import asyncio
from server import engine
from sqlalchemy import text

async def migrate():
    async with engine.begin() as conn:
        print("Renaming enum labels in PG (with COMMIT)...")
        try:
            await conn.execute(text("ALTER TYPE loanstatus RENAME VALUE 'ACTIVE' TO 'Paid'"))
            await conn.execute(text("ALTER TYPE loanstatus RENAME VALUE 'REPAID' TO 'Returned'"))
            print("Enum labels renamed and committed.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
