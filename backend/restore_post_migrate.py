"""Apply schema fixes and backfill after restoring an older DB backup."""
import asyncio
import uuid
from sqlalchemy import text
from server import engine, async_session

TABLES_WITH_COMPANY = [
    "vendortypemaster", "designationmaster", "permissionmapping",
    "partnershare", "project", "vendor", "vendorpayment", "customerpayment",
    "generalexpense", "looseexpense", "serviceexpense", "staff",
    "stafftransaction", "personalloan", "loanrepayment", "loosepurchase", "user",
]

HK_TECH_SUBDOMAIN = "hktech"
DEFAULT_SUBDOMAIN = "aemje"


async def migrate():
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE company ADD COLUMN IF NOT EXISTS subdomain VARCHAR"))
        await conn.execute(
            text("CREATE UNIQUE INDEX IF NOT EXISTS ix_company_subdomain ON company (subdomain)")
        )
        await conn.execute(
            text('ALTER TABLE "user" ADD COLUMN IF NOT EXISTS company_id VARCHAR REFERENCES company(id)')
        )
        await conn.execute(
            text('ALTER TABLE "user" ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT false')
        )
        for table in TABLES_WITH_COMPANY:
            t = f'"{table}"' if table == "user" else table
            await conn.execute(
                text(f"ALTER TABLE {t} ADD COLUMN IF NOT EXISTS company_id VARCHAR REFERENCES company(id)")
            )

    async with async_session() as session:
        companies = (
            await session.execute(text("SELECT id, name, subdomain FROM company ORDER BY name"))
        ).fetchall()
        print("Companies:", [(c[1], c[2]) for c in companies])

        hk = await session.execute(
            text("SELECT id FROM company WHERE subdomain = :s"),
            {"s": HK_TECH_SUBDOMAIN},
        )
        hk_id = hk.scalar()
        default = await session.execute(
            text("SELECT id FROM company WHERE subdomain = :s"),
            {"s": DEFAULT_SUBDOMAIN},
        )
        default_id = default.scalar()
        if not default_id and companies:
            default_id = companies[0][0]

        if hk_id:
            await session.execute(
                text(
                    'UPDATE "user" SET company_id = :cid, is_superadmin = true WHERE username = \'admin\''
                ),
                {"cid": hk_id},
            )
        await session.execute(
            text(
                'UPDATE "user" SET company_id = COALESCE(company_id, :cid) WHERE username != \'admin\' OR company_id IS NULL'
            ),
            {"cid": default_id},
        )

        await session.execute(
            text("UPDATE project SET company_id = :cid WHERE company_id IS NULL"),
            {"cid": default_id},
        )

        for table in TABLES_WITH_COMPANY:
            t = f'"{table}"' if table == "user" else table
            await session.execute(
                text(f"UPDATE {t} SET company_id = :cid WHERE company_id IS NULL"),
                {"cid": default_id},
            )

        pm_count = (
            await session.execute(text("SELECT COUNT(*) FROM permissionmapping WHERE company_id IS NULL"))
        ).scalar()
        if pm_count:
            base_company = hk_id or default_id
            await session.execute(
                text("UPDATE permissionmapping SET company_id = :cid WHERE company_id IS NULL"),
                {"cid": base_company},
            )
            existing = (
                await session.execute(
                    text(
                        "SELECT role, module_id, is_enabled FROM permissionmapping WHERE company_id = :cid"
                    ),
                    {"cid": base_company},
                )
            ).fetchall()
            for c in companies:
                if c[0] == base_company:
                    continue
                for role, module_id, is_enabled in existing:
                    await session.execute(
                        text(
                            """
                            INSERT INTO permissionmapping (id, company_id, role, module_id, is_enabled, created_at)
                            VALUES (:id, :cid, :role, :mid, :en, NOW())
                            ON CONFLICT DO NOTHING
                            """
                        ),
                        {
                            "id": str(uuid.uuid4()),
                            "cid": c[0],
                            "role": role,
                            "mid": module_id,
                            "en": is_enabled,
                        },
                    )

        await session.commit()
        users = (await session.execute(text('SELECT username, role, company_id, is_superadmin FROM "user"'))).fetchall()
        print("Users after migrate:", users)
        print("Post-restore migration completed.")


if __name__ == "__main__":
    asyncio.run(migrate())
