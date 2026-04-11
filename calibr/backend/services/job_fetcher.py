"""
services/job_fetcher.py
─────────────────────────────────────────────────────────────────────────────
Calibr – Automated Job Fetching Service

This service is the "automated" engine of Calibr. It is called:
  1. By the APScheduler cron in main.py every day at 07:00.
  2. On-demand from the /api/v1/jobs/refresh endpoint.

Workflow for each user who has uploaded a resume:
  a) Load their resume text from MongoDB.
  b) Ask Groq (Llama 3) to extract the top 5 search keywords.
  c) For each keyword → try Adzuna API (primary, free, 250 req/day).
  d) If Adzuna fails or returns nothing → fall back to JSearch via RapidAPI.
  e) Deduplicate results by URL.
  f) Embed each new job with local Ollama (nomic-embed-text) via embedder.py.
  g) Persist all jobs to MongoDB via db/mongodb.py.

No sentence-transformers. Ollama embeddings throughout.
─────────────────────────────────────────────────────────────────────────────
"""

# ── Standard library ──────────────────────────────────────────────────────────
import json
import logging
import os
import re
import time
import concurrent.futures
from datetime import datetime, date
from typing import Optional

# ── Third-party: HTTP client (async-compatible) ───────────────────────────────
import httpx                                          # async HTTP for API calls

# ── Third-party: LangChain ─────────────────────────────────────────────────────
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage

# ── Internal: database layer ───────────────────────────────────────────────────
from db.mongodb import (
    get_db,
    RESUMES_COLLECTION,
    get_resume,
    save_jobs,
)

# ── Internal: AI services ─────────────────────────────────────────────────────
from services.embedder import embed_job
from services.parser import get_llm                     # centralized Groq config

# ── Module-level logger ───────────────────────────────────────────────────────
logger = logging.getLogger("calibr.job_fetcher")

# ── API timeouts (seconds) ────────────────────────────────────────────────────
REQUEST_TIMEOUT = 15   # seconds before giving up on an API call


# ─────────────────────────────────────────────────────────────────────────────
#  Function 1: extract_keywords_for_search
# ─────────────────────────────────────────────────────────────────────────────
def extract_keywords_for_search(resume_text: str, llm: ChatGroq) -> list[str]:
    """
    Use Groq (Llama 3) to distill a resume into top-5 job search keywords.

    Why do this instead of using pre-set keywords?
        Every user's resume is different. A data engineer and a frontend dev
        need completely different search terms. Gemini understands the resume
        holistically and picks the most job-relevant terms automatically.

    Args:
        resume_text : Plain text of the user's resume (can be long).
        llm         : An already-initialised ChatGoogleGenerativeAI instance.
                      Passed in so the caller can reuse one LLM object per
                      scheduler run rather than creating one per user.

    Returns:
        A list of up to 5 search keyword strings.
        e.g. ["Machine Learning Engineer", "Python", "NLP", "TensorFlow", "MLOps"]
        Returns a generic fallback ["software engineer"] on failure.
    """
    if not resume_text or not resume_text.strip():
        logger.warning("extract_keywords_for_search: empty resume text — using fallback keyword")
        return ["software engineer"]

    try:
        # Truncate resume to stay comfortably within free-tier token limits
        truncated = resume_text[:6000]

        prompt = f"""From this resume, extract the top 5 most relevant job search keywords.
These should be role titles and core skills that best represent this candidate.

Return ONLY a valid JSON array of strings. No explanation, no markdown.
Example: ["Machine Learning Engineer", "Python", "NLP", "TensorFlow", "MLOps"]

Resume:
{truncated}"""

        # ── Step 4: Invoke chain with strict logic-level timeout ───────────
        start_step = time.perf_counter()
        
        try:
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(llm.invoke, [HumanMessage(content=prompt)])
                response = future.result(timeout=12) # narrower than API 15s
            
            logger.info(f"PERF: extract_keywords_for_search took {time.perf_counter() - start_step:.2f}s")
            raw = response.content.strip()
        except concurrent.futures.TimeoutError:
            logger.warning("❌ extract_keywords_for_search: timeout (12s) — using fallback")
            return ["software engineer"]
        except Exception as e:
            logger.error(f"extract_keywords_for_search failed: {e}")
            return ["software engineer"]

        # Strip markdown code fences if Gemini adds them
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
        raw = raw.strip()
        
        try:
            keywords = json.loads(raw)
        except json.JSONDecodeError as e:
            logger.warning(f"extract_keywords_for_search JSON parse error: {e}")
            return ["software engineer"]

        # Validate we got a list of strings
        if isinstance(keywords, list) and keywords:
            clean = [str(k).strip() for k in keywords if k][:5]  # cap at 5
            logger.info(f"Extracted {len(clean)} search keywords: {clean}")
            return clean

        logger.warning("Gemini returned unexpected format for keywords — using fallback")
        return ["software engineer"]

    except json.JSONDecodeError as e:
        logger.warning(f"extract_keywords_for_search JSON parse error: {e}")
        return ["software engineer"]

    except Exception as e:
        logger.error(f"extract_keywords_for_search failed: {e}")
        return ["software engineer"]


# ─────────────────────────────────────────────────────────────────────────────
#  Function 2: fetch_from_adzuna  (PRIMARY source)
# ─────────────────────────────────────────────────────────────────────────────
def fetch_from_adzuna(keyword: str, location: str = "india") -> list[dict]:
    """
    Fetch job listings from the Adzuna Jobs API (free tier).

    Adzuna Free Tier:
        - 250 API calls/day
        - No credit card required
        - Register at: https://developer.adzuna.com/signup

    API endpoint:
        GET https://api.adzuna.com/v1/api/jobs/{country}/search/{page}
        Country code "in" = India. Change to "gb" for UK, "us" for USA, etc.

    Args:
        keyword  : Job search term (e.g. "Python Developer").
        location : City or region (default "india").

    Returns:
        A list of job dicts normalised to the JobListing schema.
        Returns an empty list if the API call fails or returns no results.
    """
    app_id  = os.getenv("ADZUNA_APP_ID")
    app_key = os.getenv("ADZUNA_APP_KEY")

    # Skip silently if credentials are not configured
    if not app_id or not app_key:
        logger.warning("Adzuna credentials not set — skipping Adzuna fetch")
        return []

    url = "https://api.adzuna.com/v1/api/jobs/in/search/1"   # 'in' = India

    params = {
        "app_id"           : app_id,
        "app_key"          : app_key,
        "what"             : keyword,            # search query
        "where"            : location,           # location filter
        "results_per_page" : 10,                 # 10 results per call
        "content-type"     : "application/json",
    }

    try:
        logger.info(f"Adzuna: fetching '{keyword}' in '{location}'…")

        # httpx.get is synchronous — fine because fetch_and_store_jobs is also sync
        response = httpx.get(url, params=params, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()              # raise on 4xx / 5xx

        data     = response.json()
        results  = data.get("results", [])

        if not results:
            logger.info(f"Adzuna: no results for '{keyword}'")
            return []

        # ── Map Adzuna fields → Calibr JobListing schema ──────────────────
        jobs = []
        for item in results:
            # Adzuna nests company info under "company"
            company_info = item.get("company", {})

            job = {
                "job_id"      : str(item.get("id", "")),
                "title"       : item.get("title", "Unknown Title"),
                "company"     : company_info.get("display_name", "Unknown Company"),
                "location"    : item.get("location", {}).get("display_name", location),
                "salary"      : _format_adzuna_salary(item),
                "url"         : item.get("redirect_url", ""),
                "description" : item.get("description", ""),
                "source"      : "adzuna",
                "date_fetched": str(date.today()),
                "match_score" : 0.0,   # will be computed by find_matching_jobs()
            }

            # Skip entries with no URL (can't link back to the original posting)
            if job["url"]:
                jobs.append(job)

        logger.info(f"Adzuna: fetched {len(jobs)} valid jobs for '{keyword}'")
        return jobs

    except httpx.HTTPStatusError as e:
        logger.warning(f"Adzuna HTTP error for '{keyword}': {e.response.status_code} — {e}")
        return []

    except httpx.TimeoutException:
        logger.warning(f"Adzuna request timed out for '{keyword}'")
        return []

    except Exception as e:
        logger.error(f"fetch_from_adzuna unexpected error for '{keyword}': {e}")
        return []


def _format_adzuna_salary(item: dict) -> Optional[str]:
    """
    Format Adzuna's salary fields into a human-readable string.

    Adzuna provides salary_min and salary_max as separate floats.
    We combine them into "₹40,000 – ₹60,000" format, or return None
    if neither field is present.

    Args:
        item: A single Adzuna result dict.

    Returns:
        A formatted salary string, or None.
    """
    min_sal = item.get("salary_min")
    max_sal = item.get("salary_max")

    if min_sal and max_sal:
        return f"₹{int(min_sal):,} – ₹{int(max_sal):,}"
    elif min_sal:
        return f"₹{int(min_sal):,}+"
    elif max_sal:
        return f"Up to ₹{int(max_sal):,}"
    return None  # salary not disclosed


# ─────────────────────────────────────────────────────────────────────────────
#  Function 3: fetch_from_jsearch  (FALLBACK source)
# ─────────────────────────────────────────────────────────────────────────────
def fetch_from_jsearch(keyword: str) -> list[dict]:
    """
    Fetch job listings from JSearch via RapidAPI (free fallback).

    JSearch Free Tier:
        - 100 requests/month on the free plan
        - Register at: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
        - Set JSEARCH_API_KEY in your .env

    This function is only called when Adzuna fails or returns zero results,
    making it an efficient fallback that preserves our monthly quota.

    Args:
        keyword: Job search query (e.g. "Data Scientist").

    Returns:
        A list of job dicts normalised to the JobListing schema.
        Returns an empty list on failure.
    """
    api_key = os.getenv("JSEARCH_API_KEY")

    if not api_key:
        logger.warning("JSEARCH_API_KEY not set — skipping JSearch fallback")
        return []

    url = "https://jsearch.p.rapidapi.com/search"

    headers = {
        "X-RapidAPI-Key" : api_key,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
    }

    params = {
        "query"    : keyword,
        "page"     : "1",
        "num_pages": "1",           # one page = ~10 results; enough for fallback
    }

    try:
        logger.info(f"JSearch (fallback): fetching '{keyword}'…")

        response = httpx.get(url, headers=headers, params=params, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()

        data    = response.json()
        results = data.get("data", [])

        if not results:
            logger.info(f"JSearch: no results for '{keyword}'")
            return []

        # ── Map JSearch fields → Calibr JobListing schema ─────────────────
        jobs = []
        for item in results:
            job = {
                "job_id"      : item.get("job_id", ""),
                "title"       : item.get("job_title", "Unknown Title"),
                "company"     : item.get("employer_name", "Unknown Company"),
                "location"    : (
                    f"{item.get('job_city', '')} {item.get('job_country', '')}".strip()
                    or "Remote"
                ),
                "salary"      : _format_jsearch_salary(item),
                "url"         : item.get("job_apply_link", ""),
                "description" : item.get("job_description", ""),
                "source"      : "jsearch",
                "date_fetched": str(date.today()),
                "match_score" : 0.0,
            }

            if job["job_id"] and job["url"]:
                jobs.append(job)

        logger.info(f"JSearch: fetched {len(jobs)} valid jobs for '{keyword}'")
        return jobs

    except httpx.HTTPStatusError as e:
        logger.warning(f"JSearch HTTP error for '{keyword}': {e.response.status_code} — {e}")
        return []

    except httpx.TimeoutException:
        logger.warning(f"JSearch request timed out for '{keyword}'")
        return []

    except Exception as e:
        logger.error(f"fetch_from_jsearch unexpected error for '{keyword}': {e}")
        return []


def _format_jsearch_salary(item: dict) -> Optional[str]:
    """
    Format JSearch salary fields into a readable string.

    JSearch provides min_salary, max_salary, and salary_currency.

    Args:
        item: A single JSearch result dict.

    Returns:
        Formatted salary string or None.
    """
    min_sal  = item.get("job_min_salary")
    max_sal  = item.get("job_max_salary")
    currency = item.get("job_salary_currency", "")
    period   = item.get("job_salary_period", "")   # e.g. "YEAR", "MONTH"

    if min_sal and max_sal:
        return f"{currency} {int(min_sal):,} – {int(max_sal):,} / {period}".strip()
    elif min_sal:
        return f"{currency} {int(min_sal):,}+ / {period}".strip()
    return None


# ─────────────────────────────────────────────────────────────────────────────
#  Function 4: fetch_and_store_jobs  (MAIN ENTRY POINT — called by scheduler)
# ─────────────────────────────────────────────────────────────────────────────
async def fetch_and_store_jobs(user_id: str = "all") -> int:
    """
    Orchestrate the full automated job-fetch pipeline for all users (or one).

    This is the function registered with APScheduler in main.py.
    It runs every day at 07:00 and keeps the jobs collection fresh.

    Pipeline per user:
        1. Load all users who have a resume from MongoDB.
        2. For each user, extract the top-5 search keywords via Gemini.
        3. For each keyword:
             a. Try Adzuna (primary) → if it returns results, use them.
             b. If Adzuna returns empty or fails → try JSearch (fallback).
        4. Deduplicate the combined results by URL.
        5. Embed each unique job with Gemini text-embedding-004 via embed_job().
        6. Persist all jobs to MongoDB via save_jobs().

    Args:
        user_id: Pass a specific user_id to run only for that user,
                 or "all" (default) to process every user with a resume.
                 Useful for testing or on-demand triggers from the router.

    Returns:
        Total number of newly inserted job documents across all users.
    """
    logger.info(
        f"fetch_and_store_jobs started at {datetime.utcnow().isoformat()} "
        f"(target user: {user_id})"
    )

    # One LLM instance per scheduler run — reused across all users
    # to avoid re-initialising the HTTP client on every call.
    llm = get_llm()

    total_new_jobs = 0

    # ── Step 1: Determine which users to process ───────────────────────────
    try:
        db         = get_db()
        collection = db[RESUMES_COLLECTION]

        if user_id == "all":
            # Fetch all user_ids that have an uploaded resume
            user_docs = list(collection.find({}, {"user_id": 1, "_id": 0}))
            user_ids  = [doc["user_id"] for doc in user_docs if doc.get("user_id")]
        else:
            # Only process the specified user
            user_ids = [user_id]

        logger.info(f"Processing jobs for {len(user_ids)} user(s)")

    except Exception as e:
        logger.error(f"fetch_and_store_jobs: failed to load users from MongoDB: {e}")
        return 0

    # ── Step 2: Process each user ──────────────────────────────────────────
    for uid in user_ids:
        try:
            logger.info(f"--- Processing user '{uid}' ---")

            # 2a. Load resume text from MongoDB
            resume_doc = get_resume(uid)

            if not resume_doc or not resume_doc.get("raw_text"):
                logger.info(f"  Skipping user '{uid}' — no resume text found")
                continue

            resume_text = resume_doc["raw_text"]

            # 2b. Extract top-5 job search keywords using Gemini
            keywords = extract_keywords_for_search(resume_text, llm)
            logger.info(f"  Keywords for '{uid}': {keywords}")

            # Collect all jobs for this user across all keywords
            all_jobs_for_user: list[dict] = []

            # 2c. Fetch jobs for each keyword
            for keyword in keywords:
                # ── PRIMARY: Try Adzuna first ─────────────────────────────
                fetched = fetch_from_adzuna(keyword)

                # ── FALLBACK: Use JSearch if Adzuna gave nothing ──────────
                if not fetched:
                    logger.info(
                        f"  Adzuna returned 0 results for '{keyword}' "
                        f"— trying JSearch fallback"
                    )
                    fetched = fetch_from_jsearch(keyword)

                logger.info(
                    f"  '{keyword}' → {len(fetched)} jobs "
                    f"({'Adzuna' if fetched and fetched[0].get('source') == 'adzuna' else 'JSearch'})"
                )
                all_jobs_for_user.extend(fetched)

            # 2d. Deduplicate by URL (same job can appear across different keywords)
            seen_urls: set[str] = set()
            unique_jobs: list[dict] = []

            for job in all_jobs_for_user:
                url = job.get("url", "").strip()
                if url and url not in seen_urls:
                    seen_urls.add(url)
                    unique_jobs.append(job)

            logger.info(
                f"  {len(all_jobs_for_user)} total fetched → "
                f"{len(unique_jobs)} unique after deduplication"
            )

            if not unique_jobs:
                logger.info(f"  No unique jobs to store for user '{uid}'")
                continue

            # 2e. Embed each unique job with Gemini text-embedding-004
            #     embed_job() upserts into ChromaDB's "jobs" collection.
            embed_successes = 0
            for job in unique_jobs:
                success = embed_job(job)
                if success:
                    embed_successes += 1

            logger.info(f"  Embedded {embed_successes}/{len(unique_jobs)} jobs in ChromaDB")

            # 2f. Persist all jobs to MongoDB (bulk upsert by job_id)
            new_count = save_jobs(unique_jobs)
            total_new_jobs += new_count

            logger.info(
                f"  Saved {new_count} new jobs to MongoDB for user '{uid}'"
            )

        except Exception as e:
            # Log and continue — one user's failure shouldn't stop the whole run
            logger.error(f"fetch_and_store_jobs: error processing user '{uid}': {e}")
            continue

    logger.info(
        f"fetch_and_store_jobs complete — "
        f"{total_new_jobs} new jobs saved across {len(user_ids)} user(s)"
    )
    return total_new_jobs
