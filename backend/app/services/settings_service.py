"""Service to manage global application pricing settings."""

import logging
import uuid

from fastapi import Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.models.settings import AdminConfig
from app.schemas.setup import SettingsPayload
from app.schemas.user import UserRead

logger = logging.getLogger(__name__)


_cached_admin_user_id: uuid.UUID | None = None


async def get_admin_user_id(db: AsyncSession) -> uuid.UUID:
    """Fetch and cache the designated admin user's ID."""
    global _cached_admin_user_id
    if _cached_admin_user_id is None:
        result = await db.execute(
            select(AdminConfig.admin_user_id).where(AdminConfig.id == 1)
        )
        value = result.scalar_one_or_none()
        if isinstance(value, int):
            value = uuid.UUID(int=value)
        _cached_admin_user_id = value
    if _cached_admin_user_id is None:
        raise HTTPException(status_code=500, detail="Admin not configured")
    return _cached_admin_user_id


async def ensure_admin(user: UserRead, db: AsyncSession) -> None:
    """Allow only the designated admin to modify settings."""
    admin_id = await get_admin_user_id(db)
    if getattr(user, "id", None) != admin_id:
        raise HTTPException(status_code=403, detail="Admin only")


async def get_settings(db: AsyncSession = Depends(get_db)) -> SettingsPayload:
    """Fetch pricing configuration from the database.

    This endpoint is now public, so no user check occurs here."""
    logger.info("retrieving settings")
    row = await db.get(AdminConfig, 1)
    if not row:
        raise HTTPException(status_code=404, detail="No settings yet")
    return SettingsPayload(
        account_mode=row.account_mode,
        flagfall=row.flagfall,
        per_km_rate=row.per_km_rate,
        per_minute_rate=row.per_minute_rate,
        admin_user_id=row.admin_user_id,
    )


async def update_settings(data: SettingsPayload, db: AsyncSession, user: UserRead):
    """Persist updated pricing configuration."""
    await ensure_admin(user, db)
    logger.info(
        "updating settings",
        extra={"user_id": getattr(user, "id", "unknown")},
    )

    result = await db.execute(select(AdminConfig).where(AdminConfig.id == 1))
    row = result.scalar_one_or_none()
    if row is None:
        row = AdminConfig(id=1)
        db.add(row)

    row.account_mode = data.account_mode
    row.flagfall = data.flagfall
    row.per_km_rate = data.per_km_rate
    row.per_minute_rate = data.per_minute_rate

    await db.commit()  # commit first
    # await db.refresh(row)  # then refresh (transaction is open for read)

    return SettingsPayload.model_validate(row, from_attributes=True)
