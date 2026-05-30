import asyncio
from sqlmodel import select
from server import User, async_session

async def check_superadmins():
    async with async_session() as session:
        statement = select(User).where(User.is_superadmin == True)
        result = await session.execute(statement)
        users = result.scalars().all()
        if not users:
            print("No SuperAdmins found.")
        for user in users:
            print(f"SuperAdmin: {user.username} ({user.full_name})")

if __name__ == "__main__":
    asyncio.run(check_superadmins())
