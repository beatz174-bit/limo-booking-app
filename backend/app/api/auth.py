# app/api/auth.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.auth import LoginRequest, RegisterRequest
from app.services.auth_service import authenticate_user, register_user
from app.dependencies import get_db

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login")
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    return await authenticate_user(db, data)


@router.post("/register")
async def endpoint_register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    return await register_user(db, data)
