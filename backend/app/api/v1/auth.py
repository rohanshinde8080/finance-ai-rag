from datetime import timedelta
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from app.models.auth import (
    UserRegisterRequest,
    UserLoginRequest,
    TokenResponse,
    UserResponse,
    MessageResponse
)
from app.core.security import hash_password, verify_password, create_access_token
from app.core.dependencies import get_current_user
from app.db.connection import get_db_cursor
from app.utils.logger import logger

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new standard user"
)
def register(request: UserRegisterRequest):
    """
    Registers a new regular user account.
    - Validates email and strong password complexity.
    - Prevents duplicate email registrations.
    - Stores bcrypt password hash.
    """
    email_clean = request.email.lower().strip()
    
    with get_db_cursor() as cur:
        # Check if email is already registered
        cur.execute("SELECT id FROM users WHERE email = %s;", (email_clean,))
        existing = cur.fetchone()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email address already exists."
            )

        # Hash password and insert
        hashed_pwd = hash_password(request.password)
        cur.execute(
            """
            INSERT INTO users (email, full_name, password_hash, role, is_active, gender, mobile_number, date_of_birth)
            VALUES (%s, %s, %s, 'user', TRUE, %s, %s, %s)
            RETURNING id, email, full_name, role, is_active, gender, mobile_number, date_of_birth, created_at;
            """,
            (
                email_clean,
                request.full_name,
                hashed_pwd,
                request.gender,
                request.mobile_number,
                request.date_of_birth
            )
        )
        new_user = cur.fetchone()

    logger.info(f"User registered successfully: {new_user['email']} (ID: {new_user['id']})")
    return new_user

@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate user or administrator and receive JWT token"
)
def login(request: UserLoginRequest):
    """
    Authenticates email and password credentials for either a User or an Admin.
    - Validates bcrypt hash.
    - Ensures account is active.
    - Returns JWT access token containing user_id and role.
    """
    email_clean = request.email.lower().strip()

    with get_db_cursor() as cur:
        cur.execute(
            """
            SELECT id, email, full_name, password_hash, role, is_active, gender, mobile_number, date_of_birth, created_at
            FROM users
            WHERE email = %s;
            """,
            (email_clean,)
        )
        user = cur.fetchone()

    if not user or not verify_password(request.password, user["password_hash"]):
        logger.warning(f"Failed login attempt for email: {email_clean}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user["is_active"]:
        logger.warning(f"Login denied for inactive user: {email_clean}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Please contact an administrator."
        )

    # Generate JWT token
    token_payload = {
        "sub": str(user["id"]),
        "email": user["email"],
        "role": user["role"]
    }
    access_token = create_access_token(token_payload)

    logger.info(f"User logged in successfully: {user['email']} (Role: {user['role']})")
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current authenticated user profile"
)
def get_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Returns the profile of the authenticated user based on the provided JWT."""
    return current_user

@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Logout user session"
)
def logout(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Logs out the current user. Client-side should discard the token.
    """
    logger.info(f"User logged out: {current_user.get('email')}")
    return MessageResponse(message="Successfully logged out.")

