# app/api/settings.py
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.setup import SettingsPayload
from app.schemas.user import UserRead
from app.dependencies import get_db, get_current_user  # ensure admin check here
from app.services.settings_service import get_settings, update_settings

router = APIRouter(
    prefix="/settings",
    tags=["settings"],
    dependencies=[Depends(get_current_user)]
    )

@router.get("", response_model=SettingsPayload)
async def api_get_settings(db: AsyncSession = Depends(get_db), user: UserRead=Depends(get_current_user)):
    return await get_settings(db, user)

@router.put("", response_model=SettingsPayload, status_code=status.HTTP_200_OK)
async def api_update_settings(payload: SettingsPayload, db: AsyncSession = Depends(get_db), user: UserRead = Depends(get_current_user)):
    return await update_settings(payload, db, user)
