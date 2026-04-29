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
from datetime import datetime
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


async def chat_with_resume_stream(
    user_id    : str,
    question   : str,
    resume_text: str,
):
    """
    Async generator that streams status updates and the final AI response.
    Yields chunks like: "THINKING: Searching news...", then chunks of actual text.
    """
    try:
        # ── Step 1: Thinking / Context Retrieval ───────────────────────────
        yield "data: THINKING: Consulting your resume and market data...\n\n"
        
        # Fetch history and RAG context in parallel
        import asyncio
        loop = asyncio.get_event_loop()
        
        # Start both tasks concurrently
        history_task = loop.run_in_executor(None, get_chat_history, user_id, 10)
        context_task = loop.run_in_executor(None, get_rag_context, user_id, question)
        
        # Wait for both to complete
        history_docs, rag_context = await asyncio.gather(history_task, context_task)

        # Format history
        if history_docs:
            history_lines = []
            for msg in history_docs:
                role_label = "User" if msg["role"] == "user" else "Assistant"
                history_lines.append(f"{role_label}: {msg['content']}")
            chat_history_str = "\n".join(history_lines)
        else:
            chat_history_str = "No previous messages."

        if "Quota Reached" in rag_context or "Resource Exhausted" in rag_context:
             yield f"data: ERROR: {rag_context}\n\n"
             return

        yield "data: THINKING: Synthesizing career intelligence...\n\n"

        # ── Step 2: Build and Stream AI Response ───────────────────────────
        chain = build_chat_chain()
        full_response_parts = []
        
        # Current date for prompt
        current_date_str = datetime.now().strftime("%B %d, %Y")

        # Use astream for real-time token delivery
        # We wrap chunks in SSE format: data: <chunk>\n\n
        async for chunk in chain.astream({
            "resume_text" : resume_text[:5000],
            "chat_history": chat_history_str,
            "question"    : question,
            "rag_context" : rag_context,
            "current_date": current_date_str,
        }):
            if chunk:
                full_response_parts.append(chunk)
                # Escape newlines in chunk for SSE if necessary, though most LLM chunks are fine
                yield f"data: {chunk}\n\n"

        # ── Step 3: Persistence ───────────────────────────────────────────
        # Save the full exchange to MongoDB once the stream is complete
        full_response = "".join(full_response_parts)
        if full_response.strip():
            await loop.run_in_executor(None, save_chat_message, user_id, "user", question)
            await loop.run_in_executor(None, save_chat_message, user_id, "assistant", full_response)

    except Exception as e:
        logger.error(f"chat_with_resume_stream failed: {e}")
        yield "ERROR: I encountered an issue while streaming the response. Please try again."


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
        current_date_str = datetime.now().strftime("%B %d, %Y")
        
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
                        "current_date": current_date_str,
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
    """
    Retrieve semantic context for a user question from multiple vector collections:
      1. jobs      - Personalised career matches
      2. tech_news - Market intelligence, tech trends, and coding news
    """
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

        context_parts = []

        # ── Step 2 & 3: Query Collections in Parallel ─────────────────────
        def query_jobs():
            jobs_coll = get_or_create_collection("jobs")
            if jobs_coll.count() == 0: return None
            return jobs_coll.query(
                query_embeddings=[question_vector],
                n_results=3,
                include=["documents", "metadatas", "distances"],
            )

        def query_news():
            news_coll = get_or_create_collection("tech_news")
            if news_coll.count() == 0: return None
            
            # Semantic search
            semantic_results = news_coll.query(
                query_embeddings=[question_vector],
                n_results=5, 
                include=["documents", "metadatas", "distances"],
            )
            
            # Hybrid (latest) if needed
            news_keywords = ["news", "latest", "today", "yesterday", "update", "current", "trend"]
            is_news_query = any(k in question.lower() for k in news_keywords)
            latest_results = news_coll.peek(limit=10) if is_news_query else None
            
            return {"semantic": semantic_results, "latest": latest_results}

        with concurrent.futures.ThreadPoolExecutor() as executor:
            jobs_future = executor.submit(query_jobs)
            news_future = executor.submit(query_news)
            
            job_results = jobs_future.result()
            news_data = news_future.result()

        # ── Step 4: Process Results ────────────────────────────────────────
        if job_results:
            job_docs = job_results.get("documents", [[]])[0]
            job_dists = job_results.get("distances", [[]])[0]
            relevant_jobs = [doc for doc, dist in zip(job_docs, job_dists) if dist < 0.8]
            if relevant_jobs:
                jobs_str = "\n".join([f"  - {doc[:300]}..." for doc in relevant_jobs])
                context_parts.append(f"━━━━━━━━ Relevant Job Context ━━━━━━━━\n{jobs_str}")

        if news_data:
            semantic = news_data["semantic"]
            latest = news_data["latest"]
            
            news_docs = semantic.get("documents", [[]])[0]
            news_metas = semantic.get("metadatas", [[]])[0]
            news_dists = semantic.get("distances", [[]])[0]
            
            relevant_news = [
                (doc, meta) for doc, meta, dist in zip(news_docs, news_metas, news_dists) if dist < 0.9
            ]
            
            latest_news = []
            if latest:
                seen_urls = {m.get("url") for d, m in relevant_news}
                for d, m in zip(latest.get("documents", []), latest.get("metadatas", [])):
                    if m.get("url") not in seen_urls and len(latest_news) < 3:
                        latest_news.append((d, m))
                        seen_urls.add(m.get("url"))

            final_news = relevant_news + latest_news
            if final_news:
                lines = [f"  - [{m.get('source', 'Web')}] {d[:400]}..." for d, m in final_news]
                news_str = "\n".join(lines)
                context_parts.append(f"━━━━━━━━ Market Intelligence & Tech Trends ━━━━━━━━\n{news_str}")

        if not context_parts:
            return ""

        return "\n\n".join(context_parts) + "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"

    except Exception as e:
        logger.warning(f"get_rag_context failed: {e}")
        return ""

    except Exception as e:
        logger.warning(f"get_rag_context failed: {e}")
        # If it's not a quota error, just return empty context
        if "Quota Reached" in str(e): return str(e)
        return ""
