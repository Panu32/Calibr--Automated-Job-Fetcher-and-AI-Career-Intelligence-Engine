"""
routers/chat.py
─────────────────────────────────────────────────────────────────────────────
Calibr – RAG Career Chat Router

Handles the AI career chat interface:
  POST   /api/v1/chat/message          – Send a message to Calibr AI
  GET    /api/v1/chat/history/{user_id} – Retrieve chat history
  DELETE /api/v1/chat/history/{user_id} – Clear chat history
─────────────────────────────────────────────────────────────────────────────
"""

# ── Standard library ──────────────────────────────────────────────────────────
import logging
import time
from datetime import datetime

# ── Third-party: FastAPI ───────────────────────────────────────────────────────
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

# ── Internal: RAG chain service ───────────────────────────────────────────────
from services.rag_chain import chat_with_resume

# ── Internal: database ────────────────────────────────────────────────────────
from db.mongodb import (
    get_resume,
    get_chat_history,
    get_db,
    CHAT_HISTORY_COLLECTION,
)

# ── Module-level logger ───────────────────────────────────────────────────────
logger = logging.getLogger("calibr.router.chat")

# ── Router instance ───────────────────────────────────────────────────────────
router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
#  Request / Response models
# ─────────────────────────────────────────────────────────────────────────────

class ChatMessageRequest(BaseModel):
    """Request body for POST /chat/message"""
    user_id : str
    message : str


class ChatMessageResponse(BaseModel):
    """Response body for POST /chat/message"""
    response   : str
    timestamp  : datetime
    user_id    : str


class ChatHistoryItem(BaseModel):
    """A single message in the chat history list."""
    role      : str          # "user" or "assistant"
    content   : str
    timestamp : datetime | None = None


class ChatHistoryResponse(BaseModel):
    """Response body for GET /chat/history/{user_id}"""
    user_id      : str
    message_count: int
    messages     : list[ChatHistoryItem]


# ─────────────────────────────────────────────────────────────────────────────
#  POST /message
#  Main chat endpoint — the user sends a message, Calibr AI responds
# ─────────────────────────────────────────────────────────────────────────────

from fastapi.responses import StreamingResponse
from services.rag_chain import chat_with_resume_stream

@router.post(
    "/message",
    status_code=status.HTTP_200_OK,
    summary="Send a message to Calibr AI (Streaming)",
    description=(
        "Streams a personalised AI response. "
        "The AI has access to the user's resume and market context."
    ),
)
async def send_chat_message(body: ChatMessageRequest):
    """
    Process a user message and return a StreamingResponse.
    Yields 'THINKING: ...' updates then the raw AI text.
    """
    logger.info(f"POST /chat/message (Stream) — user='{body.user_id}'")

    if not body.message or not body.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message cannot be empty.",
        )

    resume_doc = get_resume(body.user_id)
    if not resume_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Please upload your resume first so I can give you personalised answers.",
        )

    resume_text = resume_doc.get("raw_text", "")
    
    # We return a StreamingResponse that iterates over the rag_chain generator
    return StreamingResponse(
        chat_with_resume_stream(
            user_id     = body.user_id,
            question    = body.message.strip(),
            resume_text = resume_text,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no", # For Nginx compatibility if present
        }
    )


# ─────────────────────────────────────────────────────────────────────────────
#  GET /history/{user_id}
#  Retrieve the last 20 chat messages for a user
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/history/{user_id}",
    status_code=status.HTTP_200_OK,
    response_model=ChatHistoryResponse,
    summary="Get chat history for a user",
    description=(
        "Returns the last 20 chat messages for the given user, "
        "ordered chronologically (oldest first). "
        "Returns an empty list if no chat history exists."
    ),
)
async def get_user_chat_history(user_id: str):
    """
    Retrieve the chat history for a user from MongoDB.

    Returns up to 20 messages in chronological order (oldest message first),
    which is the natural reading order for a chat UI.

    The endpoint returns an empty messages list (not a 404) when no history
    exists — this is expected for new users and should not be an error.

    Raises:
        500: On database failure.
    """
    logger.info(f"GET /chat/history/{user_id}")

    try:
        # get_chat_history returns messages in chronological order (oldest first)
        raw_messages = get_chat_history(user_id=user_id, limit=20)
    except Exception as e:
        logger.error(f"get_chat_history failed for user '{user_id}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve chat history.",
        )

    # Convert raw MongoDB dicts to our response model
    messages = [
        ChatHistoryItem(
            role      = msg.get("role", "user"),
            content   = msg.get("content", ""),
            timestamp = msg.get("timestamp"),
        )
        for msg in raw_messages
    ]

    logger.info(
        f"GET /chat/history/{user_id} — returning {len(messages)} messages"
    )

    return ChatHistoryResponse(
        user_id       = user_id,
        message_count = len(messages),
        messages      = messages,
    )


# ─────────────────────────────────────────────────────────────────────────────
#  DELETE /history/{user_id}
#  Clear all chat history for a user
# ─────────────────────────────────────────────────────────────────────────────

@router.delete(
    "/history/{user_id}",
    status_code=status.HTTP_200_OK,
    summary="Clear chat history for a user",
    description=(
        "Permanently deletes all chat messages for the given user. "
        "This cannot be undone."
    ),
)
async def delete_chat_history(user_id: str):
    """
    Delete all chat history entries for a user from MongoDB.

    Use cases:
        - User wants to start a fresh conversation.
        - Privacy/GDPR data deletion request.
        - Frontend "Clear chat" button.

    Note: This does NOT delete the resume or job data — only chat messages.
    The user can immediately start a new conversation after calling this.

    Raises:
        500: On database failure.
    """
    logger.info(f"DELETE /chat/history/{user_id}")

    try:
        db         = get_db()
        collection = db[CHAT_HISTORY_COLLECTION]

        # Delete ALL messages for this user
        result = collection.delete_many({"user_id": user_id})
        deleted_count = result.deleted_count

    except Exception as e:
        logger.error(f"delete_chat_history failed for user '{user_id}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to clear chat history.",
        )

    logger.info(
        f"DELETE /chat/history/{user_id} — "
        f"{deleted_count} messages deleted"
    )

    return {
        "message"      : f"Chat history cleared. {deleted_count} message(s) deleted.",
        "user_id"      : user_id,
        "deleted_count": deleted_count,
        "cleared_at"   : datetime.utcnow().isoformat(),
    }
