import asyncio
from sqlalchemy import text
from server import engine


async def main():
    async with engine.begin() as conn:
        tables = await conn.execute(
            text(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema='public' ORDER BY 1"
            )
        )
        print("Tables:", [r[0] for r in tables.fetchall()])

        cols = await conn.execute(
            text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='user' ORDER BY 1"
            )
        )
        print("user columns:", [r[0] for r in cols.fetchall()])

        try:
            companies = await conn.execute(text("SELECT id, name, subdomain FROM company"))
            print("Companies:", companies.fetchall())
        except Exception as e:
            print("company table:", e)

        users = await conn.execute(
            text('SELECT username, role FROM "user" LIMIT 10')
        )
        print("Users:", users.fetchall())


if __name__ == "__main__":
    asyncio.run(main())
