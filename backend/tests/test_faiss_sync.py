from contextlib import contextmanager
import math
from unittest.mock import MagicMock, patch
from uuid import uuid4
import numpy as np
import pytest
from fastapi.testclient import TestClient
from main import app
from app.core.security import create_access_token
from app.services.faiss_service import FAISSIndexManager, search_similar_chunks

client = TestClient(app)

def create_mock_token(role: str = "user") -> str:
    user_id = str(uuid4())
    return create_access_token({"sub": user_id, "email": f"{role}@financeai.com", "role": role})

def test_faiss_manager_lifecycle():
    """Verify FAISSIndexManager adding, searching, removing, and persisting vectors."""
    manager = FAISSIndexManager()

    # Generate 3 dummy normalized 384-dimensional vectors
    np.random.seed(42)
    vec1 = np.random.randn(384).astype(np.float32)
    vec1 /= np.linalg.norm(vec1)
    vec2 = np.random.randn(384).astype(np.float32)
    vec2 /= np.linalg.norm(vec2)
    vec3 = np.random.randn(384).astype(np.float32)
    vec3 /= np.linalg.norm(vec3)

    chunk_ids = [101, 102, 103]
    vectors = [vec1.tolist(), vec2.tolist(), vec3.tolist()]

    # 1. Add vectors
    manager.add_vectors(chunk_ids, vectors)
    assert manager.get_total_vectors() == 3

    # 2. Search nearest to vec1
    results = manager.search(vec1.tolist(), top_k=2)
    assert len(results) == 2
    # Nearest neighbor should be vec1 itself (id 101) with score ~1.0
    top_id, top_score = results[0]
    assert top_id == 101
    assert math.isclose(top_score, 1.0, abs_tol=1e-4)

    # 3. Remove a vector (id 102)
    removed = manager.remove_vectors([102])
    assert removed == 1
    assert manager.get_total_vectors() == 2

    # Verify 102 is no longer in search results
    search_after_delete = manager.search(vec2.tolist(), top_k=5)
    matched_ids = [cid for cid, _ in search_after_delete]
    assert 102 not in matched_ids

    # 4. Cleanup remaining
    manager.remove_vectors([101, 103])
    assert manager.get_total_vectors() == 0

def test_delete_document_unauthorized():
    """Verify regular user cannot delete documents."""
    user_token = create_mock_token("user")
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
        random_id = uuid4()
        response = client.delete(f"/api/v1/documents/{random_id}", headers=headers)
        assert response.status_code == 403
        assert "administrator privileges required" in response.json()["detail"].lower()

def test_delete_document_success():
    """Verify admin can delete document with vector cleanup."""
    admin_token = create_mock_token("admin")
    doc_id = uuid4()
    mock_cursor = MagicMock()

    # Sequence of fetchone/fetchall:
    # 1. auth check -> admin user
    # 2. doc existence check -> doc row
    # 3. chunk IDs check -> chunk rows
    mock_cursor.fetchone.side_effect = [
        {"id": uuid4(), "email": "admin@financeai.com", "role": "admin", "is_active": True},
        {"id": doc_id, "title": "RBI Repo Rate Circular", "storage_path": "storage/docs/dummy.pdf"}
    ]
    mock_cursor.fetchall.return_value = [{"id": 101}, {"id": 102}]

    @contextmanager
    def mock_get_db_cursor():
        yield mock_cursor

    with patch("app.core.dependencies.get_db_cursor", mock_get_db_cursor):
        with patch("app.api.v1.documents.get_db_cursor", mock_get_db_cursor):
            with patch("app.api.v1.documents.faiss_manager.remove_vectors") as mock_remove:
                mock_remove.return_value = 2
                headers = {"Authorization": f"Bearer {admin_token}"}
                response = client.delete(f"/api/v1/documents/{doc_id}", headers=headers)
                assert response.status_code == 200
                data = response.json()
                assert "deleted successfully" in data["message"].lower()
                mock_remove.assert_called_once_with([101, 102])

def test_reprocess_document_not_found():
    """Verify reprocessing a missing document returns 404."""
    admin_token = create_mock_token("admin")
    mock_cursor = MagicMock()
    mock_cursor.fetchone.side_effect = [
        {"id": uuid4(), "email": "admin@financeai.com", "role": "admin", "is_active": True},
        None
    ]

    @contextmanager
    def mock_get_db_cursor():
        yield mock_cursor

    with patch("app.core.dependencies.get_db_cursor", mock_get_db_cursor):
        with patch("app.api.v1.documents.get_db_cursor", mock_get_db_cursor):
            headers = {"Authorization": f"Bearer {admin_token}"}
            random_id = uuid4()
            response = client.post(f"/api/v1/documents/{random_id}/reprocess", headers=headers)
            assert response.status_code == 404
            assert "does not exist" in response.json()["detail"].lower()

def test_search_similar_chunks_with_mocked_faiss():
    """Verify semantic search queries FAISS and attaches PostgreSQL metadata."""
    mock_cursor = MagicMock()
    mock_cursor.fetchall.return_value = [
        {
            "chunk_id": 501,
            "document_id": uuid4(),
            "chunk_index": 2,
            "page_number": 4,
            "chunk_text": "Section 80C allows deduction up to 1.5 Lakhs for PPF and ELSS.",
            "token_count": 18,
            "document_title": "Income Tax Master Guide 2026",
            "category": "Taxation",
            "original_filename": "income_tax_guide.pdf"
        }
    ]

    @contextmanager
    def mock_get_db_cursor():
        yield mock_cursor

    with patch("app.services.faiss_service.faiss_manager.get_total_vectors", return_value=10):
        with patch("app.services.faiss_service.faiss_manager.search", return_value=[(501, 0.8845)]):
            with patch("app.services.faiss_service.get_db_cursor", mock_get_db_cursor):
                results = search_similar_chunks("What are the tax deductions under 80C?", top_k=1)
                assert len(results) == 1
                res = results[0]
                assert res["chunk_id"] == 501
                assert res["page_number"] == 4
                assert res["similarity_score"] == 0.8845
                assert "Section 80C allows deduction" in res["chunk_text"]
                assert res["category"] == "Taxation"

