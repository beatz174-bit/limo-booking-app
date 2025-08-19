"""Utilities for hashing passwords and issuing JWT tokens."""

from datetime import datetime, timedelta, timezone
from typing import Dict, Any
from jose import jwt, JWTError, ExpiredSignatureError
from passlib.context import CryptContext
from app.core.config import get_settings  # contains SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

settings = get_settings()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain: str, hashed: str) -> bool:
    """Check a plaintext password against its hashed value."""
    return pwd_context.verify(plain, hashed)

def create_jwt_token(user_id: int) -> str:
    """Generate a signed JWT for the given user id."""
    to_encode: Dict[str, Any] = {"sub": str(user_id)}
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)

def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return pwd_context.hash(password)

def decode_token(token: str):
    """Decode and validate a JWT, raising on failure."""
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        return payload
    except (JWTError, ExpiredSignatureError) as e:
        raise ValueError("Token is invalid or expired") from e