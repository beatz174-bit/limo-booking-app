# app/core/config.py
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    DATABASE_PATH: str = Field(default="../data/app.db")
    JWT_SECRET_KEY: str = Field(default=..., validation_alias="JWT_SECRET_KEY") # type: ignore[reportUnknownArgumentType]
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=60)
    ORS_API_KEY: str = Field(default=..., validation_alias="ORS_API_KEY") # type: ignore[reportUnknownArgumentType]
    ALGORITHM: str = Field(default="HS256")
    PROJECT_NAME: str = Field(default="Limo Booking App")
    PROJECT_VERSION: str = Field(default="0.1")
    ALLOW_ORIGINS: str = Field(default="http://localhost:3000")
    API_PREFIX: str = Field(default="")
    env: str = Field(default="development")
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_RECYCLE: int = 3600

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
