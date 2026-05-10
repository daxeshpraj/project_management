import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

# Connect to 'postgres' db to list others
BASE_URL = "postgresql+asyncpg://postgres:Daxesh%249173@localhost:5432/postgres"

async def list_dbs():
    engine = create_async_engine(BASE_URL)
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT datname FROM pg_database"))
        dbs = [row[0] for row in res]
        print(f"Databases: {dbs}")

if __name__ == "__main__":
    asyncio.run(list_dbs())
