import asyncio
import uuid
import os
from datetime import datetime, timezone
from enum import Enum
from sqlmodel import SQLModel, Field, Session, create_engine, select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext

# Define Enums exactly as in server.py
class Role(str, Enum):
    ADMIN = "ADMIN"
    USER = "USER"

# Define User model exactly as in server.py
class User(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    username: str = Field(index=True, unique=True)
    full_name: str
    hashed_password: str
    role: Role = Role.USER
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

# Connection string with verified DB name
DATABASE_URL = "postgresql+asyncpg://postgres:Daxesh%249173@localhost:5432/aemje_architect_db"
engine = create_async_engine(DATABASE_URL, echo=True)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

async def force_create_admin():
    print(f"Connecting to {DATABASE_URL}...")
    try:
        async with engine.begin() as conn:
            # Ensure table exists
            await conn.run_sync(SQLModel.metadata.create_all)
            print("Database connected and tables verified.")

        async with async_session() as session:
            # Check if user already exists
            stmt = select(User).where(User.username == "admin")
            result = await session.execute(stmt)
            existing_user = result.scalars().first()
            
            if existing_user:
                print("Admin user already exists. Updating password...")
                existing_user.hashed_password = pwd_context.hash("admin-password")
                session.add(existing_user)
            else:
                print("Creating new Admin user...")
                new_user = User(
                    username="admin",
                    full_name="System Administrator",
                    hashed_password=pwd_context.hash("admin-password"),
                    role=Role.ADMIN
                )
                session.add(new_user)
            
            await session.commit()
            print("SUCCESS: Admin user 'admin' is ready in the database.")
            
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(force_create_admin())
