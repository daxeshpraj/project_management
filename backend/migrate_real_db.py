import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

# Try with emergent_db
REAL_DB_URL = "postgresql+asyncpg://postgres:Daxesh%249173@localhost:5432/emergent_db"

async def migrate_real_db():
    engine = create_async_engine(REAL_DB_URL)
    async with engine.begin() as conn:
        print(f"Migrating emergent_db: {REAL_DB_URL}")
        try:
            res = await conn.execute(text("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE typname = 'loanstatus'"))
            labels = [row[0] for row in res]
            print(f"Current labels in emergent_db: {labels}")
            
            if 'Active' in labels:
                await conn.execute(text("ALTER TYPE loanstatus RENAME VALUE 'Active' TO 'PAID'"))
            if 'ACTIVE' in labels:
                await conn.execute(text("ALTER TYPE loanstatus RENAME VALUE 'ACTIVE' TO 'PAID'"))
            if 'Repaid' in labels:
                await conn.execute(text("ALTER TYPE loanstatus RENAME VALUE 'Repaid' TO 'RETURNED'"))
            if 'REPAID' in labels:
                await conn.execute(text("ALTER TYPE loanstatus RENAME VALUE 'REPAID' TO 'RETURNED'"))
                
            print("Updating records...")
            await conn.execute(text("UPDATE personalloan SET status = 'PAID' WHERE status::text IN ('Active', 'ACTIVE', 'Written Off', 'WRITTEN_OFF')"))
            await conn.execute(text("UPDATE personalloan SET status = 'RETURNED' WHERE status::text IN ('Repaid', 'REPAID')"))
            await conn.execute(text("UPDATE personalloan SET loan_type = 'Help' WHERE loan_type::text = 'Gift'"))
            
            print("Migration of emergent_db finished.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(migrate_real_db())
