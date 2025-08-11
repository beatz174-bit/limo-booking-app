from fastapi import HTTPException
from app.models.user import User
from app.models.settings import AdminConfig
from app.core.security import hash_password
from app.schemas.setup import SetupPayload
from sqlalchemy.sql import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.engine import Result
from sqlalchemy.engine import ScalarResult
from typing import Union


async def complete_initial_setup(db: AsyncSession, data: SetupPayload):
    # Prevent running setup more than once
    # existing_admin = db.query(User).filter(User.role == "admin").first()
    stmt = select(User).filter(User.id == 1)
    existing_admin = (await db.execute(stmt)).scalar_one_or_none()
    if existing_admin:
        raise HTTPException(status_code=400, detail="Setup already completed.")

    # Create admin user
    admin_user = User(
        email=data.admin_email,
        full_name=data.full_name,
        hashed_password=hash_password(data.admin_password),
        role="admin",
        is_approved=True,
    )
    db.add(admin_user)

    # Save settings
    s = data.settings
    config = AdminConfig(
        allow_public_registration=(s.account_mode == "open"),
        google_maps_api_key=s.google_maps_api_key,
        flagfall=s.flagfall,
        per_km_rate=s.per_km_rate,
        per_min_rate=s.per_minute_rate,
    )
    db.add(config)

    await db.commit()
    return {"message": "Setup complete"}

async def is_setup_complete(db: AsyncSession) -> Union[AdminConfig, None]:
    result: Result = await db.execute( # type: ignore
        select(AdminConfig).limit(1)
    )
    scalars: ScalarResult[AdminConfig] = result.scalars() # type: ignore
    first_record: Union[AdminConfig, None] = scalars.first()
    return first_record