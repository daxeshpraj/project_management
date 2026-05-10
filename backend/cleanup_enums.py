import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

DATABASE_URL = "postgresql+asyncpg://postgres:Daxesh%249173@localhost:5432/aemje_architect_db"

async def migrate():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        print("Starting data integrity cleanup...")
        # Convert all types to uppercase HELP
        await conn.execute(text("UPDATE personalloan SET loan_type = 'HELP' WHERE loan_type::text IN ('LOAN', 'Loan', 'GIFT', 'Gift', 'help', 'Help')"))
        
        # Convert all statuses to uppercase
        await conn.execute(text("UPDATE personalloan SET status = 'PAID' WHERE status::text IN ('ACTIVE', 'Active', 'paid', 'Paid', 'PAID')"))
        await conn.execute(text("UPDATE personalloan SET status = 'RETURNED' WHERE status::text IN ('REPAID', 'Repaid', 'returned', 'Returned', 'RETURNED')"))
        
        print("Cleanup finished successfully.")

if __name__ == "__main__":
    asyncio.run(migrate())
