"""
services/interview_agent.py
─────────────────────────────────────────────────────────────────────────────
Calibr – Multi-Agent AI Interview System (LangGraph)

Architecture:
  Supervisor → routes between 5 specialist agents
    1. web_searcher     – fetches company/role context (DuckDuckGo, free)
    2. question_generator – writes the next interview question
    3. evaluator        – scores the user's answer (1-10) + coaching tip
    4. interview_manager – decides phase transitions & completion

All LLM calls use Groq (llama-3.1-8b-instant) — already in .env, free tier.
─────────────────────────────────────────────────────────────────────────────
"""

import os
import re
import json
import time
import logging
import httpx
from typing import TypedDict, Literal, Optional
from datetime import datetime

from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, END

logger = logging.getLogger("calibr.interview")

# ─────────────────────────────────────────────────────────────────────────────
#  Interview Phases
# ─────────────────────────────────────────────────────────────────────────────
PHASES = [
    "introduction",
    "project_deep_dive",
    "technical_round",
    "ai_ml_round",
    "practical_thinking",
    "behavioral",
    "hr_closing",
]

PHASE_LABELS = {
    "introduction":      "Introduction",
    "project_deep_dive": "Project Deep Dive",
    "technical_round":   "Core Technical Round",
    "ai_ml_round":       "AI/ML Specialist Round",
    "practical_thinking":"Practical Thinking",
    "behavioral":        "Behavioral & Startup Mindset",
    "hr_closing":        "HR & Closing",
}

# Questions per phase before moving on
PHASE_QUESTION_LIMITS = {
    "introduction":      4,
    "project_deep_dive": 4,
    "technical_round":   4,
    "ai_ml_round":       3,
    "practical_thinking":3,
    "behavioral":        4,
    "hr_closing":        3,
}


# ─────────────────────────────────────────────────────────────────────────────
#  Shared State (passed between all LangGraph nodes)
# ─────────────────────────────────────────────────────────────────────────────
class InterviewState(TypedDict):
    # Job context
    job_title:       str
    job_company:     str
    job_description: str
    job_url:         str

    # User context (from resume)
    resume_text:     str
    user_name:       str

    # Company research (fetched once by web_searcher)
    company_context: str

    # Session state
    session_id:      str
    current_phase:   str
    phase_index:     int
    questions_in_phase: int
    is_ai_role:      bool

    # Conversation history as a list of dicts: [{role, content}]
    conversation:    list

    # Current turn data
    current_question:   str
    user_answer:        str
    evaluation_score:   int
    evaluation_feedback:str

    # Output control
    next_action: Literal["generate_question", "evaluate", "advance_phase", "end", "search"]

    # Running totals
    total_score:      int
    answers_given:    int
    is_complete:      bool
    final_report:     str


# ─────────────────────────────────────────────────────────────────────────────
#  LLM Helper — cheap, fast Groq
# ─────────────────────────────────────────────────────────────────────────────
def get_llm(temperature: float = 0.4) -> ChatGroq:
    return ChatGroq(
        model=os.getenv("GROQ_MODEL", "llama-3.1-8b-instant"),
        api_key=os.getenv("GROQ_API_KEY"),
        temperature=temperature,
        max_tokens=512,  # Keep responses tight to save tokens
    )


def call_llm(prompt: str, temperature: float = 0.4) -> str:
    """Single LLM call with error handling."""
    try:
        llm = get_llm(temperature)
        result = llm.invoke(prompt)
        return result.content.strip()
    except Exception as e:
        logger.error(f"LLM call failed: {e}")
        return ""


# ─────────────────────────────────────────────────────────────────────────────
#  Node 1: Web Searcher Agent
#  Uses DuckDuckGo Instant Answer API — completely free, no key needed
# ─────────────────────────────────────────────────────────────────────────────
def web_searcher_node(state: InterviewState) -> InterviewState:
    """Fetches a short company summary from DuckDuckGo. Runs once at session start."""
    company = state["job_company"]
    logger.info(f"[web_searcher] Searching for: {company}")

    context = ""
    try:
        url = "https://api.duckduckgo.com/"
        params = {"q": f"{company} company tech", "format": "json", "no_html": "1"}
        response = httpx.get(url, params=params, timeout=5)
        data = response.json()

        # DuckDuckGo Instant Answer gives Abstract or RelatedTopics
        abstract = data.get("Abstract", "")
        if abstract:
            context = abstract[:500]
        else:
            # Fallback: grab first related topic
            topics = data.get("RelatedTopics", [])
            if topics and isinstance(topics[0], dict):
                context = topics[0].get("Text", "")[:300]
    except Exception as e:
        logger.warning(f"[web_searcher] DuckDuckGo failed: {e}")

    if not context:
        context = f"{company} is a technology company. No additional context available."

    logger.info(f"[web_searcher] Got context: {context[:100]}...")
    return {**state, "company_context": context, "next_action": "generate_question"}


# ─────────────────────────────────────────────────────────────────────────────
#  Node 2: Question Generator Agent
#  Generates a single, contextual question for the current phase
# ─────────────────────────────────────────────────────────────────────────────
def question_generator_node(state: InterviewState) -> InterviewState:
    """Generates the next interview question based on current phase and conversation."""
    phase = state["current_phase"]
    phase_label = PHASE_LABELS[phase]
    q_num = state["questions_in_phase"] + 1
    job_title = state["job_title"]
    job_company = state["job_company"]
    jd_snippet = state["job_description"][:800]
    resume_snippet = state["resume_text"][:1000]
    company_ctx = state.get("company_context", "")

    # Build conversation context (last 4 messages only to save tokens)
    conv = state.get("conversation", [])
    recent = conv[-4:] if len(conv) > 4 else conv
    conv_text = "\n".join([f"{m['role'].upper()}: {m['content']}" for m in recent])

    prompt = f"""You are a senior interviewer at {job_company} interviewing for: {job_title}.

Company context: {company_ctx}

Job requirements: {jd_snippet}

Candidate resume summary: {resume_snippet}

Current interview phase: {phase_label} (question {q_num})
Recent conversation:
{conv_text if conv_text else "This is the first question."}

Phase guidelines:
- introduction: Ask about background, self-intro, why this role
- project_deep_dive: Dig into their best project, tech choices, challenges
- technical_round: Test DSA, OOP, DBMS, OS, APIs relevant to the job
- ai_ml_round: Ask about RAG, fine-tuning, transformers, LLMs, embeddings
- practical_thinking: System design, scaling, architecture decisions
- behavioral: Teamwork, conflict resolution, learning ability, startup mindset
- hr_closing: Availability, stipend expectations, questions for us

Generate ONE clear, concise interview question for the {phase_label} phase.
Make it specific to the role and candidate's background.
Return ONLY the question text. No preamble, no numbering."""

    question = call_llm(prompt, temperature=0.6)

    if not question:
        # Fallback questions per phase
        fallbacks = {
            "introduction": "Tell me about yourself and your background.",
            "project_deep_dive": "Walk me through your most impactful project.",
            "technical_round": "Explain how you would design a RESTful API for this product.",
            "ai_ml_round": "What is the difference between RAG and fine-tuning?",
            "practical_thinking": "How would you scale this system to handle 1 million users?",
            "behavioral": "Tell me about a time you overcame a significant challenge.",
            "hr_closing": "What is your expected stipend and availability?",
        }
        question = fallbacks.get(phase, "Tell me more about your experience.")

    logger.info(f"[question_generator] Phase={phase}, Q{q_num}: {question[:80]}...")

    updated_conv = state.get("conversation", []) + [{"role": "interviewer", "content": question}]

    return {
        **state,
        "current_question": question,
        "conversation": updated_conv,
        "next_action": "evaluate",  # Wait for user answer
    }


# ─────────────────────────────────────────────────────────────────────────────
#  Node 3: Evaluator Agent
#  Scores the user's answer (1-10) and gives one coaching tip
# ─────────────────────────────────────────────────────────────────────────────
def evaluator_node(state: InterviewState) -> InterviewState:
    """Evaluates the user's latest answer. Produces score + short feedback."""
    question = state["current_question"]
    answer = state["user_answer"]
    phase_label = PHASE_LABELS[state["current_phase"]]

    if not answer or len(answer.strip()) < 5:
        return {
            **state,
            "evaluation_score": 0,
            "evaluation_feedback": "No answer provided. Try to always give a response.",
            "next_action": "advance_phase",
        }

    prompt = f"""You are evaluating a candidate's answer in the {phase_label} phase of a technical interview.

Question: {question}

Candidate's answer: {answer}

Score their answer from 1 to 10 based on:
- Clarity and relevance
- Technical depth (if applicable)
- Communication quality
- Completeness

Respond in this EXACT format (no other text):
SCORE: <number 1-10>
FEEDBACK: <one sentence of constructive coaching>"""

    result = call_llm(prompt, temperature=0.2)

    score = 5
    feedback = "Good answer. Keep being specific."

    try:
        score_match = re.search(r"SCORE:\s*(\d+)", result)
        feedback_match = re.search(r"FEEDBACK:\s*(.+)", result)
        if score_match:
            score = max(1, min(10, int(score_match.group(1))))
        if feedback_match:
            feedback = feedback_match.group(1).strip()
    except Exception:
        pass

    logger.info(f"[evaluator] Score={score}, Feedback={feedback[:60]}")

    updated_conv = state.get("conversation", []) + [{"role": "candidate", "content": answer}]

    return {
        **state,
        "evaluation_score": score,
        "evaluation_feedback": feedback,
        "total_score": state.get("total_score", 0) + score,
        "answers_given": state.get("answers_given", 0) + 1,
        "questions_in_phase": state.get("questions_in_phase", 0) + 1,
        "conversation": updated_conv,
        "next_action": "advance_phase",
    }


# ─────────────────────────────────────────────────────────────────────────────
#  Node 4: Interview Manager Agent
#  Decides: more questions in phase? Advance phase? End interview?
# ─────────────────────────────────────────────────────────────────────────────
def interview_manager_node(state: InterviewState) -> InterviewState:
    """Controls phase progression and interview completion."""
    phase = state["current_phase"]
    phase_index = state["phase_index"]
    questions_done = state["questions_in_phase"]
    limit = PHASE_QUESTION_LIMITS.get(phase, 3)
    is_ai_role = state.get("is_ai_role", False)

    if questions_done >= limit:
        # Move to next phase
        next_phase_index = phase_index + 1

        # Skip ai_ml_round if not an AI role
        while next_phase_index < len(PHASES):
            next_phase = PHASES[next_phase_index]
            if next_phase == "ai_ml_round" and not is_ai_role:
                next_phase_index += 1
                continue
            break

        if next_phase_index >= len(PHASES):
            # All phases done — generate final report
            return _generate_final_report(state)
        else:
            next_phase = PHASES[next_phase_index]
            logger.info(f"[interview_manager] Advancing: {phase} → {next_phase}")
            return {
                **state,
                "current_phase": next_phase,
                "phase_index": next_phase_index,
                "questions_in_phase": 0,
                "next_action": "generate_question",
            }
    else:
        # Stay in same phase, ask another question
        return {**state, "next_action": "generate_question"}


def _generate_final_report(state: InterviewState) -> InterviewState:
    """Generates a final performance report."""
    total = state.get("total_score", 0)
    count = state.get("answers_given", 1)
    avg = round(total / count, 1) if count > 0 else 0
    job_title = state["job_title"]

    # Build a summary from conversation
    conv = state.get("conversation", [])
    conv_summary = "\n".join([
        f"{m['role'].upper()}: {m['content'][:150]}"
        for m in conv[-12:]
    ])

    prompt = f"""You are wrapping up a job interview for {job_title}.
The candidate's average score was {avg}/10 across {count} questions.

Final conversation excerpt:
{conv_summary}

Write a 3-sentence professional interview summary:
1. Overall performance assessment
2. Key strength demonstrated
3. One area to improve

Keep it encouraging but honest. No bullet points."""

    report_text = call_llm(prompt, temperature=0.3)
    if not report_text:
        report_text = f"You scored an average of {avg}/10. Good effort!"

    final_report = f"""INTERVIEW COMPLETE

Role: {job_title} at {state['job_company']}
Questions answered: {count}
Average score: {avg}/10
Total points: {total}

{report_text}"""

    logger.info(f"[interview_manager] Interview complete. Avg score: {avg}")

    return {
        **state,
        "is_complete": True,
        "final_report": final_report,
        "next_action": "end",
    }


# ─────────────────────────────────────────────────────────────────────────────
#  Supervisor Router
#  Decides which node to call next based on state.next_action
# ─────────────────────────────────────────────────────────────────────────────
def supervisor_router(state: InterviewState) -> str:
    action = state.get("next_action", "generate_question")
    if action == "search":
        return "web_searcher"
    elif action == "generate_question":
        return "question_generator"
    elif action == "evaluate":
        return "evaluator"
    elif action == "advance_phase":
        return "interview_manager"
    elif action == "end":
        return END
    return "question_generator"


# ─────────────────────────────────────────────────────────────────────────────
#  Build the LangGraph
# ─────────────────────────────────────────────────────────────────────────────
def build_interview_graph():
    graph = StateGraph(InterviewState)

    graph.add_node("web_searcher", web_searcher_node)
    graph.add_node("question_generator", question_generator_node)
    graph.add_node("evaluator", evaluator_node)
    graph.add_node("interview_manager", interview_manager_node)

    # After web_searcher → always go to question_generator
    graph.add_edge("web_searcher", "question_generator")

    # From question_generator → wait (return to user). Graph stops here per turn.
    graph.add_edge("question_generator", END)

    # After evaluator → interview_manager decides what next
    graph.add_conditional_edges(
        "interview_manager",
        supervisor_router,
        {
            "question_generator": "question_generator",
            END: END,
        }
    )

    # evaluator → interview_manager
    graph.add_edge("evaluator", "interview_manager")

    graph.set_entry_point("web_searcher")
    return graph.compile()


# ─────────────────────────────────────────────────────────────────────────────
#  Session Store — FILE-BASED (survives server restarts)
#  Sessions saved to ./interview_sessions/<session_id>.json
# ─────────────────────────────────────────────────────────────────────────────
SESSION_DIR = "./interview_sessions"

def _session_path(session_id: str) -> str:
    os.makedirs(SESSION_DIR, exist_ok=True)
    return os.path.join(SESSION_DIR, f"{session_id}.json")


def _save_session(session_id: str, state: dict):
    """Persist session state to disk."""
    try:
        path = _session_path(session_id)
        with open(path, "w", encoding="utf-8") as f:
            json.dump({"state": state, "created_at": time.time()}, f)
    except Exception as e:
        logger.error(f"Failed to save session {session_id}: {e}")


def _load_session(session_id: str) -> dict | None:
    """Load session state from disk. Returns None if not found."""
    path = _session_path(session_id)
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        # Expire sessions older than 2 hours
        if time.time() - data.get("created_at", 0) > 7200:
            os.remove(path)
            return None
        return data
    except Exception as e:
        logger.error(f"Failed to load session {session_id}: {e}")
        return None


def _cleanup_old_sessions():
    """Remove session files older than 2 hours."""
    if not os.path.exists(SESSION_DIR):
        return
    now = time.time()
    for fname in os.listdir(SESSION_DIR):
        fpath = os.path.join(SESSION_DIR, fname)
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                data = json.load(f)
            if now - data.get("created_at", 0) > 7200:
                os.remove(fpath)
        except Exception:
            pass  # Ignore corrupt/unreadable files



def is_ai_role(job_title: str, job_description: str) -> bool:
    """Check if the role requires AI/ML knowledge."""
    keywords = ["ai", "ml", "machine learning", "deep learning", "nlp", "llm",
                "neural", "pytorch", "tensorflow", "langchain", "rag", "embedding"]
    text = (job_title + " " + job_description).lower()
    return any(kw in text for kw in keywords)


# ─────────────────────────────────────────────────────────────────────────────
#  Public API — called by the FastAPI router
# ─────────────────────────────────────────────────────────────────────────────

def start_interview_session(
    session_id: str,
    job_title: str,
    job_company: str,
    job_description: str,
    job_url: str,
    resume_text: str,
    user_name: str,
) -> dict:
    """
    Initialize a new interview session.
    Runs the web_searcher node + generates the first question.
    Returns the first question and session state.
    """
    _cleanup_old_sessions()

    ai_role = is_ai_role(job_title, job_description)

    initial_state: InterviewState = {
        "job_title":          job_title,
        "job_company":        job_company,
        "job_description":    job_description,
        "job_url":            job_url,
        "resume_text":        resume_text,
        "user_name":          user_name,
        "company_context":    "",
        "session_id":         session_id,
        "current_phase":      PHASES[0],
        "phase_index":        0,
        "questions_in_phase": 0,
        "is_ai_role":         ai_role,
        "conversation":       [],
        "current_question":   "",
        "user_answer":        "",
        "evaluation_score":   0,
        "evaluation_feedback":"",
        "next_action":        "search",
        "total_score":        0,
        "answers_given":      0,
        "is_complete":        False,
        "final_report":       "",
    }

    graph = build_interview_graph()
    final_state = graph.invoke(initial_state)

    # Persist session to disk (survives restarts)
    _save_session(session_id, dict(final_state))

    return {
        "session_id":       session_id,
        "question":         final_state["current_question"],
        "phase":            final_state["current_phase"],
        "phase_label":      PHASE_LABELS[final_state["current_phase"]],
        "phase_index":      final_state["phase_index"],
        "questions_in_phase": final_state["questions_in_phase"],
        "is_complete":      False,
        "company_context":  final_state.get("company_context", ""),
        "is_ai_role":       ai_role,
    }


def submit_answer(session_id: str, answer: str) -> dict:
    """
    Process a user's answer and return the next question + evaluation.
    """
    session_data = _load_session(session_id)
    if session_data is None:
        raise ValueError(f"Session '{session_id}' not found or expired. Please start a new interview.")

    state: InterviewState = session_data["state"]

    if state.get("is_complete"):
        return {
            "is_complete": True,
            "final_report": state.get("final_report", "Interview complete."),
        }

    # Inject the user's answer and set next_action to evaluate
    state = {
        **state,
        "user_answer": answer.strip(),
        "next_action": "evaluate",
    }

    # Build a mini-graph just for evaluate → interview_manager → question_generator
    graph = StateGraph(InterviewState)
    graph.add_node("evaluator", evaluator_node)
    graph.add_node("interview_manager", interview_manager_node)
    graph.add_node("question_generator", question_generator_node)

    graph.add_edge("evaluator", "interview_manager")
    graph.add_conditional_edges(
        "interview_manager",
        supervisor_router,
        {"question_generator": "question_generator", END: END},
    )
    graph.add_edge("question_generator", END)
    graph.set_entry_point("evaluator")
    mini_graph = graph.compile()

    final_state = mini_graph.invoke(state)

    # Persist updated state to disk
    _save_session(session_id, dict(final_state))

    if final_state.get("is_complete"):
        return {
            "is_complete":       True,
            "final_report":      final_state.get("final_report", ""),
            "evaluation_score":  final_state.get("evaluation_score", 0),
            "evaluation_feedback": final_state.get("evaluation_feedback", ""),
            "total_score":       final_state.get("total_score", 0),
            "answers_given":     final_state.get("answers_given", 0),
        }

    return {
        "session_id":           session_id,
        "question":             final_state["current_question"],
        "phase":                final_state["current_phase"],
        "phase_label":          PHASE_LABELS[final_state["current_phase"]],
        "phase_index":          final_state["phase_index"],
        "questions_in_phase":   final_state["questions_in_phase"],
        "evaluation_score":     final_state.get("evaluation_score", 0),
        "evaluation_feedback":  final_state.get("evaluation_feedback", ""),
        "total_score":          final_state.get("total_score", 0),
        "answers_given":        final_state.get("answers_given", 0),
        "is_complete":          False,
    }


def get_session(session_id: str) -> dict:
    """Returns current session state for page refresh recovery."""
    session_data = _load_session(session_id)
    if session_data is None:
        return {"error": "Session not found or expired."}

    state = session_data["state"]
    return {
        "session_id":       session_id,
        "question":         state.get("current_question", ""),
        "phase":            state.get("current_phase", "introduction"),
        "phase_label":      PHASE_LABELS.get(state.get("current_phase", "introduction"), ""),
        "phase_index":      state.get("phase_index", 0),
        "questions_in_phase": state.get("questions_in_phase", 0),
        "total_score":      state.get("total_score", 0),
        "answers_given":    state.get("answers_given", 0),
        "is_complete":      state.get("is_complete", False),
        "final_report":     state.get("final_report", ""),
        "is_ai_role":       state.get("is_ai_role", False),
    }


def get_all_phases() -> list:
    """Returns all phase metadata for the frontend progress tracker."""
    return [
        {"id": phase, "label": PHASE_LABELS[phase], "limit": PHASE_QUESTION_LIMITS[phase]}
        for phase in PHASES
    ]
