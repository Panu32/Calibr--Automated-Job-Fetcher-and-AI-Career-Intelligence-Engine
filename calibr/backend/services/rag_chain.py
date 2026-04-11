"""
services/rag_chain.py
─────────────────────────────────────────────────────────────────────────────
Calibr – RAG-Powered Career Chat Service

This module is the conversational AI core of Calibr.
─────────────────────────────────────────────────────────────────────────────
"""

# ── Standard library ──────────────────────────────────────────────────────────
import logging
import os
import time
import concurrent.futures
from typing import Optional

# ── Third-party: LangChain ─────────────────────────────────────────────────────
from langchain_groq import ChatGroq
from langchain_core.output_parsers import StrOutputParser

# ── Internal: prompts ─────────────────────────────────────────────────────────
from prompts.chat_prompt import CHAT_PROMPT

# ── Internal: database layer ───────────────────────────────────────────────────
from db.mongodb import get_chat_history, save_chat_message

# ── Internal: embedding + vector store ────────────────────────────────────────
from services.embedder import get_embedding_model, get_or_create_collection

# ── Module-level logger ───────────────────────────────────────────────────────
logger = logging.getLogger("calibr.rag_chain")


# ─────────────────────────────────────────────────────────────────────────────
#  Module-level LLM singleton
# ─────────────────────────────────────────────────────────────────────────────
_llm: Optional[ChatGroq] = None


def get_llm():
    # Groq runs on their servers
    # Zero load on your laptop
    return ChatGroq(
        model=os.getenv("GROQ_MODEL",
                        "llama-3.1-8b-instant"),
        api_key=os.getenv("GROQ_API_KEY"),
        temperature=0.3
    )


def build_chat_chain():
    llm   = get_llm()
    chain = CHAT_PROMPT | llm | StrOutputParser()
    return chain


def chat_with_resume(
    user_id    : str,
    question   : str,
    resume_text: str,
) -> str:
    try:
        # ── Step 1: Load history ───────────────────────────────────────────
        start_step = time.perf_counter()
        history_docs = get_chat_history(user_id, limit=10)
        logger.info(f"PERF: get_chat_history took {time.perf_counter() - start_step:.2f}s")

        # ── Step 2: Format history ──────────────────────────────────────────
        if history_docs:
            history_lines = []
            for msg in history_docs:
                role_label = "User" if msg["role"] == "user" else "Assistant"
                history_lines.append(f"{role_label}: {msg['content']}")
            chat_history_str = "\n".join(history_lines)
        else:
            chat_history_str = "No previous messages."

        # ── Step 3: Get RAG context ────────────────────────────────────────
        start_step = time.perf_counter()
        rag_context = get_rag_context(user_id, question)
        logger.info(f"PERF: get_rag_context total took {time.perf_counter() - start_step:.2f}s")

        # Detect if Step 3 returned a Quota error
        if "Quota Reached" in rag_context or "Resource Exhausted" in rag_context:
             return rag_context

        # ── Step 4: Invoke chain with strict logic-level timeout ───────────
        chain = build_chat_chain()
        start_step = time.perf_counter()
        
        # We enforce a hard 10s timeout on the entire chain execution.
        try:
            # We use a thread pool executor for the sync invoke call
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(
                    chain.invoke,
                    {
                        "resume_text" : resume_text[:5000],
                        "chat_history": chat_history_str,
                        "question"    : question,
                        "rag_context" : rag_context,
                    }
                )
                # Wait for at most 12 seconds (slightly narrower than the 15s API timeout)
                response = future.result(timeout=12)
            
            logger.info(f"PERF: chain.invoke took {time.perf_counter() - start_step:.2f}s")
        except concurrent.futures.TimeoutError:
            logger.error("❌ Groq API timed out at logic level (12s).")
            return "⚠️ The AI response is taking longer than expected due to high server load. Please try a simpler question or wait a moment."
        except Exception as e:
            error_str = str(e)
            if "429" in error_str or "ResourceExhausted" in error_str or "quota" in error_str.lower():
                logger.error("❌ Gemini API Quota Exhausted during LLM call.")
                return "⚠️ I'm sorry, my daily AI limit has been reached. Please try again tomorrow or use a different API key in the .env file."
            raise e

        # ── Step 5: Save exchange ──────────────────────────────────────────
        start_step = time.perf_counter()
        save_chat_message(user_id, role="user", content=question)
        save_chat_message(user_id, role="assistant", content=response)
        logger.info(f"PERF: save_chat_message took {time.perf_counter() - start_step:.2f}s")

        return response

    except Exception as e:
        logger.error(f"chat_with_resume failed: {e}")
        return "I'm sorry, I encountered an issue processing your question. Please try again in a moment."


def get_rag_context(user_id: str, question: str) -> str:
    try:
        # ── Step 1: Embed query ────────────────────────────────────────────
        start_step = time.perf_counter()
        embedding_model = get_embedding_model()
        try:
            question_vector = embedding_model.embed_query(question)
        except Exception as e:
            error_str = str(e)
            if "429" in error_str or "ResourceExhausted" in error_str or "quota" in error_str.lower():
                return "⚠️ Quota Reached: My embedding service is currently out of credits. Please try again later."
            raise e
            
        logger.info(f"PERF: embedding_model.embed_query took {time.perf_counter() - start_step:.2f}s")

        # ── Step 2: Query ChromaDB ──────────────────────────────────────────
        start_step = time.perf_counter()
        jobs_collection = get_or_create_collection("jobs")
        total_jobs = jobs_collection.count()
        if total_jobs == 0:
            return ""

        results = jobs_collection.query(
            query_embeddings=[question_vector],
            n_results=min(3, total_jobs),
            include=["documents", "metadatas", "distances"],
        )
        logger.info(f"PERF: chroma.query took {time.perf_counter() - start_step:.2f}s")

        docs      = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]

        if not docs:
            return ""

        relevant_docs = [
            (doc, meta)
            for doc, meta, dist in zip(docs, metadatas, distances)
            if dist < 0.8
        ]

        if not relevant_docs:
            return ""

        context_lines = ["Relevant job listings from your personalised feed:\n"]
        for i, (doc, meta) in enumerate(relevant_docs, start=1):
            snippet = doc[:300].strip()
            if len(doc) > 300:
                snippet += "…"
            context_lines.append(f"  {i}. {snippet}")

        return "\n━━━━━━━━ Relevant Job Context ━━━━━━━━\n" + "\n".join(context_lines) + "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"

    except Exception as e:
        logger.warning(f"get_rag_context failed: {e}")
        # If it's not a quota error, just return empty context
        if "Quota Reached" in str(e): return str(e)
        return ""
