from contextlib import contextmanager
from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient
from main import app
from app.core.security import hash_password, create_access_token

client = TestClient(app)

def test_root_endpoint():
    """Verify that the root endpoint returns correct application metadata."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["app"] == "FinanceAI"
    assert data["status"] == "online"
    assert "documentation" in data

def test_health_endpoint():
    """Verify health check endpoint returns proper schema."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "database_connected" in data

def test_user_registration_duplicate_email():
    """Verify that registering with an existing email returns 409 Conflict."""
    mock_cursor = MagicMock()
    mock_cursor.fetchone.return_value = {"id": "existing-uuid"}

    @contextmanager
    def mock_get_db_cursor():
        yield mock_cursor

    with patch("app.api.v1.auth.get_db_cursor", mock_get_db_cursor):
        payload = {
            "full_name": "Duplicate User",
            "email": "duplicate@financeai.com",
            "password": "ValidPassword#2026"
        }
        response = client.post("/api/v1/auth/register", json=payload)
        assert response.status_code == 409
        assert "already exists" in response.json()["detail"]

def test_user_registration_success():
    """Verify successful user registration flow."""
    mock_cursor = MagicMock()
    mock_cursor.fetchone.side_effect = [
        None,
        {
            "id": "11111111-1111-1111-1111-111111111111",
            "email": "newuser@financeai.com",
            "full_name": "New User",
            "role": "user",
            "is_active": True,
            "created_at": "2026-11-08T22:00:00Z"
        }
    ]

    @contextmanager
    def mock_get_db_cursor():
        yield mock_cursor

    with patch("app.api.v1.auth.get_db_cursor", mock_get_db_cursor):
        payload = {
            "full_name": "New User",
            "email": "newuser@financeai.com",
            "password": "ValidPassword#2026"
        }
        response = client.post("/api/v1/auth/register", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "newuser@financeai.com"
        assert data["role"] == "user"

def test_user_login_invalid_password():
    """Verify that invalid password returns 401 Unauthorized."""
    mock_cursor = MagicMock()
    mock_cursor.fetchone.return_value = {
        "id": "11111111-1111-1111-1111-111111111111",
        "email": "user@financeai.com",
        "full_name": "Existing User",
        "password_hash": hash_password("CorrectPassword#123"),
        "role": "user",
        "is_active": True,
        "created_at": "2026-11-08T22:00:00Z"
    }

    @contextmanager
    def mock_get_db_cursor():
        yield mock_cursor

    with patch("app.api.v1.auth.get_db_cursor", mock_get_db_cursor):
        payload = {
            "email": "user@financeai.com",
            "password": "WrongPassword#123"
        }
        response = client.post("/api/v1/auth/login", json=payload)
        assert response.status_code == 401
        assert "Invalid email or password" in response.json()["detail"]

def test_user_login_success():
    """Verify successful login returns valid JWT token."""
    plain_password = "CorrectPassword#123"
    mock_cursor = MagicMock()
    mock_cursor.fetchone.return_value = {
        "id": "11111111-1111-1111-1111-111111111111",
        "email": "user@financeai.com",
        "full_name": "Existing User",
        "password_hash": hash_password(plain_password),
        "role": "user",
        "is_active": True,
        "created_at": "2026-11-08T22:00:00Z"
    }

    @contextmanager
    def mock_get_db_cursor():
        yield mock_cursor

    with patch("app.api.v1.auth.get_db_cursor", mock_get_db_cursor):
        payload = {
            "email": "user@financeai.com",
            "password": plain_password
        }
        response = client.post("/api/v1/auth/login", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "user@financeai.com"

def test_get_me_unauthorized_without_token():
    """Verify that /me returns 401 without Bearer token."""
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401

def test_get_me_with_valid_token():
    """Verify that /me returns user profile when valid token provided."""
    user_id = "11111111-1111-1111-1111-111111111111"
    token = create_access_token({"sub": user_id, "email": "user@financeai.com", "role": "user"})

    mock_cursor = MagicMock()
    mock_cursor.fetchone.return_value = {
        "id": user_id,
        "email": "user@financeai.com",
        "full_name": "Rohan Sharma",
        "role": "user",
        "is_active": True,
        "created_at": "2026-11-08T22:00:00Z"
    }

    @contextmanager
    def mock_get_db_cursor():
        yield mock_cursor

    with patch("app.core.dependencies.get_db_cursor", mock_get_db_cursor):
        headers = {"Authorization": f"Bearer {token}"}
        response = client.get("/api/v1/auth/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "user@financeai.com"
        assert data["role"] == "user"

def test_get_me_inactive_user_forbidden():
    """Verify that inactive user receives 403 Forbidden."""
    user_id = "22222222-2222-2222-2222-222222222222"
    token = create_access_token({"sub": user_id, "email": "inactive@financeai.com", "role": "user"})

    mock_cursor = MagicMock()
    mock_cursor.fetchone.return_value = {
        "id": user_id,
        "email": "inactive@financeai.com",
        "full_name": "Inactive User",
        "role": "user",
        "is_active": False,
        "created_at": "2026-11-08T22:00:00Z"
    }

    @contextmanager
    def mock_get_db_cursor():
        yield mock_cursor

    with patch("app.core.dependencies.get_db_cursor", mock_get_db_cursor):
        headers = {"Authorization": f"Bearer {token}"}
        response = client.get("/api/v1/auth/me", headers=headers)
        assert response.status_code == 403
        assert "inactive" in response.json()["detail"].lower()

def test_logout_endpoint():
    """Verify logout returns success message."""
    user_id = "11111111-1111-1111-1111-111111111111"
    token = create_access_token({"sub": user_id, "email": "user@financeai.com", "role": "user"})

    mock_cursor = MagicMock()
    mock_cursor.fetchone.return_value = {
        "id": user_id,
        "email": "user@financeai.com",
        "full_name": "Rohan Sharma",
        "role": "user",
        "is_active": True,
        "created_at": "2026-11-08T22:00:00Z"
    }

    @contextmanager
    def mock_get_db_cursor():
        yield mock_cursor

    with patch("app.core.dependencies.get_db_cursor", mock_get_db_cursor):
        headers = {"Authorization": f"Bearer {token}"}
        response = client.post("/api/v1/auth/logout", headers=headers)
        assert response.status_code == 200
        assert "logged out" in response.json()["message"].lower()
