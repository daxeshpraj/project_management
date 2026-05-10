import asyncio
from server import engine, PersonalLoan, select
from sqlalchemy import text

async def check():
    async with engine.connect() as conn:
        print("Checking PersonalLoan table...")
        res = await conn.execute(select(PersonalLoan))
        loans = res.all()
        types = set()
        statuses = set()
        for l in loans:
            types.add(l.loan_type)
            statuses.add(l.status)
            print(f"Loan: {l.person_name}, Type: {l.loan_type}, Status: {l.status}")
        
        print(f"\nSummary:")
        print(f"Unique Types: {types}")
        print(f"Unique Statuses: {statuses}")

if __name__ == "__main__":
    asyncio.run(check())
