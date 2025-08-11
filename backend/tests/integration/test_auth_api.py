def test_login_endpoint_success(client, db_session):
    # Prepare user in test DB
    from app.models.user import User
    from app.core.security import pwd_context
    hashed = pwd_context.hash("secret")
    u = User(email="inttest@example.com", full_name="Int Test",
             hashed_password=hashed)
    db_session.add(u)
    db_session.commit()

    resp = client.post("/auth/login", json={
        "email": "inttest@example.com",
        "password": "secret"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "token" in data
    assert data["role"] == "driver"
