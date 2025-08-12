import pytest
from app.models.user import User
from app.core.security import create_jwt_token, hash_password
from sqlalchemy import select
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any, Dict, List, cast

@pytest.mark.asyncio
async def test_create_user_success(client: AsyncClient):
    # Create a new user via the public endpoint (no auth required)
    payload = {"email": "testcreate@example.com", "full_name": "Test Create", "password": "createpass"}
    response = await client.post("/users", json=payload)
    assert response.status_code == 201
    data = response.json()
    # The response should contain the created user's data
    assert data["email"] == "testcreate@example.com"
    assert data["full_name"] == "Test Create"
    assert "id" in data
    # The returned user should not include the password
    assert "password" not in data and "hashed_password" not in data

@pytest.mark.asyncio
async def test_create_user_duplicate_email(client: AsyncClient, async_session: AsyncSession):
    # Insert a user directly into the DB
    user = User(email="exists@example.com", full_name="Exists User", hashed_password=hash_password("pass"))
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)
    # Attempt to create another user with the same email
    payload = {"email": "exists@example.com", "full_name": "Exists User 2", "password": "pass123"}
    response = await client.post("/users", json=payload)
    assert response.status_code == 400
    data = response.json()
    assert data["detail"] == "Email exists"

@pytest.mark.asyncio
async def test_list_users_unauthorized(client: AsyncClient):
    # Requesting the users list without a token should be unauthorized
    response = await client.get("/users")
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"

@pytest.mark.asyncio
async def test_list_users_success(client: AsyncClient, async_session: AsyncSession):
    # Prepare multiple users in the database
    user1 = User(email="list1@example.com", full_name="List One", hashed_password=hash_password("pass1"))
    user2 = User(email="list2@example.com", full_name="List Two", hashed_password=hash_password("pass2"))
    async_session.add_all([user1, user2])
    await async_session.commit()
    await async_session.refresh(user1)
    await async_session.refresh(user2)
    # Authenticate as one of the users
    token = create_jwt_token(user1.id)
    headers = {"Authorization": f"Bearer {token}"}
    response = await client.get("/users", headers=headers)
    assert response.status_code == 200
    users = cast(List[Dict[str, Any]],response.json())
    # Should return a list of users (at least the two created)
    assert isinstance(users, list)
    emails = [u["email"] for u in users]
    assert "list1@example.com" in emails and "list2@example.com" in emails
    # Response items should not include sensitive fields
    assert all("hashed_password" not in u for u in users)

@pytest.mark.asyncio
async def test_get_user_unauthorized(client: AsyncClient, async_session: AsyncSession):
    # Create a user but do not authenticate
    user = User(email="getme@example.com", full_name="Get Me", hashed_password=hash_password("getpass"))
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)
    url = f"/users/{user.id}"
    response = await client.get(url)
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_get_user_not_found(client: AsyncClient, async_session: AsyncSession):
    # Create and authenticate a user
    user = User(email="findme@example.com", full_name="Find Me", hashed_password=hash_password("findpass"))
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)
    token = create_jwt_token(user.id)
    headers = {"Authorization": f"Bearer {token}"}
    # Request a non-existent user ID
    response = await client.get("/users/999", headers=headers)
    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"

@pytest.mark.asyncio
async def test_get_user_success(client: AsyncClient, async_session: AsyncSession):
    # Create two users and authenticate as one
    user1 = User(email="owner@example.com", full_name="Owner User", hashed_password=hash_password("ownerpass"))
    user2 = User(email="target@example.com", full_name="Target User", hashed_password=hash_password("targetpass"))
    async_session.add_all([user1, user2])
    await async_session.commit()
    await async_session.refresh(user1)
    await async_session.refresh(user2)
    token = create_jwt_token(user1.id)
    headers = {"Authorization": f"Bearer {token}"}
    # Fetch the second user's data
    url = f"/users/{user2.id}"
    response = await client.get(url, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == user2.id
    assert data["email"] == "target@example.com"
    assert data["full_name"] == "Target User"
    # The response should not include sensitive info
    assert "hashed_password" not in data

@pytest.mark.asyncio
async def test_update_user_unauthorized(client: AsyncClient, async_session: AsyncSession):
    user = User(email="upd@example.com", full_name="To Update", hashed_password=hash_password("updpass"))
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)
    url = f"/users/{user.id}"
    response = await client.patch(url, json={"full_name": "Hacker Update"})
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_update_user_not_found(client: AsyncClient, async_session: AsyncSession):
    # Create and authenticate a user
    user = User(email="upder@example.com", full_name="Updater", hashed_password=hash_password("upd2pass"))
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)
    token = create_jwt_token(user.id)
    headers = {"Authorization": f"Bearer {token}"}
    # Attempt to update a non-existent user
    response = await client.patch("/users/999", json={"full_name": "Nobody"}, headers=headers)
    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"

@pytest.mark.asyncio
async def test_update_user_success(client: AsyncClient, async_session: AsyncSession):
    # Create a user and authenticate
    user = User(email="updme@example.com", full_name="Before Update", hashed_password=hash_password("updatepass"))
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)
    token = create_jwt_token(user.id)
    headers = {"Authorization": f"Bearer {token}"}
    # Update the user's full name
    url = f"/users/{user.id}"
    response = await client.patch(url, json={"full_name": "After Update"}, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == user.id
    assert data["full_name"] == "After Update"
    # Ensure change persisted in database
    updated = await async_session.get(User, user.id)
    await async_session.refresh(user)
    assert updated is not None
    assert updated.full_name == "After Update"

@pytest.mark.asyncio
async def test_delete_user_unauthorized(client: AsyncClient, async_session: AsyncSession):
    user = User(email="delme@example.com", full_name="Delete Me", hashed_password=hash_password("delpass"))
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)
    url = f"/users/{user.id}"
    response = await client.delete(url)
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_delete_user_not_found(client: AsyncClient, async_session: AsyncSession):
    # Create and authenticate a user
    user = User(email="deleter@example.com", full_name="Deleter", hashed_password=hash_password("delpass2"))
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)
    token = create_jwt_token(user.id)
    headers = {"Authorization": f"Bearer {token}"}
    # Attempt to delete a non-existent user ID
    response = await client.delete("/users/999", headers=headers)
    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"

@pytest.mark.asyncio
async def test_delete_user_success(client: AsyncClient, async_session: AsyncSession):
    # Create two users and authenticate as one
    user1 = User(email="delowner@example.com", full_name="Del Owner", hashed_password=hash_password("ownerpass"))
    user2 = User(email="deltarget@example.com", full_name="Del Target", hashed_password=hash_password("targetpass"))
    async_session.add_all([user1, user2])
    await async_session.commit()
    await async_session.refresh(user1)
    await async_session.refresh(user2)
    token = create_jwt_token(user1.id)
    headers = {"Authorization": f"Bearer {token}"}
    # Delete the second user
    url = f"/users/{user2.id}"
    response = await client.delete(url, headers=headers)
    assert response.status_code == 204
    # Verify the user is deleted
    # deleted = await async_session.get(User, user2.id)
    # assert deleted is None
    res = await async_session.execute(
        select(User).where(User.id == user2.id).execution_options(populate_existing=True)
    )
    assert res.scalar_one_or_none() is None
