import os
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

import uuid
import io
import pymupdf as fitz
from fastapi.testclient import TestClient
from main import app
from app.db.connection import get_db_cursor, check_db_health
from app.core.config import settings

def test_neon_live():
    print(f"[1/6] Verifying DB connection to Neon: {settings.DATABASE_URL.split('@')[-1]}")
    assert check_db_health() is True, "Database health check failed against Neon!"
    print("  -> Neon DB health check: OK")

    with get_db_cursor() as cur:
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
        tables = [row["table_name"] for row in cur.fetchall()]
        print(f"  -> Found {len(tables)} tables on Neon: {tables}")
        assert "users" in tables
        assert "documents" in tables
        assert "document_chunks" in tables

    client = TestClient(app)

    print("\n[2/6] Testing GET /health endpoint...")
    res = client.get("/health")
    assert res.status_code == 200, f"Health check status: {res.status_code}"
    health_data = res.json()
    print(f"  -> Health response: {health_data}")
    assert health_data["status"] == "healthy"
    assert health_data["database_connected"] is True

    print("\n[3/6] Testing Admin Login with default seeded credentials...")
    login_res = client.post("/api/v1/auth/login", json={
        "email": settings.INITIAL_ADMIN_EMAIL,
        "password": settings.INITIAL_ADMIN_PASSWORD
    })
    assert login_res.status_code == 200, f"Admin login failed: {login_res.text}"
    admin_auth = login_res.json()
    admin_token = admin_auth["access_token"]
    assert admin_auth["user"]["role"] == "admin"
    print(f"  -> Admin login successful: {admin_auth['user']['email']} (Role: {admin_auth['user']['role']})")

    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    stats_res = client.get("/api/v1/admin/dashboard/stats", headers=admin_headers)
    assert stats_res.status_code == 200, f"Admin stats failed: {stats_res.text}"
    print(f"  -> Admin dashboard stats retrieved: {stats_res.json()}")

    print("\n[4/6] Testing User Registration and Session...")
    test_email = f"testuser_{uuid.uuid4().hex[:8]}@example.com"
    test_password = "Password#2026!"
    reg_res = client.post("/api/v1/auth/register", json={
        "full_name": "Neon Test User",
        "email": test_email,
        "password": test_password,
        "gender": "Other",
        "mobile_number": "+919876543210",
        "date_of_birth": "1995-05-15"
    })
    assert reg_res.status_code == 201, f"Registration failed: {reg_res.text}"
    reg_user = reg_res.json()
    print(f"  -> Registered new user on Neon: {test_email} (ID: {reg_user['id']})")

    user_login_res = client.post("/api/v1/auth/login", json={
        "email": test_email,
        "password": test_password
    })
    assert user_login_res.status_code == 200, f"User login failed: {user_login_res.text}"
    user_token = user_login_res.json()["access_token"]

    user_headers = {"Authorization": f"Bearer {user_token}"}
    me_res = client.get("/api/v1/auth/me", headers=user_headers)
    assert me_res.status_code == 200, f"GET /auth/me failed: {me_res.text}"
    assert me_res.json()["email"] == test_email
    print(f"  -> Verified GET /api/v1/auth/me: {me_res.json()['email']}")

    print("\n[5/6] Testing Document Upload and Ingestion Pipeline on Neon...")
    # Create a small valid PDF in memory
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 72), "Reserve Bank of India Master Circular on Priority Sector Lending 2026.")
    page.insert_text((50, 100), "All commercial banks are mandated to allocate 40 percent of Adjusted Net Bank Credit (ANBC) to priority sectors.")
    pdf_bytes = doc.tobytes()
    doc.close()

    upload_file = io.BytesIO(pdf_bytes)
    upload_res = client.post(
        "/api/v1/documents/upload",
        headers=admin_headers,
        data={
            "title": f"RBI PSL Circular Test {uuid.uuid4().hex[:6]}",
            "category": "Banking & RBI Guidelines"  # Testing label alias normalization!
        },
        files={"file": ("rbi_psl_circular.pdf", upload_file, "application/pdf")}
    )
    assert upload_res.status_code == 201, f"Document upload failed: {upload_res.text}"
    doc_data = upload_res.json()
    doc_id = doc_data["document_id"]
    print(f"  -> Ingested document: {doc_data['title']} (ID: {doc_id}, Category: {doc_data['category']})")

    # Verify chunk was persisted in Neon document_chunks
    with get_db_cursor() as cur:
        cur.execute("SELECT COUNT(*) AS count FROM document_chunks WHERE document_id = %s;", (doc_id,))
        chunk_count = cur.fetchone()["count"]
        print(f"  -> Document chunks created on Neon: {chunk_count}")
        assert chunk_count > 0

    print("\n[6/6] Testing Financial Chat Query...")
    chat_init_res = client.post("/api/v1/chat/sessions", headers=user_headers, json={"title": "Neon E2E Test Session"})
    assert chat_init_res.status_code == 201, f"Create chat session failed: {chat_init_res.text}"
    session_id = chat_init_res.json()["id"]

    query_res = client.post(
        "/api/v1/chat/ask",
        headers=user_headers,
        json={
            "session_id": session_id,
            "question": "What is the priority sector lending mandate for commercial banks?"
        }
    )
    assert query_res.status_code == 200, f"Chat query failed: {query_res.text}"
    ans_data = query_res.json()
    print(f"  -> Assistant Answer: {ans_data['answer'][:120]}...")
    print(f"  -> Source Type: {ans_data['source_type']}")
    print(f"  -> Confidence Score: {ans_data['confidence_score']}")
    print(f"  -> Citations count: {len(ans_data.get('citations', []))}")

    print("\n==========================================")
    print("ALL LIVE TESTS ON NEON POSTGRESQL PASSED!")
    print("==========================================")

if __name__ == "__main__":
    test_neon_live()
