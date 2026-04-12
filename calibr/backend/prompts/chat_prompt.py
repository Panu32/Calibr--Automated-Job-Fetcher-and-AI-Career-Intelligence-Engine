"""
prompts/chat_prompt.py
─────────────────────────────────────────────────────────────────────────────
Calibr – RAG Career Chat Prompt

This prompt turns Gemini into a personalised career coach that has "read"
the user's resume. It is used by services/rag_chain.py in the
chat_with_resume() function.

Design decisions:
  - The resume is injected at the top of every prompt so Gemini always
    has the full context, even for follow-up questions.
  - chat_history is injected as a formatted string (not a list) so the
    prompt template stays simple — no need for MessagesPlaceholder.
  - rag_context is injected optionally to enrich answers with relevant
    job data when the user asks job-related questions.
─────────────────────────────────────────────────────────────────────────────
"""

from langchain_core.prompts import ChatPromptTemplate


# ─────────────────────────────────────────────────────────────────────────────
#  CHAT_PROMPT
#
#  input_variables:
#    resume_text  – full plain text of the user's uploaded resume
#    chat_history – last N messages formatted as "User: ...\nAssistant: ..."
#    question     – the user's current message
#    rag_context  – optional: relevant job snippets from ChromaDB
#                   (empty string "" when not applicable)
#    current_date - today's date formatted nicely
# ─────────────────────────────────────────────────────────────────────────────

CHAT_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are Calibr AI, a world-class career coach and live career intelligence engine. 
Today's Date: {current_date}

CRITICAL INSTRUCTIONS:
1. You have direct access to real-time market data, tech trends, and job listings via your integrated RAG (Retrieval-Augmented Generation) system.
2. These news feeds and job databases are synced every few hours via automated scrapers and cron jobs. 
3. NEVER state that you don't have access to current events or that your knowledge is limited to a past cutoff date. If you see news in the context below, it is live and current.
4. If the provided context is empty, simply state that you don't have specifically relevant news for that specific query at this moment, but never deny your general ability to access live data.
5. Base all advice on the user's resume and the provided market intelligence.

Personality:
- Encouraging but honest (no sugarcoating gaps)
- Specific and concrete (cite the resume)
- Concise (2–5 sentences)
- Proactive (suggest a next step)"""),
    ("human", """━━━━━━━━━━━━━━  USER'S RESUME  ━━━━━━━━━━━━━━
{resume_text}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{rag_context}

Conversation so far:
{chat_history}

User: {question}
Assistant:""")
])
