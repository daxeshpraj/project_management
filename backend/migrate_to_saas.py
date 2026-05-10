import asyncio
import uuid
from datetime import datetime, timezone
from sqlalchemy import text
from server import async_session, Company, User, Role

from server import async_session, Company, User, Role, engine, SQLModel

async def migrate():
    # Create tables first
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        # Also run the ALTER TABLEs from lifespan just in case
        await conn.execute(text("ALTER TABLE company ADD COLUMN IF NOT EXISTS subdomain VARCHAR"))
        await conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_company_subdomain ON company (subdomain)"))
        
        tables = [
            "vendortypemaster", "designationmaster", "permissionmapping", 
            "partnershare", "project", "vendor", "vendorpayment", "customerpayment", 
            "generalexpense", "looseexpense", "serviceexpense", "staff", 
            "stafftransaction", "personalloan", "loanrepayment", "loosepurchase", "\"user\""
        ]
        for table in tables:
            await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS company_id VARCHAR REFERENCES company(id)"))
        await conn.commit()

    async with async_session() as session:
        # 1. Check if default company exists
        result = await session.execute(text("SELECT id FROM company WHERE name = 'Aemje Architect'"))
        company = result.fetchone()
        
        if not company:
            print("Creating default company: Aemje Architect")
            company_id = str(uuid.uuid4())
            await session.execute(text("""
                INSERT INTO company (id, name, subdomain, currency, date_format, created_at)
                VALUES (:id, :name, :subdomain, :currency, :date_format, :created_at)
            """), {
                "id": company_id,
                "name": "Aemje Architect",
                "subdomain": "aemje",
                "currency": "INR",
                "date_format": "DD-MM-YYYY",
                "created_at": datetime.now(timezone.utc).replace(tzinfo=None)
            })
        else:
            company_id = company[0]
            print(f"Using existing company ID: {company_id}")
            await session.execute(text("UPDATE company SET subdomain = 'aemje' WHERE id = :id AND subdomain IS NULL"), {"id": company_id})

        # 2. Backfill company_id for all tables
        tables = [
            "vendortypemaster", "designationmaster", "permissionmapping", 
            "partnershare", "project", "vendor", "vendorpayment", "customerpayment", 
            "generalexpense", "looseexpense", "serviceexpense", "staff", 
            "stafftransaction", "personalloan", "loanrepayment", "loosepurchase", "user"
        ]
        
        for table in tables:
            print(f"Backfilling {table}...")
            # Use double quotes for 'user' table as it's a reserved word in PG
            table_name = f'"{table}"' if table == "user" else table
            await session.execute(text(f"UPDATE {table_name} SET company_id = :cid WHERE company_id IS NULL"), {"cid": company_id})
        
        # 3. Update all users to be OWNERS or ADMINS of this company if they don't have a role yet
        # Actually, let's just make sure they all belong to this company.
        
        await session.commit()
        print("Migration completed successfully!")

if __name__ == "__main__":
    asyncio.run(migrate())
