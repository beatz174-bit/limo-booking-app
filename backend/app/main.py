"""Application entry point and API router configuration."""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, JSONResponse

from app.core.config import get_settings
from app.core.logging import RequestLoggingMiddleware, setup_logging
from app.db.database import database

from app.api import (
    auth as auth_router,
    users as users_router,
    bookings as bookings_router,
    setup as setup_router,
    settings as settings_router,
    route_metrics as route_metrics_router,
    geocode as geocode_router,
)
from app.api.v1 import bookings as bookings_v1_router
from app.api.v1 import driver_bookings as driver_bookings_v1_router
from app.api.v1 import track as track_v1_router
from app.api import ws as ws_router
from app.services.scheduler import scheduler

setup_logging()
settings = get_settings()
logger = logging.getLogger(__name__)

def get_app() -> FastAPI:
    """For pytest: returns the singleton `app`."""
    return app

@asynccontextmanager
async def lifespan(app: FastAPI):
    await database.connect()
    await ws_router.broadcast.connect()
    scheduler.start()
    try:
        yield
    finally:
        scheduler.shutdown()
        await ws_router.broadcast.disconnect()
        await database.disconnect()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    openapi_prefix=settings.api_prefix,
    docs_url="/docs",
    redoc_url="/redoc",
    dependencies=[],
    swagger_ui_parameters={"persistAuthorization": True},
    lifespan=lifespan,
)
app.add_middleware(RequestLoggingMiddleware)
logger.info("Application startup complete", extra={"env": settings.env})

if not settings.env == "production":
    # Global CORS configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=settings.allow_credentials,
        allow_methods=settings.allow_methods,
        allow_headers=settings.allow_headers,
    )

app.include_router(auth_router.router)
app.include_router(bookings_router.router)
app.include_router(geocode_router.router)
app.include_router(setup_router.router)
app.include_router(settings_router.router)
app.include_router(route_metrics_router.router)
app.include_router(users_router.router)
app.include_router(bookings_v1_router.router)
app.include_router(driver_bookings_v1_router.router)
app.include_router(track_v1_router.router)
app.include_router(ws_router.router)

@app.get("/", include_in_schema=False)
async def docs_redirect():
    return RedirectResponse(url="/docs")


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Log handled HTTP errors."""
    logger = logging.getLogger("app.error")
    logger.warning(
        "HTTPException status=%s detail=%s path=%s",
        exc.status_code,
        exc.detail,
        request.url.path,
    )
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Log unexpected errors and return a generic message."""
    logger = logging.getLogger("app.error")
    logger.exception("Unhandled exception path=%s", request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal Server Error"})

