import asyncio
from sqlmodel import select
from server import engine, User
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker

async def check():
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        result = await session.execute(select(User).where(User.username == 'sai'))
        user = result.scalar_one_or_none()
        if user:
            print(f"DEBUG: User={user.username}, is_superadmin={user.is_superadmin}, company_id={user.company_id}")
        else:
            print("DEBUG: User 'sai' not found")

if __name__ == "__main__":
    asyncio.run(check())
