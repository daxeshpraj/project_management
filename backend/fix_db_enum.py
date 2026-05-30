import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv
from pathlib import Path

async def fix_enum():
    ROOT_DIR = Path(__file__).parent
    load_dotenv(ROOT_DIR / '.env')
    
    # Use fallback if .env not loaded or missing
    DATABASE_URL = os.environ.get(
        'DATABASE_URL', 
        'postgresql+asyncpg://postgres:Daxesh%249173@localhost:5432/aemje_architect_db'
    )
    
    print(f"Connecting to {DATABASE_URL}...")
    engine = create_async_engine(DATABASE_URL)
    
    async with engine.begin() as conn:
        try:
            # Check if role type exists and update it
            await conn.execute(text("ALTER TYPE role ADD VALUE IF NOT EXISTS 'STAFF'"))
            print("Successfully added 'STAFF' to 'role' enum.")
        except Exception as e:
            print(f"Error adding enum value: {e}")

    # Also trigger table creation
    from sqlmodel import SQLModel
    # Import all models to register them with SQLModel.metadata
    from server import User, Project, Vendor, Staff, StaffTransaction, GeneralExpense, LooseExpense, ServiceExpense
    
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        print("Ensured all tables are created.")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(fix_enum())
