import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

URL = "postgresql+asyncpg://postgres:Daxesh%249173@localhost:5432/emergent_db"

async def check():
    engine = create_async_engine(URL)
    async with engine.connect() as conn:
        try:
            res = await conn.execute(text("SELECT count(*) FROM personalloan"))
            count = res.scalar()
            print(f"emergent_db count: {count}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(check())
