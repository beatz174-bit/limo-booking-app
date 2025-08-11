from fastapi import HTTPException, status
from app.services.auth_service import authenticate_user
from app.schemas.auth import LoginRequest
from app.models.user import User

def test_login_success(db_session):
    # Arrange
    user = User(email="user@example.com", full_name="Test User",
                password_hash="$2b$12$...bcrypt-hash...",  # pre-hashed
                role="rider", is_approved=True)
    db_session.add(user)
    db_session.refresh()

    login_req = LoginRequest(email="user@example.com", password="correct")  
    # Act
    token_response = authenticate_user(db_session, login_req)

    # Assert
    assert token_response.email == "user@example.com"
    assert token_response.role == "rider"
    assert token_response.token.startswith("eyJ")  # JWT
    assert token_response.id == user.id

def test_login_unapproved_user(db_session):
    user = User(email="unapproved@example.com", full_name="No Access",
                password_hash="$2b$12$...", role="driver", is_approved=False)
    db_session.add(user); db_session.commit()
    login_req = LoginRequest(email="unapproved@example.com", password="correct")
    with pytest.raises(HTTPException) as exc:
        authenticate_user(db_session, login_req)
    assert exc.value.status_code == status.HTTP_403_FORBIDDEN

