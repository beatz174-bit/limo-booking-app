"""Service to manage global application pricing settings."""

import logging

from fastapi import Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.models.settings import AdminConfig
from app.schemas.setup import SettingsPayload
from app.schemas.user import UserRead

logger = logging.getLogger(__name__)


def ensure_admin(user: UserRead):
    """Placeholder admin check to be replaced in future."""
    return


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
    )


async def update_settings(data: SettingsPayload, db: AsyncSession, user: UserRead):
    """Persist updated pricing configuration."""
    ensure_admin(user)
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
