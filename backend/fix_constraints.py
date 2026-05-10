import asyncio
from sqlalchemy import text
from server import engine

async def fix_constraints():
    print("Fixing unique constraints for multi-tenancy...")
    try:
        async with engine.begin() as conn:
            # 1. Drop the old unique index on vendor type name
            # Note: We use 'DROP INDEX IF EXISTS' to avoid errors
            try:
                await conn.execute(text("DROP INDEX IF EXISTS ix_vendortypemaster_name"))
                print("Old unique index on VendorTypeMaster name dropped.")
            except Exception as e:
                print(f"Note: Could not drop index (it might not be unique or name is different): {e}")

            # 2. Create a new composite index (company_id + name)
            try:
                await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_vendortypemaster_company_name ON vendortypemaster (company_id, name)"))
                print("New composite index on (company_id, name) created.")
            except Exception as e:
                print(f"Error creating new index: {e}")

            # 3. Repeat for DesignationMaster if needed
            try:
                await conn.execute(text("DROP INDEX IF EXISTS ix_designationmaster_name"))
                await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_designationmaster_company_name ON designationmaster (company_id, name)"))
                print("Indexes for DesignationMaster updated.")
            except Exception as e:
                print(f"Note: DesignationMaster index update: {e}")

    except Exception as e:
        print(f"Database error: {e}")

if __name__ == "__main__":
    asyncio.run(fix_constraints())
