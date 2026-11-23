from typing import Any, Dict, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from app.core.dependencies import require_admin
from app.db.connection import get_db_cursor
from app.models.admin import (
    AdminDashboardStats,
    AdminUserListResponse,
    AdminUserListItem,
    UserStatusUpdateRequest,
    AdminFeedbackSummaryResponse,
    AdminFeedbackItem,
    AdminAuditLogResponse,
    AdminAuditLogItem
)
from app.services.audit_service import log_audit_event
from app.services.faiss_service import faiss_manager
from app.utils.logger import logger

router = APIRouter(prefix="/admin", tags=["Admin Portal"])

@router.get(
    "/dashboard/stats",
    response_model=AdminDashboardStats,
    summary="Get aggregated system and RAG analytics (Admin only)"
)
def get_dashboard_stats(admin_user: Dict[str, Any] = Depends(require_admin)):
    """
    Computes real-time system observability metrics:
    - User count & Document ingestion counts.
    - Chunks in PostgreSQL and active vectors in FAISS.
    - Query grounding ratio (Document Grounded vs. Web Fallback).
    - User feedback satisfaction metrics.
    """
    with get_db_cursor() as cur:
        # User counts
        cur.execute("SELECT COUNT(*) AS count FROM users;")
        total_users = cur.fetchone()["count"]

        # Document counts
        cur.execute("SELECT COUNT(*) AS count FROM documents;")
        total_documents = cur.fetchone()["count"]

        cur.execute("SELECT COUNT(*) AS count FROM documents WHERE processing_status = 'INDEXED';")
        total_indexed_documents = cur.fetchone()["count"]

        # Chunk count in DB
        cur.execute("SELECT COUNT(*) AS count FROM document_chunks;")
        total_chunks = cur.fetchone()["count"]

        # Chat and query counts
        cur.execute("SELECT COUNT(*) AS count FROM chat_sessions;")
        total_conversations = cur.fetchone()["count"]

        cur.execute("SELECT COUNT(*) AS count FROM chat_messages WHERE sender = 'user';")
        total_queries = cur.fetchone()["count"]

        cur.execute("SELECT COUNT(*) AS count FROM chat_messages WHERE sender = 'assistant' AND source_type = 'document';")
        doc_queries = cur.fetchone()["count"]

        cur.execute("SELECT COUNT(*) AS count FROM chat_messages WHERE sender = 'assistant' AND source_type = 'web';")
        web_queries = cur.fetchone()["count"]

        # Feedback metrics
        cur.execute("SELECT COUNT(*) AS count FROM feedback WHERE rating = 1;")
        pos_feedback = cur.fetchone()["count"]

        cur.execute("SELECT COUNT(*) AS count FROM feedback WHERE rating = -1;")
        neg_feedback = cur.fetchone()["count"]

    # In-memory FAISS vector count
    total_vectors_in_memory = faiss_manager.get_total_vectors()

    # Derived rates
    total_assistant_answers = doc_queries + web_queries
    fallback_rate = (web_queries / total_assistant_answers * 100.0) if total_assistant_answers > 0 else 0.0

    total_feedback = pos_feedback + neg_feedback
    satisfaction_rate = (pos_feedback / total_feedback * 100.0) if total_feedback > 0 else 100.0

    return AdminDashboardStats(
        total_users=total_users,
        total_documents=total_documents,
        total_indexed_documents=total_indexed_documents,
        total_chunks=total_chunks,
        total_vectors_in_memory=total_vectors_in_memory,
        total_conversations=total_conversations,
        total_queries=total_queries,
        document_grounded_queries=doc_queries,
        web_fallback_queries=web_queries,
        web_fallback_rate_pct=round(fallback_rate, 2),
        positive_feedback_count=pos_feedback,
        negative_feedback_count=neg_feedback,
        user_satisfaction_rate_pct=round(satisfaction_rate, 2)
    )

@router.get(
    "/users",
    response_model=AdminUserListResponse,
    summary="List registered users with account statuses and activity (Admin only)"
)
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Returns a paginated list of registered user accounts with activity stats."""
    query = """
        SELECT u.id, u.email, u.full_name, u.role, u.is_active, u.gender, u.mobile_number, u.date_of_birth, u.created_at,
               COUNT(s.id) AS session_count
        FROM users u
        LEFT JOIN chat_sessions s ON u.id = s.user_id
    """
    params = []

    if search:
        query += " WHERE (u.email ILIKE %s OR u.full_name ILIKE %s)"
        pattern = f"%{search.strip()}%"
        params.extend([pattern, pattern])

    query += " GROUP BY u.id ORDER BY u.created_at DESC LIMIT %s OFFSET %s;"
    params.extend([limit, skip])

    with get_db_cursor() as cur:
        # Total count
        count_sql = "SELECT COUNT(*) AS count FROM users"
        if search:
            count_sql += " WHERE (email ILIKE %s OR full_name ILIKE %s);"
            cur.execute(count_sql, (pattern, pattern))
        else:
            cur.execute(count_sql + ";")
        total_count = cur.fetchone()["count"]

        cur.execute(query, tuple(params))
        users = cur.fetchall()

    return AdminUserListResponse(
        total=total_count,
        items=users
    )

@router.patch(
    "/users/{user_id}/status",
    summary="Activate or deactivate a user account (Admin only)"
)
def update_user_status(
    user_id: UUID,
    request: UserStatusUpdateRequest,
    raw_req: Request,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """
    Toggles user account active/inactive status:
    - Protects the acting administrator from self-deactivation.
    - Records an audit log entry for security traceability.
    """
    if str(user_id) == str(admin_user["id"]) and not request.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot deactivate their own account."
        )

    with get_db_cursor() as cur:
        cur.execute(
            """
            UPDATE users 
            SET is_active = %s, updated_at = NOW()
            WHERE id = %s
            RETURNING id, email, full_name, is_active;
            """,
            (request.is_active, user_id)
        )
        updated_user = cur.fetchone()

        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} was not found."
            )

    client_ip = raw_req.client.host if raw_req.client else None
    log_audit_event(
        action="USER_STATUS_TOGGLE",
        entity_type="user",
        user_id=admin_user["id"],
        entity_id=str(user_id),
        details={"email": updated_user["email"], "new_is_active": request.is_active},
        ip_address=client_ip
    )

    action_word = "activated" if request.is_active else "deactivated"
    logger.info(f"Admin {admin_user['email']} {action_word} user {updated_user['email']}")

    return {
        "message": f"User account successfully {action_word}.",
        "user_id": updated_user["id"],
        "is_active": updated_user["is_active"]
    }

@router.get(
    "/feedback/summary",
    response_model=AdminFeedbackSummaryResponse,
    summary="Get feedback overview and recent user reviews (Admin only)"
)
def get_feedback_summary(
    limit: int = Query(20, ge=1, le=100),
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Returns aggregated satisfaction metrics and the most recent user ratings and comments."""
    with get_db_cursor() as cur:
        # Aggregates
        cur.execute("SELECT COUNT(*) AS count FROM feedback;")
        total_feedback = cur.fetchone()["count"]

        cur.execute("SELECT COUNT(*) AS count FROM feedback WHERE rating = 1;")
        pos_feedback = cur.fetchone()["count"]

        cur.execute("SELECT COUNT(*) AS count FROM feedback WHERE rating = -1;")
        neg_feedback = cur.fetchone()["count"]

        # Recent feedback submissions
        cur.execute(
            """
            SELECT f.id, f.message_id, f.rating, f.comments, f.created_at,
                   u.email AS user_email,
                   m.content AS message_content, m.source_type
            FROM feedback f
            JOIN users u ON f.user_id = u.id
            JOIN chat_messages m ON f.message_id = m.id
            ORDER BY f.created_at DESC
            LIMIT %s;
            """,
            (limit,)
        )
        recent_feedbacks = cur.fetchall()

    sat_rate = (pos_feedback / total_feedback * 100.0) if total_feedback > 0 else 100.0

    return AdminFeedbackSummaryResponse(
        total_feedback_count=total_feedback,
        positive_count=pos_feedback,
        negative_count=neg_feedback,
        satisfaction_rate_pct=round(sat_rate, 2),
        recent_feedbacks=recent_feedbacks
    )

@router.get(
    "/audit-logs",
    response_model=AdminAuditLogResponse,
    summary="Inspect system administrative and security audit logs (Admin only)"
)
def get_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Retrieves chronological security audit logs."""
    with get_db_cursor() as cur:
        cur.execute("SELECT COUNT(*) AS count FROM audit_logs;")
        total_count = cur.fetchone()["count"]

        cur.execute(
            """
            SELECT a.id, a.user_id, a.action, a.entity_type, a.entity_id,
                   a.details, a.ip_address, a.created_at,
                   u.email AS user_email
            FROM audit_logs a
            LEFT JOIN users u ON a.user_id = u.id
            ORDER BY a.created_at DESC
            LIMIT %s OFFSET %s;
            """,
            (limit, skip)
        )
        logs = cur.fetchall()

    return AdminAuditLogResponse(
        total=total_count,
        items=logs
    )

