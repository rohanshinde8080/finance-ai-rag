from typing import Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.core.security import decode_access_token
from app.db.connection import get_db_cursor
from app.utils.logger import logger

# OAuth2 scheme for extracting Bearer tokens from Authorization headers
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/login",
    auto_error=True
)

def get_current_user(token: str = Depends(oauth2_scheme)) -> Dict[str, Any]:
    """
    Validates the JWT access token and fetches the current user from the database.
    Raises HTTPException 401 if token is invalid or user not found.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if not payload:
        raise credentials_exception

    user_id = payload.get("sub")
    if not user_id:
        raise credentials_exception

    # Query user directly from PostgreSQL via psycopg
    with get_db_cursor() as cur:
        cur.execute(
            """
            SELECT id, email, full_name, role, is_active, gender, mobile_number, date_of_birth, created_at
            FROM users 
            WHERE id = %s;
            """,
            (user_id,)
        )
        user = cur.fetchone()

    if user is None:
        logger.warning(f"Authentication failed: User {user_id} not found in database.")
        raise credentials_exception

    if not user.get("is_active"):
        logger.warning(f"Authentication failed: User {user_id} account is deactivated.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive. Please contact support."
        )

    return user

def require_admin(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Restricts access strictly to users with the 'admin' role.
    Raises HTTPException 403 if role is not admin.
    """
    if current_user.get("role") != "admin":
        logger.warning(f"Unauthorized access attempt by non-admin user {current_user.get('email')}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Administrator privileges required."
        )
    return current_user

