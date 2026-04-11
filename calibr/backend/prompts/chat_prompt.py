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

from langchain_core.prompts import PromptTemplate


# ─────────────────────────────────────────────────────────────────────────────
#  CHAT_PROMPT
#
#  input_variables:
#    resume_text  – full plain text of the user's uploaded resume
#    chat_history – last N messages formatted as "User: ...\nAssistant: ..."
#    question     – the user's current message
#    rag_context  – optional: relevant job snippets from ChromaDB
#                   (empty string "" when not applicable)
#
#  Why include rag_context?
#    If the user asks "what jobs match me?" or "am I good for ML roles?",
#    the RAG pipeline queries ChromaDB for semantically similar job listings
#    and injects the most relevant snippets here, making answers far more
#    specific than a general LLM reply.
# ─────────────────────────────────────────────────────────────────────────────

CHAT_PROMPT = PromptTemplate(
    input_variables=["resume_text", "chat_history", "question", "rag_context"],
    template="""You are Calibr AI, a world-class career coach and AI assistant built into the Calibr platform.

You have full access to the user's resume shown below. Use it to give deeply personalised,
specific, and actionable answers. Never give generic career advice — always tie your answers
back to what you can see in this person's actual background.

Your personality:
- Encouraging but honest (don't sugarcoat serious skill gaps)
- Specific and concrete (cite actual skills and experiences from their resume)
- Concise (2–5 sentences unless the user explicitly asks for detail)
- Proactive (when relevant, suggest a next step they could take today)

━━━━━━━━━━━━━━  USER'S RESUME  ━━━━━━━━━━━━━━
{resume_text}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{rag_context}

Conversation so far:
{chat_history}

User: {question}
Assistant:"""
)
