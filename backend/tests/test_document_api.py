from contextlib import contextmanager
from unittest.mock import MagicMock, patch
from uuid import uuid4
import pytest
from fastapi.testclient import TestClient
from main import app
from app.core.security import create_access_token

client = TestClient(app)

def create_mock_token(role: str = "user") -> str:
    user_id = str(uuid4())
    return create_access_token({"sub": user_id, "email": f"{role}@financeai.com", "role": role})

def test_list_documents_unauthorized():
    """Verify listing documents requires authentication."""
    response = client.get("/api/v1/documents")
    assert response.status_code == 401

def test_list_documents_authorized():
    """Verify authenticated user can list indexed documents."""
    token = create_mock_token("user")
    mock_cursor = MagicMock()
    # First fetchone is auth check, second fetchone is document count
    mock_cursor.fetchone.side_effect = [
        {
            "id": uuid4(),
            "email": "user@financeai.com",
            "full_name": "Normal User",
            "role": "user",
            "is_active": True
        },
        {"count": 1}
    ]
    mock_cursor.fetchall.return_value = [
        {
            "id": uuid4(),
            "title": "RBI Master Direction on KYC",
            "original_filename": "rbi_kyc_2026.pdf",
            "category": "Banking",
            "file_size_bytes": 1048576,
            "processing_status": "INDEXED",
            "error_message": None,
            "total_pages": 42,
            "total_chunks": 180,
            "created_at": "2026-11-08T22:00:00Z"
        }
    ]

    @contextmanager
    def mock_get_db_cursor():
        yield mock_cursor

    with patch("app.core.dependencies.get_db_cursor", mock_get_db_cursor):
        with patch("app.api.v1.documents.get_db_cursor", mock_get_db_cursor):
            headers = {"Authorization": f"Bearer {token}"}
            response = client.get("/api/v1/documents", headers=headers)
            assert response.status_code == 200
            data = response.json()
            assert data["total"] == 1
            assert len(data["items"]) == 1
            assert data["items"][0]["title"] == "RBI Master Direction on KYC"

def test_upload_document_forbidden_for_regular_user():
    """Verify regular non-admin users cannot upload documents."""
    user_token = create_mock_token("user")
    mock_cursor = MagicMock()
    mock_cursor.fetchone.return_value = {
        "id": uuid4(),
        "email": "user@financeai.com",
        "full_name": "Normal User",
        "role": "user",
        "is_active": True
    }

    @contextmanager
    def mock_get_db_cursor():
        yield mock_cursor

    with patch("app.core.dependencies.get_db_cursor", mock_get_db_cursor):
        headers = {"Authorization": f"Bearer {user_token}"}
        files = {"file": ("test.pdf", b"%PDF-1.4 sample", "application/pdf")}
        data = {"title": "Test Circular", "category": "Banking"}
        response = client.post("/api/v1/documents/upload", headers=headers, files=files, data=data)
        assert response.status_code == 403
        assert "administrator privileges required" in response.json()["detail"].lower()

def test_upload_document_invalid_category():
    """Verify upload fails when an invalid category is provided."""
    admin_token = create_mock_token("admin")
    mock_cursor = MagicMock()
    mock_cursor.fetchone.return_value = {
        "id": uuid4(),
        "email": "admin@financeai.com",
        "full_name": "Admin User",
        "role": "admin",
        "is_active": True
    }

    @contextmanager
    def mock_get_db_cursor():
        yield mock_cursor

    with patch("app.core.dependencies.get_db_cursor", mock_get_db_cursor):
        headers = {"Authorization": f"Bearer {admin_token}"}
        files = {"file": ("test.pdf", b"%PDF-1.4 sample", "application/pdf")}
        data = {"title": "Test Circular", "category": "UnsupportedCategory"}
        response = client.post("/api/v1/documents/upload", headers=headers, files=files, data=data)
        assert response.status_code == 400
        assert "invalid category" in response.json()["detail"].lower()

def test_upload_document_invalid_extension():
    """Verify upload fails when a non-PDF file is submitted."""
    admin_token = create_mock_token("admin")
    mock_cursor = MagicMock()
    mock_cursor.fetchone.return_value = {
        "id": uuid4(),
        "email": "admin@financeai.com",
        "full_name": "Admin User",
        "role": "admin",
        "is_active": True
    }

    @contextmanager
    def mock_get_db_cursor():
        yield mock_cursor

    with patch("app.core.dependencies.get_db_cursor", mock_get_db_cursor):
        headers = {"Authorization": f"Bearer {admin_token}"}
        files = {"file": ("report.docx", b"Word document binary bytes", "application/octet-stream")}
        data = {"title": "Word Document", "category": "General"}
        response = client.post("/api/v1/documents/upload", headers=headers, files=files, data=data)
        assert response.status_code == 400
        assert "invalid file extension" in response.json()["detail"].lower()

def test_get_document_by_id_not_found():
    """Verify requesting a nonexistent document returns 404."""
    user_token = create_mock_token("user")
    mock_cursor = MagicMock()
    # First fetchone is user check, second is doc check returning None
    mock_cursor.fetchone.side_effect = [
        {"id": uuid4(), "email": "user@financeai.com", "role": "user", "is_active": True},
        None
    ]

    @contextmanager
    def mock_get_db_cursor():
        yield mock_cursor

    with patch("app.core.dependencies.get_db_cursor", mock_get_db_cursor):
        with patch("app.api.v1.documents.get_db_cursor", mock_get_db_cursor):
            headers = {"Authorization": f"Bearer {user_token}"}
            random_id = uuid4()
            response = client.get(f"/api/v1/documents/{random_id}", headers=headers)
            assert response.status_code == 404
            assert "not found" in response.json()["detail"].lower()
