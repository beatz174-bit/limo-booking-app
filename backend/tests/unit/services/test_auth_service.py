import pytest
from app.core.security import hash_password, verify_password
from app.models.user_v2 import User
from app.schemas.auth import LoginRequest, RegisterRequest
from app.services import auth_service
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_authenticate_user_success(async_session: AsyncSession):
    # Create a user in the async test database
    password = "SecretPwd"
    user = User(
        email="async@example.com",
        full_name="Async User",
        hashed_password=hash_password(password),
    )
    async_session.add(user)
    await async_session.commit()
    # Attempt to authenticate with correct credentials
    login_req = LoginRequest(email="async@example.com", password=password)
    result = await auth_service.authenticate_user(async_session, login_req)
    # Should return a LoginResponse with correct user info
    assert result.email == "async@example.com"
    assert result.full_name == "Async User"
    assert hasattr(result, "token")
    assert result.id == user.id
    # The token should look like a JWT
    assert isinstance(result.token, str) and result.token.count(".") == 2


@pytest.mark.asyncio
async def test_authenticate_user_wrong_password(async_session: AsyncSession):
    # Create a user with known password
    user = User(
        email="wrongpass@async.com",
        full_name="Wrong Pass",
        hashed_password=hash_password("correctPW"),
    )
    async_session.add(user)
    await async_session.commit()
    login_req = LoginRequest(email="wrongpass@async.com", password="wrongPW")
    with pytest.raises(HTTPException) as excinfo:
        await auth_service.authenticate_user(async_session, login_req)
    assert excinfo.value.status_code == 401


@pytest.mark.asyncio
async def test_authenticate_user_not_found(async_session: AsyncSession):
    login_req = LoginRequest(email="nosuch@async.com", password="irrelevant")
    with pytest.raises(HTTPException) as excinfo:
        await auth_service.authenticate_user(async_session, login_req)
    assert excinfo.value.status_code == 401


@pytest.mark.asyncio
async def test_register_user_success(async_session: AsyncSession):
    register_req = RegisterRequest(
        email="new@async.com",
        full_name="New Async",
        password="newpass",
    )
    result = await auth_service.register_user(async_session, register_req)
    # Should return a UserRead schema for the new user
    assert result.email == "new@async.com"
    assert result.full_name == "New Async"
    assert hasattr(result, "id")
    # The new user should be persisted in the database
    new_user = (
        (
            await async_session.execute(
                select(User).filter(User.email == "new@async.com")
            )
        )
        .scalars()
        .first()
    )
    assert new_user is not None
    # Password should be stored hashed
    assert verify_password("newpass", new_user.hashed_password)


@pytest.mark.asyncio
async def test_register_user_duplicate_email(async_session: AsyncSession):
    # Create a user first
    user = User(
        email="dup@async.com",
        full_name="Dup Async",
        hashed_password=hash_password("somepass"),
    )
    async_session.add(user)
    await async_session.commit()
    register_req = RegisterRequest(
        email="dup@async.com", full_name="Dup Async2", password="otherpass"
    )
    with pytest.raises(HTTPException) as excinfo:
        await auth_service.register_user(async_session, register_req)
    assert excinfo.value.status_code == 400
