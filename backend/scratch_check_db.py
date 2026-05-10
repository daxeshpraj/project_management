import asyncio
from server import engine, Staff, select, Vendor, StaffTransaction
from sqlalchemy import text

async def check():
    async with engine.connect() as conn:
        print("Checking Staff table...")
        res = await conn.execute(select(Staff).limit(5))
        for row in res:
            print(f"Staff: {row.name}, Designation ID: {row.designation_id}")
            
        print("\nChecking Vendor table...")
        res = await conn.execute(select(Vendor).limit(5))
        for row in res:
            print(f"Vendor: {row.name}, Vendor Type ID: {row.vendor_type_id}")

        print("\nChecking StaffTransaction table...")
        res = await conn.execute(select(StaffTransaction).limit(5))
        for row in res:
            print(f"Transaction ID: {row.id}, Paid By: {row.paid_by}")

if __name__ == "__main__":
    asyncio.run(check())
