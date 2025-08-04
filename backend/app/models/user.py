from sqlalchemy import Boolean
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import Text
from typing import Literal
from app.db.database import Base

Status = Literal["pending", "accepted", "completed", "cancelled"]

class User(Base):
    __tablename__ = "users"

    id:              Mapped[int]    = mapped_column(primary_key=True)
    email:           Mapped[str]    = mapped_column(Text, unique=True, index=True)
    full_name:       Mapped[str]    = mapped_column(Text)
    hashed_password: Mapped[str]    = mapped_column(Text, name="password_hash")
    is_approved:     Mapped[bool]   = mapped_column(Boolean, default=False)
    role:            Mapped[Status] = mapped_column(Text, default="pending")
