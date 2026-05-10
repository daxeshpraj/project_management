import asyncio
from server import engine
from sqlalchemy import text

async def migrate():
    async with engine.begin() as conn:
        print("Normalizing enum labels to UPPERCASE in PG...")
        try:
            # First, check what we have
            res = await conn.execute(text("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE typname = 'loanstatus'"))
            labels = [row[0] for row in res]
            print(f"Current labels: {labels}")
            
            for l in labels:
                if l == 'Paid':
                    await conn.execute(text("ALTER TYPE loanstatus RENAME VALUE 'Paid' TO 'PAID'"))
                elif l == 'Returned':
                    await conn.execute(text("ALTER TYPE loanstatus RENAME VALUE 'Returned' TO 'RETURNED'"))
            print("Enum labels normalized.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
