"""
services/skill_gap.py
─────────────────────────────────────────────────────────────────────────────
Calibr – Skill Gap Analysis & Job Match Scoring Service

This module contains the AI logic that powers two of Calibr's core features:
  1. Skill Gap Analysis  – Compare a user's resume against a job description
                           and produce a structured breakdown of strengths,
                           gaps, and actionable recommendations.
  2. Job Match Scoring   – Score a single job listing (0–100) against a
                           resume to rank jobs by relevance in the UI.

Both functions use Groq (Llama 3) via LangChain LCEL.
─────────────────────────────────────────────────────────────────────────────
"""

# ── Standard library ──────────────────────────────────────────────────────────
import json
import logging
import os
import re
import time
import concurrent.futures

# ── Third-party: LangChain ─────────────────────────────────────────────────────
from langchain_groq import ChatGroq
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import HumanMessage

# ── Internal: prompts ─────────────────────────────────────────────────────────
from prompts.skill_gap_prompt import SKILL_GAP_PROMPT
from prompts.job_match_prompt import JOB_MATCH_PROMPT

# ── Module-level logger ───────────────────────────────────────────────────────
logger = logging.getLogger("calibr.skill_gap")


# ─────────────────────────────────────────────────────────────────────────────
#  Safe default responses
#  Returned when the LLM call or JSON parsing fails so the API never
#  returns a 500 — the user still gets a structured (if empty) response.
# ─────────────────────────────────────────────────────────────────────────────

_DEFAULT_SKILL_GAP = {
    "has_skills"               : [],
    "missing_skills"           : [],
    "weak_skills"              : [],
    "recommendations"          : ["Unable to analyse — please try again."],
    "overall_match_percentage" : 0,
    "summary"                  : "Analysis could not be completed. Please retry.",
    "error"                    : True,
}

_DEFAULT_MATCH_SCORE = 0.0   # safe float fallback for score_job_match()


# ─────────────────────────────────────────────────────────────────────────────
#  Helper: build the Groq LLM client
# ─────────────────────────────────────────────────────────────────────────────

def get_llm():
    return ChatGroq(
        model=os.getenv("GROQ_MODEL", "llama-3.1-8b-instant"),
        api_key=os.getenv("GROQ_API_KEY"),
        temperature=0.1
    )


# ─────────────────────────────────────────────────────────────────────────────
#  Helper: strip markdown code fences from LLM output
# ─────────────────────────────────────────────────────────────────────────────

def _strip_fences(text: str) -> str:
    """
    Remove markdown code fences that LLMs sometimes wrap around JSON.

    Args:
        text: Raw string output from the LLM.

    Returns:
        The same string with any ``` fences removed and leading/trailing
        whitespace stripped.
    """
    text = re.sub(r"^```(?:json)?\s*", "", text)   # remove opening fence
    text = re.sub(r"\s*```$", "", text)             # remove closing fence
    return text.strip()


# ─────────────────────────────────────────────────────────────────────────────
#  Function 1: analyze_skill_gap
# ─────────────────────────────────────────────────────────────────────────────

def analyze_skill_gap(
    resume_text  : str,
    resume_skills: list[str],
    jd_text      : str,
    jd_skills    : list[str],
) -> dict:
    """
    Run a full skill-gap analysis between a resume and a job description.

    LCEL chain:  SKILL_GAP_PROMPT | llm | StrOutputParser()
    """
    try:
        llm = get_llm()   # Groq LLM

        # ── Build the LCEL chain using the pipe operator ───────────────────
        chain = SKILL_GAP_PROMPT | llm | StrOutputParser()

        # ── Prepare the prompt variables ───────────────────────────────────
        resume_skills_str = ", ".join(resume_skills) if resume_skills else "No skills extracted"
        jd_skills_str     = ", ".join(jd_skills)     if jd_skills     else "No skills extracted"

        # Truncate texts to manage token usage
        resume_truncated = resume_text[:4000]
        jd_truncated     = jd_text[:4000]

        logger.info(
            f"analyze_skill_gap: resume has {len(resume_skills)} skills, "
            f"JD has {len(jd_skills)} skills"
        )

        # ── Step 4: Invoke chain with strict logic-level timeout ───────────
        start_step = time.perf_counter()
        
        try:
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(
                    chain.invoke,
                    {
                        "resume_skills": resume_skills_str,
                        "jd_skills"    : jd_skills_str,
                        "resume_text"  : resume_truncated,
                        "jd_text"      : jd_truncated,
                    }
                )
                raw_response = future.result(timeout=14)
            
            logger.info(f"PERF: analyze_skill_gap invoke took {time.perf_counter() - start_step:.2f}s")
        except concurrent.futures.TimeoutError:
            logger.error("❌ analyze_skill_gap: timeout (14s).")
            return _DEFAULT_SKILL_GAP

        # ── Parse the JSON response ────────────────────────────────────────
        clean_json = _strip_fences(raw_response)
        result     = json.loads(clean_json)

        logger.info(
            f"analyze_skill_gap complete — "
            f"match: {result.get('overall_match_percentage', '?')}%, "
            f"missing: {len(result.get('missing_skills', []))} skills"
        )
        return result

    except json.JSONDecodeError as e:
        logger.warning(
            f"analyze_skill_gap: JSON parse failed — {e}\n"
            f"Raw response snippet: {raw_response[:300] if 'raw_response' in dir() else 'N/A'}"
        )
        return _DEFAULT_SKILL_GAP

    except Exception as e:
        logger.error(f"analyze_skill_gap unexpected error: {e}", exc_info=True)
        return _DEFAULT_SKILL_GAP


# ─────────────────────────────────────────────────────────────────────────────
#  Function 2: score_job_match
# ─────────────────────────────────────────────────────────────────────────────

def score_job_match(resume_text: str, job: dict) -> float:
    """
    Score how well a user's resume matches a specific job listing (0–100).

    Uses the JOB_MATCH_PROMPT from prompts/job_match_prompt.py piped through
    Gemini (gemini-flash-latest) to produce a structured match assessment.

    This function is called:
      - After fetching a batch of jobs (to pre-score them for the UI)
      - On-demand when the user views a specific job listing

    LCEL chain:  JOB_MATCH_PROMPT | llm | StrOutputParser()

    Args:
        resume_text : Full plain text of the user's resume.
        job         : A job dict with at least "title" and "description" keys.
                      Matches the JobListing schema from models/schemas.py.

    Returns:
        A float between 0.0 and 100.0 representing match strength.
        Returns 0.0 on any error (safe for sorting/ranking operations).
    """
    try:
        llm   = get_llm()
        chain = JOB_MATCH_PROMPT | llm | StrOutputParser()

        # Truncate to manage token usage — description capped at 3000 chars
        resume_truncated = resume_text[:3000]
        job_title        = job.get("title", "Unknown Title")
        job_desc         = job.get("description", "")[:3000]

        if not job_desc:
            logger.warning(
                f"score_job_match: job '{job_title}' has no description — returning 0"
            )
            return _DEFAULT_MATCH_SCORE

        logger.debug(f"score_job_match: scoring '{job_title}'…")

        # ── Step 4: Invoke chain with strict logic-level timeout ───────────
        start_step = time.perf_counter()
        
        try:
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(
                    chain.invoke,
                    {
                        "resume_text"    : resume_truncated,
                        "job_title"      : job_title,
                        "job_description": job_desc,
                    }
                )
                raw_response = future.result(timeout=12) # narrower than API 15s
            
            logger.debug(f"score_job_match: chain.invoke took {time.perf_counter() - start_step:.2f}s")
        except concurrent.futures.TimeoutError:
            logger.warning(f"score_job_match: timeout for '{job_title}' — returning 0")
            return _DEFAULT_MATCH_SCORE

        # ── Parse the JSON and extract match_score ─────────────────────────
        clean_json   = _strip_fences(raw_response)
        result       = json.loads(clean_json)

        # Safely extract the score and clamp it to 0–100
        raw_score    = result.get("match_score", 0)
        match_score  = float(max(0.0, min(100.0, raw_score)))

        logger.debug(f"score_job_match: '{job_title}' → {match_score:.1f}/100")
        return match_score

    except json.JSONDecodeError as e:
        logger.warning(f"score_job_match: JSON parse failed for '{job.get('title', '?')}': {e}")
        return _DEFAULT_MATCH_SCORE

    except Exception as e:
        logger.error(f"score_job_match unexpected error for '{job.get('title', '?')}': {e}")
        return _DEFAULT_MATCH_SCORE
