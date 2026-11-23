from contextlib import contextmanager
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch
from uuid import uuid4
import pytest
from fastapi.testclient import TestClient
from main import app
from app.core.security import create_access_token
from app.services.audit_service import log_audit_event

client = TestClient(app)

def create_mock_token(role: str = "user", user_id: str = None) -> str:
    uid = user_id or str(uuid4())
    return create_access_token({"sub": uid, "email": f"{role}@financeai.com", "role": role})

def test_admin_dashboard_stats_forbidden_for_user():
    """Verify regular user receives 403 Forbidden on admin dashboard."""
    user_token = create_mock_token(role="user")
    mock_cursor = MagicMock()
    mock_cursor.fetchone.return_value = {
        "id": uuid4(),
        "email": "user@financeai.com",
        "role": "user",
        "is_active": True
    }

    @contextmanager
    def mock_get_db_cursor():
        yield mock_cursor

    with patch("app.core.dependencies.get_db_cursor", mock_get_db_cursor):
        headers = {"Authorization": f"Bearer {user_token}"}
        response = client.get("/api/v1/admin/dashboard/stats", headers=headers)
        assert response.status_code == 403
        assert "administrator privileges required" in response.json()["detail"].lower()

def test_admin_dashboard_stats_success():
    """Verify admin receives aggregated metrics."""
    admin_id = str(uuid4())
    admin_token = create_mock_token(role="admin", user_id=admin_id)

    mock_cursor = MagicMock()
    # auth check, then 9 metric queries
    mock_cursor.fetchone.side_effect = [
        {"id": admin_id, "email": "admin@financeai.com", "role": "admin", "is_active": True},
        {"count": 25},   # total_users
        {"count": 8},    # total_documents
        {"count": 7},    # total_indexed_documents
        {"count": 142},  # total_chunks
        {"count": 30},   # total_conversations
        {"count": 95},   # total_queries
        {"count": 80},   # doc_queries
        {"count": 15},   # web_queries
        {"count": 12},   # pos_feedback
        {"count": 2}     # neg_feedback
    ]

    @contextmanager
    def mock_get_db_cursor():
        yield mock_cursor

    with patch("app.core.dependencies.get_db_cursor", mock_get_db_cursor):
        with patch("app.api.v1.admin.get_db_cursor", mock_get_db_cursor):
            with patch("app.api.v1.admin.faiss_manager.get_total_vectors", return_value=142):
                headers = {"Authorization": f"Bearer {admin_token}"}
                response = client.get("/api/v1/admin/dashboard/stats", headers=headers)
                assert response.status_code == 200
                data = response.json()
                assert data["total_users"] == 25
                assert data["total_documents"] == 8
                assert data["total_chunks"] == 142
                assert data["total_vectors_in_memory"] == 142
                assert data["document_grounded_queries"] == 80
                assert data["web_fallback_queries"] == 15
                assert data["web_fallback_rate_pct"] == 15.79
                assert data["user_satisfaction_rate_pct"] == 85.71

def test_admin_list_users():
    """Verify admin can list user accounts with pagination."""
    admin_id = str(uuid4())
    admin_token = create_mock_token(role="admin", user_id=admin_id)
    target_user_id = uuid4()
    now = datetime.now(timezone.utc)

    mock_cursor = MagicMock()
    mock_cursor.fetchone.side_effect = [
        # auth check
        {"id": admin_id, "email": "admin@financeai.com", "role": "admin", "is_active": True},
        # total count
        {"count": 1}
    ]
    mock_cursor.fetchall.return_value = [
        {
            "id": target_user_id,
            "email": "analyst@financeai.com",
            "full_name": "Senior Analyst",
            "role": "user",
            "is_active": True,
            "created_at": now,
            "session_count": 5
        }
    ]

    @contextmanager
    def mock_get_db_cursor():
        yield mock_cursor

    with patch("app.core.dependencies.get_db_cursor", mock_get_db_cursor):
        with patch("app.api.v1.admin.get_db_cursor", mock_get_db_cursor):
            headers = {"Authorization": f"Bearer {admin_token}"}
            response = client.get("/api/v1/admin/users", headers=headers)
            assert response.status_code == 200
            data = response.json()
            assert data["total"] == 1
            assert len(data["items"]) == 1
            assert data["items"][0]["email"] == "analyst@financeai.com"
            assert data["items"][0]["session_count"] == 5

def test_admin_deactivate_self_forbidden():
    """Verify admin cannot deactivate their own account."""
    admin_id = str(uuid4())
    admin_token = create_mock_token(role="admin", user_id=admin_id)

    mock_cursor = MagicMock()
    mock_cursor.fetchone.return_value = {
        "id": admin_id,
        "email": "admin@financeai.com",
        "role": "admin",
        "is_active": True
    }

    @contextmanager
    def mock_get_db_cursor():
        yield mock_cursor

    with patch("app.core.dependencies.get_db_cursor", mock_get_db_cursor):
        headers = {"Authorization": f"Bearer {admin_token}"}
        # Attempt to deactivate oneself
        response = client.patch(
            f"/api/v1/admin/users/{admin_id}/status",
            headers=headers,
            json={"is_active": False}
        )
        assert response.status_code == 400
        assert "cannot deactivate their own account" in response.json()["detail"].lower()

def test_admin_update_user_status_success():
    """Verify admin can activate or deactivate another user account."""
    admin_id = str(uuid4())
    admin_token = create_mock_token(role="admin", user_id=admin_id)
    target_user_id = uuid4()

    mock_cursor = MagicMock()
    mock_cursor.fetchone.side_effect = [
        # auth check
        {"id": admin_id, "email": "admin@financeai.com", "role": "admin", "is_active": True},
        # update user
        {"id": target_user_id, "email": "user@financeai.com", "full_name": "Test User", "is_active": False}
    ]

    @contextmanager
    def mock_get_db_cursor():
        yield mock_cursor

    with patch("app.core.dependencies.get_db_cursor", mock_get_db_cursor):
        with patch("app.api.v1.admin.get_db_cursor", mock_get_db_cursor):
            with patch("app.api.v1.admin.log_audit_event") as mock_audit:
                headers = {"Authorization": f"Bearer {admin_token}"}
                response = client.patch(
                    f"/api/v1/admin/users/{target_user_id}/status",
                    headers=headers,
                    json={"is_active": False}
                )
                assert response.status_code == 200
                data = response.json()
                assert data["is_active"] is False
                assert "deactivated" in data["message"].lower()
                mock_audit.assert_called_once()

def test_admin_feedback_summary():
    """Verify admin feedback summary endpoint returns analytics and review list."""
    admin_id = str(uuid4())
    admin_token = create_mock_token(role="admin", user_id=admin_id)
    now = datetime.now(timezone.utc)

    mock_cursor = MagicMock()
    mock_cursor.fetchone.side_effect = [
        # auth check
        {"id": admin_id, "email": "admin@financeai.com", "role": "admin", "is_active": True},
        {"count": 10},  # total feedback
        {"count": 9},   # positive
        {"count": 1}    # negative
    ]
    mock_cursor.fetchall.return_value = [
        {
            "id": uuid4(),
            "message_id": uuid4(),
            "rating": 1,
            "comments": "Exact RBI circular cited correctly.",
            "user_email": "investor@financeai.com",
            "message_content": "Repo rate remains at 6.50%...",
            "source_type": "document",
            "created_at": now
        }
    ]

    @contextmanager
    def mock_get_db_cursor():
        yield mock_cursor

    with patch("app.core.dependencies.get_db_cursor", mock_get_db_cursor):
        with patch("app.api.v1.admin.get_db_cursor", mock_get_db_cursor):
            headers = {"Authorization": f"Bearer {admin_token}"}
            response = client.get("/api/v1/admin/feedback/summary", headers=headers)
            assert response.status_code == 200
            data = response.json()
            assert data["total_feedback_count"] == 10
            assert data["positive_count"] == 9
            assert data["satisfaction_rate_pct"] == 90.0
            assert len(data["recent_feedbacks"]) == 1

def test_log_audit_event_safe_execution():
    """Verify audit logger writes to database safely without raising exceptions."""
    mock_cursor = MagicMock()

    @contextmanager
    def mock_get_db_cursor():
        yield mock_cursor

    with patch("app.services.audit_service.get_db_cursor", mock_get_db_cursor):
        # Should not raise exception
        log_audit_event(
            action="TEST_ACTION",
            entity_type="system",
            entity_id="123",
            details={"key": "val"}
        )
        mock_cursor.execute.assert_called_once()

