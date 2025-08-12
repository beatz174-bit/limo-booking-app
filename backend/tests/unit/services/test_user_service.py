import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.services import user_service
from app.core.security import verify_password
from sqlalchemy import select

async def test_create_user_success(async_session: AsyncSession):
    data = UserCreate(email="unit@example.com", full_name="Unit Test", password="unitpass")
    result = await user_service.create_user(async_session, data)
    # The result should be a UserRead model with correct data
    assert result.email == "unit@example.com"
    assert result.full_name == "Unit Test"
    assert hasattr(result, "id")
    # The user should be persisted in the database with hashed password
    # user = async_session.query(User).filter_by(email="unit@example.com").first()
    res = await async_session.execute(select(User).filter_by(email="unit@example.com"))
    user = res.scalar_one_or_none()
    assert user is not None
    assert verify_password("unitpass", user.hashed_password)

async def test_create_user_duplicate_email(async_session: AsyncSession):
    # Create initial user
    user = User(email="dupunit@example.com", full_name="Dup Unit", hashed_password="hash")
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)
    data = UserCreate(email="dupunit@example.com", full_name="Dup Unit 2", password="pass123")
    with pytest.raises(HTTPException) as excinfo:
        await user_service.create_user(async_session, data)
    assert excinfo.value.status_code == 400

async def test_get_user_success(async_session: AsyncSession):
    user = User(email="getunit@example.com", full_name="Get Unit", hashed_password="hash")
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)
    result = await user_service.get_user(async_session, user.id)
    assert result.email == "getunit@example.com"
    assert result.full_name == "Get Unit"
    assert result.id == user.id

async def test_get_user_not_found(async_session: AsyncSession):
    with pytest.raises(HTTPException) as excinfo:
        await user_service.get_user(async_session, 999)
    assert excinfo.value.status_code == 404

async def test_list_users_multiple(async_session: AsyncSession):
    u1 = User(email="listunit1@example.com", full_name="List Unit1", hashed_password="h1")
    u2 = User(email="listunit2@example.com", full_name="List Unit2", hashed_password="h2")
    async_session.add_all([u1, u2])
    await async_session.commit()
    await async_session.refresh(u1)
    await async_session.refresh(u2)
    result = await user_service.list_users(async_session)
    # result should contain all users in the DB
    emails = [u.email for u in result]
    assert len(result) == len(emails)
    for user_read in result:
        assert user_read.email in emails

async def test_update_user_success(async_session: AsyncSession):
    user = User(email="updunit@example.com", full_name="Before Update", hashed_password="hash")
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)
    data = UserUpdate(full_name="After Update")
    result = await user_service.update_user(async_session, user.id, data)
    assert result.full_name == "After Update"
    # Database should reflect the change
    updated = await async_session.get(User, user.id)
    assert updated is not None
    assert updated.full_name == "After Update"

async def test_update_user_not_found(async_session: AsyncSession):
    data = UserUpdate(full_name="No User")
    with pytest.raises(HTTPException) as excinfo:
        await user_service.update_user(async_session, 12345, data)
    assert excinfo.value.status_code == 404

async def test_delete_user_success(async_session: AsyncSession):
    user = User(email="delunit@example.com", full_name="Del Unit", hashed_password="hash")
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)
    await user_service.delete_user(async_session, user.id)
    # After deletion, querying should return None
    gone = await async_session.get(User, user.id)
    assert gone is None

async def test_delete_user_not_found(async_session: AsyncSession):
    with pytest.raises(HTTPException) as excinfo:
        await user_service.delete_user(async_session, 54321)
    assert excinfo.value.status_code == 404
