from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies import get_db
from app.schemas.setup import SetupPayload, SettingsPayload
from app.services.setup_service import complete_initial_setup, is_setup_complete
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Union

router = APIRouter(prefix="/setup", tags=["setup"])

@router.post("")
async def setup(data: SetupPayload, db: AsyncSession = Depends(get_db)):
    return await complete_initial_setup(db, data)

@router.get("")
async def setup_status(db: AsyncSession = Depends(get_db)) -> Union[SettingsPayload, None]:
    complete: Union[SettingsPayload, None] = await is_setup_complete(db)
    return complete