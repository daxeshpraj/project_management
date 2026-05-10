import asyncio
from sqlalchemy import text
from server import engine

async def activate():
    async with engine.begin() as conn:
        await conn.execute(text("UPDATE company SET is_active = TRUE"))
        print("All companies activated!")

if __name__ == "__main__":
    asyncio.run(activate())
