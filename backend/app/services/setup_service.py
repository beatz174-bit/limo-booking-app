"""Service functions for initial application setup."""

import logging

from fastapi import HTTPException
from app.models.user import User
from app.models.settings import AdminConfig
from app.core.security import hash_password
from app.schemas.setup import SetupPayload, SettingsPayload
from sqlalchemy.sql import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Union

logger = logging.getLogger(__name__)


async def complete_initial_setup(db: AsyncSession, data: SetupPayload):
    from app.db.database import Base, async_engine
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    if await is_setup_complete(db):
        logger.warning("setup already completed")
        raise HTTPException(status_code=400, detail="Setup already completed")

    admin_user = User(
        email=data.admin_email,
        full_name=data.full_name,
        hashed_password=hash_password(data.admin_password)
    )
    db.add(admin_user)

    cfg = AdminConfig(
        account_mode=(data.settings.account_mode),
        flagfall=data.settings.flagfall,
        per_km_rate=data.settings.per_km_rate,
        per_minute_rate=data.settings.per_minute_rate,
    )
    db.add(cfg)

    await db.commit()
    logger.info("setup complete")
    return {"message": "Setup complete"}

async def is_setup_complete(db: AsyncSession) -> Union[SettingsPayload, None]:
    logger.debug("checking setup status")
    res = await db.execute(select(AdminConfig).limit(1))
    cfg = res.scalars().first()
    if not cfg:
        return None
    return SettingsPayload(
        account_mode=cfg.account_mode,
        flagfall=cfg.flagfall,
        per_km_rate=cfg.per_km_rate,
        per_minute_rate=cfg.per_minute_rate,
    )

