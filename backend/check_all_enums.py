import asyncio
from server import engine
from sqlalchemy import text

async def check():
    async with engine.connect() as conn:
        print("Checking enum labels...")
        for typ in ['loanstatus', 'loantype', 'paymentmode']:
            res = await conn.execute(text(f"SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE typname = '{typ}'"))
            labels = [row[0] for row in res]
            print(f"{typ} labels: {labels}")

if __name__ == "__main__":
    asyncio.run(check())
