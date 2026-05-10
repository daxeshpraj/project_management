import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

URL = "postgresql+asyncpg://postgres:Daxesh%249173@localhost:5432/aemje_architect_db"

async def migrate():
    engine = create_async_engine(URL)
    async with engine.begin() as conn:
        print("Normalizing ALL enums to UPPERCASE...")
        
        # LoanType
        res = await conn.execute(text("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE typname = 'loantype'"))
        labels = [row[0] for row in res]
        for l in labels:
            if l == 'Loan':
                await conn.execute(text("ALTER TYPE loantype RENAME VALUE 'Loan' TO 'LOAN'"))
            elif l == 'Help':
                await conn.execute(text("ALTER TYPE loantype RENAME VALUE 'Help' TO 'HELP'"))
        
        # LoanStatus (already done mostly, but double check)
        res = await conn.execute(text("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE typname = 'loanstatus'"))
        labels = [row[0] for row in res]
        for l in labels:
            if l == 'Paid':
                await conn.execute(text("ALTER TYPE loanstatus RENAME VALUE 'Paid' TO 'PAID'"))
            elif l == 'Returned':
                await conn.execute(text("ALTER TYPE loanstatus RENAME VALUE 'Returned' TO 'RETURNED'"))
        
        print("Updating records to use uppercase...")
        await conn.execute(text("UPDATE personalloan SET loan_type = 'LOAN' WHERE loan_type::text IN ('Loan', 'LOAN')"))
        await conn.execute(text("UPDATE personalloan SET loan_type = 'HELP' WHERE loan_type::text IN ('Help', 'HELP', 'Gift', 'GIFT')"))
        await conn.execute(text("UPDATE personalloan SET status = 'PAID' WHERE status::text IN ('Paid', 'PAID', 'Active', 'ACTIVE', 'Written Off', 'WRITTEN_OFF')"))
        await conn.execute(text("UPDATE personalloan SET status = 'RETURNED' WHERE status::text IN ('Returned', 'RETURNED', 'Repaid', 'REPAID')"))
        
        print("Normalization finished.")

if __name__ == "__main__":
    asyncio.run(migrate())
