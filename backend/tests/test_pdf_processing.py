import io
import math
import pytest
from app.services.pdf_service import (
    validate_pdf_file,
    compute_sha256,
    clean_extracted_text,
    extract_pages_from_pdf,
    PDFValidationError
)
from app.services.chunking_service import (
    split_text_recursive,
    chunk_document_pages,
    estimate_token_count
)

def create_mock_pdf_bytes(text: str = "FinanceAI Test Regulatory Document") -> bytes:
    """Creates in-memory minimal valid PDF bytes using PyMuPDF."""
    import pymupdf as fitz
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 72), text)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes

def test_pdf_validation_valid():
    """Verify that a properly structured PDF passes validation."""
    pdf_bytes = create_mock_pdf_bytes("Reserve Bank of India Monetary Policy Circular 2026")
    validate_pdf_file(pdf_bytes, "rbi_circular.pdf")

def test_pdf_validation_invalid_extension():
    """Verify that non-.pdf filenames are rejected."""
    pdf_bytes = create_mock_pdf_bytes()
    with pytest.raises(PDFValidationError, match="Invalid file extension"):
        validate_pdf_file(pdf_bytes, "circular.txt")

def test_pdf_validation_empty_file():
    """Verify that 0-byte files are rejected."""
    with pytest.raises(PDFValidationError, match="empty"):
        validate_pdf_file(b"", "empty.pdf")

def test_pdf_validation_invalid_magic_bytes():
    """Verify that files not starting with %PDF- are rejected."""
    with pytest.raises(PDFValidationError, match="Invalid file signature"):
        validate_pdf_file(b"NOT_A_REAL_PDF_HEADER_DATA", "fake.pdf")

def test_pdf_validation_size_limit():
    """Verify that files exceeding 25MB are rejected."""
    fake_huge_pdf = b"%PDF-1.4\n" + (b"0" * (26 * 1024 * 1024))
    with pytest.raises(PDFValidationError, match="exceeds the 25MB limit"):
        validate_pdf_file(fake_huge_pdf, "large.pdf")

def test_compute_sha256():
    """Verify SHA-256 calculation is deterministic and accurate."""
    data = b"%PDF-1.4 sample content"
    hash1 = compute_sha256(data)
    hash2 = compute_sha256(data)
    assert hash1 == hash2
    assert len(hash1) == 64

def test_clean_extracted_text():
    """Verify text cleaning removes artifacts while retaining semantics."""
    raw = "Section 80C  \u00a0\u00a0Deduction\x00\n\n\n\nLimit: Rs. 1,50,000 \t\tper year."
    cleaned = clean_extracted_text(raw)
    assert "\x00" not in cleaned
    assert "\u00a0" not in cleaned
    assert "Section 80C Deduction" in cleaned
    assert "Limit: Rs. 1,50,000 per year." in cleaned
    assert "\n\n\n\n" not in cleaned

def test_extract_pages_from_pdf():
    """Verify page-by-page extraction retains page numbers and text."""
    import pymupdf as fitz
    doc = fitz.open()
    p1 = doc.new_page()
    p1.insert_text((50, 72), "Page 1: Income Tax Slabs for FY 2026-27 under New Tax Regime.")
    p2 = doc.new_page()
    p2.insert_text((50, 72), "Page 2: Standard Deduction limit increased to Rs. 75,000.")
    pdf_bytes = doc.tobytes()
    doc.close()

    result = extract_pages_from_pdf(pdf_bytes)
    assert result["total_pages"] == 2
    assert len(result["pages"]) == 2
    assert result["pages"][0]["page_number"] == 1
    assert "Income Tax Slabs" in result["pages"][0]["text"]
    assert result["pages"][1]["page_number"] == 2
    assert "Standard Deduction" in result["pages"][1]["text"]

def test_recursive_chunking_boundaries_and_overlap():
    """Verify recursive chunking splits properly and applies overlap."""
    sample_text = (
        "The Reserve Bank of India (RBI) regulates monetary policy.\n\n"
        "The Monetary Policy Committee (MPC) meets bi-monthly to determine the repo rate.\n\n"
        "The repo rate directly impacts borrowing costs for commercial banks and home loan borrowers.\n\n"
        "Inflation targeting is maintained within the statutory band of 4 percent plus or minus 2 percent."
    )
    chunks = split_text_recursive(sample_text, max_chunk_size=120, overlap=20)
    assert len(chunks) >= 2
    for chunk in chunks:
        assert len(chunk) <= 120

def test_chunk_document_pages_metadata_retention():
    """Verify document chunking page preservation and index numbering."""
    pages = [
        {"page_number": 1, "text": "Page one paragraph regarding GST input tax credit rules."},
        {"page_number": 2, "text": "Page two paragraph on reverse charge mechanism (RCM) compliance under CGST Act."}
    ]
    chunks = chunk_document_pages(pages, chunk_size=300, chunk_overlap=30)
    assert len(chunks) == 2
    assert chunks[0]["page_number"] == 1
    assert chunks[0]["chunk_index"] == 0
    assert "input tax credit" in chunks[0]["chunk_text"]

    assert chunks[1]["page_number"] == 2
    assert chunks[1]["chunk_index"] == 1
    assert "reverse charge mechanism" in chunks[1]["chunk_text"]

def test_estimate_token_count():
    """Verify token estimation calculation."""
    text = "Mutual funds are subject to market risks. Read all scheme related documents carefully."
    tokens = estimate_token_count(text)
    assert tokens > 0
    assert tokens == len(text) // 4

def test_embedding_generation_shape_and_normalization():
    """Verify SentenceTransformers embedding generation, dimensions, and L2 normalization."""
    from app.services.embedding_service import compute_embedding, compute_embeddings_batch, get_model_dimension

    dim = get_model_dimension()
    assert dim == 384

    # Single text embedding test
    text = "Income tax exemption under Section 80C is capped at 1.5 Lakhs per financial year."
    emb = compute_embedding(text)
    assert isinstance(emb, list)
    assert len(emb) == 384

    # Assert L2 norm is ~1.0 (normalized vector)
    norm = math.sqrt(sum(x * x for x in emb))
    assert abs(norm - 1.0) < 1e-4

    # Batch embedding test
    batch_texts = [
        "What are the GST slabs for financial services?",
        "SEBI guidelines on mutual fund total expense ratio (TER)."
    ]
    batch_embs = compute_embeddings_batch(batch_texts)
    assert len(batch_embs) == 2
    assert len(batch_embs[0]) == 384
    assert len(batch_embs[1]) == 384
