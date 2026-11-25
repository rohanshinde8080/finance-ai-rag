from datetime import datetime, date
from typing import Any, Optional, Union
from uuid import UUID
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
import re

class UserRegisterRequest(BaseModel):
    """Schema for standard user registration."""
    full_name: str = Field(..., min_length=2, max_length=150, description="Full name of user")
    email: EmailStr = Field(..., description="Valid user email address")
    password: str = Field(..., min_length=8, max_length=128, description="Password (minimum 8 characters)")
    gender: Optional[str] = Field(None, max_length=50, description="User gender (e.g., Male, Female, Other)")
    mobile_number: Optional[str] = Field(None, max_length=20, description="User mobile contact number")
    date_of_birth: Optional[str] = Field(None, description="Date of birth in YYYY-MM-DD format")

    @field_validator("gender", "mobile_number", "date_of_birth", mode="before")
    @classmethod
    def clean_optional_fields(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        if isinstance(v, str):
            s = v.strip()
            return s if s else None
        return str(v)

    @field_validator("password")
    @classmethod
    def validate_password_complexity(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        if not re.search(r"\d", v) and not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("Password must contain at least one digit or special character.")
        return v

    @field_validator("full_name")
    @classmethod
    def clean_full_name(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Full name cannot be blank.")
        return cleaned

class UserLoginRequest(BaseModel):
    """Schema for user and admin login."""
    email: EmailStr = Field(..., description="Registered email address")
    password: str = Field(..., description="User password")

class UserResponse(BaseModel):
    """Public user response schema."""
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

class TokenResponse(BaseModel):
    """JWT Token response schema."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class MessageResponse(BaseModel):
    """Generic status response schema."""
    message: str
    detail: Optional[str] = None

class UserProfileUpdateRequest(BaseModel):
    """Schema for updating personal user profile details."""
    full_name: Optional[str] = Field(None, min_length=2, max_length=150)
    gender: Optional[str] = Field(None, max_length=50)
    mobile_number: Optional[str] = Field(None, max_length=20)
    date_of_birth: Optional[str] = Field(None)

    @field_validator("gender", "mobile_number", "date_of_birth", mode="before")
    @classmethod
    def clean_optional(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        if isinstance(v, str):
            s = v.strip()
            return s if s else None
        return str(v)

class UserChangePasswordRequest(BaseModel):
    """Schema for updating user password."""
    current_password: str = Field(..., description="Current active password")
    new_password: str = Field(..., min_length=8, max_length=128, description="New secure password")

    @field_validator("new_password")
    @classmethod
    def validate_new_pwd(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("New password must be at least 8 characters long.")
        if not re.search(r"\d", v) and not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("New password must contain at least one digit or special character.")
        return v
