import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.services import user_service
from app.core.security import verify_password

def test_create_user_success(db_session: Session):
    data = UserCreate(email="unit@example.com", full_name="Unit Test", password="unitpass")
    result = user_service.create_user(db_session, data)
    # The result should be a UserRead model with correct data
    assert result.email == "unit@example.com"
    assert result.full_name == "Unit Test"
    assert hasattr(result, "id")
    # The user should be persisted in the database with hashed password
    user = db_session.query(User).filter_by(email="unit@example.com").first()
    assert user is not None
    assert verify_password("unitpass", user.hashed_password)

def test_create_user_duplicate_email(db_session: Session):
    # Create initial user
    user = User(email="dupunit@example.com", full_name="Dup Unit", hashed_password="hash")
    db_session.add(user)
    db_session.commit()
    data = UserCreate(email="dupunit@example.com", full_name="Dup Unit 2", password="pass123")
    with pytest.raises(HTTPException) as excinfo:
        user_service.create_user(db_session, data)
    assert excinfo.value.status_code == 400

def test_get_user_success(db_session: Session):
    user = User(email="getunit@example.com", full_name="Get Unit", hashed_password="hash")
    db_session.add(user)
    db_session.commit()
    result = user_service.get_user(db_session, user.id)
    assert result.email == "getunit@example.com"
    assert result.full_name == "Get Unit"
    assert result.id == user.id

def test_get_user_not_found(db_session: Session):
    with pytest.raises(HTTPException) as excinfo:
        user_service.get_user(db_session, 999)
    assert excinfo.value.status_code == 404

def test_list_users_empty(db_session: Session):
    result = user_service.list_users(db_session)
    assert result == []

def test_list_users_multiple(db_session: Session):
    u1 = User(email="listunit1@example.com", full_name="List Unit1", hashed_password="h1")
    u2 = User(email="listunit2@example.com", full_name="List Unit2", hashed_password="h2")
    db_session.add_all([u1, u2])
    db_session.commit()
    result = user_service.list_users(db_session)
    # result should contain all users in the DB
    emails = [u.email for u in db_session.query(User).all()]
    assert len(result) == len(emails)
    for user_read in result:
        assert user_read.email in emails

def test_update_user_success(db_session: Session):
    user = User(email="updunit@example.com", full_name="Before Update", hashed_password="hash")
    db_session.add(user)
    db_session.commit()
    data = UserUpdate(full_name="After Update")
    result = user_service.update_user(db_session, user.id, data)
    assert result.full_name == "After Update"
    # Database should reflect the change
    updated = db_session.get(User, user.id)
    assert updated.full_name == "After Update"

def test_update_user_not_found(db_session: Session):
    data = UserUpdate(full_name="No User")
    with pytest.raises(HTTPException) as excinfo:
        user_service.update_user(db_session, 12345, data)
    assert excinfo.value.status_code == 404

def test_delete_user_success(db_session: Session):
    user = User(email="delunit@example.com", full_name="Del Unit", hashed_password="hash")
    db_session.add(user)
    db_session.commit()
    user_service.delete_user(db_session, user.id)
    # After deletion, querying should return None
    gone = db_session.get(User, user.id)
    assert gone is None

def test_delete_user_not_found(db_session: Session):
    with pytest.raises(HTTPException) as excinfo:
        user_service.delete_user(db_session, 54321)
    assert excinfo.value.status_code == 404
