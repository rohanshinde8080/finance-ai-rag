import json
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.dependencies import get_current_user
from app.db.connection import get_db_cursor
from app.models.chat import (
    ChatSessionCreateRequest,
    ChatSessionDetail,
    ChatSessionListItem,
    ChatMessageItem,
    ChatAskRequest,
    ChatAskResponse
)
from app.services.rag_service import answer_financial_query
from app.utils.logger import logger

router = APIRouter(prefix="/chat", tags=["Chat & RAG"])

def generate_session_title(question: str) -> str:
    """Generates a clean concise conversation title from the first question."""
    title = question.strip().replace("\n", " ")
    if len(title) > 60:
        return title[:57].rstrip() + "..."
    return title

@router.post(
    "/sessions",
    response_model=ChatSessionDetail,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new conversation session"
)
def create_session(
    request: Optional[ChatSessionCreateRequest] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Initializes a new isolated chat session for the authenticated user."""
    user_id = current_user["id"]
    title = request.title.strip() if request and request.title else "New Conversation"

    with get_db_cursor() as cur:
        cur.execute(
            """
            INSERT INTO chat_sessions (user_id, title)
            VALUES (%s, %s)
            RETURNING id, title, created_at, updated_at;
            """,
            (user_id, title)
        )
        session = cur.fetchone()

    logger.info(f"Created chat session {session['id']} for user {current_user['email']}")
    return {
        "id": session["id"],
        "title": session["title"],
        "created_at": session["created_at"],
        "updated_at": session["updated_at"],
        "messages": []
    }

@router.get(
    "/sessions",
    response_model=List[ChatSessionListItem],
    summary="List past chat sessions for current user"
)
def list_sessions(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Returns all past chat sessions owned by the authenticated user, sorted by recency."""
    user_id = current_user["id"]

    with get_db_cursor() as cur:
        cur.execute(
            """
            SELECT s.id, s.title, s.created_at, s.updated_at,
                   COUNT(m.id) AS message_count
            FROM chat_sessions s
            LEFT JOIN chat_messages m ON s.id = m.session_id
            WHERE s.user_id = %s
            GROUP BY s.id
            ORDER BY s.updated_at DESC;
            """,
            (user_id,)
        )
        sessions = cur.fetchall()

    return sessions

@router.get(
    "/sessions/{session_id}",
    response_model=ChatSessionDetail,
    summary="Get full conversation history for a specific session"
)
def get_session(
    session_id: UUID,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Retrieves full message history of a chat session.
    Enforces strict user isolation: returns 404 if session is not owned by caller.
    """
    user_id = current_user["id"]

    with get_db_cursor() as cur:
        # Check session ownership
        cur.execute(
            "SELECT id, title, created_at, updated_at FROM chat_sessions WHERE id = %s AND user_id = %s;",
            (session_id, user_id)
        )
        session = cur.fetchone()

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversation session {session_id} not found."
            )

        # Retrieve messages chronologically
        cur.execute(
            """
            SELECT id, sender, content, source_type, metadata, created_at
            FROM chat_messages
            WHERE session_id = %s
            ORDER BY created_at ASC;
            """,
            (session_id,)
        )
        messages = cur.fetchall()

    session["messages"] = messages
    return session

@router.delete(
    "/sessions/{session_id}",
    summary="Delete a conversation session and all its messages"
)
def delete_session(
    session_id: UUID,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Deletes a user's chat session.
    Cascades automatically to delete associated chat_messages and feedback.
    """
    user_id = current_user["id"]

    with get_db_cursor() as cur:
        cur.execute(
            "DELETE FROM chat_sessions WHERE id = %s AND user_id = %s RETURNING id;",
            (session_id, user_id)
        )
        deleted = cur.fetchone()

        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversation session {session_id} not found."
            )

    logger.info(f"User {current_user['email']} deleted chat session {session_id}")
    return {"message": "Conversation session deleted successfully."}

@router.post(
    "/ask",
    response_model=ChatAskResponse,
    summary="Submit a financial question to the assistant"
)
def ask_question(
    request: ChatAskRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Core conversational RAG endpoint:
    1. Validates or initializes user session.
    2. Saves incoming user question to PostgreSQL.
    3. Executes RAG pipeline (FAISS similarity -> Document grounding OR Tavily fallback).
    4. Persists assistant response with citations and metadata.
    5. Returns grounded answer with exact citations and disclaimer.
    """
    user_id = current_user["id"]
    question = request.question.strip()

    with get_db_cursor() as cur:
        # Step 1: Resolve or create session
        if request.session_id:
            cur.execute(
                "SELECT id, title FROM chat_sessions WHERE id = %s AND user_id = %s;",
                (request.session_id, user_id)
            )
            session = cur.fetchone()
            if not session:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Conversation session {request.session_id} not found."
                )
            session_id = session["id"]
        else:
            initial_title = generate_session_title(question)
            cur.execute(
                """
                INSERT INTO chat_sessions (user_id, title)
                VALUES (%s, %s)
                RETURNING id;
                """,
                (user_id, initial_title)
            )
            session_id = cur.fetchone()["id"]

        # Step 2: Store user message
        cur.execute(
            """
            INSERT INTO chat_messages (session_id, sender, content, source_type)
            VALUES (%s, 'user', %s, 'direct')
            RETURNING id;
            """,
            (session_id, question)
        )
        user_message_id = cur.fetchone()["id"]

    # Step 3: Execute RAG Orchestration
    rag_result = answer_financial_query(question, category=request.category)

    # Step 4: Persist assistant message with citations & confidence metadata
    citations_data = [c.model_dump() for c in rag_result.citations]
    web_sources_data = [w.model_dump() for w in rag_result.web_sources]
    metadata_json = json.dumps({
        "citations": citations_data,
        "web_sources": web_sources_data,
        "confidence_score": rag_result.confidence_score
    })

    with get_db_cursor() as cur:
        cur.execute(
            """
            INSERT INTO chat_messages (session_id, sender, content, source_type, metadata)
            VALUES (%s, 'assistant', %s, %s, %s::jsonb)
            RETURNING id, created_at;
            """,
            (session_id, rag_result.answer, rag_result.source_type, metadata_json)
        )
        assistant_row = cur.fetchone()
        assistant_message_id = assistant_row["id"]
        created_at = assistant_row["created_at"]

        # Update session title if default and update timestamp
        new_title = generate_session_title(question)
        cur.execute(
            """
            UPDATE chat_sessions 
            SET updated_at = NOW(),
                title = CASE WHEN title = 'New Conversation' THEN %s ELSE title END
            WHERE id = %s;
            """,
            (new_title, session_id)
        )

    logger.info(
        f"Answered query for user {current_user['email']} in session {session_id} "
        f"(Source: {rag_result.source_type}, Score: {rag_result.confidence_score:.4f})"
    )

    return ChatAskResponse(
        session_id=session_id,
        user_message_id=user_message_id,
        assistant_message_id=assistant_message_id,
        answer=rag_result.answer,
        source_type=rag_result.source_type,
        confidence_score=rag_result.confidence_score,
        citations=rag_result.citations,
        web_sources=rag_result.web_sources,
        disclaimer=rag_result.disclaimer,
        created_at=created_at
    )

