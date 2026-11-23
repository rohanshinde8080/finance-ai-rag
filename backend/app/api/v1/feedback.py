from typing import Any, Dict, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.dependencies import get_current_user
from app.db.connection import get_db_cursor
from app.models.feedback import FeedbackCreateRequest, FeedbackResponse, UserFeedbackItem
from app.utils.logger import logger

router = APIRouter(prefix="/feedback", tags=["Feedback"])

@router.post(
    "",
    response_model=FeedbackResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit user feedback on an AI assistant answer"
)
@router.post(
    "/",
    response_model=FeedbackResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False
)
def submit_feedback(
    request: FeedbackCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Submits feedback (Thumbs Up +1 or Thumbs Down -1 with optional comment):
    - Validates that the message is an assistant message.
    - Prevents duplicates via UPSERT on (message_id, user_id).
    """
    user_id = current_user["id"]

    with get_db_cursor() as cur:
        # Verify assistant message existence
        cur.execute(
            "SELECT id, sender FROM chat_messages WHERE id = %s;",
            (request.message_id,)
        )
        msg = cur.fetchone()
        if not msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Message with ID {request.message_id} was not found."
            )

        if msg["sender"] != "assistant":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Feedback can only be submitted on assistant responses."
            )

        # Upsert feedback
        cur.execute(
            """
            INSERT INTO feedback (message_id, user_id, rating, comments)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (message_id, user_id) DO UPDATE
            SET rating = EXCLUDED.rating,
                comments = EXCLUDED.comments,
                created_at = NOW()
            RETURNING id, message_id, user_id, rating, comments, created_at;
            """,
            (request.message_id, user_id, request.rating, request.comments)
        )
        fb = cur.fetchone()

    logger.info(
        f"Feedback recorded: User {current_user['email']} rated message {request.message_id} as {request.rating}"
    )

    return FeedbackResponse(
        id=fb["id"],
        message_id=fb["message_id"],
        user_id=fb["user_id"],
        rating=fb["rating"],
        comments=fb["comments"],
        created_at=fb["created_at"],
        message="Feedback recorded successfully."
    )

@router.get(
    "/my",
    response_model=List[UserFeedbackItem],
    summary="List feedback submitted by current user"
)
def get_my_feedback(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Returns all ratings and comments submitted by the logged-in user."""
    user_id = current_user["id"]

    with get_db_cursor() as cur:
        cur.execute(
            """
            SELECT f.id, f.message_id, f.rating, f.comments, f.created_at,
                   m.content AS message_content
            FROM feedback f
            JOIN chat_messages m ON f.message_id = m.id
            WHERE f.user_id = %s
            ORDER BY f.created_at DESC;
            """,
            (user_id,)
        )
        feedbacks = cur.fetchall()

    return feedbacks
