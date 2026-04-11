# 🚀 AI Career Intelligence Platform (RAG + Job Automation)

An end-to-end AI-powered career assistant that helps users analyze their resumes, identify skill gaps, fetch relevant jobs automatically, and stay updated with real-time tech and job trends using RAG (Retrieval-Augmented Generation).

---

## 🧠 Overview

This project combines **Resume Intelligence + Job Automation + RAG-based Knowledge System** into one unified platform.

### 🔹 Part 1: Resume & Job Matching Engine
- Upload Resume + Job Description (JD)
- Get **Skill Gap Analysis**
- Get **AI-based Resume Matching Score**
- Automatically fetch **relevant jobs daily (date-wise)** using Job APIs

### 🔹 Part 2: RAG-based Career Knowledge Engine
- Scrapes **job market trends + tech content daily**
- Stores embeddings in **Vector Database**
- Enables **natural language queries** like:
  - "What skills are trending today?"
  - "Is MERN still in demand?"
  - "Which AI roles are growing?"

---

## 🔥 Features

- 📄 Resume parsing & semantic analysis  
- 🧠 Skill gap detection using LLM  
- 🔍 Semantic job matching (vector similarity)  
- 🌐 Multi-source job fetching (Adzuna, JSearch APIs)  
- ⏰ Automated daily job updates  
- 📊 RAG-powered Q&A system for career insights  
- 🧾 Context-aware chatbot for resume improvement  
- ⚡ Low-latency inference using Groq / LLMs  

---

## 🏗️ Tech Stack

### Backend
- FastAPI  
- Python  
- LangChain  

### AI / ML
- RAG (Retrieval-Augmented Generation)  
- LLMs (Groq - Llama 3.1 / Gemini)  
- Embeddings (Ollama / OpenAI)  

### Database
- MongoDB (structured data)  
- ChromaDB (vector database)  

### Frontend
- React.js  

### Tools
- Docker  
- REST APIs  
- Cron Jobs (for automation)  

---

## ⚙️ System Architecture
User Input (Resume + JD)
↓
Resume Parsing + Embedding
↓
Skill Gap Analysis (LLM)
↓
Job Fetching APIs → Data Cleaning → Storage (MongoDB)
↓
Vector Embeddings (ChromaDB)
↓
RAG Pipeline → Query Answering


---

## 🚀 How It Works

### 🧩 Resume Intelligence
1. User uploads resume + JD  
2. Extract skills using NLP  
3. Compare using embeddings  
4. Generate:
   - Match Score  
   - Missing Skills  
   - Learning Suggestions  

---

### 🔄 Job Automation
1. Fetch jobs daily via APIs  
2. Remove duplicates  
3. Rank using semantic similarity  
4. Store & display latest jobs  

---

### 🧠 RAG Knowledge Engine
1. Scrape tech + job-related content  
2. Convert to embeddings  
3. Store in vector DB  
4. Answer user queries contextually  

---

## 💡 Why This Project?

- Combines **Data Engineering + AI + Full Stack**
- Solves a **real-world problem (career guidance)**
- Demonstrates:
  - RAG systems  
  - Data pipelines  
  - LLM integration  
  - Automation  

---

## 🤔 Are Both Parts Related?

✅ YES — and that’s the strength of this project.

- Part 1 → **Personalized Career Intelligence**
- Part 2 → **Market Intelligence**

👉 Together = **Complete Career Ecosystem**

---

## 🏷️ Suggested Project Names

Choose one 👇

- **CareerAI Engine**
- **SkillSync AI**
- **HireSense AI**
- **NextRole AI**
- **PathFinder AI**
- **CareerRAG**

🔥 Best pick: **CareerAI Engine** (simple + powerful)

---

## 📈 Future Improvements

- Add dashboard analytics  
- Resume auto-improvement suggestions  
- Company-specific interview prep  
- Real-time notifications  
- AI mock interviews  

---

## 🤝 Contribution

Feel free to fork, improve, and contribute 🚀

---

## 📬 Contact

Built with passion for AI + real-world impact 💯
