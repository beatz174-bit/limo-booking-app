from fastapi import HTTPException
from app.models.user import User
from app.models.settings import AdminConfig
from app.core.security import hash_password
from app.schemas.setup import SetupPayload, SetupSummary
from sqlalchemy.sql import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Union

async def complete_initial_setup(db: AsyncSession, data: SetupPayload):
    if await is_setup_complete(db):
        raise HTTPException(status_code=400, detail="Setup already completed")

    admin_user = User(
        email=data.admin_email,
        full_name=data.full_name,
        hashed_password=hash_password(data.admin_password)
    )
    db.add(admin_user)

    cfg = AdminConfig(
        allow_public_registration=(data.settings.account_mode == "open"),
        google_maps_api_key=data.settings.google_maps_api_key,
        flagfall=data.settings.flagfall,
        per_km_rate=data.settings.per_km_rate,
        per_min_rate=data.settings.per_minute_rate,
    )
    db.add(cfg)

    await db.commit()
    return {"message": "Setup complete"}

async def is_setup_complete(db: AsyncSession) -> Union[SetupSummary, None]:
    res = await db.execute(select(AdminConfig).limit(1))
    cfg = res.scalars().first()
    if not cfg:
        return None
    return {
        "allow_public_registration": cfg.allow_public_registration,
        "google_maps_api_key": cfg.google_maps_api_key,
        "flagfall": cfg.flagfall,
        "per_km_rate": cfg.per_km_rate,
        "per_min_rate": cfg.per_min_rate,
    }