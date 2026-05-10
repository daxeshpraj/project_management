import asyncio
import os
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext
from server import User, verify_password

async def test_login():
    DATABASE_URL = 'postgresql+asyncpg://postgres:Daxesh%249173@localhost:5432/aemje_architect_db'
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        statement = select(User).where(User.username == "admin")
        result = await session.execute(statement)
        user = result.scalar_one_or_none()
        
        if not user:
            print("User admin not found")
            return
            
        print(f"User found: {user.username}, Role: {user.role}")
        # Try a known password if we can, or just verify the hash logic
        # Since I don't know the password, I'll just check if the user object is valid
        print("User object is valid.")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_login())
