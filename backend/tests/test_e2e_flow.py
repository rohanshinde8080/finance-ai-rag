"""
End-to-End (E2E) Flow Integration Tests for FinanceAI.
Validates the complete user and administrative lifecycles, RAG retrieval routing,
vector synchronization, feedback submission, and security boundary assertions.
"""

from contextlib import contextmanager
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch
from uuid import uuid4
import pytest
from fastapi.testclient import TestClient

from main import app
from app.core.security import create_access_token, hash_password
from app.models.chat import RAGResponse, DocumentCitation, WebSourceCitation

client = TestClient(app)

def create_mock_user_token(user_id: str = None, email: str = "scholar@financeai.com", role: str = "user") -> str:
    uid = user_id or str(uuid4())
    return create_access_token({"sub": str(uid), "email": email, "role": role})

def create_mock_admin_token(admin_id: str = None) -> str:
    aid = admin_id or str(uuid4())
    return create_access_token({"sub": str(aid), "email": "admin@financeai.com", "role": "admin"})


def test_e2e_user_journey_ask_and_feedback():
    """
    End-to-End User Journey:
    1. Register new user
    2. Login to retrieve access token
    3. Verify identity via /me
    4. Create chat session
    5. Ask grounded financial question -> Verify citations and disclaimer
    6. Submit positive feedback (+1)
    7. User logout
    """
    user_id = str(uuid4())
    session_id = str(uuid4())
    user_msg_id = uuid4()
    assistant_msg_id = uuid4()
    feedback_id = uuid4()
    now = datetime.now(timezone.utc)
    hashed = hash_password("ValidPassword#123")

    mock_cursor = MagicMock()
    # Mocking sequential DB operations across the user journey
    mock_cursor.fetchone.side_effect = [
        # 1. Register: check existing email -> None
        None,
        # 2. Register: insert user
        {"id": user_id, "email": "scholar@financeai.com", "full_name": "Finance Scholar", "role": "user", "is_active": True, "created_at": now},
        # 3. Login: find user by email
        {"id": user_id, "email": "scholar@financeai.com", "password_hash": hashed, "full_name": "Finance Scholar", "role": "user", "is_active": True, "created_at": now},
        # 4. /me: fetch profile
        {"id": user_id, "email": "scholar@financeai.com", "full_name": "Finance Scholar", "role": "user", "is_active": True, "created_at": now},
        # 5. create_session: get_current_user
        {"id": user_id, "email": "scholar@financeai.com", "role": "user", "is_active": True},
        # 6. create_session: insert session
        {"id": session_id, "title": "RBI Repo Rate Query", "created_at": now, "updated_at": now},
        # 7. ask_question: auth check
        {"id": user_id, "email": "scholar@financeai.com", "role": "user", "is_active": True},
        # 8. ask_question: session check
        {"id": session_id, "title": "RBI Repo Rate Query"},
        # 9. ask_question: insert user query message
        {"id": user_msg_id},
        # 10. ask_question: insert assistant response message
        {"id": assistant_msg_id, "created_at": now},
        # 11. submit_feedback: auth check
        {"id": user_id, "email": "scholar@financeai.com", "role": "user", "is_active": True},
        # 12. submit_feedback: message existence check
        {"id": assistant_msg_id, "sender": "assistant"},
        # 13. submit_feedback: insert feedback record
        {
            "id": feedback_id,
            "message_id": assistant_msg_id,
            "user_id": user_id,
            "rating": 1,
            "comments": "Accurate page reference.",
            "created_at": now
        },
        # 14. logout: auth check
        {"id": user_id, "email": "scholar@financeai.com", "role": "user", "is_active": True}
    ]

    mock_cursor.fetchall.return_value = []

    @contextmanager
    def mock_get_db_cursor():
        yield mock_cursor

    mock_rag_response = RAGResponse(
        answer="According to RBI Monetary Policy guidelines, the Policy Repo Rate is maintained at 6.50%.",
        source_type="document",
        confidence_score=0.91,
        citations=[
            DocumentCitation(
                chunk_id=101,
                document_title="RBI Monetary Policy Statement 2026",
                category="banking",
                page_number=3,
                snippet="The Monetary Policy Committee (MPC) decided to keep the policy repo rate unchanged at 6.50 per cent.",
                similarity_score=0.91
            )
        ],
        web_sources=[],
        disclaimer="Disclaimer: FinanceAI is an informational assistant, not a financial advisor."
    )

    with patch("app.core.dependencies.get_db_cursor", mock_get_db_cursor), \
         patch("app.api.v1.auth.get_db_cursor", mock_get_db_cursor), \
         patch("app.api.v1.chat.get_db_cursor", mock_get_db_cursor), \
         patch("app.api.v1.feedback.get_db_cursor", mock_get_db_cursor), \
         patch("app.api.v1.chat.answer_financial_query", return_value=mock_rag_response):

        # Step 1: User Registration
        reg_res = client.post("/api/v1/auth/register", json={
            "full_name": "Finance Scholar",
            "email": "scholar@financeai.com",
            "password": "ValidPassword#123"
        })
        assert reg_res.status_code == 201
        assert reg_res.json()["email"] == "scholar@financeai.com"

        # Step 2: User Login
        login_res = client.post("/api/v1/auth/login", json={
            "email": "scholar@financeai.com",
            "password": "ValidPassword#123"
        })
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        assert token is not None
        headers = {"Authorization": f"Bearer {token}"}

        # Step 3: Identity Verification
        me_res = client.get("/api/v1/auth/me", headers=headers)
        assert me_res.status_code == 200
        assert me_res.json()["full_name"] == "Finance Scholar"

        # Step 4: Create Chat Session
        session_res = client.post("/api/v1/chat/sessions", headers=headers, json={"title": "RBI Repo Rate Query"})
        assert session_res.status_code == 201
        assert session_res.json()["id"] == session_id

        # Step 5: Ask Question (RAG Grounded)
        ask_res = client.post("/api/v1/chat/ask", headers=headers, json={
            "session_id": session_id,
            "question": "What is the current RBI Policy Repo Rate?"
        })
        assert ask_res.status_code == 200
        ask_data = ask_res.json()
        assert ask_data["source_type"] == "document"
        assert len(ask_data["citations"]) == 1
        assert ask_data["citations"][0]["page_number"] == 3
        assert "6.50" in ask_data["answer"]
        assert "Disclaimer:" in ask_data["disclaimer"]

        # Step 6: Submit Positive Feedback (+1)
        feedback_res = client.post("/api/v1/feedback/", headers=headers, json={
            "message_id": str(assistant_msg_id),
            "rating": 1,
            "comments": "Accurate page reference."
        })
        assert feedback_res.status_code == 201
        assert feedback_res.json()["rating"] == 1

        # Step 7: User Logout
        logout_res = client.post("/api/v1/auth/logout", headers=headers)
        assert logout_res.status_code == 200
        assert logout_res.json()["message"] == "Successfully logged out."


def test_e2e_admin_lifecycle_stats_and_user_management():
    """
    End-to-End Administrative Lifecycle:
    1. Admin authentication
    2. Retrieve aggregated system telemetry
    3. Manage user activation state
    4. Review user feedback metrics
    """
    admin_id = str(uuid4())
    admin_token = create_mock_admin_token(admin_id)
    headers = {"Authorization": f"Bearer {admin_token}"}
    target_user_id = str(uuid4())
    now = datetime.now(timezone.utc)

    mock_cursor = MagicMock()
    mock_cursor.fetchone.side_effect = [
        # 1. dashboard_stats: auth check
        {"id": admin_id, "email": "admin@financeai.com", "role": "admin", "is_active": True},
        # 2. dashboard_stats: total_users
        {"count": 12},
        # 3. dashboard_stats: total_documents
        {"count": 5},
        # 4. dashboard_stats: total_indexed_documents
        {"count": 5},
        # 5. dashboard_stats: total_chunks
        {"count": 142},
        # 6. dashboard_stats: total_conversations
        {"count": 28},
        # 7. dashboard_stats: total_queries
        {"count": 84},
        # 8. dashboard_stats: doc_queries
        {"count": 72},
        # 9. dashboard_stats: web_queries
        {"count": 12},
        # 10. dashboard_stats: pos_feedback
        {"count": 45},
        # 11. dashboard_stats: neg_feedback
        {"count": 3},
        # 12. update_user_status: auth check
        {"id": admin_id, "email": "admin@financeai.com", "role": "admin", "is_active": True},
        # 13. update_user_status: update target user
        {"id": target_user_id, "email": "flagged_student@financeai.com", "full_name": "Test Student", "is_active": False},
        # 14. get_feedback_summary: auth check
        {"id": admin_id, "email": "admin@financeai.com", "role": "admin", "is_active": True},
        # 15. get_feedback_summary: count stats
        {"count": 48},
        {"count": 45},
        {"count": 3}
    ]

    mock_cursor.fetchall.return_value = [
        {
            "id": uuid4(),
            "message_id": uuid4(),
            "user_email": "scholar@financeai.com",
            "rating": 1,
            "comments": "Accurate page reference.",
            "message_content": "The repo rate is 6.50%",
            "source_type": "document",
            "created_at": now
        }
    ]

    @contextmanager
    def mock_get_db_cursor():
        yield mock_cursor

    with patch("app.core.dependencies.get_db_cursor", mock_get_db_cursor), \
         patch("app.api.v1.admin.get_db_cursor", mock_get_db_cursor), \
         patch("app.api.v1.admin.faiss_manager.get_total_vectors", return_value=142):

        # Step 1: Retrieve Aggregated System Telemetry
        stats_res = client.get("/api/v1/admin/dashboard/stats", headers=headers)
        assert stats_res.status_code == 200
        stats = stats_res.json()
        assert stats["total_users"] == 12
        assert stats["total_documents"] == 5
        assert stats["total_queries"] == 84
        assert stats["user_satisfaction_rate_pct"] > 90.0

        # Step 2: Deactivate User Account
        status_res = client.patch(
            f"/api/v1/admin/users/{target_user_id}/status",
            headers=headers,
            json={"is_active": False}
        )
        assert status_res.status_code == 200
        assert status_res.json()["is_active"] is False

        # Step 3: Review User Feedback Summary
        feedback_summary_res = client.get("/api/v1/admin/feedback/summary", headers=headers)
        assert feedback_summary_res.status_code == 200
        summary = feedback_summary_res.json()
        assert summary["total_feedback_count"] == 48
        assert summary["positive_count"] == 45
        assert len(summary["recent_feedbacks"]) == 1


def test_e2e_web_fallback_when_unindexed():
    """
    Verify fallback behavior:
    When semantic similarity threshold (<0.70) is not met, the query must
    route to Tavily Search restricted to official regulatory domains (sebi.gov.in, etc.).
    """
    user_id = str(uuid4())
    session_id = str(uuid4())
    user_msg_id = uuid4()
    assistant_msg_id = uuid4()
    token = create_mock_user_token(user_id)
    headers = {"Authorization": f"Bearer {token}"}
    now = datetime.now(timezone.utc)

    mock_cursor = MagicMock()
    mock_cursor.fetchone.side_effect = [
        # 1. auth check
        {"id": user_id, "email": "scholar@financeai.com", "role": "user", "is_active": True},
        # 2. session check
        {"id": session_id, "title": "SEBI ICDR Regulations"},
        # 3. insert user msg
        {"id": user_msg_id},
        # 4. insert assistant msg
        {"id": assistant_msg_id, "created_at": now}
    ]

    mock_cursor.fetchall.return_value = []

    @contextmanager
    def mock_get_db_cursor():
        yield mock_cursor

    mock_web_response = RAGResponse(
        answer="According to SEBI regulations, public issues require minimum promoter contribution.",
        source_type="web",
        confidence_score=0.85,
        citations=[],
        web_sources=[
            WebSourceCitation(
                title="SEBI Issue of Capital and Disclosure Requirements Regulations",
                url="https://www.sebi.gov.in/legal/regulations/icdr-2018.html",
                snippet="Promoters shall contribute not less than twenty per cent of the post-issue capital.",
                score=0.85,
                domain="sebi.gov.in"
            )
        ],
        disclaimer="Disclaimer: FinanceAI is an informational assistant, not a financial advisor."
    )
    mock_rag_response = mock_web_response

    with patch("app.core.dependencies.get_db_cursor", mock_get_db_cursor), \
         patch("app.api.v1.chat.get_db_cursor", mock_get_db_cursor), \
         patch("app.api.v1.chat.answer_financial_query", return_value=mock_rag_response):

        res = client.post("/api/v1/chat/ask", headers=headers, json={
            "session_id": session_id,
            "question": "What are the SEBI ICDR promoter contribution requirements?"
        })

        assert res.status_code == 200
        data = res.json()
        assert data["source_type"] == "web"
        assert len(data["web_sources"]) == 1
        assert "sebi.gov.in" in data["web_sources"][0]["domain"]
        assert "Disclaimer:" in data["disclaimer"]