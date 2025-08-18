# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from contextlib import asynccontextmanager

from app.core.config import get_settings
from app.db.database import database

from app.api import (
    auth as auth_router,
    bookings as bookings_router,
    geocode as geocode_router,
    settings as settings_router,
    setup as setup_router,
    users as users_router,
)
settings = get_settings()

def get_app() -> FastAPI:
    """For pytest: returns the singleton `app`."""
    return app

@asynccontextmanager
async def lifespan(app: FastAPI):
    await database.connect()
    yield
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
app.include_router(users_router.router)

@app.get("/", include_in_schema=False)
async def docs_redirect():
    return RedirectResponse(url="/docs")
