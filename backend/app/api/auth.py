# app/api/auth.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.auth import LoginRequest, LoginResponse, RegisterRequest
from app.schemas.user import UserRead
from app.services.auth_service import authenticate_user, register_user
from app.dependencies import get_db

router = APIRouter(prefix="/auth", tags=["auth"])

# @router.post("/login", response_model=LoginResponse)
# def login(data: LoginRequest, db: Session = Depends(get_db)):
#     return authenticate_user(db, data)
# ✅ CORRECT
@router.post("/login")
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    return await authenticate_user(db, data)


@router.post("/register", response_model=UserRead, status_code=201)
def endpoint_register(data: RegisterRequest, db: Session = Depends(get_db)):
    return register_user(db, data)
