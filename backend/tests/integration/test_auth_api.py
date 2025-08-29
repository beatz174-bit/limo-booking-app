import pytest
from app.core.security import decode_token, hash_password
from app.models.user_v2 import User
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, async_session: AsyncSession):
    raw_password = "secret123"
    hashed_pwd = hash_password(raw_password)

    user = User(
        email="login@example.com", full_name="Login User", hashed_password=hashed_pwd
    )
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)

    resp = await client.post(
        "/auth/login", json={"email": "login@example.com", "password": raw_password}
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()

    assert "token" in data
    assert data["email"] == "login@example.com"
    assert data["full_name"] == "Login User"
    assert data["id"] == str(user.id)

    payload = decode_token(data["token"])
    assert payload.get("sub") == str(user.id)


@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient, async_session: AsyncSession):
    # Prepare a user with known password
    hashed_pwd = hash_password("correctpass")
    user = User(
        email="wrongpass@example.com",
        full_name="Wrong Pass",
        hashed_password=hashed_pwd,
    )
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)

    # Attempt to login with incorrect password
    response = await client.post(
        "/auth/login", json={"email": "wrongpass@example.com", "password": "incorrect"}
    )
    assert response.status_code == 401
    data = response.json()
    assert data["detail"] == "Invalid credentials"


@pytest.mark.asyncio
async def test_login_user_not_found(client: AsyncClient):
    # No user is created for this email
    response = await client.post(
        "/auth/login", json={"email": "nouser@example.com", "password": "irrelevant"}
    )
    assert response.status_code == 401
    data = response.json()
    assert data["detail"] == "Invalid credentials"


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient, async_session: AsyncSession):
    # Register a new user
    new_user = {
        "email": "newuser@example.com",
        "full_name": "New User",
        "password": "newpass123",
    }
    response = await client.post("/auth/register", json=new_user)
    assert response.status_code == 200

    # Verify what actually got persisted and that the hash matches
    from app.core.security import verify_password
    from app.models.user_v2 import User
    from sqlalchemy import select

    row = (
        (
            await async_session.execute(
                select(User).where(User.email == new_user["email"])
            )
        )
        .scalars()
        .first()
    )
    assert row is not None, "User not in DB after register()"

    # If your model uses row.password_hash / row.hashed_password adjust the attr accordingly
    stored_hash = getattr(row, "password_hash", None) or getattr(
        row, "hashed_password", None
    )
    assert stored_hash, "No password hash stored on user row"
    assert verify_password(
        new_user["password"], stored_hash
    ), "Stored password hash does not verify"
    data = response.json()
    # Should return the created user's data
    assert data["email"] == "newuser@example.com"
    assert data["full_name"] == "New User"
    assert "id" in data
    # Verify the user was saved by attempting to log in
    login_resp = await client.post(
        "/auth/login",
        json={"email": new_user["email"], "password": new_user["password"]},
    )
    assert login_resp.status_code == 200


@pytest.mark.asyncio
async def test_register_duplicate_email(
    client: AsyncClient, async_session: AsyncSession
):
    # Create an initial user directly
    hashed_pwd = hash_password("somepass")
    user = User(
        email="dup@example.com", full_name="Dup User", hashed_password=hashed_pwd
    )
    async_session.add(user)
    await async_session.commit()

    # Try to register a new user with the same email
    payload = {
        "email": "dup@example.com",
        "full_name": "Duplicate User",
        "password": "otherpass",
    }
    response = await client.post("/auth/register", json=payload)
    assert response.status_code == 400
    data = response.json()
    # Expect an error about email already registered
    assert data["detail"] == "Email already registered"
