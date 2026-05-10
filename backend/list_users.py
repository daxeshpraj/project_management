import asyncio
from sqlmodel import select
from server import User, async_session

async def list_users():
    async with async_session() as session:
        statement = select(User)
        result = await session.execute(statement)
        users = result.scalars().all()
        for user in users:
            print(f"Username: {user.username}, Role: {user.role}, Full Name: {user.full_name}")

if __name__ == "__main__":
    asyncio.run(list_users())
