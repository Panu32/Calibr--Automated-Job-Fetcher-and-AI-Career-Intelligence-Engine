"""
routers/jobs.py
─────────────────────────────────────────────────────────────────────────────
Calibr – Jobs Router

Handles job listing retrieval, refresh, and filtering:
  GET  /api/v1/jobs/{user_id}         – Get personalised ranked job feed
  POST /api/v1/jobs/refresh/{user_id} – Manually trigger a job fetch
  GET  /api/v1/jobs/filters/{user_id} – Filter jobs by location/source/score
─────────────────────────────────────────────────────────────────────────────
"""

# ── Standard library ──────────────────────────────────────────────────────────
import logging
from datetime import datetime, date
from typing import Optional

# ── Third-party: FastAPI ───────────────────────────────────────────────────────
from fastapi import APIRouter, HTTPException, Query, status

# ── Internal: services ────────────────────────────────────────────────────────
from services.job_fetcher import fetch_and_store_jobs
from services.embedder import find_matching_jobs

# ── Internal: database ────────────────────────────────────────────────────────
from db.mongodb import (
    get_resume,
    get_jobs_for_user,
    get_db,
    JOBS_COLLECTION,
)

# ── Module-level logger ───────────────────────────────────────────────────────
logger = logging.getLogger("calibr.router.jobs")

# ── Router instance ───────────────────────────────────────────────────────────
router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
#  Helper: check if any jobs were fetched for a user today
# ─────────────────────────────────────────────────────────────────────────────

def _has_jobs_for_today() -> bool:
    """
    Check if any jobs were fetched and stored today.

    Looks in MongoDB's jobs collection for at least one document where
    date_fetched matches today's date string (YYYY-MM-DD).

    Returns:
        True if at least one job was saved today, False otherwise.
    """
    try:
        db         = get_db()
        collection = db[JOBS_COLLECTION]
        today_str  = str(date.today())   # "2025-04-06"

        count = collection.count_documents({"date_fetched": today_str})
        return count > 0
    except Exception as e:
        logger.error(f"_has_jobs_for_today check failed: {e}")
        return False   # assume no jobs so we trigger a fresh fetch


# ─────────────────────────────────────────────────────────────────────────────
#  GET /{user_id}
#  Main job feed — ranked by semantic similarity to the user's resume
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/{user_id}",
    status_code=status.HTTP_200_OK,
    summary="Get personalised job feed for a user",
    description=(
        "Returns a list of job listings ranked by match score for the user. "
        "If no jobs were fetched today, triggers an immediate fetch before returning. "
        "Uses Gemini text-embedding-004 cosine similarity for ranking."
    ),
)
async def get_jobs_for_user_feed(user_id: str):
    """
    Return the user's personalised, ranked job feed.

    Pipeline:
        1. Validate the user has an uploaded resume.
        2. Check if jobs were already fetched today.
           If not → trigger fetch_and_store_jobs() immediately.
        3. Use find_matching_jobs() (ChromaDB semantic search) to rank job_ids
           by cosine similarity to the user's resume embeddings.
        4. Fetch full job documents from MongoDB by those ranked IDs.
        5. Return the list sorted by match_score descending.

    Why trigger an on-demand fetch if no jobs today?
        The scheduler runs at 7 AM. If a user signs up at 3 PM and checks
        their feed, they'd find nothing without this fallback.

    Raises:
        404: If no resume found for user_id.
        500: On pipeline failure.
    """
    logger.info(f"GET /jobs/{user_id}")

    # ── Step 1: Validate resume exists ────────────────────────────────────
    resume_doc = get_resume(user_id)
    if not resume_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"No resume found for user '{user_id}'. "
                "Please upload your resume first to get personalised job recommendations."
            ),
        )

    # ── Step 2: Trigger on-demand fetch if no jobs exist yet today ─────────
    if not _has_jobs_for_today():
        logger.info(f"No jobs found for today — triggering on-demand fetch for '{user_id}'")
        try:
            new_count = await fetch_and_store_jobs(user_id=user_id)
            logger.info(f"On-demand fetch complete — {new_count} new jobs saved")
        except Exception as e:
            logger.error(f"On-demand job fetch failed for user '{user_id}': {e}")
            # Non-fatal: continue and return whatever jobs exist in DB

    # ── Step 3: Rank jobs by semantic similarity to the user's resume ──────
    try:
        ranked_job_ids = find_matching_jobs(user_id=user_id, top_k=15)
    except Exception as e:
        logger.error(f"find_matching_jobs failed for user '{user_id}': {e}")
        ranked_job_ids = []   # fall through to unranked MongoDB fetch

    # ── Step 4: Fetch full job documents from MongoDB ─────────────────────
    if ranked_job_ids:
        # Fetch the ranked jobs (sorted by match_score inside get_jobs_for_user)
        jobs = get_jobs_for_user(user_id=user_id, job_ids=ranked_job_ids)
    else:
        # Fallback: return the 15 most recently fetched jobs (unranked)
        logger.info(f"No ranked job IDs — falling back to most recent jobs")
        try:
            db         = get_db()
            collection = db[JOBS_COLLECTION]
            cursor     = collection.find({}).sort("date_fetched", -1).limit(15)
            jobs       = []
            for doc in cursor:
                doc["_id"] = str(doc["_id"])
                jobs.append(doc)
        except Exception as e:
            logger.error(f"Fallback job fetch failed: {e}")
            jobs = []

    logger.info(f"GET /jobs/{user_id} → returning {len(jobs)} jobs")

    return {
        "user_id"    : user_id,
        "job_count"  : len(jobs),
        "jobs"       : jobs,
        "fetched_at" : datetime.utcnow().isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
#  POST /refresh/{user_id}
#  Manually trigger a fresh job fetch for a specific user
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/refresh/{user_id}",
    status_code=status.HTTP_200_OK,
    summary="Manually refresh job listings for a user",
    description=(
        "Triggers an immediate job fetch from Adzuna and JSearch for the given user. "
        "Useful for testing or when the user wants fresh results outside the 7 AM cron."
    ),
)
async def refresh_jobs(user_id: str):
    """
    On-demand job refresh for a specific user.

    Calls the same fetch_and_store_jobs() function used by the scheduler.
    The user_id argument scopes the fetch to their specific resume keywords
    rather than refreshing all users (which is what the cron does at 7 AM).

    Raises:
        404: If user has no resume (keywords cannot be extracted).
        500: If the fetch fails.
    """
    logger.info(f"POST /jobs/refresh/{user_id} — manual trigger")

    # Validate resume first so we give a clear error rather than a silent 0
    resume_doc = get_resume(user_id)
    if not resume_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"No resume found for user '{user_id}'. "
                "Please upload a resume before refreshing jobs."
            ),
        )

    try:
        new_count = await fetch_and_store_jobs(user_id=user_id)
    except Exception as e:
        logger.error(f"Job refresh failed for user '{user_id}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Job refresh failed. Please try again.",
        )

    logger.info(f"Job refresh complete for '{user_id}' — {new_count} new jobs")

    return {
        "message"   : f"Job refresh complete. {new_count} new job(s) saved.",
        "new_jobs"  : new_count,
        "user_id"   : user_id,
        "refreshed_at": datetime.utcnow().isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
#  GET /filters/{user_id}
#  Filter and sort the job feed with query parameters
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/filters/{user_id}",
    status_code=status.HTTP_200_OK,
    summary="Get filtered and sorted job listings",
    description=(
        "Supports filtering by location (partial match), source API, "
        "minimum match score, and fetch date. Returns sorted by match_score descending."
    ),
)
async def get_filtered_jobs(
    user_id  : str,
    location : Optional[str]   = Query(None,  description="Filter by location (case-insensitive partial match)"),
    source   : Optional[str]   = Query(None,  description="Filter by source API: 'adzuna' or 'jsearch'"),
    min_match: Optional[float] = Query(None,  ge=0.0, le=100.0, description="Minimum match_score (0–100)"),
    fetch_date: Optional[str]  = Query(None,  description="Filter by fetch date in YYYY-MM-DD format"),
):
    """
    Return jobs filtered by the provided query parameters.

    All filters are optional and combinable. Unfiltered returns all jobs
    in MongoDB sorted by match_score descending.

    Query params:
        location   : Case-insensitive substring match against job.location
                     (e.g. "bangalore" matches "Bangalore, India")
        source     : Exact match against job.source ("adzuna" or "jsearch")
        min_match  : Float 0–100; only return jobs with match_score >= this value
        fetch_date : ISO date string "YYYY-MM-DD"; only return jobs fetched on this date

    Raises:
        404: If user has no resume.
        500: On database error.
    """
    logger.info(
        f"GET /jobs/filters/{user_id} — "
        f"location={location}, source={source}, "
        f"min_match={min_match}, fetch_date={fetch_date}"
    )

    # Validate user has a resume
    resume_doc = get_resume(user_id)
    if not resume_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No resume found for user '{user_id}'.",
        )

    # ── Build MongoDB filter dict dynamically ──────────────────────────────
    mongo_filter: dict = {}

    if source:
        # Source is an exact match (the values are controlled: "adzuna"/"jsearch")
        mongo_filter["source"] = source.lower().strip()

    if min_match is not None:
        # match_score >= min_match (stored as a float in MongoDB)
        mongo_filter["match_score"] = {"$gte": min_match}

    if fetch_date:
        # date_fetched is stored as a "YYYY-MM-DD" string in MongoDB
        mongo_filter["date_fetched"] = fetch_date.strip()

    # ── Execute the query ─────────────────────────────────────────────────
    try:
        db         = get_db()
        collection = db[JOBS_COLLECTION]

        # Sort by match_score descending so best matches always come first
        cursor = collection.find(mongo_filter).sort("match_score", -1)
        jobs   = []

        for doc in cursor:
            doc["_id"] = str(doc["_id"])   # ObjectId → str

            # Apply location filter in Python (case-insensitive substring match)
            # Doing this in Python because MongoDB regex on large collections
            # without an index is slow; this way we avoid adding an index dependency.
            if location:
                job_location = doc.get("location", "").lower()
                if location.lower() not in job_location:
                    continue   # skip this job — location doesn't match

            jobs.append(doc)

    except Exception as e:
        logger.error(f"get_filtered_jobs DB query failed for user '{user_id}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch filtered jobs.",
        )

    logger.info(f"GET /jobs/filters/{user_id} → {len(jobs)} jobs after filtering")

    return {
        "user_id"   : user_id,
        "job_count" : len(jobs),
        "filters"   : {
            "location"  : location,
            "source"    : source,
            "min_match" : min_match,
            "fetch_date": fetch_date,
        },
        "jobs"      : jobs,
    }
