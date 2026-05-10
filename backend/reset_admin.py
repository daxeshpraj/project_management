import asyncio
from sqlmodel import select
from server import User, async_session, get_password_hash

async def reset_admin_password():
    async with async_session() as session:
        statement = select(User).where(User.username == "admin")
        result = await session.execute(statement)
        user = result.scalar_one_or_none()
        if user:
            user.hashed_password = get_password_hash("admin123")
            session.add(user)
            await session.commit()
            print("Admin password reset to admin123")
        else:
            print("Admin user not found")

if __name__ == "__main__":
    asyncio.run(reset_admin_password())
