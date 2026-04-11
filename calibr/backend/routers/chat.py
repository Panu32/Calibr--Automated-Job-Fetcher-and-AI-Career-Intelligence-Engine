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

@router.post(
    "/message",
    status_code=status.HTTP_200_OK,
    response_model=ChatMessageResponse,
    summary="Send a message to Calibr AI career coach",
    description=(
        "Accepts a user message and returns a personalised AI response. "
        "The AI has access to the user's resume and recent chat history. "
        "Uses RAG to inject relevant job data when asking job-related questions. "
        "Requires the user to have uploaded a resume first."
    ),
)
async def send_chat_message(body: ChatMessageRequest):
    """
    Process a user message through the full RAG chat pipeline.

    Pipeline (all handled inside chat_with_resume()):
        1. Load the last 10 messages from MongoDB for conversation context.
        2. Embed the user's question with Gemini text-embedding-004.
        3. Retrieve top-3 semantically relevant job snippets from ChromaDB.
        4. Inject resume + history + RAG context into CHAT_PROMPT.
        5. Call Gemini (gemini-flash-latest) via the LCEL chain.
        6. Save both the user message and assistant response to MongoDB.
        7. Return the response string.

    Pre-check:
        Before invoking the expensive LLM pipeline, we verify the user has an
        uploaded resume. Without a resume, the AI's "personalised" answers
        would be meaningless — and we can give a much clearer error message
        than Gemini would.

    Raises:
        400: Message content is empty.
        404: No resume uploaded yet (with a helpful instruction message).
        500: LLM or pipeline failure.
    """
    logger.info(
        f"POST /chat/message — user='{body.user_id}', "
        f"message='{body.message[:60]}{'…' if len(body.message) > 60 else ''}'"
    )

    # ── Guard: reject empty messages ───────────────────────────────────────
    if not body.message or not body.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message cannot be empty.",
        )

    # ── Guard: ensure user has uploaded a resume ───────────────────────────
    # We check BEFORE calling the LLM so we give a fast, clear error.
    # Without a resume, the CHAT_PROMPT would have empty {resume_text}
    # and responses would be generic and useless.
    resume_doc = get_resume(body.user_id)

    if not resume_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Please upload your resume first so I can give you personalised answers. "
                "Go to the Resume tab and upload your PDF or DOCX file — "
                "it only takes a moment!"
            ),
        )

    resume_text = resume_doc.get("raw_text", "")

    if not resume_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Your resume appears to have been uploaded but contains no readable text. "
                "Please re-upload your resume."
            ),
        )

    # ── Invoke the RAG chat pipeline ───────────────────────────────────────
    try:
        start_time = time.perf_counter()
        response = chat_with_resume(
            user_id     = body.user_id,
            question    = body.message.strip(),
            resume_text = resume_text,
        )
        duration = time.perf_counter() - start_time
        logger.info(f"chat_with_resume completed in {duration:.2f}s for user '{body.user_id}'")
    except Exception as e:
        logger.error(f"chat_with_resume raised for user '{body.user_id}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "The AI is temporarily unavailable. "
                "Please try again in a moment."
            ),
        )

    # Guard: if the response came back empty (shouldn't happen but just in case)
    if not response or not response.strip():
        response = "I'm sorry, I couldn't generate a response. Please try rephrasing your question."

    timestamp = datetime.utcnow()

    logger.info(
        f"POST /chat/message — response {len(response)} chars "
        f"for user '{body.user_id}'"
    )

    return ChatMessageResponse(
        response  = response,
        timestamp = timestamp,
        user_id   = body.user_id,
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
