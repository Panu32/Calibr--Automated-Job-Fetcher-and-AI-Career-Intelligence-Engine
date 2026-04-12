"""
db/mongodb.py
─────────────────────────────────────────────────────────────────────────────
Calibr – MongoDB Connection & Data Access Layer

All database interactions in Calibr go through this module.
We use pymongo (synchronous) for simplicity. FastAPI runs sync DB calls
in a thread pool automatically, so this is safe to use in async routes.

The module exposes:
  - get_db()          → returns a cached MongoClient Database object
  - connect_to_mongo()/ close_mongo_connection() → lifecycle hooks for main.py
  - Collection name constants
  - CRUD helpers for resumes, jobs, and chat history
─────────────────────────────────────────────────────────────────────────────
"""

# ── Standard library ──────────────────────────────────────────────────────────
import logging
import os
from datetime import datetime
from typing import Optional

# ── Third-party: pymongo ──────────────────────────────────────────────────────
from pymongo import MongoClient, UpdateOne, DESCENDING
from pymongo.database import Database
from pymongo.errors import ConnectionFailure, PyMongoError
import certifi

# ── Module-level logger ───────────────────────────────────────────────────────
logger = logging.getLogger("calibr.mongodb")


# ─────────────────────────────────────────────────────────────────────────────
#  Collection name constants
#  Centralised here so no other module ever hard-codes a collection name.
#  Change any name once here and it propagates everywhere.
# ─────────────────────────────────────────────────────────────────────────────
RESUMES_COLLECTION      = "resumes"
JOBS_COLLECTION         = "jobs"
USERS_COLLECTION        = "users"
CHAT_HISTORY_COLLECTION = "chat_history"
API_USAGE_COLLECTION    = "api_usage"


# ─────────────────────────────────────────────────────────────────────────────
#  Module-level singleton — the MongoClient and Database objects.
#  Cached here so get_db() never opens more than one connection pool
#  regardless of how many times it is called across the application.
# ─────────────────────────────────────────────────────────────────────────────
_client: Optional[MongoClient] = None
_db: Optional[Database] = None


# ─────────────────────────────────────────────────────────────────────────────
#  Lifecycle hooks (called from main.py lifespan)
# ─────────────────────────────────────────────────────────────────────────────

async def connect_to_mongo() -> None:
    """
    Open the MongoDB connection pool on server startup.

    Called once from the FastAPI lifespan context manager in main.py.
    Stores the MongoClient and Database in module-level singletons so every
    subsequent call to get_db() reuses the same connection pool.

    serverSelectionTimeoutMS=5000 → raises ConnectionFailure within 5 seconds
    if Atlas is unreachable, rather than hanging indefinitely.
    """
    global _client, _db

    mongo_url = os.getenv("MONGODB_URL")
    db_name   = os.getenv("DB_NAME", "calibr")

    if not mongo_url:
        # Fail early and loudly — the app cannot run without a database.
        raise EnvironmentError(
            "MONGODB_URL is not set in your .env file. "
            "Please add your MongoDB Atlas connection string."
        )

    logger.info(f"Connecting to MongoDB (database: '{db_name}')…")

    try:
        # Create the pymongo client.
        _client = MongoClient(
            mongo_url,
            serverSelectionTimeoutMS=30000,
            connectTimeoutMS=20000,           # 20s is plenty for TCP
            socketTimeoutMS=20000,
            localThresholdMS=1000,            # helps find reachable nodes faster on Windows
            tlsCAFile=certifi.where(),
            retryWrites=True,
            connect=False,                    # don't block startup thread
            readPreference='secondaryPreferred' # force reading from reachable nodes
        )

        try:
            # Use secondaryPreferred for the startup ping to allow app to boot 
            # even if one shard (the Primary) is network-blocked from this machine.
            _client.admin.command("ping", readPreference="secondaryPreferred")
            _db = _client[db_name]
            
            # ── Ensure indexes ────────────────────────────────────────────────
            # Unique email index for users collection
            _db[USERS_COLLECTION].create_index("email", unique=True)
            logger.info(f"✅ MongoDB connected (database: '{db_name}')")
            
        except Exception as ping_err:
            # DEGRADED BOOT: Log the error but don't crash main.py.
            # This allows the API to stay alive even if the DB is flaky.
            logger.warning(
                f"⚠️ MongoDB is in DEGRADED mode: {ping_err}. "
                "The app started, but database features may be slow or unavailable until Shard-01 is reachable."
            )
            _db = _client[db_name]
        
        # ── Ensure indexes ────────────────────────────────────────────────
        # Unique email index for users collection
        _db[USERS_COLLECTION].create_index("email", unique=True)
        
        logger.info(f"✅ MongoDB connected to database '{db_name}' and indexes ensured.")

    except ConnectionFailure as e:
        logger.error(f"MongoDB connection failed: {e}")
        raise   # re-raise so main.py can halt startup cleanly


async def close_mongo_connection() -> None:
    """
    Close the MongoDB connection pool on server shutdown.

    Called from the FastAPI lifespan context manager after the yield.
    Flushing the pool cleanly prevents connection leaks in Atlas free tier,
    which has a hard limit on concurrent connections.
    """
    global _client

    if _client is not None:
        _client.close()
        _client = None
        logger.info("MongoDB connection closed.")


# ─────────────────────────────────────────────────────────────────────────────
#  Function 1: get_db
# ─────────────────────────────────────────────────────────────────────────────

def get_db() -> Database:
    """
    Return the cached MongoDB Database object.

    If the database has not been initialised yet (e.g. when called before
    lifespan startup in tests), this function initialises it on the spot.

    Returns:
        A pymongo Database instance pointing to the Calibr database.

    Raises:
        RuntimeError: If the connection cannot be established.
    """
    global _client, _db

    # If already initialised (normal production path), return immediately
    if _db is not None:
        return _db

    # Fallback initialisation for direct/test calls outside lifespan
    mongo_url = os.getenv("MONGODB_URL")
    db_name   = os.getenv("DB_NAME", "calibr")

    if not mongo_url:
        raise RuntimeError(
            "MongoDB is not connected. Ensure MONGODB_URL is in your .env "
            "and connect_to_mongo() has been called."
        )

    try:
        _client = MongoClient(
            mongo_url, 
            serverSelectionTimeoutMS=30000,
            connectTimeoutMS=30000,
            tlsCAFile=certifi.where(),
            readPreference='secondaryPreferred'
        )
        _client.admin.command("ping", readPreference="secondaryPreferred")
        _db = _client[db_name]
        logger.info(f"get_db(): lazy-initialised connection to '{db_name}'")
    except Exception as e:
        raise RuntimeError(f"Failed to connect to MongoDB in get_db(): {e}")

    return _db


# ─────────────────────────────────────────────────────────────────────────────
#  Function 2: save_resume
# ─────────────────────────────────────────────────────────────────────────────

def save_resume(user_id: str, resume_data: dict) -> str:
    """
    Upsert a resume document into the resumes collection.

    "Upsert" means: insert if no document with this user_id exists,
    or update the existing one if it does. This handles the re-upload flow
    gracefully — a user can update their resume without creating duplicates.

    Args:
        user_id     : Unique user identifier (used as the upsert key).
        resume_data : Dict containing resume fields (raw_text, extracted_skills, etc.)
                      Should match the ResumeData schema in models/schemas.py.

    Returns:
        The MongoDB document _id as a string (the upserted or updated document).
    """
    try:
        db         = get_db()
        collection = db[RESUMES_COLLECTION]

        # Always stamp the document with the time it was last updated
        resume_data["updated_at"] = datetime.utcnow()
        resume_data["user_id"]    = user_id  # ensure user_id is part of the document

        result = collection.update_one(
            filter={"user_id": user_id},             # match on user_id
            update={"$set": resume_data},            # set/overwrite all provided fields
            upsert=True,                             # insert if no match found
        )

        # upserted_id is set when a new document was created;
        # for updates it's None, so we look up the _id separately.
        if result.upserted_id:
            doc_id = str(result.upserted_id)
        else:
            doc    = collection.find_one({"user_id": user_id}, {"_id": 1})
            doc_id = str(doc["_id"]) if doc else "unknown"

        logger.info(f"save_resume: upserted resume for user '{user_id}' → doc_id={doc_id}")
        return doc_id

    except PyMongoError as e:
        logger.error(f"save_resume failed for user '{user_id}': {e}")
        raise


# ─────────────────────────────────────────────────────────────────────────────
#  Function 3: get_resume
# ─────────────────────────────────────────────────────────────────────────────

def get_resume(user_id: str) -> dict | None:
    """
    Retrieve a user's resume document from MongoDB.

    Args:
        user_id: The unique user identifier.

    Returns:
        The full resume document as a dict (with MongoDB's _id converted to str),
        or None if no resume has been uploaded for this user.
    """
    try:
        db         = get_db()
        collection = db[RESUMES_COLLECTION]

        doc = collection.find_one({"user_id": user_id})

        if doc is None:
            logger.info(f"get_resume: no resume found for user '{user_id}'")
            return None

        # Convert ObjectId to string so the dict is JSON-serialisable
        doc["_id"] = str(doc["_id"])

        logger.info(f"get_resume: found resume for user '{user_id}'")
        return doc

    except PyMongoError as e:
        logger.error(f"get_resume failed for user '{user_id}': {e}")
        return None


# ─────────────────────────────────────────────────────────────────────────────
#  Function 4: save_jobs
# ─────────────────────────────────────────────────────────────────────────────

def save_jobs(jobs: list[dict]) -> int:
    """
    Bulk-upsert a list of job listings into the jobs collection.

    Uses MongoDB bulk_write with UpdateOne(upsert=True) operations,
    which is far more efficient than calling update_one() in a Python loop —
    a single round-trip to Atlas instead of N round-trips.

    Deduplication is handled by upserting on job_id. If Adzuna returns the same
    job tomorrow, the document is updated in-place rather than duplicated.

    Args:
        jobs: List of job dicts matching the JobListing schema.
              Each dict MUST have a "job_id" field.

    Returns:
        Count of newly inserted documents (upserts, not updates).
        (Updated existing jobs are not counted toward the return value.)
    """
    if not jobs:
        logger.info("save_jobs: called with empty jobs list — nothing to save")
        return 0

    try:
        db         = get_db()
        collection = db[JOBS_COLLECTION]

        # Build bulk operations — one per job
        operations = []
        for job in jobs:
            if not job.get("job_id"):
                logger.warning("save_jobs: skipping job with missing job_id")
                continue

            # Automatically add/update the date_fetched timestamp
            job["date_fetched"] = datetime.utcnow()

            operations.append(
                UpdateOne(
                    filter={"job_id": job["job_id"]},  # match on job_id
                    update={"$set": job},               # update all fields
                    upsert=True,                        # insert if new
                )
            )

        if not operations:
            return 0

        # Execute all upserts in one network call
        result = collection.bulk_write(operations, ordered=False)

        new_count = result.upserted_count
        logger.info(
            f"save_jobs: {new_count} new jobs inserted, "
            f"{result.modified_count} existing jobs updated "
            f"(out of {len(operations)} total)"
        )
        return new_count

    except PyMongoError as e:
        logger.error(f"save_jobs bulk write failed: {e}")
        return 0


# ─────────────────────────────────────────────────────────────────────────────
#  Function 5: get_jobs_for_user
# ─────────────────────────────────────────────────────────────────────────────

def get_jobs_for_user(user_id: str, job_ids: list[str]) -> list[dict]:
    """
    Fetch full job documents from MongoDB given a list of job_ids.

    This is called after find_matching_jobs() in embedder.py returns a ranked
    list of job_ids. We fetch the full documents from MongoDB (which has salary,
    URL, description, etc.) and return them sorted by match_score descending.

    Args:
        user_id : Used only for logging; helps trace which user is querying.
        job_ids : List of job_id strings (from ChromaDB similarity results).

    Returns:
        A list of job dicts sorted by match_score descending.
        Each dict has _id converted to a string.
    """
    if not job_ids:
        return []

    try:
        db         = get_db()
        collection = db[JOBS_COLLECTION]

        # $in fetches all documents whose job_id is in our list — one query
        cursor = collection.find({"job_id": {"$in": job_ids}})

        jobs = []
        for doc in cursor:
            doc["_id"] = str(doc["_id"])  # ObjectId → str for JSON serialisation
            jobs.append(doc)

        # Sort by match_score descending (best match first)
        # match_score may have been updated by the scoring pipeline
        jobs.sort(key=lambda j: j.get("match_score", 0.0), reverse=True)

        logger.info(
            f"get_jobs_for_user: fetched {len(jobs)} jobs "
            f"for user '{user_id}' from {len(job_ids)} requested IDs"
        )
        return jobs

    except PyMongoError as e:
        logger.error(f"get_jobs_for_user failed for user '{user_id}': {e}")
        return []


# ─────────────────────────────────────────────────────────────────────────────
#  Function 6: save_chat_message
# ─────────────────────────────────────────────────────────────────────────────

def save_chat_message(user_id: str, role: str, content: str) -> None:
    """
    Append a single chat message to the user's chat history in MongoDB.

    Chat history is stored as a list of message events in the chat_history
    collection. Each document represents one message (not one conversation),
    so querying by user_id and sorting by timestamp reconstructs the thread.

    Args:
        user_id : Identifies whose chat thread this belongs to.
        role    : "user" or "assistant" — mirrors the ChatMessage schema.
        content : The message text.

    Returns:
        None. Errors are logged but not re-raised to avoid breaking the chat
        response if history persistence fails.
    """
    try:
        db         = get_db()
        collection = db[CHAT_HISTORY_COLLECTION]

        message_doc = {
            "user_id"   : user_id,
            "role"      : role,
            "content"   : content,
            "timestamp" : datetime.utcnow(),  # UTC so sorting works across timezones
        }

        collection.insert_one(message_doc)
        logger.debug(f"save_chat_message: [{role}] saved for user '{user_id}'")

    except PyMongoError as e:
        # Non-fatal: if history fails to save, the user still gets their answer
        logger.error(f"save_chat_message failed for user '{user_id}': {e}")


# ─────────────────────────────────────────────────────────────────────────────
#  Function 7: get_chat_history
# ─────────────────────────────────────────────────────────────────────────────

def get_chat_history(user_id: str, limit: int = 20) -> list[dict]:
    """
    Retrieve the most recent N chat messages for a user, ordered chronologically.

    Used by the RAG chain to build the conversation context window before
    sending a prompt to Gemini. Limiting to the last 20 messages keeps the
    context manageable within free-tier token limits.

    Args:
        user_id : Identifies the user whose history to retrieve.
        limit   : Max number of messages to return (default 20).

    Returns:
        A list of message dicts [{role, content, timestamp}, ...] sorted oldest-first
        (so they read as a natural conversation when passed to the LLM).
    """
    try:
        db         = get_db()
        collection = db[CHAT_HISTORY_COLLECTION]

        # Sort descending by timestamp to get the most recent messages,
        # then reverse in Python so they are chronological for the LLM.
        cursor = (
            collection
            .find(
                {"user_id": user_id},
                {"_id": 0, "role": 1, "content": 1, "timestamp": 1},  # project only needed fields
            )
            .sort("timestamp", DESCENDING)  # newest first
            .limit(limit)                   # cap the result set
        )

        messages = list(cursor)

        # Reverse to chronological order (oldest message first)
        messages.reverse()

        logger.info(
            f"get_chat_history: returning {len(messages)} messages "
            f"for user '{user_id}'"
        )
        return messages

    except PyMongoError as e:
        logger.error(f"get_chat_history failed for user '{user_id}': {e}")
        return []


# ─────────────────────────────────────────────────────────────────────────────
#  User-related Helpers
# ─────────────────────────────────────────────────────────────────────────────

def get_user_by_email(email: str) -> dict | None:
    """Find a user in MongoDB by their unique email address."""
    try:
        db = get_db()
        user = db[USERS_COLLECTION].find_one({"email": email})
        if user:
            user["_id"] = str(user["_id"])
        return user
    except PyMongoError as e:
        logger.error(f"get_user_by_email failed for '{email}': {e}")
        return None

def create_user(user_data: dict) -> str:
    """Create a new user in MongoDB and return their record _id as string."""
    try:
        db = get_db()
        # Ensure we have a creation timestamp
        if "created_at" not in user_data:
            user_data["created_at"] = datetime.utcnow()
        
        result = db[USERS_COLLECTION].insert_one(user_data)
        logger.info(f"create_user: Created new user '{user_data.get('email')}'")
        return str(result.inserted_id)
    except PyMongoError as e:
        logger.error(f"create_user failed: {e}")
        raise

def get_user_by_id(user_id: str) -> dict | None:
    """Find a user in MongoDB by their record's _id."""
    from bson.objectid import ObjectId
    try:
        db = get_db()
        user = db[USERS_COLLECTION].find_one({"_id": ObjectId(user_id)})
        if user:
            user["_id"] = str(user["_id"])
        return user
    except Exception as e:
        logger.error(f"get_user_by_id failed for '{user_id}': {e}")
        return None


# ─────────────────────────────────────────────────────────────────────────────
#  API Usage Tracking
# ─────────────────────────────────────────────────────────────────────────────

def check_and_increment_api_usage(api_name: str, limit: int) -> bool:
    """
    Atomically check and increment the usage count for a given API in the
    current calendar month.
    
    Returns:
        True if the increment succeeded and the total is <= limit.
        False if the limit has been reached.
    """
    try:
        db = get_db()
        collection = db[API_USAGE_COLLECTION]
        
        # Key by month and year (e.g. "04_2026")
        month_key = datetime.utcnow().strftime("%m_%Y")
        
        # update_one with $inc is atomic in MongoDB
        # We don't check BEFORE incrementing to avoid race conditions.
        # Instead, we increment and then check the result.
        result = collection.find_one_and_update(
            filter={"api_name": api_name, "month": month_key},
            update={"$inc": {"count": 1}},
            upsert=True,
            return_document=True   # returns the document AFTER increment
        )
        
        current_count = result.get("count", 0)
        
        if current_count > limit:
            logger.warning(f"Quota exceeded for '{api_name}': {current_count}/{limit}")
            return False
            
        logger.info(f"API usage tracked for '{api_name}': {current_count}/{limit}")
        return True
        
    except PyMongoError as e:
        logger.error(f"check_and_increment_api_usage failed for '{api_name}': {e}")
        # On DB error, we default to ALLOWING the request to avoid breaking the core feature.
        return True

def get_api_usage(api_name: str) -> int:
    """Return the current month's usage count for an API."""
    try:
        db = get_db()
        month_key = datetime.utcnow().strftime("%m_%Y")
        doc = db[API_USAGE_COLLECTION].find_one({"api_name": api_name, "month": month_key})
        return doc.get("count", 0) if doc else 0
    except Exception:
        return 0
