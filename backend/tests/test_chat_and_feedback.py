from contextlib import contextmanager
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch
from uuid import uuid4
import pytest
from fastapi.testclient import TestClient
from main import app
from app.core.security import create_access_token
from app.models.chat import RAGResponse, DocumentCitation

client = TestClient(app)

def create_mock_token(user_id: str = None) -> str:
    uid = user_id or str(uuid4())
    return create_access_token({"sub": uid, "email": "investor@financeai.com", "role": "user"})

def test_create_session_success():
    """Verify creating a new chat session."""
    user_id = str(uuid4())
    token = create_mock_token(user_id)
    session_id = uuid4()
    now = datetime.now(timezone.utc)

    mock_cursor = MagicMock()
    mock_cursor.fetchone.side_effect = [
        # 1. get_current_user
        {"id": user_id, "email": "investor@financeai.com", "role": "user", "is_active": True},
        # 2. insert session
        {"id": session_id, "title": "Tax Planning 2026", "created_at": now, "updated_at": now}
    ]

    @contextmanager
    def mock_get_db_cursor():
        yield mock_cursor

    with patch("app.core.dependencies.get_db_cursor", mock_get_db_cursor):
        with patch("app.api.v1.chat.get_db_cursor", mock_get_db_cursor):
            headers = {"Authorization": f"Bearer {token}"}
            response = client.post(
                "/api/v1/chat/sessions",
                headers=headers,
                json={"title": "Tax Planning 2026"}
            )
            assert response.status_code == 201
            data = response.json()
            assert data["id"] == str(session_id)
            assert data["title"] == "Tax Planning 2026"
            assert data["messages"] == []

def test_list_sessions():
    """Verify listing user's chat sessions."""
    user_id = str(uuid4())
    token = create_mock_token(user_id)
    session_id = uuid4()
    now = datetime.now(timezone.utc)

    mock_cursor = MagicMock()
    mock_cursor.fetchone.return_value = {"id": user_id, "email": "investor@financeai.com", "role": "user", "is_active": True}
    mock_cursor.fetchall.return_value = [
        {
            "id": session_id,
            "title": "Home Loan Slabs",
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "message_count": 4
        }
    ]

    @contextmanager
    def mock_get_db_cursor():
        yield mock_cursor

    with patch("app.core.dependencies.get_db_cursor", mock_get_db_cursor):
        with patch("app.api.v1.chat.get_db_cursor", mock_get_db_cursor):
            headers = {"Authorization": f"Bearer {token}"}
            response = client.get("/api/v1/chat/sessions", headers=headers)
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 1
            assert data[0]["title"] == "Home Loan Slabs"
            assert data[0]["message_count"] == 4

def test_get_session_user_isolation_not_found():
    """Verify session isolation: accessing a session owned by another user returns 404."""
    user_id = str(uuid4())
    token = create_mock_token(user_id)
    foreign_session_id = uuid4()

    mock_cursor = MagicMock()
    mock_cursor.fetchone.side_effect = [
        # auth user
        {"id": user_id, "email": "investor@financeai.com", "role": "user", "is_active": True},
        # session check returns None because WHERE user_id = current_user_id failed
        None
    ]

    @contextmanager
    def mock_get_db_cursor():
        yield mock_cursor

    with patch("app.core.dependencies.get_db_cursor", mock_get_db_cursor):
        with patch("app.api.v1.chat.get_db_cursor", mock_get_db_cursor):
            headers = {"Authorization": f"Bearer {token}"}
            response = client.get(f"/api/v1/chat/sessions/{foreign_session_id}", headers=headers)
            assert response.status_code == 404
            assert "not found" in response.json()["detail"].lower()

def test_delete_session():
    """Verify deleting a chat session."""
    user_id = str(uuid4())
    token = create_mock_token(user_id)
    session_id = uuid4()

    mock_cursor = MagicMock()
    mock_cursor.fetchone.side_effect = [
        # auth
        {"id": user_id, "email": "investor@financeai.com", "role": "user", "is_active": True},
        # delete returning id
        {"id": session_id}
    ]

    @contextmanager
    def mock_get_db_cursor():
        yield mock_cursor

    with patch("app.core.dependencies.get_db_cursor", mock_get_db_cursor):
        with patch("app.api.v1.chat.get_db_cursor", mock_get_db_cursor):
            headers = {"Authorization": f"Bearer {token}"}
            response = client.delete(f"/api/v1/chat/sessions/{session_id}", headers=headers)
            assert response.status_code == 200
            assert "deleted successfully" in response.json()["message"].lower()

def test_ask_question_in_session():
    """Verify asking a question calls RAG pipeline and returns answer with citations."""
    user_id = str(uuid4())
    token = create_mock_token(user_id)
    session_id = uuid4()
    user_msg_id = uuid4()
    assistant_msg_id = uuid4()
    now = datetime.now(timezone.utc)

    mock_cursor = MagicMock()
    mock_cursor.fetchone.side_effect = [
        # 1. auth check
        {"id": user_id, "email": "investor@financeai.com", "role": "user", "is_active": True},
        # 2. session check
        {"id": session_id, "title": "New Conversation"},
        # 3. insert user message
        {"id": user_msg_id},
        # 4. insert assistant message
        {"id": assistant_msg_id, "created_at": now}
    ]

    mock_rag_response = RAGResponse(
        answer="Under Section 80C, the maximum deduction limit is Rs. 1,50,000 per financial year.",
        source_type="document",
        confidence_score=0.9125,
        citations=[
            DocumentCitation(
                chunk_id=1,
                document_title="Income Tax Guide 2026",
                category="Taxation",
                page_number=8,
                snippet="Section 80C deductions include EPF, PPF...",
                similarity_score=0.9125
            )
        ],
        web_sources=[],
        disclaimer="Disclaimer: Informational only."
    )

    @contextmanager
    def mock_get_db_cursor():
        yield mock_cursor

    with patch("app.core.dependencies.get_db_cursor", mock_get_db_cursor):
        with patch("app.api.v1.chat.get_db_cursor", mock_get_db_cursor):
            with patch("app.api.v1.chat.answer_financial_query", return_value=mock_rag_response):
                headers = {"Authorization": f"Bearer {token}"}
                payload = {
                    "session_id": str(session_id),
                    "question": "What is the maximum limit under Section 80C?",
                    "category": "Taxation"
                }
                response = client.post("/api/v1/chat/ask", headers=headers, json=payload)
                assert response.status_code == 200
                data = response.json()
                assert data["session_id"] == str(session_id)
                assert data["source_type"] == "document"
                assert "1,50,000" in data["answer"]
                assert len(data["citations"]) == 1
                assert data["citations"][0]["document_title"] == "Income Tax Guide 2026"
                assert data["citations"][0]["page_number"] == 8

def test_submit_feedback_thumbs_up():
    """Verify user can submit feedback on assistant response."""
    user_id = str(uuid4())
    token = create_mock_token(user_id)
    message_id = uuid4()
    feedback_id = uuid4()
    now = datetime.now(timezone.utc)

    mock_cursor = MagicMock()
    mock_cursor.fetchone.side_effect = [
        # 1. auth
        {"id": user_id, "email": "investor@financeai.com", "role": "user", "is_active": True},
        # 2. message existence check
        {"id": message_id, "sender": "assistant"},
        # 3. insert feedback
        {
            "id": feedback_id,
            "message_id": message_id,
            "user_id": user_id,
            "rating": 1,
            "comments": "Very accurate citation and page reference!",
            "created_at": now
        }
    ]

    @contextmanager
    def mock_get_db_cursor():
        yield mock_cursor

    with patch("app.core.dependencies.get_db_cursor", mock_get_db_cursor):
        with patch("app.api.v1.feedback.get_db_cursor", mock_get_db_cursor):
            headers = {"Authorization": f"Bearer {token}"}
            payload = {
                "message_id": str(message_id),
                "rating": 1,
                "comments": "Very accurate citation and page reference!"
            }
            response = client.post("/api/v1/feedback/", headers=headers, json=payload)
            assert response.status_code == 201
            data = response.json()
            assert data["rating"] == 1
            assert data["message_id"] == str(message_id)

def test_submit_feedback_invalid_rating():
    """Verify invalid rating value (e.g. 5) is rejected by Pydantic validation."""
    user_id = str(uuid4())
    token = create_mock_token(user_id)
    mock_cursor = MagicMock()
    mock_cursor.fetchone.return_value = {
        "id": user_id,
        "email": "investor@financeai.com",
        "role": "user",
        "is_active": True
    }

    @contextmanager
    def mock_get_db_cursor():
        yield mock_cursor

    with patch("app.core.dependencies.get_db_cursor", mock_get_db_cursor):
        headers = {"Authorization": f"Bearer {token}"}
        payload = {
            "message_id": str(uuid4()),
            "rating": 5  # Only 1 and -1 permitted
        }
        response = client.post("/api/v1/feedback", headers=headers, json=payload)
        assert response.status_code == 422
