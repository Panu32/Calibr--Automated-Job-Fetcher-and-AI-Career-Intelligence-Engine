"""
services/embedder.py
─────────────────────────────────────────────────────────────────────────────
Calibr – Embedding & Vector Store Service

Responsibilities:
  1. Provide a cached Gemini embedding client (text-embedding-004, free API).
  2. Manage a persistent ChromaDB instance with a custom Gemini embedding function.
  3. Embed resume chunks and job listings into separate Chroma collections.
  4. Query the jobs collection using a user's averaged resume embedding to find
     the most semantically similar job listings.

Gemini embedding model: models/text-embedding-004
  - Completely free (up to 1500 requests/min on free tier)
  - 768-dimensional vectors
  - No local GPU or model download required
─────────────────────────────────────────────────────────────────────────────
"""

# ── Standard library ──────────────────────────────────────────────────────────
import logging
import os
from typing import Optional

# ── Third-party: ChromaDB ─────────────────────────────────────────────────────
import chromadb
from chromadb import EmbeddingFunction, Embeddings   # base class for custom embed fn
from chromadb.config import Settings                  # persistent storage config

# ── Third-party: Ollama embeddings via LangChain ───────────────────────────────
from langchain_ollama import OllamaEmbeddings

# ── Module-level logger ───────────────────────────────────────────────────────
logger = logging.getLogger("calibr.embedder")


# ─────────────────────────────────────────────────────────────────────────────
#  Module-level singletons (cached after first load)
# ─────────────────────────────────────────────────────────────────────────────
_embedding_model: Optional[OllamaEmbeddings] = None  # Ollama embed client
_chroma_client: Optional[chromadb.ClientAPI] = None  # Chroma persistent client


# ─────────────────────────────────────────────────────────────────────────────
#  ChromaDB Custom Embedding Function (wraps Ollama API)
# ─────────────────────────────────────────────────────────────────────────────
class OllamaEmbeddingFunction(EmbeddingFunction):
    """
    Custom ChromaDB embedding function backed by local Ollama nomic-embed-text.
    """

    def __call__(self, input: list[str]) -> Embeddings:
        """
        Embed a batch of texts using the Ollama nomic-embed-text model.
        """
        model = get_embedding_model()
        vectors = model.embed_documents(input)
        return vectors


# ─────────────────────────────────────────────────────────────────────────────
#  Function 1: get_embedding_model
# ─────────────────────────────────────────────────────────────────────────────
def get_embedding_model():
    # nomic-embed-text runs locally via Ollama
    # Tiny 274MB model - very light on laptop
    # No API key needed, no rate limits
    return OllamaEmbeddings(
        model=os.getenv("OLLAMA_EMBED_MODEL",
                        "nomic-embed-text"),
        base_url=os.getenv("OLLAMA_BASE_URL",
                           "http://localhost:11434")
    )


# ─────────────────────────────────────────────────────────────────────────────
#  Function 2: get_chroma_client
# ─────────────────────────────────────────────────────────────────────────────
def get_chroma_client() -> chromadb.ClientAPI:
    """
    Return the cached persistent ChromaDB client.

    Persistent mode means ChromaDB saves its data to disk (at CHROMA_PATH)
    so embeddings survive server restarts. Without persistence,
    all vectors would be lost when the FastAPI process stops.

    The path is read from the CHROMA_PATH environment variable
    (default: ./chroma_db if the variable is not set).

    Returns:
        A chromadb.PersistentClient connected to the on-disk store.
    """
    global _chroma_client

    if _chroma_client is None:
        chroma_path = os.getenv("CHROMA_PATH", "./chroma_db")
        logger.info(f"Initialising ChromaDB persistent client at '{chroma_path}'…")

        # PersistentClient writes all data to the specified directory.
        # The directory is created automatically if it doesn't exist.
        _chroma_client = chromadb.PersistentClient(path=chroma_path)

        logger.info("✅ ChromaDB client ready.")

    return _chroma_client


# ─────────────────────────────────────────────────────────────────────────────
#  Function 3: get_or_create_collection
# ─────────────────────────────────────────────────────────────────────────────
def get_or_create_collection(name: str) -> chromadb.Collection:
    """
    Retrieve an existing ChromaDB collection by name, or create it if absent.

    Uses our custom GeminiEmbeddingFunction so that all documents added to
    this collection are automatically embedded with Gemini text-embedding-004
    without needing to pass embeddings explicitly.

    Distance metric: cosine
        Cosine similarity measures the angle between vectors regardless of
        magnitude — perfect for comparing sentence embeddings, where direction
        matters more than length.

    Args:
        name: The collection name (e.g. "resumes" or "jobs").

    Returns:
        A ChromaDB Collection object ready for add/query operations.
    """
    client = get_chroma_client()

    # get_or_create_collection never raises if the collection exists;
    # it simply returns the existing one with the same settings.
    collection = client.get_or_create_collection(
        name=name,
        embedding_function=OllamaEmbeddingFunction(),   # plug Ollama in as the embedder
        metadata={"hnsw:space": "cosine"},              # use cosine distance metric
    )

    logger.debug(f"Collection '{name}' ready ({collection.count()} existing docs)")
    return collection


# ─────────────────────────────────────────────────────────────────────────────
#  Helper: chunk_text
#  Splits a long string into overlapping chunks for better semantic coverage.
# ─────────────────────────────────────────────────────────────────────────────
def _chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    """
    Split text into fixed-size character chunks with an overlap window.

    Why chunk resumes?
        A long resume might contain 3000+ characters. Embedding the whole thing
        as one vector averages away important local details (skills, projects).
        Chunking lets us embed each section separately so queries can match
        specific parts of the resume.

    Why overlap?
        If a sentence spans a chunk boundary, the overlap ensures the concept
        appears in full in at least one chunk, preserving context.

    Args:
        text      : The full text to chunk.
        chunk_size: Maximum characters per chunk (default 500).
        overlap   : Characters shared between adjacent chunks (default 50).

    Returns:
        A list of string chunks. Each chunk is at most chunk_size chars long.
    """
    chunks = []
    start = 0

    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]

        # Only include chunks with meaningful content (not just whitespace)
        if chunk.strip():
            chunks.append(chunk.strip())

        # Move forward by (chunk_size - overlap) so next chunk overlaps
        start += chunk_size - overlap

    return chunks


# ─────────────────────────────────────────────────────────────────────────────
#  Function 4: embed_resume
# ─────────────────────────────────────────────────────────────────────────────
def embed_resume(user_id: str, resume_text: str) -> bool:
    """
    Chunk a resume, embed all chunks with Gemini, and store them in ChromaDB.

    Why store multiple chunks per user?
        - One embedding per resume loses granularity.
        - Multiple chunks let us match specific sections (e.g. skills, projects)
          against job descriptions more precisely.

    Storage layout in the "resumes" collection:
        ID       : "{user_id}_chunk_{index}"  (unique per chunk)
        Document : The chunk text
        Metadata : {"user_id": user_id, "chunk_index": index}

    The GeminiEmbeddingFunction on the collection handles embedding
    automatically — we just pass raw text via add().

    Args:
        user_id    : User's unique identifier (ties chunks to a user).
        resume_text: Full plain text extracted from the resume.

    Returns:
        True  if all chunks were embedded and stored successfully.
        False if any error occurred (logged).
    """
    try:
        # ── 1. Get the resumes collection ─────────────────────────────────
        collection = get_or_create_collection("resumes")

        # ── 2. Delete any existing chunks for this user (re-upload flow) ──
        # When a user uploads a new resume, we replace the old embeddings.
        existing = collection.get(where={"user_id": user_id})
        if existing["ids"]:
            collection.delete(ids=existing["ids"])
            logger.info(f"Deleted {len(existing['ids'])} old resume chunks for user '{user_id}'")

        # ── 3. Chunk the resume text ───────────────────────────────────────
        chunks = _chunk_text(resume_text, chunk_size=500, overlap=50)

        if not chunks:
            logger.warning(f"embed_resume: no chunks produced for user '{user_id}'")
            return False

        logger.info(f"Embedding {len(chunks)} resume chunks for user '{user_id}'…")

        # ── 4. Build parallel lists required by chromadb.add() ────────────
        ids       = [f"{user_id}_chunk_{i}" for i in range(len(chunks))]
        metadatas = [{"user_id": user_id, "chunk_index": i} for i in range(len(chunks))]

        # chromadb.add() calls our GeminiEmbeddingFunction internally
        # to convert the documents list → embedding vectors before storing.
        collection.add(
            ids=ids,
            documents=chunks,    # raw text — Gemini embedding happens inside Chroma
            metadatas=metadatas,
        )

        logger.info(f"✅ Stored {len(chunks)} resume chunks for user '{user_id}' in ChromaDB")
        return True

    except Exception as e:
        logger.error(f"embed_resume failed for user '{user_id}': {e}")
        return False


# ─────────────────────────────────────────────────────────────────────────────
#  Function 5: embed_job
# ─────────────────────────────────────────────────────────────────────────────
def embed_job(job: dict) -> bool:
    """
    Embed a single job listing and store it in the "jobs" ChromaDB collection.

    Why combine title + company + description into one string?
        A job listing has several fields but we want ONE vector per job
        for efficient cosine similarity queries. Concatenating the most
        meaningful fields gives the embedding model the full context it needs.

    Storage layout in the "jobs" collection:
        ID       : job["job_id"]
        Document : "{title} at {company}. {description}"
        Metadata : {"job_id": ..., "date_fetched": ...}

    Args:
        job: A dict (or JobListing-compatible mapping) containing at least:
             - job_id      (str)
             - title       (str)
             - company     (str)
             - description (str)
             - date_fetched(str or datetime)

    Returns:
        True  on success.
        False on failure (logged).
    """
    try:
        collection = get_or_create_collection("jobs")

        # ── Build a single rich text string from the most important fields ──
        # Format: "<title> at <company>. <description>"
        combined_text = (
            f"{job.get('title', 'Unknown Title')} "
            f"at {job.get('company', 'Unknown Company')}. "
            f"{job.get('description', '')}"
        ).strip()

        job_id = str(job.get("job_id", ""))

        if not job_id:
            logger.warning("embed_job called with missing job_id — skipping")
            return False

        # Convert date_fetched to string for ChromaDB metadata
        # (Chroma metadata values must be str, int, float, or bool)
        date_fetched = str(job.get("date_fetched", ""))

        # upsert = insert if new, replace if job_id already exists
        # This is safe to call repeatedly (e.g. daily refresh).
        collection.upsert(
            ids=[job_id],
            documents=[combined_text],
            metadatas=[{"job_id": job_id, "date_fetched": date_fetched}],
        )

        logger.debug(f"Embedded job '{job_id}': {job.get('title', '')} @ {job.get('company', '')}")
        return True

    except Exception as e:
        logger.error(f"embed_job failed for job '{job.get('job_id', '?')}': {e}")
        return False


# ─────────────────────────────────────────────────────────────────────────────
#  Function 6: find_matching_jobs
# ─────────────────────────────────────────────────────────────────────────────
def find_matching_jobs(user_id: str, top_k: int = 15) -> list[str]:
    """
    Find the top-k most semantically similar jobs for a given user's resume.

    Strategy:
        1. Retrieve all resume chunk embeddings for this user from ChromaDB.
        2. Average them into a single "resume vector" — this represents the
           user's overall profile as a point in 768-dimensional embedding space.
        3. Query the "jobs" collection with that averaged vector to find the
           nearest neighbors (most similar job listings).
        4. Return a list of job_ids ranked by similarity (closest first).

    Why average embeddings?
        Averaging is a simple and effective way to combine multiple chunk
        vectors into one representative vector. It works well when chunks
        cover different resume sections, since the average captures the
        general skill/experience profile.

    Args:
        user_id: The user whose resume chunks we want to query against.
        top_k  : Max number of matching job IDs to return (default 15).

    Returns:
        A list of job_id strings ordered by cosine similarity (best match first).
        Returns an empty list if the user has no resume embeddings or on error.
    """
    try:
        # ── 1. Get the resume collection and fetch all chunks for this user ─
        resume_collection = get_or_create_collection("resumes")

        # include=["embeddings"] tells ChromaDB to return the raw vectors
        user_data = resume_collection.get(
            where={"user_id": user_id},
            include=["embeddings"],
        )

        # If no embeddings exist, try embedding the raw text from MongoDB once
        if user_data["embeddings"] is None or len(user_data["embeddings"]) == 0:
            logger.info(f"No embeddings found for user '{user_id}' — attempting lazy embedding...")
            from db.mongodb import get_resume
            resume_doc = get_resume(user_id)
            if resume_doc and resume_doc.get("raw_text"):
                success = embed_resume(user_id, resume_doc["raw_text"])
                if success:
                    # Retry the fetch from Chroma
                    user_data = resume_collection.get(
                        where={"user_id": user_id},
                        include=["embeddings"],
                    )
            
            if user_data.get("embeddings") is None or len(user_data["embeddings"]) == 0:
                logger.warning(f"Lazy embedding failed or no text for user '{user_id}'")
                return []

        chunk_vectors = user_data["embeddings"]  # list of list[float]
        logger.info(f"Found {len(chunk_vectors)} resume chunks for user '{user_id}'")

        # ── 2. Average all chunk vectors into one representative vector ─────
        # zip(*chunk_vectors) transposes [[v1_dim1, v1_dim2,...], [v2_dim1,...]]
        # into [[all_dim1_values], [all_dim2_values], ...]
        # We then average each dimension across all chunks.
        num_dims   = len(chunk_vectors[0])
        avg_vector = [
            sum(vec[i] for vec in chunk_vectors) / len(chunk_vectors)
            for i in range(num_dims)
        ]

        # ── 3. Query the jobs collection with the averaged resume vector ────
        jobs_collection = get_or_create_collection("jobs")

        results = jobs_collection.query(
            query_embeddings=[avg_vector],   # our averaged resume embedding
            n_results=min(top_k, jobs_collection.count()),  # don't ask for more than exist
            include=["metadatas", "distances"],
        )

        if not results["ids"] or not results["ids"][0]:
            logger.info(f"No matching jobs found for user '{user_id}'")
            return []

        # ── 4. Extract job_ids and distances (lower distance = better match) ──
        # ChromaDB returns distance: 0.0 means identical, 1.0+ means different.
        # We convert distance to a similarity match percentage: (1 - distance) * 100
        matched_results = []
        for i in range(len(results["ids"][0])):
            job_id = results["metadatas"][0][i]["job_id"]
            distance = results["distances"][0][i]
            
            # Simple conversion: lower distance -> higher score
            # Cap at 0-100 range
            match_score = max(0.0, min(100.0, (1.0 - distance) * 100.0))
            
            matched_results.append({
                "job_id": job_id,
                "match_score": round(match_score, 1)
            })

        logger.info(
            f"find_matching_jobs: returning {len(matched_results)} ranked results "
            f"for user '{user_id}'"
        )
        return matched_results

    except Exception as e:
        logger.error(f"find_matching_jobs failed for user '{user_id}': {e}")
        return []
