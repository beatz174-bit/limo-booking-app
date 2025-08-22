"""Routes used to perform initial application setup."""

import logging
from typing import Union

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.schemas.setup import SettingsPayload, SetupPayload
from app.services.setup_service import complete_initial_setup, is_setup_complete

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/setup", tags=["setup"])


@router.post("")
async def setup(data: SetupPayload, db: AsyncSession = Depends(get_db)):
    """Create admin settings and initial user."""
    logger.info("initial setup run")
    return await complete_initial_setup(db, data)


@router.get("")
async def setup_status(
    db: AsyncSession = Depends(get_db),
) -> Union[SettingsPayload, None]:
    """Check if setup has already been completed."""
    complete: Union[SettingsPayload, None] = await is_setup_complete(db)
    logger.info("setup status", extra={"complete": bool(complete)})
    return complete
