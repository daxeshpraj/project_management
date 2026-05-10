import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:Daxesh%249173@localhost:5432/aemje_architect_db"

async def check_enums():
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT n.nspname as schema, t.typname as type, e.enumlabel as value FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace"))
        for row in res:
            print(f"Enum {row[1]}: {row[2]}")

if __name__ == "__main__":
    asyncio.run(check_enums())
