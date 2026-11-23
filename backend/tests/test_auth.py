import pytest
from datetime import timedelta
from pydantic import ValidationError
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token
from app.models.auth import UserRegisterRequest, UserLoginRequest

def test_password_hashing():
    """Verify that bcrypt hashes correctly and matches during verification."""
    password = "FinanceSecurePassword#2026"
    hashed = hash_password(password)

    assert hashed != password
    assert hashed.startswith("$2b$") or hashed.startswith("$2a$")
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword123!", hashed) is False

def test_jwt_token_generation_and_decode():
    """Verify that JWT tokens are generated, signed, and decoded correctly."""
    user_payload = {
        "sub": "12345678-1234-5678-1234-567812345678",
        "email": "analyst@financeai.com",
        "role": "user"
    }
    token = create_access_token(user_payload, expires_delta=timedelta(minutes=15))
    assert isinstance(token, str)
    assert len(token) > 20

    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded["sub"] == user_payload["sub"]
    assert decoded["email"] == user_payload["email"]
    assert decoded["role"] == user_payload["role"]
    assert "exp" in decoded

def test_jwt_expired_token_rejected():
    """Verify that expired JWT tokens return None on decode."""
    user_payload = {"sub": "test-user-id", "email": "expired@example.com", "role": "user"}
    # Token that expired 5 minutes ago
    token = create_access_token(user_payload, expires_delta=timedelta(minutes=-5))
    decoded = decode_access_token(token)
    assert decoded is None

def test_user_registration_model_validation():
    """Verify validation rules on registration input."""
    # 1. Valid registration data
    valid_data = {
        "full_name": "Rohan Sharma",
        "email": "rohan.sharma@example.com",
        "password": "StrongPassword#2026"
    }
    req = UserRegisterRequest(**valid_data)
    assert req.full_name == "Rohan Sharma"
    assert req.email == "rohan.sharma@example.com"

    # 2. Invalid email format
    with pytest.raises(ValidationError):
        UserRegisterRequest(
            full_name="Invalid Email User",
            email="not-a-valid-email",
            password="StrongPassword#2026"
        )

    # 3. Short password (< 8 chars)
    with pytest.raises(ValidationError):
        UserRegisterRequest(
            full_name="Short Pwd User",
            email="short@example.com",
            password="short"
        )

    # 4. Weak password (no number or special character)
    with pytest.raises(ValidationError):
        UserRegisterRequest(
            full_name="Weak Pwd User",
            email="weak@example.com",
            password="onlylettersalltheway"
        )

    # 5. Blank full name
    with pytest.raises(ValidationError):
        UserRegisterRequest(
            full_name="   ",
            email="blank@example.com",
            password="StrongPassword#2026"
        )

def test_user_registration_with_extended_demographics():
    """Verify registration request with gender, mobile number, and date of birth."""
    data = {
        "full_name": "Rohan Sharma",
        "email": "rohan.sharma@example.com",
        "password": "StrongPassword#2026",
        "gender": "Male",
        "mobile_number": "+91 9876543210",
        "date_of_birth": "2000-01-15"
    }
    req = UserRegisterRequest(**data)
    assert req.gender == "Male"
    assert req.mobile_number == "+91 9876543210"
    assert req.date_of_birth == "2000-01-15"

def test_user_login_model_validation():
    """Verify validation rules on login input."""
    valid_login = {
        "email": "user@financeai.com",
        "password": "AnyPassword123!"
    }
    req = UserLoginRequest(**valid_login)
    assert req.email == "user@financeai.com"

    with pytest.raises(ValidationError):
        UserLoginRequest(email="invalid-email", password="Password123")
