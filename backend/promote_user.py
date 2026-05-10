import asyncio
from sqlalchemy import text
from server import engine

async def promote_user(username):
    print(f"Promoting user '{username}' to Super Admin...")
    try:
        async with engine.begin() as conn:
            result = await conn.execute(
                text("UPDATE \"user\" SET is_superadmin = TRUE WHERE username = :username"),
                {"username": username}
            )
            success = result.rowcount > 0
        
        if success:
            print(f"User '{username}' is now a Super Admin!")
        else:
            print(f"User '{username}' not found.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    import sys
    target = sys.argv[1] if len(sys.argv) > 1 else "sai" # Defaulting to 'sai' based on previous context
    asyncio.run(promote_user(target))
