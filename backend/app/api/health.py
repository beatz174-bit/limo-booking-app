"""Health check endpoint."""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_async_session

logger = logging.getLogger(__name__)
router = APIRouter(tags=["health"])


@router.get("/health", status_code=status.HTTP_200_OK)
async def health(db: AsyncSession = Depends(get_async_session)):
    """Return 200 if database connection succeeds, 503 otherwise."""
    logger.debug("health check start")
    try:
        await db.execute(text("SELECT 1"))
        logger.info("health check ok")
        return {"status": "ok"}
    except Exception as exc:  # noqa: BLE001
        logger.exception("health check failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service unavailable",
        ) from exc
