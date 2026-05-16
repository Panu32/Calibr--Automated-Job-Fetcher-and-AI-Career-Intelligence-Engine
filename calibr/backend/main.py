"""
main.py
─────────────────────────────────────────────────────────────────────────────
Calibr – FastAPI Application Entry Point

This is the root of the backend. It is responsible for:
  1. Loading environment variables from .env
  2. Configuring CORS so the React frontend (localhost:5173) can talk to us
  3. Registering all API routers under the /api/v1 prefix
  4. Initialising the MongoDB connection on startup
  5. Starting an APScheduler cron job that auto-fetches new jobs every day at 7 AM
  6. Shutting everything down cleanly when the server stops

Run the server with:
    uvicorn main:app --reload --port 8000
─────────────────────────────────────────────────────────────────────────────
"""

# ── Standard library ──────────────────────────────────────────────────────────
import logging
from contextlib import asynccontextmanager

# ── Third-party: FastAPI ───────────────────────────────────────────────────────
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ── Third-party: Environment variables ────────────────────────────────────────
from dotenv import load_dotenv

# ── Third-party: APScheduler (background cron jobs) ───────────────────────────
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

# ── Internal: routers ─────────────────────────────────────────────────────────
# Each router handles a specific feature domain of the API.
from routers import resume, jobs, chat, auth, news, interview

# ── Internal: database initialisation ─────────────────────────────────────────
from db.mongodb import connect_to_mongo, close_mongo_connection

# ── Internal: the scheduled job that fetches new listings from Adzuna/JSearch ─
from services.job_fetcher import fetch_and_store_jobs


# ─────────────────────────────────────────────────────────────────────────────
#  Step 1 – Load environment variables from the .env file
#  Must happen BEFORE anything else reads os.environ (e.g. db connections).
# ─────────────────────────────────────────────────────────────────────────────
load_dotenv()  # reads .env in the current working directory into os.environ


# ─────────────────────────────────────────────────────────────────────────────
#  Step 2 – Configure logging 
#  Using Python's built-in logger so we get timestamped output in the console.
# ─────────────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,                               # show INFO and above
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("calibr")                 # our named logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manages the full lifecycle of the Calibr backend:
      - Startup:  open MongoDB connection, register + start scheduler
      - Shutdown: stop scheduler, close MongoDB connection
    """
    # ── STARTUP ──────────────────────────────────────────────────────────────
    logger.info("🚀 Calibr backend starting up…")

    # 4a. Connect to MongoDB Atlas
    logger.info("Connecting to MongoDB Atlas…")
    await connect_to_mongo()
    logger.info("✅ MongoDB connected.")

    # 4b. Initialize and start the scheduler inside the lifespan to ensure
    #     it binds to the correct running event loop.
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from apscheduler.triggers.cron import CronTrigger
    from services.job_fetcher import fetch_and_store_jobs
    from services.news_service import sync_market_intelligence
    
    # We store the scheduler on the app state so routers can access it if needed
    app.state.scheduler = AsyncIOScheduler()
    
    # Register daily job-fetch (07:00 AM) - DISABLED to save Groq API credits
    # app.state.scheduler.add_job(
    #     func=fetch_and_store_jobs,
    #     trigger=CronTrigger(hour=7, minute=0),
    #     id="daily_job_fetch",
    #     replace_existing=True,
    # )

    # Register Market Intel sync (Every 6 hours)
    app.state.scheduler.add_job(
        func=sync_market_intelligence,
        trigger="interval",
        hours=6,
        id="market_intel_sync",
        replace_existing=True,
    )

    app.state.scheduler.start()
    logger.info("⏰  Scheduler started: Daily Job Fetch & Market Intel.")

    # 4c. Initial Market Intel sync (runs in background thread)
    import threading
    threading.Thread(target=sync_market_intelligence, daemon=True).start()

    # ── Hand control to FastAPI ──────────────────────────────────────────────
    yield

    # ── SHUTDOWN ─────────────────────────────────────────────────────────────
    logger.info("🛑 Calibr backend shutting down…")

    # Stop scheduler
    if hasattr(app.state, "scheduler"):
        app.state.scheduler.shutdown(wait=False)
        logger.info("⏹  Scheduler stopped.")

    # Close MongoDB
    await close_mongo_connection()
    logger.info("🔌  MongoDB connection closed.")


# ─────────────────────────────────────────────────────────────────────────────
#  Step 5 – Create the FastAPI application instance
#  We pass the lifespan manager defined above so startup/shutdown hooks fire.
# ─────────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Calibr API",
    description=(
        "AI-powered career intelligence engine. "
        "Analyses resumes, fetches jobs, identifies skill gaps, "
        "and provides a RAG-powered career coach chat."
    ),
    version="1.0.0",
    lifespan=lifespan,                          # attach lifecycle hooks
    docs_url="/docs",                           # Swagger UI at /docs
    redoc_url="/redoc",                         # ReDoc at /redoc
)


# ─────────────────────────────────────────────────────────────────────────────
#  Step 6 – CORS Middleware
#  Allows the React frontend running at http://localhost:5173 (Vite default)
#  to make cross-origin requests to this FastAPI backend.
#  In production, replace the origin with your actual deployed frontend URL.
# ─────────────────────────────────────────────────────────────────────────────
import os
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:5173")], # Exact origins
    allow_origin_regex=r"https://.*\.vercel\.app", # Allow any Vercel deployment
    allow_credentials=True,                    # allow cookies / auth headers
    allow_methods=["*"],                       # GET, POST, PUT, DELETE, etc.
    allow_headers=["*"],                       # all request headers allowed
)


# ── Step 7 – Register API Routers
# Each router handles a specific feature domain of the API.
# All routes are prefixed with /api/v1 for versioning.
API_PREFIX = "/api/v1"

app.include_router(auth.router, prefix=f"{API_PREFIX}/auth", tags=["Auth"])
app.include_router(resume.router, prefix=f"{API_PREFIX}/resume", tags=["Resume"])
app.include_router(jobs.router, prefix=f"{API_PREFIX}/jobs", tags=["Jobs"])
app.include_router(chat.router, prefix=f"{API_PREFIX}/chat", tags=["Chat"])
app.include_router(news.router, prefix=f"{API_PREFIX}/news", tags=["Market Intel"])
app.include_router(interview.router, prefix=f"{API_PREFIX}/interview", tags=["Interview"])


# ─────────────────────────────────────────────────────────────────────────────
#  Step 8 – Root Health-Check Endpoint
#  GET /  → simple health check so infrastructure monitors (or the frontend)
#  can confirm the API is alive without hitting any resource-intensive route.
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
async def health_check() -> dict:
    """
    Health Check

    Returns a simple JSON response confirming the API is running.
    Use this in Docker HEALTHCHECK instructions or uptime monitors.

    Example response:
        {
            "status": "ok",
            "app": "Calibr API",
            "version": "1.0.0"
        }
    """
    return {
        "status": "ok",
        "app": "Calibr API",          # branding — matches FastAPI title above
        "version": app.version,        # pulls from the FastAPI instance metadata
    }
