"""
Apply schema upgrades after restoring an older DB backup so it works with current server.py.
"""
import asyncio
from sqlalchemy import text
from server import engine, SQLModel


TABLES_WITH_COMPANY = [
    "vendortypemaster",
    "designationmaster",
    "permissionmapping",
    "partnershare",
    "project",
    "vendor",
    "vendorpayment",
    "customerpayment",
    "generalexpense",
    "looseexpense",
    "serviceexpense",
    "staff",
    "stafftransaction",
    "personalloan",
    "loanrepayment",
    "loosepurchase",
    '"user"',
]


async def migrate():
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

        await conn.execute(
            text("ALTER TABLE company ADD COLUMN IF NOT EXISTS subdomain VARCHAR")
        )
        await conn.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS ix_company_subdomain "
                "ON company (subdomain)"
            )
        )

        for table in TABLES_WITH_COMPANY:
            await conn.execute(
                text(
                    f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS "
                    f"company_id VARCHAR REFERENCES company(id)"
                )
            )

        await conn.execute(
            text('ALTER TABLE "user" ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT FALSE')
        )
        await conn.execute(
            text("ALTER TABLE vendor ADD COLUMN IF NOT EXISTS vendor_type_id VARCHAR")
        )
        await conn.execute(
            text("ALTER TABLE staff ADD COLUMN IF NOT EXISTS designation_id VARCHAR")
        )
        await conn.execute(
            text("ALTER TABLE stafftransaction ADD COLUMN IF NOT EXISTS paid_by VARCHAR")
        )
        await conn.execute(
            text(
                "ALTER TABLE loanrepayment ADD COLUMN IF NOT EXISTS type VARCHAR DEFAULT 'RETURNED'"
            )
        )
        await conn.execute(
            text("ALTER TABLE loanrepayment ADD COLUMN IF NOT EXISTS person_name VARCHAR")
        )
        await conn.execute(
            text("ALTER TABLE generalexpense ADD COLUMN IF NOT EXISTS added_by VARCHAR")
        )
        await conn.execute(
            text(
                "ALTER TABLE stafftransaction ADD COLUMN IF NOT EXISTS ledger_type VARCHAR DEFAULT 'BANK'"
            )
        )
        await conn.execute(
            text('ALTER TABLE "user" ADD COLUMN IF NOT EXISTS linked_staff_id VARCHAR')
        )
        await conn.execute(
            text('ALTER TABLE "user" ADD COLUMN IF NOT EXISTS profile_image VARCHAR')
        )

        companies = await conn.execute(text("SELECT id, name, subdomain FROM company"))
        company_rows = companies.fetchall()
        print("Companies:", company_rows)

        # Prefer HK Tech, then Aemje Architect, else first company
        default_id = None
        for prefer_sub in ("hktech", "aemje"):
            for row in company_rows:
                if row[2] == prefer_sub:
                    default_id = row[0]
                    break
            if default_id:
                break
        if not default_id and company_rows:
            default_id = company_rows[0][0]

        print(f"Default company_id for orphan rows: {default_id}")

        for table in TABLES_WITH_COMPANY:
            await conn.execute(
                text(f"UPDATE {table} SET company_id = :cid WHERE company_id IS NULL"),
                {"cid": default_id},
            )
            t = table.replace('"', "")
            print(f"Backfilled {t}")

        await conn.execute(
            text('UPDATE "user" SET is_superadmin = TRUE WHERE username = \'admin\'')
        )

        users = await conn.execute(
            text('SELECT username, role, company_id, is_superadmin FROM "user"')
        )
        print("Users after migrate:", users.fetchall())

    print("Post-restore migration completed.")


if __name__ == "__main__":
    asyncio.run(migrate())
