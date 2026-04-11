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
from routers import resume, jobs, analysis, chat, auth

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


# ─────────────────────────────────────────────────────────────────────────────
#  Step 3 – Create the APScheduler instance
#  AsyncIOScheduler integrates with FastAPI's asyncio event loop,
#  so we can await async functions from scheduled jobs.
# ─────────────────────────────────────────────────────────────────────────────
scheduler = AsyncIOScheduler()


# ─────────────────────────────────────────────────────────────────────────────
#  Step 4 – Lifespan context manager (startup + shutdown)
#  FastAPI recommends using @asynccontextmanager instead of the older
#  @app.on_event("startup") / @app.on_event("shutdown") decorators.
#
#  Code BEFORE `yield`  → runs on startup
#  Code AFTER  `yield`  → runs on shutdown
# ─────────────────────────────────────────────────────────────────────────────
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
    #     connect_to_mongo() stores the client in a module-level variable
    #     so all routers and services can import and use it without reconnecting.
    logger.info("Connecting to MongoDB Atlas…")
    await connect_to_mongo()
    logger.info("✅ MongoDB connected.")

    # 4b. Register the daily job-fetch cron (DISABLED to save Gemini Quota)
    # scheduler.add_job(
    #     func=fetch_and_store_jobs,
    #     trigger=CronTrigger(hour=7, minute=0),
    #     id="daily_job_fetch",
    #     name="Daily Job Fetch",
    #     replace_existing=True,
    # )

    # 4c. Start the scheduler (DISABLED)
    # scheduler.start()
    # logger.info("⏰  Daily job-fetch cron scheduled for 07:00 every day.")

    # ── Hand control to FastAPI (serve requests) ──────────────────────────────
    yield

    # ── SHUTDOWN ─────────────────────────────────────────────────────────────

    logger.info("🛑 Calibr backend shutting down…")

    # 4d. Stop all scheduled jobs gracefully (wait=False for fast exit)
    scheduler.shutdown(wait=False)
    logger.info("⏹  Scheduler stopped.")

    # 4e. Close the MongoDB connection so the driver flushes its connection pool
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],    # React/Vite dev server
    allow_credentials=True,                    # allow cookies / auth headers
    allow_methods=["*"],                       # GET, POST, PUT, DELETE, etc.
    allow_headers=["*"],                       # all request headers allowed
)


# ─────────────────────────────────────────────────────────────────────────────
#  Step 7 – Register API Routers
#  Each router is a separate module that owns a slice of the API.
#  All routes are prefixed with /api/v1 for versioning.
#
#  Resulting route groups:
#    /api/v1/auth/*    – authentication and user management
#    /api/v1/resume/*  – upload, parse, and embed resumes
#    /api/v1/jobs/*    – browse, search, and score job listings
#    /api/v1/analysis/*– skill-gap analysis between resume and job description
#    /api/v1/chat/*    – RAG-powered career advisor chat
# ─────────────────────────────────────────────────────────────────────────────
API_PREFIX = "/api/v1"

app.include_router(
    auth.router,
    prefix=f"{API_PREFIX}/auth",
    tags=["Auth"],
)

app.include_router(
    resume.router,
    prefix=f"{API_PREFIX}/resume",
    tags=["Resume"],            # groups these endpoints in /docs
)

app.include_router(
    jobs.router,
    prefix=f"{API_PREFIX}/jobs",
    tags=["Jobs"],
)

app.include_router(
    analysis.router,
    prefix=f"{API_PREFIX}/analysis",
    tags=["Analysis"],
)

app.include_router(
    chat.router,
    prefix=f"{API_PREFIX}/chat",
    tags=["Chat"],
)


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
