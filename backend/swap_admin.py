import asyncio
from sqlalchemy import text
from server import engine

async def swap_admin(old_admin, new_admin):
    print(f"Swapping Super Admin from '{old_admin}' to '{new_admin}'...")
    async with engine.begin() as conn:
        # Promote new
        res_new = await conn.execute(
            text("UPDATE \"user\" SET is_superadmin = TRUE WHERE username = :name"),
            {"name": new_admin}
        )
        # Demote old
        res_old = await conn.execute(
            text("UPDATE \"user\" SET is_superadmin = FALSE WHERE username = :name"),
            {"name": old_admin}
        )
        print(f"Promoted {res_new.rowcount} users, Demoted {res_old.rowcount} users.")

if __name__ == "__main__":
    asyncio.run(swap_admin("sai", "aemje"))
