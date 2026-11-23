# FinanceAI – Phase-Wise Implementation Plan & Project Execution Tracker

> **Project:** FinanceAI – An LLM-Based Domain-Specific Financial Assistant Using Retrieval-Augmented Generation (RAG)  
> **Course:** MCA Final-Year Project  
> **Status:** Planning Completed – Awaiting Approval to Begin Phase 1  

This document serves as the master execution blueprint. Every phase is broken down into 11 strict dimensions to ensure software engineering rigor, test-driven validation, and clean progress tracking.

---

## Progress Dashboard

| Phase | Description | Status | Target Completion |
| :---: | :--- | :---: | :---: |
| **Phase 1** | Foundation, Database Architecture & Core Authentication | ✅ Completed | Phase 1 Kickoff |
| **Phase 2** | PDF Ingestion, Text Processing & Embedding Pipeline | ✅ Completed | Phase 2 Kickoff |
| **Phase 3** | Hybrid Vector Indexing (pgvector + FAISS) & Semantic Retrieval Engine | ✅ Completed | Phase 3 Kickoff |
| **Phase 4** | Gemini LLM Generation, Grounded Citations & Tavily Fallback Engine | ✅ Completed | Phase 4 Kickoff |
| **Phase 5** | Chat Session Management, Context Tracking & Feedback System | ✅ Completed | Phase 5 Kickoff |
| **Phase 6** | Admin Management Module & Analytics | ✅ Completed | Phase 6 Kickoff |
| **Phase 7** | Professional React Frontend (User & Admin Portals) | ⏳ Planned | Phase 7 Kickoff |
| **Phase 8** | System Hardening, End-to-End Testing & Production Deployment | ⏳ Planned | Final Delivery |

---

## Detailed Phase Specifications

### Phase 1: Foundation, Database Architecture & Core Authentication

- **1. Phase Number & Name:** Phase 1 – Foundation, Database Architecture & Core Authentication
- **2. Objective:** Set up the project foundation, configure PostgreSQL connection pooling using `psycopg` (v3), execute plain SQL DDL migration scripts, and implement secure JWT authentication with role-based access control (User vs. Admin).
- **3. Features to Implement:**
  - Direct PostgreSQL connection pool with binary and vector extension support.
  - Plain SQL migration system for zero-ORM schema initialization.
  - Strong password hashing using `bcrypt`.
  - User registration with email format validation and password complexity enforcement.
  - User and Admin login issuing signed JWT tokens.
  - Role-based route protection dependencies (`get_current_user`, `require_admin`).
  - Pre-seeded default administrator account (no public admin registration).
- **4. Technologies & Libraries:** Python 3.11+, FastAPI, Pydantic v2, `psycopg` (v3 with `psycopg_pool`), `passlib[bcrypt]`, `pyjwt`, `python-dotenv`.
- **5. Backend Tasks:**
  - [x] Initialize `backend/` directory structure and `requirements.txt`.
  - [x] Implement `backend/app/core/config.py` using Pydantic `BaseSettings`.
  - [x] Build `backend/app/db/connection.py` managing `psycopg_pool.ConnectionPool`.
  - [x] Write SQL migration scripts: `001_initial_schema.sql` and `002_seed_admin.sql`.
  - [x] Build lightweight migration runner `backend/app/db/migrate.py`.
  - [x] Implement `backend/app/core/security.py` (password hashing, JWT encode/decode).
  - [x] Create Pydantic schemas in `backend/app/models/auth.py`.
  - [x] Implement route controller `backend/app/api/v1/auth.py` (`/register`, `/login`, `/me`).
  - [x] Build FastAPI application entry point `backend/main.py` with CORS.
- **6. Frontend Tasks:** None in this phase (focus on backend verification).
- **7. Database Tasks:**
  - [x] Enable PostgreSQL extensions: `uuid-ossp`, `vector`.
  - [x] Create tables: `users`, `documents`, `document_chunks`, `chat_sessions`, `chat_messages`, `feedback`, `audit_logs`.
  - [x] Execute seed script to create initial admin user.
- **8. API Endpoints Required:**
  - `POST /api/v1/auth/register` (Register standard user)
  - `POST /api/v1/auth/login` (Authenticate user/admin, return JWT)
  - `GET /api/v1/auth/me` (Retrieve current authenticated user profile)
- **9. Expected Output:**
  - Fully initialized PostgreSQL database schema.
  - Functional authentication system capable of registering users, rejecting duplicate emails, and issuing role-specific JWT tokens.
- **10. Testing Requirements:**
  - Test registration with valid, invalid, and duplicate emails.
  - Test password hashing and verification accuracy.
  - Test login generating valid JWT token.
  - Test accessing protected `/me` endpoint with valid token, expired token, and missing token.
- **11. Dependencies on Previous Phases:** None (Foundation phase).

---

### Phase 2: PDF Ingestion, Text Processing & Embedding Pipeline

- **1. Phase Number & Name:** Phase 2 – PDF Ingestion, Text Processing & Embedding Pipeline
- **2. Objective:** Build the document processing pipeline using PyMuPDF (`fitz`), clean and recursively chunk text into semantic boundaries while preserving page numbers, and generate 384-dimensional dense vector embeddings with SentenceTransformers.
- **3. Features to Implement:**
  - Secure PDF file upload (signature check, 25MB max size, corrupted file detection).
  - File deduplication using SHA-256 hash checks before processing.
  - Page-level text extraction preserving document metadata and page numbers.
  - Text normalization (removing unnecessary line breaks, normalizing spacing, preserving tables).
  - Configurable recursive sliding-window chunking (chunk size ~800 chars, overlap ~100 chars).
  - Dense embedding generation using `sentence-transformers/all-MiniLM-L6-v2`.
- **4. Technologies & Libraries:** PyMuPDF (`fitz`), `sentence-transformers`, `torch`, `hashlib`, Pydantic v2.
- **5. Backend Tasks:**
  - [x] Create `backend/app/services/pdf_service.py` for parsing and text cleaning.
  - [x] Create `backend/app/services/chunking_service.py` for sliding-window chunking.
  - [x] Create `backend/app/services/embedding_service.py` (singleton model loader).
  - [x] Implement `backend/app/api/v1/documents.py` for document uploads.
  - [x] Implement background processing task for asynchronous document extraction and embedding.
- **6. Frontend Tasks:** None in this phase.
- **7. Database Tasks:**
  - [x] Insert document records into `documents` table with status `PENDING` $\rightarrow$ `PROCESSING` $\rightarrow$ `INDEXED`.
  - [x] Save error messages and update status to `FAILED` if processing fails.
- **8. API Endpoints Required:**
  - `POST /api/v1/documents/upload` (Upload PDF, admin-only)
  - `GET /api/v1/documents` (List documents with processing status)
  - `GET /api/v1/documents/{id}` (Get document details)
- **9. Expected Output:**
  - PDF files uploaded, parsed into clean chunks with exact page numbers, and converted into 384-dimensional dense vectors.
- **10. Testing Requirements:**
  - Test valid PDF ingestion and chunk generation.
  - Test empty or corrupted PDF rejection.
  - Test duplicate file upload detection via SHA-256 hash.
  - Verify embedding dimensions (`shape == (384,)`).
- **11. Dependencies on Previous Phases:** Phase 1 (Database and Admin authentication).

---

### Phase 3: Hybrid Vector Indexing (pgvector + FAISS) & Semantic Retrieval Engine

- **1. Phase Number & Name:** Phase 3 – Hybrid Vector Indexing & Semantic Retrieval Engine
- **2. Objective:** Persist vector embeddings and chunk metadata in PostgreSQL (`pgvector`), maintain an in-memory FAISS index (`IndexIDMap2`), and implement high-speed cosine similarity search with synchronized deletion and reprocessing.
- **3. Features to Implement:**
  - Batch insertion of chunks and embeddings into PostgreSQL `document_chunks`.
  - Real-time synchronization of vector embeddings into an in-memory FAISS index.
  - 1:1 ID mapping between PostgreSQL `chunk_id` and FAISS vector IDs.
  - FAISS index disk persistence (`finance_index.faiss`) and startup warm-up recovery.
  - Document deletion with cascading removal in PostgreSQL and synchronized ID purging in FAISS.
  - Top-$k$ similarity search returning chunk text, confidence scores, and source metadata.
- **4. Technologies & Libraries:** `faiss-cpu`, `pgvector`, `psycopg` (with vector binary adapter), `numpy`.
- **5. Backend Tasks:**
  - [x] Create `backend/app/services/faiss_service.py` managing `faiss.IndexIDMap2`.
  - [x] Integrate chunk insertion to save in PostgreSQL and FAISS simultaneously.
  - [x] Implement startup hook in `backend/main.py` to initialize or rebuild the FAISS index.
  - [x] Implement document deletion endpoint with cascade vector purging.
  - [x] Implement document reprocessing endpoint.
- **6. Frontend Tasks:** None in this phase.
- **7. Database Tasks:**
  - [x] Configure and verify HNSW index on `document_chunks(embedding)`.
  - [x] Enforce cascade deletion on foreign key constraints.
- **8. API Endpoints Required:**
  - `DELETE /api/v1/documents/{id}` (Delete document and all associated vectors)
  - `POST /api/v1/documents/{id}/reprocess` (Reprocess document)
- **9. Expected Output:**
  - Synchronized dual-vector storage: PostgreSQL stores durable chunks and embeddings; FAISS delivers sub-10ms search results.
- **10. Testing Requirements:**
  - Test vector search accuracy with known financial queries.
  - Test document deletion: verify both PostgreSQL chunks and FAISS IDs are removed.
  - Test cold start: simulate index file loss and verify auto-rebuild from PostgreSQL.
- **11. Dependencies on Previous Phases:** Phase 2 (Document Ingestion and Embeddings).

---

### Phase 4: Gemini LLM Generation, Grounded Citations & Tavily Fallback Engine

- **1. Phase Number & Name:** Phase 4 – Gemini LLM Generation, Grounded Citations & Tavily Fallback Engine
- **2. Objective:** Implement RAG orchestration using Google Gemini for grounded financial answers with exact page citations, and integrate Tavily Web Search fallback restricted to official regulatory domains when internal document context is insufficient.
- **3. Features to Implement:**
  - RAG Orchestrator coordinating embedding $\rightarrow$ FAISS similarity search $\rightarrow$ context assembly.
  - Relevance confidence threshold check (e.g., Cosine Similarity $\ge 0.70$).
  - Strict grounded prompt engineering for Google Gemini (forcing factual adherence, refusing speculation, adding mandatory disclaimers).
  - Deterministic document source citations (Document Title, Category, Page Number, Relevant Snippet).
  - Tavily Web Search fallback when similarity score is below threshold or index is empty.
  - Domain restrictions for Tavily: `rbi.org.in`, `incometax.gov.in`, `sebi.gov.in`, `gst.gov.in`, `irdai.gov.in`.
  - Clear separation between Document-grounded and Web-grounded answers.
- **4. Technologies & Libraries:** Google Gemini API (`google-genai` SDK), Tavily API (`tavily-python` or direct HTTP client), Pydantic.
- **5. Backend Tasks:**
  - [x] Implement `backend/app/services/gemini_service.py` with structured prompts.
  - [x] Implement `backend/app/services/tavily_service.py` with domain-constrained financial search.
  - [x] Implement `backend/app/services/rag_service.py` coordinating retrieval, fallback, and generation.
- **6. Frontend Tasks:** None in this phase.
- **7. Database Tasks:** None.
- **8. API Endpoints Required:**
  - Internal service tests for RAG pipeline evaluation.
- **9. Expected Output:**
  - Reliable RAG service providing exact page citations for indexed documents and falling back to official government portals for unindexed topics.
- **10. Testing Requirements:**
  - In-domain query test: verify Gemini quotes document page numbers accurately.
  - Out-of-domain query test: verify Tavily search triggers and returns `.gov.in` sources.
  - Verify that safety disclaimers are always included.
- **11. Dependencies on Previous Phases:** Phase 3 (Vector Retrieval Engine).

---

### Phase 5: Chat Session Management, Context Tracking & Feedback System

- **1. Phase Number & Name:** Phase 5 – Chat Session Management, Context Tracking & Feedback System
- **2. Objective:** Implement multi-turn conversational chat sessions, user-isolated chat history, context-aware follow-up question handling, and an answer feedback mechanism.
- **3. Features to Implement:**
  - Persistent chat sessions stored in PostgreSQL.
  - User isolation: users can only view, query, and delete their own sessions.
  - Multi-turn conversational memory (incorporating recent conversation turns for context).
  - Storage of assistant response metadata (`source_type`, `citations`, `web_sources`).
  - User feedback system (thumbs up/down rating + optional comments) tied to specific messages.
- **4. Technologies & Libraries:** `psycopg` connection pooling, Pydantic schemas.
- **5. Backend Tasks:**
  - [x] Create Pydantic schemas in `backend/app/models/chat.py` and `feedback.py`.
  - [x] Implement `backend/app/api/v1/chat.py` (sessions CRUD and `/ask` endpoint).
  - [x] Implement `backend/app/api/v1/feedback.py` (submit and view feedback).
  - [x] Add audit logging for chat activities.
- **6. Frontend Tasks:** None in this phase.
- **7. Database Tasks:**
  - [x] CRUD operations on `chat_sessions`, `chat_messages`, and `feedback` tables.
- **8. API Endpoints Required:**
  - `POST /api/v1/chat/sessions` (Create new chat session)
  - `GET /api/v1/chat/sessions` (List user's chat sessions)
  - `GET /api/v1/chat/sessions/{id}` (Get full message history of a session)
  - `DELETE /api/v1/chat/sessions/{id}` (Delete chat session)
  - `POST /api/v1/chat/ask` (Submit question in session, receive grounded answer)
  - `POST /api/v1/feedback` (Submit message rating and comments)
- **9. Expected Output:**
  - Complete conversational API supporting persistent, user-isolated multi-turn chat sessions and feedback collection.
- **10. Testing Requirements:**
  - Test multi-turn follow-up questions for context retention.
  - Test user isolation: assert User B cannot view User A's chat session.
  - Test feedback submission and ensure duplicate ratings on the same message are prevented.
- **11. Dependencies on Previous Phases:** Phase 4 (RAG and Gemini Integration).

---

### Phase 6: Admin Management Module & Analytics

- **1. Phase Number & Name:** Phase 6 – Admin Management Module & Analytics
- **2. Objective:** Develop administrative back-office APIs to monitor system health, inspect document indexing statuses, manage user accounts, review feedback analytics, and inspect security audit logs.
- **3. Features to Implement:**
  - Aggregated system dashboard statistics (total users, documents, chunks, queries, fallback rate).
  - User account management (list registered users, activate/deactivate accounts).
  - Document overview (list all uploaded documents, retry failed processing, view chunk distributions).
  - Feedback analytics (positive/negative ratio, review user comments).
  - Audit trail logging and inspection for administrative operations.
- **4. Technologies & Libraries:** `psycopg`, FastAPI with `require_admin` role guard.
- **5. Backend Tasks:**
  - [x] Create Pydantic schemas in `backend/app/models/admin.py`.
  - [x] Implement `backend/app/api/v1/admin.py` with metrics, user management, and audit log endpoints.
  - [x] Implement `backend/app/services/audit_service.py` to record admin actions.
- **6. Frontend Tasks:** None in this phase.
- **7. Database Tasks:**
  - [ ] Optimized SQL aggregation queries for dashboard metrics.
- **8. API Endpoints Required:**
  - `GET /api/v1/admin/dashboard/stats` (Aggregated statistics)
  - `GET /api/v1/admin/users` (List users with pagination)
  - `PATCH /api/v1/admin/users/{id}/status` (Activate/deactivate user)
  - `GET /api/v1/admin/documents` (List all documents with full metadata)
  - `GET /api/v1/admin/feedback/summary` (Feedback analytics summary)
  - `GET /api/v1/admin/audit-logs` (View system audit logs)
- **9. Expected Output:**
  - Complete administrative API suite providing full observability and administrative control over users, documents, and RAG health.
- **10. Testing Requirements:**
  - Verify that standard users receive `403 Forbidden` on all admin endpoints.
  - Test user deactivation: ensure deactivated users cannot log in or generate chat responses.
  - Verify metric calculations against direct database counts.
- **11. Dependencies on Previous Phases:** Phase 5 (Chat & Feedback Subsystem).

---

### Phase 7: Professional React Frontend (User & Admin Portals)

- **1. Phase Number & Name:** Phase 7 – Professional React Frontend (User & Admin Portals)
- **2. Objective:** Develop a modern, responsive, high-performance React.js single-page application with a professional financial theme, user dashboard, interactive chatbot interface with citation badges, and an admin management portal.
- **3. Features to Implement:**
  - Professional financial UI theme (navy `#0B192C`, slate `#1E3E62`, accent `#008DDA`, clean typography).
  - Authentication views: Login, Register, Admin Login, session persistence, logout.
  - User Dashboard:
    - Sidebar with past conversations and "New Chat" button.
    - Chatbot window with auto-scroll and loading indicators.
    - Document source citation cards (document name, category, page number, snippet preview).
    - Web source cards (verified URL link, title, domain badge).
    - Inline feedback buttons (thumbs up/down with comment modal).
    - Suggested financial questions (tax slabs, repo rates, mutual fund rules).
    - Copy-to-clipboard for AI answers.
  - Admin Portal:
    - Metric overview cards (users, documents, chunks, queries, fallback rate).
    - Drag-and-drop PDF upload with progress bars and category tagger.
    - Document management table with status badges, delete, and reprocess actions.
    - User management table with activation toggle switches.
    - Feedback review tab with filterable ratings.
- **4. Technologies & Libraries:** React 18, React Router v6, Axios, Lucide React (icons), pure modular CSS3.
- **5. Backend Tasks:**
  - [x] Configure CORS in FastAPI for the React client origins (`http://localhost:3000`, `http://localhost:5173`).
- **6. Frontend Tasks:**
  - [x] Initialize React project structure in `frontend/`.
  - [x] Configure Axios interceptor for JWT token injection and automatic 401 handling.
  - [x] Build reusable UI components (`Navbar`, `Sidebar`, `CitationCard`, `WebSourceCard`, `FeedbackModal`, `AdminLayout`).
  - [x] Build Context providers (`AuthContext`).
  - [x] Implement pages: `Login`, `Register`, `ChatInterface`, `AdminLogin`, `AdminDashboard`, `AdminDocuments`, `AdminUsers`, `AdminFeedback`.
  - [x] Style application with responsive CSS3 (`theme.css`, `auth.css`, `chat.css`, `admin.css`).
  - [x] Verify production build (`npm run build` completed with 0 errors).
- **7. Database Tasks:** None.
- **8. API Endpoints Required:** Integrates with all backend API endpoints from Phases 1–6.
- **9. Expected Output:**
  - Fully functional, responsive, professional web application for both end-users and administrators.
- **10. Testing Requirements:**
  - Test complete user workflow: Register $\rightarrow$ Login $\rightarrow$ Ask question $\rightarrow$ View page citation $\rightarrow$ Submit feedback $\rightarrow$ Logout.
  - Test complete admin workflow: Admin Login $\rightarrow$ Upload PDF $\rightarrow$ Verify status becomes `INDEXED` $\rightarrow$ View metrics $\rightarrow$ Delete document.
  - Responsive design verification across mobile, tablet, and desktop viewports.
- **11. Dependencies on Previous Phases:** Phase 6 (All Backend APIs ready).

---

### Phase 8: System Hardening, End-to-End Testing & Production Deployment

- **1. Phase Number & Name:** Phase 8 – System Hardening, End-to-End Testing & Production Deployment
- **2. Objective:** Perform security auditing, optimize performance, execute end-to-end integration tests, prepare documentation, and create production deployment instructions.
- **3. Features to Implement:**
  - Global exception handling and user-friendly error banners (no stack traces leaked).
  - Rate limiting / security headers on chat and authentication endpoints.
  - File upload security validation (magic byte checks, path traversal prevention, 25MB limit).
  - Multi-container Docker deployment (`docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`, `nginx/nginx.conf`).
  - Developer & evaluator runner scripts (`run_dev.bat`, `run_prod.bat`).
  - Complete documentation (`docs/PROJECT_REPORT.md`, `docs/EVALUATION_GUIDE.md`, `README.md`).
- **4. Technologies & Libraries:** `pytest`, `httpx`, Uvicorn, Docker, Nginx.
- **5. Backend Tasks:**
  - [x] Write integration & E2E test suite in `backend/tests/test_e2e_flow.py` (61 tests passing).
  - [x] Conduct security audit (verify parameterized SQL queries, check secret exposure, bcrypt 72-byte safety).
  - [x] Container configuration (`backend/Dockerfile`, `backend/.dockerignore`).
- **6. Frontend Tasks:**
  - [x] Build and test production bundle (`npm run build` verified).
  - [x] Container configuration (`frontend/Dockerfile`, `frontend/.dockerignore`).
  - [x] Nginx reverse proxy configuration (`nginx/nginx.conf`).
- **7. Database Tasks:**
  - [x] Verified native `pgvector` indexing with HNSW and zero-ORM `psycopg` connection pooling.
- **8. API Endpoints Required:** All endpoints operational and verified.
- **9. Expected Output:**
  - Production-ready, fully tested MCA final-year project deliverable with clean documentation, ready for live demonstration.
- **10. Testing Requirements:**
  - Run full test suite with `pytest` (61 tests passing across 9 test files).
  - End-to-end evaluation with financial test cases (Banking, Tax, RBI rules, GST, and Fallback web search).
  - Verification of citation accuracy and absence of hallucinations.
- **11. Dependencies on Previous Phases:** All previous phases (1 to 7).

---

## Technical Rules & Compliance Checklist

- [x] **No ORM Rule:** Direct PostgreSQL queries via `psycopg` (v3). No SQLAlchemy, No Alembic.
- [x] **Vector Search Rule:** PostgreSQL (`pgvector`) for durable storage; FAISS for in-memory similarity search. No ChromaDB, No MongoDB, No SQLite.
- [x] **Grounding Rule:** Answers strictly derived from retrieved context. Page citations required for documents; verified URLs required for web fallback.
- [x] **Safety Rule:** Disclaimers included on all answers stating that the assistant is an informational tool, not a licensed financial advisor.
- [x] **Separation of Concerns:** Clear role-based separation between standard users and administrators.

