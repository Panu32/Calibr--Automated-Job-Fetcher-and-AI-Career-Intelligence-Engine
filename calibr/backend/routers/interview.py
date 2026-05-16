"""
routers/interview.py
─────────────────────────────────────────────────────────────────────────────
Calibr – AI Interview Router

Endpoints:
  POST /api/v1/interview/start                 – Start a new interview session
  POST /api/v1/interview/answer                – Submit answer, get next question
  GET  /api/v1/interview/session/{session_id}  – Get current session state
  GET  /api/v1/interview/phases                – Get all phase metadata
─────────────────────────────────────────────────────────────────────────────
"""

import uuid
import logging
import asyncio

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from services.interview_agent import (
    start_interview_session,
    submit_answer,
    get_session,
    get_all_phases,
)
from db.mongodb import get_resume

logger = logging.getLogger("calibr.router.interview")
router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
#  Request / Response Models
# ─────────────────────────────────────────────────────────────────────────────

class StartInterviewRequest(BaseModel):
    user_id:         str
    job_title:       str
    job_company:     str
    job_description: str
    job_url:         str = ""


class SubmitAnswerRequest(BaseModel):
    session_id: str
    answer:     str


# ─────────────────────────────────────────────────────────────────────────────
#  POST /start
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/start", status_code=status.HTTP_200_OK)
async def start_interview(body: StartInterviewRequest):
    """
    Initializes a new interview session for the given user + job.
    Fetches the user's resume from MongoDB, runs the web_searcher agent,
    and generates the very first question.
    Returns the session_id and first question.
    """
    logger.info(f"POST /interview/start — user={body.user_id}, job={body.job_title}")

    # Get resume from MongoDB
    resume_doc = get_resume(body.user_id)
    if not resume_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Please upload your resume before starting an interview.",
        )

    resume_text = resume_doc.get("raw_text", "")
    user_name = resume_doc.get("user_name", "Candidate")

    if not resume_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Resume text is empty. Please re-upload your resume.",
        )

    # Generate unique session ID
    session_id = str(uuid.uuid4())

    try:
        result = await asyncio.to_thread(
            start_interview_session,
            session_id,
            body.job_title,
            body.job_company,
            body.job_description,
            body.job_url,
            resume_text,
            user_name,
        )
        return result
    except Exception as e:
        logger.error(f"start_interview_session failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start interview: {str(e)}",
        )


# ─────────────────────────────────────────────────────────────────────────────
#  POST /answer
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/answer", status_code=status.HTTP_200_OK)
async def answer_question(body: SubmitAnswerRequest):
    """
    Submits the user's answer to the current question.
    Returns evaluation (score + feedback) and the next question.
    If interview is complete, returns the final report.
    """
    logger.info(f"POST /interview/answer — session={body.session_id}")

    if not body.answer or not body.answer.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Answer cannot be empty.",
        )

    try:
        result = await asyncio.to_thread(submit_answer, body.session_id, body.answer)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"submit_answer failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process answer: {str(e)}",
        )


# ─────────────────────────────────────────────────────────────────────────────
#  GET /session/{session_id}
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/session/{session_id}", status_code=status.HTTP_200_OK)
async def get_interview_session(session_id: str):
    """Returns the current state of an interview session (for page refresh recovery)."""
    logger.info(f"GET /interview/session/{session_id}")
    result = get_session(session_id)
    if "error" in result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=result["error"])
    return result


# ─────────────────────────────────────────────────────────────────────────────
#  GET /phases
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/phases", status_code=status.HTTP_200_OK)
async def get_phases():
    """Returns all interview phases with labels and question counts."""
    return {"phases": get_all_phases()}
