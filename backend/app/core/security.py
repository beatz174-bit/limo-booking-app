# app/core/security.py
from datetime import datetime, timedelta, timezone
from typing import Dict, Any
from jose import jwt, JWTError, ExpiredSignatureError
from passlib.context import CryptContext
from app.core.config import get_settings  # contains SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

settings = get_settings()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_jwt_token(user_id: int) -> str:
    to_encode: Dict[str, Any] = {"sub": str(user_id)}
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def decode_token(token: str):
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        return payload
    except (JWTError, ExpiredSignatureError) as e:
        raise ValueError("Token is invalid or expired") from e