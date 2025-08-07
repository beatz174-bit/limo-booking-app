# app/core/security.py
from datetime import datetime, timedelta, timezone
from typing import Dict, Any
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.core.config import settings  # contains SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_jwt_token(user_id: int) -> str:
    to_encode: Dict[str, Any] = {"sub": user_id}
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.ALGORITHM)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def decode_token(token: str):
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError as e:
        raise ValueError("Token is invalid or expired") from e