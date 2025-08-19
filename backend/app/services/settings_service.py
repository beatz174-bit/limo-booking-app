"""Service to manage global application pricing settings."""

from fastapi import Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.setup import SettingsPayload
from app.schemas.user import UserRead
from app.models.settings import AdminConfig
from app.dependencies import get_db, get_current_user
from sqlalchemy import select


def ensure_admin(user: UserRead):
    """Allow only the designated admin (user_id 1) to modify settings."""
    if getattr(user, "id", None) != 1:
        raise HTTPException(status_code=403, detail="Admin only")


async def get_settings(db: AsyncSession = Depends(get_db), user: UserRead=Depends(get_current_user)) -> SettingsPayload:
    """Fetch pricing configuration from the database."""
    ensure_admin(user)
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

    result = await db.execute(select(AdminConfig).where(AdminConfig.id == 1))
    row = result.scalar_one_or_none()
    if row is None:
        row = AdminConfig(id=1)
        db.add(row)

    row.account_mode = data.account_mode
    row.flagfall = data.flagfall
    row.per_km_rate = data.per_km_rate
    row.per_minute_rate = data.per_minute_rate

    await db.commit()      # commit first
    # await db.refresh(row)  # then refresh (transaction is open for read)

    return SettingsPayload.model_validate(row, from_attributes=True)
