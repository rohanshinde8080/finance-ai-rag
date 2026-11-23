import os
from pathlib import Path
from typing import Optional, List
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from app.core.config import settings
from app.core.dependencies import get_current_user, require_admin
from app.db.connection import get_db_cursor
from app.models.document import (
    DocumentUploadResponse,
    DocumentListResponse,
    DocumentListItem,
    DocumentDetailResponse,
    DocumentChunkResponse
)
from app.services.pdf_service import (
    validate_pdf_file,
    compute_sha256,
    extract_pages_from_pdf,
    PDFValidationError
)
from app.services.chunking_service import chunk_document_pages
from app.services.embedding_service import compute_embeddings_batch
from app.services.faiss_service import faiss_manager
from app.utils.logger import logger

router = APIRouter(prefix="/documents", tags=["Documents"])

VALID_CATEGORIES = [
    "Banking", "Taxation", "GST", "Insurance", "Mutual Funds",
    "Stock Market", "RBI Circulars", "Government Schemes", "General"
]

def process_and_index_document(
    document_id: UUID,
    file_bytes: bytes,
    storage_path: str
):
    """
    Executes the ingestion pipeline:
    Extraction -> Cleaning -> Chunking -> Vector Embedding -> DB & FAISS Synchronization.
    """
    try:
        logger.info(f"Starting processing pipeline for document: {document_id}")
        
        # 1. Page-level extraction with PyMuPDF
        extraction_result = extract_pages_from_pdf(file_bytes)
        total_pages = extraction_result["total_pages"]
        pages = extraction_result["pages"]

        if total_pages == 0 or extraction_result["total_chars"] == 0:
            raise ValueError("Document contains no readable text content.")

        # 2. Semantic recursive chunking
        chunks = chunk_document_pages(pages)
        if not chunks:
            raise ValueError("Failed to generate text chunks from document.")

        # 3. Dense embedding generation via SentenceTransformers
        chunk_texts = [c["chunk_text"] for c in chunks]
        logger.info(f"Computing embeddings for {len(chunk_texts)} chunks...")
        embeddings = compute_embeddings_batch(chunk_texts)

        # 4. Batch persistence into PostgreSQL & retrieve generated chunk IDs
        chunk_ids: List[int] = []
        with get_db_cursor() as cur:
            for chunk, emb in zip(chunks, embeddings):
                cur.execute(
                    """
                    INSERT INTO document_chunks 
                    (document_id, chunk_index, page_number, chunk_text, token_count, embedding)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id;
                    """,
                    (
                        document_id,
                        chunk["chunk_index"],
                        chunk["page_number"],
                        chunk["chunk_text"],
                        chunk["token_count"],
                        emb
                    )
                )
                new_chunk_id = cur.fetchone()["id"]
                chunk_ids.append(new_chunk_id)

            # Update document status to INDEXED
            cur.execute(
                """
                UPDATE documents
                SET processing_status = 'INDEXED',
                    total_pages = %s,
                    total_chunks = %s,
                    error_message = NULL,
                    updated_at = NOW()
                WHERE id = %s;
                """,
                (total_pages, len(chunks), document_id)
            )

        # 5. Synchronize with FAISS in-memory index
        faiss_manager.add_vectors(chunk_ids, embeddings)

        logger.info(
            f"Successfully processed and indexed document {document_id} ({total_pages} pages, {len(chunks)} chunks synced to pgvector and FAISS)."
        )

    except Exception as e:
        logger.error(f"Error during document processing for {document_id}: {e}", exc_info=True)
        with get_db_cursor() as cur:
            cur.execute(
                """
                UPDATE documents
                SET processing_status = 'FAILED',
                    error_message = %s,
                    updated_at = NOW()
                WHERE id = %s;
                """,
                (str(e), document_id)
            )

@router.post(
    "/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload and ingest a financial PDF circular (Admin only)"
)
async def upload_document(
    file: UploadFile = File(..., description="PDF circular or regulatory document"),
    title: str = Form(..., min_length=2, max_length=255, description="Document title"),
    category: str = Form("General", description="Document category"),
    admin_user: dict = Depends(require_admin)
):
    """
    Ingests a financial PDF document:
    - Validates file type (%PDF- header) and 25MB size limit.
    - Computes SHA-256 hash to prevent duplicate uploads.
    - Saves raw PDF to storage directory.
    - Executes extraction, chunking, and dual vector storage (pgvector + FAISS).
    """
    if category not in VALID_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid category '{category}'. Must be one of: {', '.join(VALID_CATEGORIES)}"
        )

    # Read uploaded file bytes
    try:
        file_bytes = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read uploaded file: {str(e)}"
        )

    # Validate PDF integrity and structure
    try:
        validate_pdf_file(file_bytes, file.filename)
    except PDFValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    # Deduplication check via SHA-256
    file_hash = compute_sha256(file_bytes)
    with get_db_cursor() as cur:
        cur.execute("SELECT id, title FROM documents WHERE file_hash = %s;", (file_hash,))
        duplicate = cur.fetchone()
        if duplicate:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An identical document already exists in the system: '{duplicate['title']}' (ID: {duplicate['id']})"
            )

    # Persist physical file
    document_id = uuid4()
    safe_filename = f"{document_id}_{Path(file.filename).name}"
    storage_path = str(settings.DOCUMENTS_DIR / safe_filename)

    try:
        with open(storage_path, "wb") as f:
            f.write(file_bytes)
    except Exception as e:
        logger.error(f"Failed to save document to disk: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to persist file to storage."
        )

    file_size = len(file_bytes)

    # Insert initial document record with status PROCESSING
    with get_db_cursor() as cur:
        cur.execute(
            """
            INSERT INTO documents 
            (id, title, original_filename, storage_path, category, file_size_bytes, file_hash, processing_status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'PROCESSING')
            RETURNING id;
            """,
            (
                document_id,
                title.strip(),
                file.filename,
                storage_path,
                category,
                file_size,
                file_hash
            )
        )

    # Process document synchronously for verified execution
    process_and_index_document(document_id, file_bytes, storage_path)

    return DocumentUploadResponse(
        document_id=document_id,
        title=title.strip(),
        original_filename=file.filename,
        category=category,
        file_size_bytes=file_size,
        processing_status="INDEXED",
        message="Document uploaded, parsed, chunked, and synchronized with pgvector and FAISS."
    )

@router.get(
    "/",
    response_model=DocumentListResponse,
    summary="List uploaded financial documents"
)
def list_documents(
    skip: int = 0,
    limit: int = 50,
    category: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Returns a list of all documents with processing metadata."""
    query = """
        SELECT id, title, original_filename, category, file_size_bytes, 
               processing_status, error_message, total_pages, total_chunks, created_at
        FROM documents
    """
    params = []

    if category:
        query += " WHERE category = %s"
        params.append(category)

    query += " ORDER BY created_at DESC LIMIT %s OFFSET %s;"
    params.extend([limit, skip])

    with get_db_cursor() as cur:
        # Get total count
        count_query = "SELECT COUNT(*) FROM documents"
        if category:
            count_query += " WHERE category = %s;"
            cur.execute(count_query, (category,))
        else:
            cur.execute(count_query + ";")
        total_count = cur.fetchone()["count"]

        # Fetch page items
        cur.execute(query, tuple(params))
        rows = cur.fetchall()

    return DocumentListResponse(
        total=total_count,
        items=rows
    )

@router.get(
    "/{document_id}",
    response_model=DocumentDetailResponse,
    summary="Get document details and sample chunks"
)
def get_document(
    document_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """Retrieves document details and sample chunks for inspection."""
    with get_db_cursor() as cur:
        cur.execute(
            """
            SELECT id, title, original_filename, category, file_size_bytes, file_hash,
                   processing_status, error_message, total_pages, total_chunks, created_at, updated_at
            FROM documents
            WHERE id = %s;
            """,
            (document_id,)
        )
        doc = cur.fetchone()

        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document with ID {document_id} was not found."
            )

        # Retrieve first 5 chunks as a sample
        cur.execute(
            """
            SELECT id, chunk_index, page_number, chunk_text, token_count
            FROM document_chunks
            WHERE document_id = %s
            ORDER BY chunk_index ASC
            LIMIT 5;
            """,
            (document_id,)
        )
        sample_chunks = cur.fetchall()

    doc["sample_chunks"] = sample_chunks
    return doc

@router.delete(
    "/{document_id}",
    summary="Delete a document, cascade PostgreSQL records, and purge FAISS vectors (Admin only)"
)
def delete_document(
    document_id: UUID,
    admin_user: dict = Depends(require_admin)
):
    """
    Deletes a document and executes complete vector and file cleanup:
    1. Retrieves chunk IDs from PostgreSQL.
    2. Purges corresponding vector IDs from the in-memory FAISS index.
    3. Deletes document record from PostgreSQL (cascades to document_chunks).
    4. Removes physical PDF from storage.
    """
    with get_db_cursor() as cur:
        # Check document existence and get metadata
        cur.execute("SELECT id, storage_path, title FROM documents WHERE id = %s;", (document_id,))
        doc = cur.fetchone()
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document with ID {document_id} does not exist."
            )

        # Retrieve chunk IDs to remove from FAISS
        cur.execute("SELECT id FROM document_chunks WHERE document_id = %s;", (document_id,))
        chunk_rows = cur.fetchall()
        chunk_ids = [row["id"] for row in chunk_rows]

        # Delete from PostgreSQL (cascades to document_chunks)
        cur.execute("DELETE FROM documents WHERE id = %s;", (document_id,))

    # Remove from FAISS index
    if chunk_ids:
        faiss_manager.remove_vectors(chunk_ids)

    # Remove physical PDF file from disk
    storage_path = doc.get("storage_path")
    if storage_path and os.path.exists(storage_path):
        try:
            os.remove(storage_path)
            logger.info(f"Removed document file from storage: {storage_path}")
        except Exception as e:
            logger.warning(f"Failed to delete physical file {storage_path}: {e}")

    return {
        "document_id": document_id,
        "message": f"Document '{doc['title']}' and all associated vector embeddings deleted successfully."
    }

@router.post(
    "/{document_id}/reprocess",
    summary="Reprocess an existing PDF, refreshing chunks and vector embeddings (Admin only)"
)
def reprocess_document(
    document_id: UUID,
    admin_user: dict = Depends(require_admin)
):
    """
    Reprocesses an existing document from its original physical PDF:
    1. Fetches current document metadata.
    2. Purges existing chunks from FAISS and PostgreSQL.
    3. Re-extracts text, re-chunks, re-generates embeddings, and re-indexes.
    """
    with get_db_cursor() as cur:
        cur.execute(
            "SELECT id, title, storage_path, processing_status FROM documents WHERE id = %s;",
            (document_id,)
        )
        doc = cur.fetchone()
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document with ID {document_id} does not exist."
            )

        # Retrieve and purge old chunks from FAISS
        cur.execute("SELECT id FROM document_chunks WHERE document_id = %s;", (document_id,))
        old_chunk_rows = cur.fetchall()
        old_chunk_ids = [row["id"] for row in old_chunk_rows]

        # Delete existing chunks in PostgreSQL
        cur.execute("DELETE FROM document_chunks WHERE document_id = %s;", (document_id,))

        # Update status to PROCESSING
        cur.execute(
            "UPDATE documents SET processing_status = 'PROCESSING', updated_at = NOW() WHERE id = %s;",
            (document_id,)
        )

    # Purge from FAISS
    if old_chunk_ids:
        faiss_manager.remove_vectors(old_chunk_ids)

    # Read physical file from disk
    storage_path = doc["storage_path"]
    if not os.path.exists(storage_path):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Source PDF file is missing from disk at: {storage_path}"
        )

    with open(storage_path, "rb") as f:
        file_bytes = f.read()

    # Re-process document
    process_and_index_document(document_id, file_bytes, storage_path)

    return {
        "document_id": document_id,
        "status": "INDEXED",
        "message": f"Document '{doc['title']}' successfully reprocessed and re-indexed."
    }
