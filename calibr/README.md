# Calibr — Automated Job Fetcher & AI Career Intelligence Engine

Calibr is an AI-powered career platform that parses your resume, fetches personalised job listings from multiple sources, performs skill-gap analysis using Gemini, and provides a RAG-powered career coach chat — all driven by Google Gemini embeddings and a fully local vector store.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Zustand, Axios, Tailwind CSS |
| **Backend** | Python 3.11+, FastAPI, Uvicorn, APScheduler |
| **AI / LLM** | Google Gemini `gemini-1.5-flash-latest` (chat + skill extraction) |
| **Embeddings** | Google Gemini `models/text-embedding-004` (free, via `langchain-google-genai`) |
| **Database** | MongoDB Atlas (free 512 MB tier via Motor async driver) |
| **Vector DB** | ChromaDB (local, no signup — persisted to `./chroma_db`) |
| **Job Sources** | Adzuna API · JSearch via RapidAPI |

---

## Getting Started

### Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv

# macOS / Linux
source venv/bin/activate

# Windows
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template and fill in your keys
cp .env.example .env
# (edit .env with your actual API keys — see "Free API Keys" section below)

# Start the backend server
uvicorn main:app --reload --port 8000
```

The FastAPI server will be available at **http://localhost:8000**  
Interactive API docs: **http://localhost:8000/docs**

### Frontend Setup

```bash
cd frontend

# Install Node dependencies
npm install

# Copy environment template
cp .env.example .env
# (default VITE_API_URL=http://localhost:8000/api/v1 works for local dev)

# Start the Vite dev server
npm run dev
```

The React app will be available at **http://localhost:5173**

---

## Free API Keys — Where to Get Them

| Service | URL | Free Tier |
|---|---|---|
| **Gemini API** (LLM + Embeddings) | [aistudio.google.com](https://aistudio.google.com/app/apikey) | Free — generous quota |
| **MongoDB Atlas** (Database) | [mongodb.com/atlas](https://www.mongodb.com/atlas) | Free 512 MB shared cluster |
| **Adzuna** (Job listings) | [developer.adzuna.com](https://developer.adzuna.com) | Free 250 calls/day |
| **JSearch via RapidAPI** (Job listings) | [rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch) | Free tier available |

> **Minimum required:** Only `GEMINI_API_KEY` and `MONGODB_URL` are strictly required to run Calibr. The Adzuna and JSearch keys are optional; without them the job feed will be empty but all other features work.

---

## API Endpoints

### Resume

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/resume/upload` | Upload a PDF/DOCX resume — parses text, extracts skills with Gemini, creates embeddings, saves to MongoDB + ChromaDB |
| `POST` | `/api/v1/resume/jd` | Submit a job description text — extracts JD skills with Gemini and saves to user profile |
| `GET` | `/api/v1/resume/{user_id}` | Get lightweight resume metadata (filename, skills list, upload date) |

### Jobs

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/jobs/{user_id}` | Get personalised ranked job feed — triggers on-demand fetch if no jobs today |
| `POST` | `/api/v1/jobs/refresh/{user_id}` | Manually trigger a fresh job fetch from Adzuna + JSearch |
| `GET` | `/api/v1/jobs/filters/{user_id}` | Get filtered/sorted job listings (`?location=`, `?source=`, `?min_match=`, `?fetch_date=`) |

### Analysis

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/analysis/skill-gap` | Run full AI skill-gap analysis — returns `has_skills`, `missing_skills`, `weak_skills`, `recommendations`, and `overall_match_percentage` |

### Chat

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/chat/message` | Send a message to Calibr AI career coach — RAG-powered with resume + job context |
| `GET` | `/api/v1/chat/history/{user_id}` | Retrieve last 20 chat messages in chronological order |
| `DELETE` | `/api/v1/chat/history/{user_id}` | Clear all chat history for a user |

### Health

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Health check — returns `{"status": "ok", "app": "Calibr API", "version": "1.0.0"}` |

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | ✅ Yes | Google Gemini API key — used for both LLM and embeddings |
| `MONGODB_URL` | ✅ Yes | MongoDB Atlas connection string |
| `DB_NAME` | No (default: `calibr`) | MongoDB database name |
| `CHROMA_PATH` | No (default: `./chroma_db`) | Local path for ChromaDB vector storage |
| `ADZUNA_APP_ID` | Optional | Adzuna App ID for job fetching |
| `ADZUNA_APP_KEY` | Optional | Adzuna App Key for job fetching |
| `JSEARCH_API_KEY` | Optional | RapidAPI key for JSearch job fetching |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | No (default: `http://localhost:8000/api/v1`) | Backend API base URL |

---

## Project Structure

```
calibr/
├── backend/
│   ├── main.py                  # FastAPI app entry point, CORS, lifespan, routers
│   ├── requirements.txt         # Python dependencies
│   ├── .env.example             # Environment variable template
│   ├── routers/
│   │   ├── resume.py            # Resume upload, JD submit, metadata
│   │   ├── jobs.py              # Job feed, refresh, filters
│   │   ├── analysis.py          # Skill-gap analysis
│   │   └── chat.py              # RAG chat, history, clear
│   ├── services/
│   │   ├── parser.py            # PDF/DOCX parsing + Gemini skill extraction
│   │   ├── embedder.py          # Gemini text-embedding-004 + ChromaDB indexing
│   │   ├── job_fetcher.py       # Adzuna + JSearch API integration
│   │   ├── skill_gap.py         # Gemini-powered skill gap analysis
│   │   ├── rag_chain.py         # LangChain RAG chain for career chat
│   │   └── scheduler.py        # APScheduler daily job-fetch cron
│   ├── db/
│   │   └── mongodb.py           # Motor async MongoDB client + helpers
│   ├── models/                  # Pydantic schemas
│   ├── prompts/                 # Gemini prompt templates
│   └── utils/
│       └── helpers.py           # JSON cleaning, chunking, date, chat formatting
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── .env.example
    └── src/
        ├── App.jsx              # Routing + layout shell
        ├── main.jsx             # React entry point
        ├── index.css            # Tailwind + global styles + animations
        ├── services/
        │   └── api.js           # Axios client + all API call functions
        ├── store/               # Zustand global state
        ├── components/          # Reusable UI components
        └── pages/               # Resume, Jobs, Analysis, Chat pages
```

---

## Architecture Notes

- **Embeddings everywhere**: All resume text, job descriptions, and chat queries are embedded with Gemini `text-embedding-004` (free tier). Semantic similarity drives job ranking and RAG retrieval.
- **No auth yet**: `user_id` is passed as a plain string. A JWT auth layer can be added later without changing any other code.
- **ChromaDB is local**: All vector data lives in `./chroma_db` on your machine. No external vector DB service or signup needed.
- **Daily cron at 07:00**: APScheduler fires `fetch_and_store_jobs()` every morning. A first-time user triggers an immediate fetch on their first `/jobs/{user_id}` request.
