import asyncio
from server import engine, PersonalLoan, select, LoanStatus, LoanType, async_session
from sqlalchemy import update

async def migrate():
    async with async_session() as session:
        print("Migrating Loan data using SQLModel...")
        
        # Status update
        stmt1 = update(PersonalLoan).where(PersonalLoan.status == "Written Off").values(status=LoanStatus.ACTIVE)
        await session.execute(stmt1)
        
        # Type update
        stmt2 = update(PersonalLoan).where(PersonalLoan.loan_type == "Gift").values(loan_type=LoanType.HELP)
        await session.execute(stmt2)
        
        await session.commit()
        print("Migration complete.")

if __name__ == "__main__":
    asyncio.run(migrate())
