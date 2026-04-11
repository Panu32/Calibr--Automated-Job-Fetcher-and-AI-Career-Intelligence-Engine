"""
routers/analysis.py
─────────────────────────────────────────────────────────────────────────────
Calibr – Skill Gap Analysis Router

Handles the AI-powered career analysis features:
  POST /api/v1/analysis/skill-gap – Run a full skill gap analysis between
                                    a user's resume and a job description
─────────────────────────────────────────────────────────────────────────────
"""

# ── Standard library ──────────────────────────────────────────────────────────
import logging

# ── Third-party: FastAPI ───────────────────────────────────────────────────────
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

# ── Internal: services ────────────────────────────────────────────────────────
from services.skill_gap import analyze_skill_gap
from services.parser import extract_skills_with_gemini

# ── Internal: database ────────────────────────────────────────────────────────
from db.mongodb import get_resume

# ── Module-level logger ───────────────────────────────────────────────────────
logger = logging.getLogger("calibr.router.analysis")

# ── Router instance ───────────────────────────────────────────────────────────
router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
#  Request / Response models
# ─────────────────────────────────────────────────────────────────────────────

class SkillGapRequest(BaseModel):
    """
    Request body for POST /analysis/skill-gap.

    jd_text is optional: if not provided, the endpoint falls back to the
    job description previously saved via POST /resume/jd.
    This lets the frontend avoid re-sending the full JD text every time.
    """
    user_id: str
    jd_text: str | None = None   # optional — falls back to saved JD in MongoDB


class SkillGapResponse(BaseModel):
    """
    Full skill gap analysis result returned to the frontend.
    Mirrors the SkillGapResult schema from models/schemas.py,
    plus the extra fields that Gemini produces (match %, summary).
    """
    has_skills               : list[str]
    missing_skills           : list[str]
    weak_skills              : list[str]
    recommendations          : list[str]
    overall_match_percentage : int
    summary                  : str
    resume_skills            : list[str]    # echo back for UI display
    jd_skills                : list[str]    # echo back for UI display


# ─────────────────────────────────────────────────────────────────────────────
#  POST /skill-gap
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/skill-gap",
    status_code=status.HTTP_200_OK,
    response_model=SkillGapResponse,
    summary="Run a skill gap analysis",
    description=(
        "Compares a user's resume skills against a job description. "
        "Returns a structured breakdown of has_skills, missing_skills, "
        "weak_skills, actionable recommendations, and an overall match score. "
        "If jd_text is not provided, uses the JD previously saved via POST /resume/jd."
    ),
)
async def run_skill_gap_analysis(body: SkillGapRequest):
    """
    Run an AI-powered skill gap analysis using Gemini (gemini-flash-latest).

    Pipeline:
        1. Validate that the user has an uploaded resume.
        2. Determine the JD text source — body.jd_text or saved MongoDB JD.
        3. Extract skills from the JD using Gemini (if not already cached).
        4. Call analyze_skill_gap() with resume + JD data.
        5. Return the full analysis result.

    Raises:
        404: No resume found for user_id.
        400: No JD text available (not in body and not saved previously).
        500: Analysis failed internally.
    """
    logger.info(f"POST /skill-gap — user='{body.user_id}'")

    # ── Step 1: Fetch the user's resume from MongoDB ───────────────────────
    resume_doc = get_resume(body.user_id)

    if not resume_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"No resume found for user '{body.user_id}'. "
                "Please upload a resume first."
            ),
        )

    resume_text   = resume_doc.get("raw_text", "")
    resume_skills = resume_doc.get("extracted_skills", [])

    if not resume_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Resume text is empty. Please re-upload your resume.",
        )

    # ── Step 2: Determine the JD text ─────────────────────────────────────
    # Priority:  body.jd_text (fresh from request)  >  saved jd_text in MongoDB
    jd_text  = None
    jd_skills = []

    if body.jd_text and body.jd_text.strip():
        # Fresh JD provided in the request body
        jd_text = body.jd_text.strip()
        logger.info(f"Using JD from request body ({len(jd_text)} chars)")

    elif resume_doc.get("jd_text"):
        # Fall back to the JD saved via POST /resume/jd
        jd_text   = resume_doc["jd_text"]
        jd_skills = resume_doc.get("jd_skills", [])   # may already be parsed
        logger.info(
            f"Using saved JD from MongoDB "
            f"({len(jd_text)} chars, {len(jd_skills)} cached skills)"
        )

    else:
        # No JD available at all — cannot run analysis
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "No job description provided. "
                "Either include jd_text in this request, "
                "or first submit a JD via POST /api/v1/resume/jd."
            ),
        )

    # ── Step 3: Extract JD skills (if not already cached from MongoDB) ─────
    if not jd_skills:
        try:
            logger.info("Extracting skills from JD using Gemini…")
            jd_skills = extract_skills_with_gemini(jd_text)
        except Exception as e:
            logger.error(f"JD skill extraction failed for user '{body.user_id}': {e}")
            # Non-fatal: analysis can still run with empty jd_skills
            # (Gemini will use the full jd_text for context anyway)
            jd_skills = []

    logger.info(
        f"Starting skill gap analysis — "
        f"resume: {len(resume_skills)} skills, JD: {len(jd_skills)} skills"
    )

    # ── Step 4: Run the Gemini-powered skill gap analysis ─────────────────
    try:
        result = analyze_skill_gap(
            resume_text   = resume_text,
            resume_skills = resume_skills,
            jd_text       = jd_text,
            jd_skills     = jd_skills,
        )
    except Exception as e:
        logger.error(f"analyze_skill_gap raised unexpectedly: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Skill gap analysis failed. Please try again.",
        )

    # Guard: if the service returned the error default, surface a 500
    if result.get("error"):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Analysis could not be completed. Please try again.",
        )

    # ── Step 5: Build and return the response ─────────────────────────────
    logger.info(
        f"Skill gap complete — user='{body.user_id}', "
        f"match={result.get('overall_match_percentage', 0)}%"
    )

    return SkillGapResponse(
        has_skills               = result.get("has_skills", []),
        missing_skills           = result.get("missing_skills", []),
        weak_skills              = result.get("weak_skills", []),
        recommendations          = result.get("recommendations", []),
        overall_match_percentage = int(result.get("overall_match_percentage", 0)),
        summary                  = result.get("summary", ""),
        resume_skills            = resume_skills,    # echo back for frontend display
        jd_skills                = jd_skills,        # echo back for frontend display
    )
