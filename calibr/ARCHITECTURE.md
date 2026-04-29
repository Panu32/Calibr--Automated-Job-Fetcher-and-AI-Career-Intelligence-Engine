# Calibr — Full Architecture Diagram

> **Editable Diagram File:** [`../architecture.drawio`](../architecture.drawio)
>
> Open it at **[app.diagrams.net](https://app.diagrams.net)** → `File → Open from → This device` → select `architecture.drawio`
> All blocks, labels, colours, and arrows are fully editable.

---

## How to Open & Edit

| Step | Action |
|------|--------|
| 1 | Go to **https://app.diagrams.net** |
| 2 | Click **File → Open from → This device** |
| 3 | Select `calibr/architecture.drawio` from this project |
| 4 | Click any block to move, resize, or re-label it |
| 5 | Save back: **File → Save** (stays as `.drawio`) or **Export as PNG/SVG** |

---

## Architecture Overview (5 Layers)

```mermaid
flowchart TD
    subgraph CLIENT["① CLIENT LAYER — React 18 + Vite (localhost:5173)"]
        USER["👤 User (Browser)"]
        PAGES["Pages\nHome | Chat | Resume | Jobs | Login | Signup"]
        COMP["Components\nSidebar | ChatWindow | ResumeUpload | JobCard"]
        STORE["Zustand Global Store\nuser | token | chatHistory | resumeData | jobs"]
        AXIOS["Axios API Client\nservices/api.js — JWT Interceptors"]
        LS["LocalStorage\ncalibr_token | calibr_user"]
    end

    subgraph BACKEND["② BACKEND LAYER — FastAPI + Uvicorn (localhost:8000)"]
        CORS["CORS Middleware\nallow_origins: localhost:5173"]
        LIFE["Lifespan Manager\nstartup / shutdown hooks"]
        SCHED["APScheduler\nMarket Intel: /6h | Jobs: 07:00 daily"]
        JWT["JWT Auth Utils\nutils/auth.py"]

        subgraph ROUTERS["API Routers — /api/v1/*"]
            R_AUTH["/auth\nPOST /signup\nPOST /login"]
            R_RES["/resume\nPOST /upload\nPOST /jd\nGET /{user_id}"]
            R_JOB["/jobs\nGET /{user_id}\nPOST /refresh/{id}\nGET /filters/{id}"]
            R_ANA["/analysis\nPOST /skill-gap"]
            R_CHAT["/chat\nPOST /message (SSE)\nGET /history/{id}\nDELETE /history/{id}"]
            R_NEWS["/news\nPOST /refresh\nGET /status"]
        end
    end

    subgraph SERVICES["③ SERVICES LAYER — Business Logic & AI"]
        RAG["RAG Chain\nservices/rag_chain.py\nchat_with_resume_stream()\nLangChain + Groq + SSE"]
        PARSER["Parser\nservices/parser.py\nPDF/DOCX text extraction\nSkill extraction via LLM"]
        EMBED["Embedder\nservices/embedder.py\nget_embedding_model()\nChromaDB indexing"]
        JOBSVC["Job Fetcher\nservices/job_fetcher.py\nAdzuna + JSearch dedup"]
        SGAP["Skill Gap Analyser\nservices/skill_gap.py\nhas/missing/weak skills\nmatch percentage"]
        NEWS["News Service\nservices/news_service.py\nHN + TechCrunch + Dev.to"]
        DAL["MongoDB DAL\ndb/mongodb.py\nsave/get resume, jobs\nchat_history, users"]
    end

    subgraph DATA["④ DATA STORAGE LAYER"]
        subgraph MONGO["MongoDB Atlas (Cloud — Free 512 MB)"]
            COL_U["users\n_id | email | password_hash\nfull_name | created_at"]
            COL_R["resumes\nuser_id | raw_text | filename\nextracted_skills | jd_text"]
            COL_J["jobs\njob_id | title | company\nlocation | match_score"]
            COL_C["chat_history\nuser_id | role\ncontent | timestamp"]
            COL_A["api_usage\napi_name | month | count"]
        end
        subgraph CHROMA["ChromaDB (Local — ./chroma_db)"]
            CH_J["jobs collection\nJob description embeddings\nSemantic job matching"]
            CH_N["tech_news collection\nNews article embeddings\nMarket intelligence RAG"]
        end
    end

    subgraph EXTERNAL["⑤ EXTERNAL SERVICES & APIs"]
        GROQ["Groq API\nllama-3.1-8b-instant\nChat + Skill Extraction"]
        OLLAMA["Ollama (Local)\nnomic-embed-text\nlocalhost:11434"]
        ADZUNA["Adzuna API\n250 calls/month free\nPrimary job source"]
        JSEARCH["JSearch / RapidAPI\n100 req/month free\nSecondary job source"]
        HN["Hacker News API\nAlgolia HN endpoint"]
        TC["TechCrunch RSS\nXML feed parsing"]
        DEVTO["Dev.to API\nTrending articles"]
    end

    %% Client → Backend
    AXIOS -->|"HTTP + Bearer JWT"| CORS

    %% Backend routing
    CORS --> R_AUTH & R_RES & R_JOB & R_ANA & R_CHAT & R_NEWS

    %% Routers → Services
    R_RES  -->|resume upload| PARSER
    R_JOB  -->|fetch jobs|   JOBSVC
    R_ANA  -->|skill-gap|    SGAP
    R_CHAT -->|chat message| RAG
    R_NEWS -->|news sync|    NEWS

    %% Services → Services
    RAG    --> EMBED
    PARSER --> EMBED
    SGAP   --> RAG

    %% Services → DAL → MongoDB
    RAG    -->|save/get chat| DAL
    PARSER -->|save resume|   DAL
    JOBSVC -->|save jobs|     DAL
    DAL    --> MONGO

    %% Services → ChromaDB
    EMBED  -->|upsert vectors| CHROMA

    %% Services → External
    RAG    -->|LLM call|    GROQ
    EMBED  -->|embed|       OLLAMA
    JOBSVC -->|listings|    ADZUNA
    JOBSVC -->|listings|    JSEARCH
    NEWS   -->|stories|     HN
    NEWS   -->|RSS|         TC
    NEWS   -->|articles|    DEVTO

    %% APScheduler triggers
    SCHED -.->|every 6h|   NEWS
    SCHED -.->|07:00 daily| JOBSVC
```

---

## Layer-by-Layer Breakdown

### ① Client Layer
| Module | Purpose |
|--------|---------|
| `React 18 + Vite` | UI framework + lightning-fast dev server |
| `Zustand` | Zero-boilerplate global state management |
| `Axios + api.js` | All API calls; JWT auto-attached via request interceptor |
| `LocalStorage` | Session persistence across browser refreshes |
| `Tailwind CSS` | Utility-first design system + custom animations |
| `react-markdown` | Renders AI responses as rich Markdown in the Chat page |

### ② Backend Layer
| Module | Purpose |
|--------|---------|
| `FastAPI` | ASGI web framework; auto OpenAPI docs at `/docs` |
| `Uvicorn` | ASGI server running on port 8000 |
| `CORS Middleware` | Allows `localhost:5173` cross-origin requests |
| `Lifespan Manager` | Hooks for MongoDB connect + APScheduler init on startup |
| `APScheduler` | Cron: job fetch at 07:00 daily; news sync every 6 hours |
| `JWT utils/auth.py` | Decodes Bearer token → user_id for protected routes |
| `Pydantic Schemas` | Request/response validation models |

### ③ Services Layer
| Service | File | Key Function |
|---------|------|-------------|
| RAG Chain | `rag_chain.py` | `chat_with_resume_stream()` — SSE streaming via LangChain + Groq |
| Parser | `parser.py` | PDF/DOCX text extraction + skill tagging via LLM |
| Embedder | `embedder.py` | Ollama `nomic-embed-text` → ChromaDB upsert |
| Job Fetcher | `job_fetcher.py` | Adzuna + JSearch fetch, normalise, dedup, store |
| Skill Gap | `skill_gap.py` | `has_skills`, `missing_skills`, `match_percentage` |
| News Service | `news_service.py` | HN + TechCrunch + Dev.to fetch → ChromaDB embed |
| MongoDB DAL | `db/mongodb.py` | All CRUD helpers for every collection |

### ④ Data Storage
| Store | Type | Collections / Data |
|-------|------|-------------------|
| MongoDB Atlas | Cloud (Free 512 MB) | `users`, `resumes`, `jobs`, `chat_history`, `api_usage` |
| ChromaDB | Local (`./chroma_db`) | `jobs` (job embeddings), `tech_news` (news embeddings) |

### ⑤ External Services
| Service | Role | Free Tier |
|---------|------|-----------|
| Groq API | LLM (llama-3.1-8b-instant) — chat + skill extraction | Free |
| Ollama | Local embeddings (nomic-embed-text) | Free (local) |
| Adzuna | Primary job listings source | 250 calls/month |
| JSearch | Secondary job listings source | 100 calls/month |
| Hacker News | Tech news via Algolia API | Free |
| TechCrunch | Tech news via RSS feed | Free |
| Dev.to | Trending coding articles | Free |

---

## Key Data Flows

```
User sends chat message
  → Axios POST /api/v1/chat/message
  → FastAPI chat router
  → rag_chain.chat_with_resume_stream()
  → [parallel] get_chat_history(MongoDB) + get_rag_context(ChromaDB)
  → LangChain CHAT_PROMPT | ChatGroq(llama-3.1-8b-instant) | StrOutputParser
  → SSE token stream → React ChatWindow
  → save_chat_message(MongoDB) — persisted after stream completes

User uploads resume
  → Axios POST /api/v1/resume/upload (multipart)
  → FastAPI resume router
  → parser.extract_text() → LLM skill extraction
  → embedder.embed_and_store() → Ollama → ChromaDB jobs collection
  → save_resume(MongoDB)

APScheduler (every 6h)
  → news_service.sync_market_intelligence()
  → fetch HN + TechCrunch + Dev.to
  → Ollama embed each article
  → ChromaDB tech_news upsert
```

---

*Generated: April 2026 | Edit `architecture.drawio` at [app.diagrams.net](https://app.diagrams.net)*
