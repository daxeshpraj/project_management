import asyncio
from server import engine, select
from sqlalchemy import text

async def check():
    async with engine.connect() as conn:
        print("Checking enum labels...")
        res = await conn.execute(text("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE typname = 'loanstatus'"))
        labels = [row[0] for row in res]
        print(f"LoanStatus labels: {labels}")

if __name__ == "__main__":
    asyncio.run(check())
