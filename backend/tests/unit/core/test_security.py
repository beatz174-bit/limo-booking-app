import uuid

from app.core.security import (
    create_jwt_token,
    decode_token,
    hash_password,
    verify_password,
)


def test_hash_and_verify_password():
    plain = "mysecret"
    hashed = hash_password(plain)
    # The hashed password should not equal the plain password
    assert plain != hashed
    # It should verify correctly
    assert verify_password(plain, hashed) is True
    # Wrong password should not verify
    assert verify_password("notsecret", hashed) is False


def test_create_and_decode_jwt_token():
    user_id = uuid.uuid4()
    token = create_jwt_token(user_id)
    assert token.count(".") == 2
    payload = decode_token(token)
    sub = payload.get("sub")
    assert isinstance(sub, str), "JWT payload missing or invalid 'sub'"
    assert uuid.UUID(sub) == user_id


def test_decode_token_invalid():
    # Create a valid token and then tamper with it to invalidate
    token = create_jwt_token(uuid.uuid4())
    # Flip the last character to break the signature
    invalid_token = token[:-1] + ("A" if token[-1] != "A" else "B")
    # Decoding an invalid token should raise a ValueError
    try:
        decode_token(invalid_token)
        assert False, "Expected ValueError for invalid token"
    except ValueError as e:
        assert "invalid or expired" in str(e).lower()
