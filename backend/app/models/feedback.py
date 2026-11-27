from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, field_validator

class FeedbackCreateRequest(BaseModel):
    """Schema for submitting rating and review on an AI assistant response."""
    message_id: UUID = Field(..., description="ID of the assistant chat message being rated")
    rating: int = Field(..., description="1 for Thumbs Up, -1 for Thumbs Down")
    comments: Optional[str] = Field(None, max_length=1000, description="Optional user comment or feedback")

    @field_validator("rating")
    @classmethod
    def validate_rating_value(cls, v: int) -> int:
        if v not in (1, -1):
            raise ValueError("Rating must be either 1 (Thumbs Up) or -1 (Thumbs Down).")
        return v

class GeneralFeedbackRequest(BaseModel):
    """Schema for submitting general portal feedback or support inquiries."""
    comments: str = Field(..., min_length=2, max_length=2000, description="User question or feedback message")
    rating: int = Field(0, description="0 for general inquiry, 1 for positive, -1 for negative")

    @field_validator("rating")
    @classmethod
    def validate_rating_value(cls, v: int) -> int:
        if v not in (1, -1, 0):
            raise ValueError("Rating must be 1, -1, or 0.")
        return v

class FeedbackResponse(BaseModel):
    """Response returned upon feedback submission."""
    id: UUID
    message_id: Optional[UUID] = None
    user_id: UUID
    rating: int
    comments: Optional[str] = None
    created_at: datetime
    message: str = "Feedback recorded successfully."

class UserFeedbackItem(BaseModel):
    """Feedback item representation for user/admin review."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    message_id: Optional[UUID] = None
    rating: int
    comments: Optional[str] = None
    created_at: datetime
    message_content: Optional[str] = None

