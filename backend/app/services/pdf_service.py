import hashlib
import re
from typing import Any, Dict, List, Union
import pymupdf as fitz
from app.utils.logger import logger

# Maximum allowed file size for PDF circulars (25 MB)
MAX_PDF_SIZE_BYTES = 25 * 1024 * 1024

class PDFValidationError(Exception):
    """Raised when PDF file format or content fails validation."""
    pass

def validate_pdf_file(file_bytes: bytes, filename: str) -> None:
    """
    Validates uploaded file against security and formatting constraints:
    1. Enforces .pdf extension.
    2. Validates magic byte signature (%PDF-).
    3. Enforces 25MB maximum size.
    4. Validates that PyMuPDF can open and parse the document.
    """
    if not filename.lower().endswith(".pdf"):
        raise PDFValidationError("Invalid file extension. Only .pdf files are accepted.")

    if len(file_bytes) == 0:
        raise PDFValidationError("The uploaded PDF file is empty (0 bytes).")

    if len(file_bytes) > MAX_PDF_SIZE_BYTES:
        raise PDFValidationError(
            f"File size exceeds the 25MB limit (Size: {len(file_bytes) / (1024*1024):.2f}MB)."
        )

    # Validate Magic Bytes (%PDF-) within first 1024 bytes (per PDF specification ISO 32000-1)
    if b"%PDF-" not in file_bytes[:1024]:
        raise PDFValidationError("Invalid file signature. File is not a valid PDF document.")

    # Integrity check with PyMuPDF
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        if doc.page_count == 0:
            doc.close()
            raise PDFValidationError("The PDF file contains 0 pages.")
        doc.close()
    except PDFValidationError:
        raise
    except Exception as e:
        raise PDFValidationError(f"Corrupted or unreadable PDF document: {str(e)}")

def compute_sha256(file_bytes: bytes) -> str:
    """Generates a SHA-256 cryptographic hash of the raw bytes for deduplication."""
    return hashlib.sha256(file_bytes).hexdigest()

def clean_extracted_text(text: str) -> str:
    """
    Cleans raw extracted PDF text:
    - Normalizes non-breaking spaces and form feeds.
    - Removes unprintable control characters.
    - Condenses multiple horizontal spaces into single spaces.
    - Normalizes consecutive blank lines to standard paragraph breaks (\n\n).
    """
    if not text:
        return ""

    # Replace null characters and form feeds
    cleaned = text.replace("\x00", "").replace("\x0c", "\n")
    # Replace non-breaking and unusual unicode spaces
    cleaned = re.sub(r"[\u00a0\u1680\u2000-\u200b\u202f\u205f\u3000]", " ", cleaned)
    # Replace carriage returns
    cleaned = cleaned.replace("\r\n", "\n").replace("\r", "\n")
    # Replace 3 or more consecutive newlines with double newline (paragraph break)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    # Condense multiple horizontal spaces into a single space
    cleaned = re.sub(r"[ \t]+", " ", cleaned)
    # Strip leading and trailing whitespace per line
    lines = [line.strip() for line in cleaned.split("\n")]
    return "\n".join(lines).strip()

def extract_pages_from_pdf(file_source: Union[str, bytes]) -> Dict[str, Any]:
    """
    Extracts text page-by-page using PyMuPDF.
    Preserves exact 1-indexed page numbers for source citations.
    Detects possible scanned/image-only PDFs.
    """
    doc = None
    try:
        if isinstance(file_source, bytes):
            doc = fitz.open(stream=file_source, filetype="pdf")
        else:
            doc = fitz.open(file_source)

        pages_data: List[Dict[str, Any]] = []
        total_chars = 0

        for page_idx in range(doc.page_count):
            page_num = page_idx + 1
            page = doc.load_page(page_idx)
            raw_text = page.get_text("text") or ""
            cleaned = clean_extracted_text(raw_text)
            char_count = len(cleaned)
            total_chars += char_count

            pages_data.append({
                "page_number": page_num,
                "text": cleaned,
                "char_count": char_count
            })

        total_pages = doc.page_count
        avg_chars_per_page = total_chars / total_pages if total_pages > 0 else 0
        is_scanned_warning = avg_chars_per_page < 50

        if is_scanned_warning:
            logger.warning(
                f"PDF appears to contain scanned or non-searchable pages (Avg {avg_chars_per_page:.1f} chars/page)."
            )

        return {
            "total_pages": total_pages,
            "total_chars": total_chars,
            "is_scanned_warning": is_scanned_warning,
            "pages": pages_data
        }
    finally:
        if doc is not None:
            doc.close()
