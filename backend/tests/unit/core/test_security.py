from app.core.security import hash_password, verify_password, create_jwt_token, decode_token

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
    user_id = 42
    token = create_jwt_token(user_id)
    # Token should be a string with three parts (header.payload.signature)
    assert token.count(".") == 2
    # Decoding the token should yield the original user id in the payload
    payload = decode_token(token)
    assert int(payload.get("sub")) == user_id
    assert "exp" in payload

def test_decode_token_invalid():
    # Create a valid token and then tamper with it to invalidate
    token = create_jwt_token(99)
    # Flip the last character to break the signature
    invalid_token = token[:-1] + ("A" if token[-1] != "A" else "B")
    # Decoding an invalid token should raise a ValueError
    try:
        decode_token(invalid_token)
        assert False, "Expected ValueError for invalid token"
    except ValueError as e:
        assert "invalid or expired" in str(e).lower()
