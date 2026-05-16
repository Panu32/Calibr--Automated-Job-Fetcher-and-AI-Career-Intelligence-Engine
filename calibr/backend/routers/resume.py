"""
routers/resume.py
─────────────────────────────────────────────────────────────────────────────
Calibr – Resume Router

Handles everything related to uploading and accessing a user's resume:
  POST /api/v1/resume/upload  – Upload a PDF/DOCX, parse it, embed it, save it
  POST /api/v1/resume/jd      – Submit a job description text for a user
  GET  /api/v1/resume/{user_id} – Retrieve resume metadata for a user
─────────────────────────────────────────────────────────────────────────────
"""

# ── Standard library ──────────────────────────────────────────────────────────
import logging
from datetime import datetime

# ── Third-party: FastAPI ───────────────────────────────────────────────────────
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel

# ── Internal: services ────────────────────────────────────────────────────────
from services.parser import parse_resume
from services.embedder import embed_resume

# ── Internal: database ────────────────────────────────────────────────────────
from db.mongodb import save_resume, get_resume

# ── Module-level logger ───────────────────────────────────────────────────────
logger = logging.getLogger("calibr.router.resume")

# ── Router instance ───────────────────────────────────────────────────────────
# prefix and tags are applied in main.py when this router is registered.
router = APIRouter()

# ── Allowed file extensions for resume uploads ────────────────────────────────
ALLOWED_EXTENSIONS = {".pdf", ".docx"}


# ─────────────────────────────────────────────────────────────────────────────
#  Request / Response models
#  Defined here (not in schemas.py) because they are specific to this router's
#  API contract and not shared across the application.
# ─────────────────────────────────────────────────────────────────────────────

class ResumeMetadataResponse(BaseModel):
    """
    Lightweight resume metadata returned by GET /resume/{user_id}.
    """
    user_id     : str
    filename    : str
    uploaded_at : datetime | None

# ─────────────────────────────────────────────────────────────────────────────
#  POST /upload
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/upload",
    status_code=status.HTTP_201_CREATED,
    summary="Upload a resume (PDF or DOCX)",
    description=(
        "Accepts a PDF or DOCX resume file and a user_id. "
        "Extracts text, creates embeddings, and stores everything in "
        "MongoDB and ChromaDB."
    ),
)
async def upload_resume(
    user_id: str        = Form(..., description="Unique user identifier"),
    file   : UploadFile = File(..., description="Resume file (.pdf or .docx only)"),
):
    """
    Upload and fully process a resume for a user.
    """
    logger.info(f"POST /upload — user='{user_id}', file='{file.filename}'")

    if not user_id or user_id.lower() in {"null", "undefined", ""}:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User session is invalid. Please log in again.",
        )

    filename    = file.filename or ""
    file_suffix = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if file_suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{file_suffix}'.",
        )

    try:
        file_bytes = await file.read()
    except Exception as e:
        logger.error(f"Failed to read file: {e}")
        raise HTTPException(status_code=500, detail="Failed to read file.")

    if not file_bytes:
        raise HTTPException(status_code=400, detail="File is empty.")

    try:
        parsed = parse_resume(file_bytes, filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"parse_resume failed: {e}")
        raise HTTPException(status_code=500, detail="Parsing failed.")

    raw_text = parsed["raw_text"]

    if not raw_text:
        raise HTTPException(status_code=422, detail="No text extracted.")

    # Embed for RAG
    try:
        embed_resume(user_id, raw_text)
    except Exception as e:
        logger.error(f"embed_resume failed: {e}")

    # Save to Mongo
    resume_doc = {
        "user_id"     : user_id,
        "filename"    : filename,
        "raw_text"    : raw_text,
        "uploaded_at" : datetime.utcnow(),
    }

    try:
        doc_id = save_resume(user_id, resume_doc)
    except Exception as e:
        logger.error(f"save_resume failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to save to database.")

    return {
        "message" : "Resume uploaded successfully.",
        "filename": filename,
        "doc_id"  : doc_id,
    }


# ─────────────────────────────────────────────────────────────────────────────
#  GET /{user_id}
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/{user_id}",
    status_code=status.HTTP_200_OK,
    response_model=ResumeMetadataResponse,
    summary="Get resume metadata for a user",
)
async def get_resume_metadata(user_id: str):
    """
    Fetch and return lightweight resume metadata for the given user.
    """
    logger.info(f"GET /resume/{user_id}")

    resume = get_resume(user_id)

    if not resume:
        raise HTTPException(status_code=404, detail="No resume found.")

    return ResumeMetadataResponse(
        user_id     = user_id,
        filename    = resume.get("filename", "unknown"),
        uploaded_at = resume.get("uploaded_at"),
    )
