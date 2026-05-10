import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

URL = "postgresql+asyncpg://postgres:Daxesh%249173@localhost:5432/aemje_architect_db"

async def check():
    engine = create_async_engine(URL)
    async with engine.connect() as conn:
        print("Checking LoanType labels in aemje_architect_db...")
        res = await conn.execute(text("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE typname = 'loantype'"))
        labels = [row[0] for row in res]
        print(f"LoanType labels: {labels}")
        
        res_status = await conn.execute(text("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE typname = 'loanstatus'"))
        status_labels = [row[0] for row in res_status]
        print(f"LoanStatus labels: {status_labels}")

if __name__ == "__main__":
    asyncio.run(check())
