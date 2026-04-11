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
from services.parser import parse_resume, extract_skills_with_gemini
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

class JDSubmitRequest(BaseModel):
    """Request body for POST /resume/jd"""
    user_id: str
    jd_text: str


class JDSubmitResponse(BaseModel):
    """Response body for POST /resume/jd"""
    parsed_skills: list[str]
    skill_count: int
    message: str


class ResumeMetadataResponse(BaseModel):
    """
    Lightweight resume metadata returned by GET /resume/{user_id}.
    We deliberately exclude raw_text to keep the response small.
    """
    user_id     : str
    filename    : str
    skill_count : int
    skills      : list[str]
    uploaded_at : datetime | None


# ─────────────────────────────────────────────────────────────────────────────
#  POST /upload
#  Full resume ingestion pipeline: validate → parse → embed → save
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/upload",
    status_code=status.HTTP_201_CREATED,
    summary="Upload a resume (PDF or DOCX)",
    description=(
        "Accepts a PDF or DOCX resume file and a user_id. "
        "Extracts text and skills using Gemini, creates embeddings "
        "with Gemini text-embedding-004, and stores everything in "
        "MongoDB and ChromaDB."
    ),
)
async def upload_resume(
    user_id: str        = Form(..., description="Unique user identifier"),
    file   : UploadFile = File(..., description="Resume file (.pdf or .docx only)"),
):
    """
    Upload and fully process a resume for a user.

    Pipeline:
        1. Validate that the file extension is .pdf or .docx.
        2. Read raw bytes from the uploaded file.
        3. Call parse_resume() → extract text + skills via Gemini.
        4. Call embed_resume() → chunk text and store in ChromaDB
           using Gemini text-embedding-004 vectors.
        5. Call save_resume() → upsert into MongoDB.
        6. Return a success response with skill count.

    Raises:
        400: If the file type is not .pdf or .docx.
        422: FastAPI auto-validation if form fields are missing.
        500: If any step in the pipeline fails unexpectedly.
    """
    logger.info(f"POST /upload — user='{user_id}', file='{file.filename}'")

    # ── Step 1: Validate file extension ───────────────────────────────────
    filename    = file.filename or ""
    file_suffix = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if file_suffix not in ALLOWED_EXTENSIONS:
        logger.warning(f"Rejected upload: unsupported file type '{file_suffix}'")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Unsupported file type '{file_suffix}'. "
                "Please upload a .pdf or .docx file."
            ),
        )

    # ── Step 2: Read raw bytes from the upload ─────────────────────────────
    try:
        file_bytes = await file.read()
    except Exception as e:
        logger.error(f"Failed to read uploaded file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to read the uploaded file. Please try again.",
        )

    # Guard: reject empty files
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty.",
        )

    # ── Step 3: Parse resume text and extract skills via Gemini ───────────
    try:
        parsed = parse_resume(file_bytes, filename)   # returns {raw_text, extracted_skills}
    except ValueError as e:
        # parse_resume raises ValueError for unsupported file types (extra guard)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"parse_resume failed for user '{user_id}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Resume parsing failed. Please try again.",
        )

    raw_text         = parsed["raw_text"]
    extracted_skills = parsed["extracted_skills"]

    if not raw_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "No readable text could be extracted from the file. "
                "Ensure the resume is not a scanned image-only PDF."
            ),
        )

    # ── Step 4: Embed resume chunks in ChromaDB with Gemini embeddings ─────
    try:
        embed_success = embed_resume(user_id, raw_text)
        if not embed_success:
            logger.warning(f"embed_resume returned False for user '{user_id}'")
            # Non-fatal: continue — MongoDB save still works without embeddings
    except Exception as e:
        logger.error(f"embed_resume raised for user '{user_id}': {e}")
        # Non-fatal: embeddings failing should not block the upload

    # ── Step 5: Upsert resume document in MongoDB ──────────────────────────
    resume_doc = {
        "user_id"         : user_id,
        "filename"        : filename,
        "raw_text"        : raw_text,
        "extracted_skills": extracted_skills,
        "uploaded_at"     : datetime.utcnow(),
    }

    try:
        doc_id = save_resume(user_id, resume_doc)
    except Exception as e:
        logger.error(f"save_resume failed for user '{user_id}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save resume to database. Please try again.",
        )

    logger.info(
        f"Resume upload complete — user='{user_id}', "
        f"skills={len(extracted_skills)}, doc_id={doc_id}"
    )

    # ── Step 6: Return success response ───────────────────────────────────
    return {
        "message"        : "Resume uploaded and processed successfully.",
        "filename"       : filename,
        "skill_count"    : len(extracted_skills),
        "extracted_skills": extracted_skills,
        "doc_id"         : doc_id,
    }


# ─────────────────────────────────────────────────────────────────────────────
#  POST /jd
#  Accept a job description text for a user and extract its skills
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/jd",
    status_code=status.HTTP_200_OK,
    response_model=JDSubmitResponse,
    summary="Submit a job description for skill extraction",
    description=(
        "Accepts a job description string and a user_id. "
        "Calls Gemini to extract required skills from the JD and saves "
        "them to the user's MongoDB resume document for use in skill-gap analysis."
    ),
)
async def submit_job_description(body: JDSubmitRequest):
    """
    Parse a job description and attach the extracted skills to the user's profile.

    Why save JD skills to the resume document?
        The skill-gap analysis endpoint needs both resume skills and JD skills.
        Saving the JD here lets the frontend call /analysis/skill-gap with just
        a user_id (no need to resend the full JD text on every call).

    Raises:
        400: If jd_text is empty.
        404: If no resume found for the user (must upload resume first).
        500: On extraction or DB failure.
    """
    logger.info(f"POST /jd — user='{body.user_id}', jd_text={len(body.jd_text)} chars")

    # Guard: reject empty JD text
    if not body.jd_text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="jd_text cannot be empty.",
        )

    # Guard: ensure user has an uploaded resume
    existing_resume = get_resume(body.user_id)
    if not existing_resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "No resume found for this user. "
                "Please upload your resume before submitting a job description."
            ),
        )

    # ── Extract skills from the JD using Gemini (gemini-flash-latest) ─────
    try:
        jd_skills = extract_skills_with_gemini(body.jd_text)
    except Exception as e:
        logger.error(f"extract_skills_with_gemini (JD) failed for user '{body.user_id}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Skill extraction from job description failed.",
        )

    # ── Save JD data to the user's existing resume document ───────────────
    try:
        save_resume(body.user_id, {
            "jd_text"  : body.jd_text,
            "jd_skills": jd_skills,
            "jd_saved_at": datetime.utcnow(),
        })
    except Exception as e:
        logger.error(f"Failed to save JD skills for user '{body.user_id}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save job description to database.",
        )

    logger.info(
        f"JD saved for user '{body.user_id}' — {len(jd_skills)} skills extracted"
    )

    return JDSubmitResponse(
        parsed_skills=jd_skills,
        skill_count=len(jd_skills),
        message="Job description parsed and saved successfully.",
    )


# ─────────────────────────────────────────────────────────────────────────────
#  GET /{user_id}
#  Retrieve lightweight resume metadata for a user
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/{user_id}",
    status_code=status.HTTP_200_OK,
    response_model=ResumeMetadataResponse,
    summary="Get resume metadata for a user",
    description=(
        "Returns resume metadata (filename, skills, upload date) for a user. "
        "Does NOT return the full resume text to keep the response lightweight."
    ),
)
async def get_resume_metadata(user_id: str):
    """
    Fetch and return lightweight resume metadata for the given user.

    Why exclude raw_text?
        The resume text can be thousands of characters — no frontend component
        needs the full text via this endpoint. Skills and metadata are enough
        for the dashboard display. Full text is used internally by services.

    Raises:
        404: If no resume exists for this user_id.
    """
    logger.info(f"GET /resume/{user_id}")

    resume = get_resume(user_id)

    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No resume found for user '{user_id}'. Please upload a resume first.",
        )

    skills = resume.get("extracted_skills", [])

    return ResumeMetadataResponse(
        user_id     = user_id,
        filename    = resume.get("filename", "unknown"),
        skill_count = len(skills),
        skills      = skills,
        uploaded_at = resume.get("uploaded_at"),
    )
