# routes/users.py
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..database import get_db
from ..models import User, AdminConfig
from ..security import decode_token, hash_password

router = APIRouter(prefix="/users", tags=["users"])

# Utility: fetch current user

def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid auth header")

    token = auth.split()[1]
    try:
        payload = decode_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user

# Get own profile
@router.get("/me")
def get_profile(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "is_approved": current_user.is_approved,
    }

# Admin-only settings management
class AdminSettings(BaseModel):
    allow_public_registration: bool
    google_maps_api_key: str
    flagfall: float
    per_km_rate: float
    per_min_rate: float

@router.get("/admin/settings")
def get_admin_settings(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "driver":
        raise HTTPException(status_code=403, detail="Admin only")
    settings = db.query(AdminConfig).first()
    if not settings:
        settings = AdminConfig()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

@router.post("/admin/settings")
def update_admin_settings(new_settings: AdminSettings, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "driver":
        raise HTTPException(status_code=403, detail="Admin only")
    settings = db.query(AdminConfig).first()
    if not settings:
        settings = AdminConfig(**new_settings.dict())
        db.add(settings)
    else:
        for field, value in new_settings.dict().items():
            setattr(settings, field, value)
    db.commit()
    db.refresh(settings)
    return {"message": "Settings updated", "settings": settings}

# Initial setup route for first-time configuration
class SetupRequest(BaseModel):
    admin_email: str
    admin_password: str
    full_name: str
    settings: AdminSettings

@router.post("/setup")
def setup_app(data: SetupRequest, db: Session = Depends(get_db)):
    existing_driver = db.query(User).filter(User.role == "driver").first()
    if existing_driver:
        raise HTTPException(status_code=400, detail="Driver already exists")

    driver = User(
        email=data.admin_email,
        full_name=data.full_name,
        password_hash=hash_password(data.admin_password),
        role="driver",
        is_approved=True,
    )
    db.add(driver)

    config = AdminConfig(**data.settings.dict())
    db.add(config)

    db.commit()
    return {"message": "Setup complete. Admin account and settings saved."}
