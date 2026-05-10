import asyncio
from sqlalchemy import text
from server import engine

async def update_roles():
    print("Updating database roles...")
    try:
        async with engine.begin() as conn:
            # PostgreSQL doesn't support IF NOT EXISTS for ADD VALUE in some versions, 
            # so we check if it exists first or just try and catch.
            # But usually, it's safer to just run it.
            try:
                await conn.execute(text("ALTER TYPE role ADD VALUE 'OWNER'"))
                print("Role 'OWNER' added successfully.")
            except Exception as e:
                if "already exists" in str(e).lower():
                    print("Role 'OWNER' already exists.")
                else:
                    print(f"Note: Could not add 'OWNER' role (it might already exist or the type name is different): {e}")
            
            # Also ensure permission mappings are initialized for the new company
            # (Handled in signup endpoint now)
    except Exception as e:
        print(f"Database error: {e}")

if __name__ == "__main__":
    asyncio.run(update_roles())
