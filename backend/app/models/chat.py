from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

class DocumentCitation(BaseModel):
    """Citation metadata for document-grounded answers."""
    chunk_id: int
    document_title: str
    category: str
    page_number: int
    snippet: str
    similarity_score: float

class WebSourceCitation(BaseModel):
    """Citation metadata for web-grounded answers."""
    title: str
    url: str
    snippet: str
    score: Optional[float] = None
    domain: str

class RAGResponse(BaseModel):
    """Complete structured response from the RAG orchestration pipeline."""
    answer: str
    source_type: str = Field(..., description="'document', 'web', or 'fallback'")
    confidence_score: float
    citations: List[DocumentCitation] = []
    web_sources: List[WebSourceCitation] = []
    disclaimer: str

class ChatSessionCreateRequest(BaseModel):
    """Request to create a new chat session."""
    title: Optional[str] = Field("New Conversation", max_length=255, description="Session title")

class ChatAskRequest(BaseModel):
    """User query request inside a chat session."""
    session_id: Optional[UUID] = None
    question: str = Field(..., min_length=2, max_length=1000, description="User financial question")
    category: Optional[str] = Field(None, description="Optional category filter")
    language: Optional[str] = Field("English", description="Response language: English, Marathi, Hindi")

class ChatMessageItem(BaseModel):
    """Message item in a chat session."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    sender: str
    content: str
    source_type: str
    metadata: Dict[str, Any] = {}
    created_at: datetime

class ChatSessionDetail(BaseModel):
    """Full detail of a chat session including message history."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    created_at: datetime
    updated_at: datetime
    messages: List[ChatMessageItem] = []

class ChatSessionListItem(BaseModel):
    """Summary item for user chat session listings."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0

class ChatAskResponse(BaseModel):
    """Response returned upon answering a question in a chat session."""
    session_id: UUID
    user_message_id: UUID
    assistant_message_id: UUID
    answer: str
    source_type: str
    confidence_score: float
    citations: List[DocumentCitation] = []
    web_sources: List[WebSourceCitation] = []
    disclaimer: str
    created_at: datetime
