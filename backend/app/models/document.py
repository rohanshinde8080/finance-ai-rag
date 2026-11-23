from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

class DocumentUploadResponse(BaseModel):
    """Response returned upon initiating a PDF upload."""
    document_id: UUID
    title: str
    original_filename: str
    category: str
    file_size_bytes: int
    processing_status: str
    message: str

class DocumentListItem(BaseModel):
    """Summary item for document listings."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    original_filename: str
    category: str
    file_size_bytes: int
    processing_status: str
    error_message: Optional[str] = None
    total_pages: int
    total_chunks: int
    created_at: datetime

class DocumentListResponse(BaseModel):
    """Paginated list of uploaded documents."""
    total: int
    items: List[DocumentListItem]

class DocumentChunkResponse(BaseModel):
    """Schema for individual chunk inspection."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    chunk_index: int
    page_number: int
    chunk_text: str
    token_count: int

class DocumentDetailResponse(BaseModel):
    """Full detail view of an indexed document."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    original_filename: str
    category: str
    file_size_bytes: int
    file_hash: str
    processing_status: str
    error_message: Optional[str] = None
    total_pages: int
    total_chunks: int
    created_at: datetime
    updated_at: datetime
    sample_chunks: Optional[List[DocumentChunkResponse]] = None

