from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

class AdminDashboardStats(BaseModel):
    """Aggregated system metrics for admin overview dashboard."""
    total_users: int
    total_documents: int
    total_indexed_documents: int
    total_chunks: int
    total_vectors_in_memory: int
    total_conversations: int
    total_queries: int
    document_grounded_queries: int
    web_fallback_queries: int
    web_fallback_rate_pct: float
    positive_feedback_count: int
    negative_feedback_count: int
    user_satisfaction_rate_pct: float

class AdminUserListItem(BaseModel):
    """User account representation for administration."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    full_name: str
    role: str
    is_active: bool
    gender: Optional[str] = None
    mobile_number: Optional[str] = None
    date_of_birth: Optional[Any] = None
    created_at: datetime
    session_count: int = 0

class AdminUserListResponse(BaseModel):
    """Paginated user listing response."""
    total: int
    items: List[AdminUserListItem]

class UserStatusUpdateRequest(BaseModel):
    """Request schema for activating or deactivating a user."""
    is_active: bool = Field(..., description="True to activate, False to deactivate")

class AdminFeedbackItem(BaseModel):
    """Detailed feedback entry for admin review."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    message_id: UUID
    user_email: str
    rating: int
    comments: Optional[str] = None
    message_content: str
    source_type: str
    created_at: datetime

class AdminFeedbackSummaryResponse(BaseModel):
    """Feedback metrics and recent submissions."""
    total_feedback_count: int
    positive_count: int
    negative_count: int
    satisfaction_rate_pct: float
    recent_feedbacks: List[AdminFeedbackItem]

class AdminAuditLogItem(BaseModel):
    """Audit log entry for system security monitoring."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: Optional[UUID] = None
    user_email: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    details: Dict[str, Any] = {}
    ip_address: Optional[str] = None
    created_at: datetime

class AdminAuditLogResponse(BaseModel):
    """Paginated audit logs response."""
    total: int
    items: List[AdminAuditLogItem]

