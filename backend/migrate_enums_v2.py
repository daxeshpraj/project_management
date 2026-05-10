import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:Daxesh%249173@localhost:5432/aemje_architect_db"

async def migrate():
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        print("Migrating enums to uppercase with casting...")
        
        # Update PersonalLoan
        # We need to cast to text to use UPPER, then cast back to the enum type
        await conn.execute(text("UPDATE personalloan SET status = UPPER(status::text)::loanstatus"))
        await conn.execute(text("UPDATE personalloan SET loan_type = UPPER(loan_type::text)::loantype"))
        
        # PaymentMode is also an enum
        await conn.execute(text("UPDATE personalloan SET payment_mode = 'CASH' WHERE payment_mode::text ILIKE 'cash'"))
        await conn.execute(text("UPDATE personalloan SET payment_mode = 'BANK_TRANSFER' WHERE payment_mode::text ILIKE 'bank%transfer'"))
        await conn.execute(text("UPDATE personalloan SET payment_mode = 'UPI' WHERE payment_mode::text ILIKE 'upi'"))
        await conn.execute(text("UPDATE personalloan SET payment_mode = 'CHEQUE' WHERE payment_mode::text ILIKE 'cheque'"))
        await conn.execute(text("UPDATE personalloan SET payment_mode = 'CREDIT_CARD' WHERE payment_mode::text ILIKE 'credit%card'"))
        
        # Update LoanRepayment
        await conn.execute(text("UPDATE loanrepayment SET payment_mode = 'CASH' WHERE payment_mode::text ILIKE 'cash'"))
        await conn.execute(text("UPDATE loanrepayment SET payment_mode = 'BANK_TRANSFER' WHERE payment_mode::text ILIKE 'bank%transfer'"))
        await conn.execute(text("UPDATE loanrepayment SET payment_mode = 'UPI' WHERE payment_mode::text ILIKE 'upi'"))
        await conn.execute(text("UPDATE loanrepayment SET payment_mode = 'CHEQUE' WHERE payment_mode::text ILIKE 'cheque'"))
        await conn.execute(text("UPDATE loanrepayment SET payment_mode = 'CREDIT_CARD' WHERE payment_mode::text ILIKE 'credit%card'"))
        
        # Clean up any statuses that are not PAID or RETURNED
        # Note: WRITTEN_OFF is still in the DB enum (based on check_db_enums_labels), so we can filter it out
        await conn.execute(text("UPDATE personalloan SET status = 'PAID' WHERE status::text NOT IN ('PAID', 'RETURNED')"))
        
        await conn.commit()
        print("Migration complete!")

if __name__ == "__main__":
    asyncio.run(migrate())
