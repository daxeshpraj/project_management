import asyncio
from sqlalchemy import text
from server import engine

async def migrate_phase3():
    print("Migrating database for Phase 3 (Subscriptions & SuperAdmin)...")
    try:
        async with engine.begin() as conn:
            # 1. Update Company table
            print("Updating 'company' table...")
            await conn.execute(text("ALTER TABLE company ADD COLUMN IF NOT EXISTS plan_type VARCHAR DEFAULT 'FREE'"))
            await conn.execute(text("ALTER TABLE company ADD COLUMN IF NOT EXISTS subscription_status VARCHAR DEFAULT 'TRIAL'"))
            await conn.execute(text("ALTER TABLE company ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE"))

            # 2. Update User table
            print("Updating 'user' table...")
            await conn.execute(text("ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT FALSE"))
            
            print("Migration successful.")
    except Exception as e:
        print(f"Migration error: {e}")

if __name__ == "__main__":
    asyncio.run(migrate_phase3())
