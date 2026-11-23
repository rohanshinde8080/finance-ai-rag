# FinanceAI: Domain-Specific Financial Assistant Using Retrieval-Augmented Generation (RAG)
## MCA Final Year Project Comprehensive Technical Report

---

## 1. Abstract
The rapid democratization of Large Language Models (LLMs) has revolutionized interactive information retrieval. However, deploying general-purpose LLMs in high-stakes domains—particularly personal finance, banking compliance, taxation, and regulatory mandates—presents critical risks of hallucination, lack of source attribution, and temporal obsolescence. 

**FinanceAI** is an enterprise-grade, domain-specific financial assistant designed to provide accurate, grounded, and verified financial explanations strictly backed by authoritative documentation. Built using a high-performance **Retrieval-Augmented Generation (RAG)** pipeline, FinanceAI utilizes PyMuPDF for layout-preserving PDF ingestion, Sentence-Transformers (`all-MiniLM-L6-v2`) for 384-dimensional dense semantic embedding, and a **Dual-Vector Storage Architecture** combining PostgreSQL with `pgvector` for durable relational storage and FAISS (`IndexIDMap2` with `IndexFlatIP`) for sub-10ms in-memory similarity search.

To adhere to the strictest software engineering standards, the backend eliminates Object-Relational Mappings (ORMs) in favor of high-throughput direct connection pooling via native `psycopg` (v3). An adaptive decision gate evaluates retrieval similarity ($\tau = 0.70$): queries meeting the threshold generate grounded responses with exact document title and page citations via Google Gemini; queries on unindexed topics dynamically fall back to Tavily Search restricted strictly to official regulatory domains (`rbi.org.in`, `incometax.gov.in`, `sebi.gov.in`, `gst.gov.in`). The system features a responsive React 18 single-page application with real-time streaming feedback and comprehensive administrative observability.

---

## 2. Problem Statement & Motivation
Financial decision-making in India is heavily governed by intricate regulatory frameworks issued by bodies such as the Reserve Bank of India (RBI), the Securities and Exchange Board of India (SEBI), the Central Board of Direct Taxes (CBDT), and the Insurance Regulatory and Development Authority of India (IRDAI). 

### Key Industry Challenges:
1. **Document Complexity & Fragmentation:** Regulatory circulars, tax rules, and policy guidelines span hundreds of pages across disparate governmental portals.
2. **Generic LLM Hallucinations:** Commercial AI chatbots frequently synthesize outdated tax brackets, fabricate non-existent interest rates, or conflate regulatory regimes.
3. **Absence of Verifiable Citations:** Generic assistants deliver authoritative-sounding answers without pointing users to the exact clause or page number.
4. **Architectural Bloat:** Modern web applications often accumulate multiple database engines (SQL + ChromaDB + MongoDB), introducing synchronization bugs, memory bloat, and transactional inconsistency.

---

## 3. High-Level System Architecture

FinanceAI is structured into a clean three-tier microservice architecture:

```
[ React 18 + Vite Frontend ]
        │  (Axios + JWT Bearer)
        ▼
[ Nginx Reverse Proxy / Load Balancer ]
        │
        ▼
[ FastAPI High-Performance Backend (Python 3.10) ]
   ├── Authentication & Role Guard (bcrypt + pyjwt)
   ├── PDF Ingestion Pipeline (PyMuPDF + Recursive Chunker)
   ├── In-Memory Semantic Index (FAISS IndexIDMap2 - Flat Inner Product)
   ├── RAG Orchestration Engine (Dual Grounding Gate)
   │     ├── Google Gemini LLM API (Temperature 0.2, Strict Grounding)
   │     └── Tavily Regulatory Fallback (Restricted Domain Filtering)
   └── Native PostgreSQL Driver (psycopg v3 ConnectionPool)
        │
        ▼
[ PostgreSQL 16 + pgvector Extension ]
   ├── users (RBAC: user / admin)
   ├── documents (PDF metadata, SHA-256 deduplication)
   ├── document_chunks (384-dim vector embeddings + HNSW index)
   ├── chat_sessions & chat_messages
   ├── feedback (user ratings + qualitative commentary)
   └── audit_logs (security and operational audit trail)
```

---

## 4. Architectural Innovations & Technical Highlights

### 4.1 Strict Zero-ORM Design (`psycopg` v3 Connection Pooling)
In strict compliance with architectural constraints, FinanceAI rejects SQLAlchemy and Alembic. Instead:
- **Connection Pooling:** Uses `psycopg_pool.ConnectionPool` with dynamic pre-warming (`open=True`) and client pooling.
- **pgvector Adaptation:** Registers the native `pgvector` adapter on every pooled connection (`register_vector(conn)`), serializing numpy arrays directly into PostgreSQL `vector(384)` columns.
- **Safe SQL Execution:** All queries use parameterized SQL `%s` placeholders, guaranteeing complete immunity to SQL injection vulnerabilities without the overhead of an abstraction layer.
- **Migration Engine:** Managed through plain SQL scripts (`001_initial_schema.sql`, `002_seed_admin.sql`) tracked via a dedicated `schema_migrations` audit table.

### 4.2 Dual-Vector Architecture: PostgreSQL `pgvector` + FAISS
FinanceAI uniquely resolves the trade-off between durable relational persistence and sub-second query latency:
- **PostgreSQL (`pgvector`):** Acts as the **Durable System of Record**. When a document is processed, chunk embeddings are stored alongside textual snippets, page numbers, and foreign keys. PostgreSQL provides transactional durability (ACID) and cross-document relational joins.
- **FAISS (`IndexIDMap2(IndexFlatIP)`):** Acts as the **In-Memory Query Cache**. During server startup, the FAISS index is populated directly from PostgreSQL chunk records. When a query arrives, similarity search executes entirely in RAM in under 5 milliseconds.
- **Cascade Synchronization:** Deleting or reprocessing a document atomically purges vectors from both PostgreSQL and FAISS simultaneously, eliminating orphan records.

### 4.3 Two-Tier Semantic Routing with Regulatory Web Fallback
The core RAG engine executes an adaptive decision pipeline:

$$\text{similarity}(q, c) = \frac{\mathbf{e}_q \cdot \mathbf{e}_c}{\|\mathbf{e}_q\|_2 \|\mathbf{e}_c\|_2}$$

1. **Document-Grounded RAG ($\max(\text{similarity}) \ge 0.70$):**
   - Retrieves the top-$K$ ($K=4$) most relevant document chunks.
   - Prepares an isolated context window with document titles and page numbers.
   - Prompts Google Gemini with temperature $0.2$, enforcing that all factual assertions cite specific documents and pages.
2. **Regulatory Web Fallback ($\max(\text{similarity}) < 0.70$):**
   - Triggered when user queries fall outside the uploaded knowledge base.
   - Executes targeted queries via Tavily Search API strictly restricted to official regulatory domains:
     - `rbi.org.in` (Banking, repo rates, monetary policy)
     - `incometax.gov.in` (Tax slabs, exemptions, deductions)
     - `sebi.gov.in` (Securities, mutual funds, IPO regulations)
     - `gst.gov.in` (Goods and Services Tax schedules)
     - `irdai.gov.in` (Insurance guidelines)
   - Delivers grounded answers with verified URLs and domain verification badges.
3. **Mandatory Advisory Disclaimer:**
   Every generated answer automatically includes an immutable advisory notice:
   > *"FinanceAI is an informational assistant, not a financial advisor. Verify with official regulatory sources."*

---

## 5. Security & Reliability Architecture
1. **Password Security:** Uses direct `bcrypt` hashing with pre-hash 72-byte truncation to eliminate length-truncation overflow vulnerabilities.
2. **File Ingestion Security:**
   - 25MB file size limit enforced prior to memory buffering.
   - Magic byte header inspection (`%PDF-`) preventing extension spoofing.
   - Path traversal prevention using `Path(file.filename).name`.
   - SHA-256 cryptographic hashing to detect and reject duplicate uploads.
3. **Role-Based Access Control (RBAC):**
   - Non-administrators attempting to access `/api/v1/admin/*` or `/api/v1/documents/upload` receive immediate `403 Forbidden` responses.
   - User chat isolation: Database queries filter by `user_id = current_user.id`, ensuring zero cross-tenant session leakage.
   - Administrative self-deactivation guard: Prevents the root admin from deactivating their own active account.

---

## 6. Verification & Experimental Results

The project was subjected to comprehensive automated verification:

| Test Module | Test File | Test Cases | Status |
|:---|:---|:---:|:---:|
| Core Authentication & RBAC | `test_auth.py` | 5 | **PASS** |
| General API Endpoints | `test_api_endpoints.py` | 10 | **PASS** |
| PDF Processing & Magic Bytes | `test_pdf_processing.py` | 12 | **PASS** |
| Document API & Role Checks | `test_document_api.py` | 6 | **PASS** |
| FAISS Synchronization & Cache | `test_faiss_sync.py` | 5 | **PASS** |
| RAG Pipeline & Web Fallback | `test_rag_pipeline.py` | 6 | **PASS** |
| Chat Sessions & Feedback Subsystem | `test_chat_and_feedback.py` | 7 | **PASS** |
| Administrative API & Telemetry | `test_admin_api.py` | 7 | **PASS** |
| End-to-End Complete Flow | `test_e2e_flow.py` | 3 | **PASS** |
| **Total Automated Test Suite** | **9 Test Files** | **61 Tests** | **100% PASS** |

Frontend production compilation (`vite build`) transformed 2,159 modules into a minified production distribution bundle (`dist/`) in 11.27 seconds with 0 warnings.

---

## 7. Conclusion & Future Enhancements
FinanceAI demonstrates that a modern, domain-specific AI assistant can be built with rigorous software discipline: zero-ORM direct pooling, verified citation grounding, and strict data protection.

### Future Roadmap:
1. **Multimodal Table & Chart Parsing:** Integration of vision models to transcribe tabular financial balance sheets and cash flow statements directly into structured JSON.
2. **Multilingual Regional Support:** Translation of regulatory circulars into Hindi, Tamil, Telugu, and other Indian regional languages using Gemini Multilingual.
3. **Streaming Token Generation:** Server-Sent Events (SSE) for word-by-word streaming responses in the chat UI.

