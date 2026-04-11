"""
prompts/job_match_prompt.py
─────────────────────────────────────────────────────────────────────────────
Calibr – Job Match Scoring Prompt

This prompt asks Gemini to rate how well a user's resume matches a specific
job listing on a 0–100 scale and explain the reasoning.

Used by services/skill_gap.py → score_job_match() to assign a match_score
to each fetched job listing before storing it in MongoDB.
─────────────────────────────────────────────────────────────────────────────
"""

from langchain_core.prompts import PromptTemplate


# ─────────────────────────────────────────────────────────────────────────────
#  JOB_MATCH_PROMPT
#
#  input_variables:
#    resume_text      – full plain text of the user's resume
#    job_title        – title of the job being evaluated (e.g. "ML Engineer")
#    job_description  – full or truncated text of the job posting
#
#  Output: strict JSON so score_job_match() can parse it with json.loads()
#
#  Why include apply_recommendation?
#    Beyond a raw score, users want to know if it's worth applying.
#    Gemini can factor in things like seniority mismatch that a score alone
#    doesn't communicate (e.g. score=65 but "don't apply — 8 years required").
# ─────────────────────────────────────────────────────────────────────────────

JOB_MATCH_PROMPT = PromptTemplate(
    input_variables=["resume_text", "job_title", "job_description"],
    template="""You are a senior technical recruiter at a top-tier technology company.
Your task is to evaluate how well a candidate's resume matches a specific job posting.

━━━━━━━━━━━━━━  CANDIDATE RESUME  ━━━━━━━━━━━━━━
{resume_text}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Job Title: {job_title}

Job Description:
{job_description}

Evaluate the match carefully. Consider:
  1. Technical skill overlap (are the core required skills present in the resume?)
  2. Experience level fit (does seniority align with what the role demands?)
  3. Domain alignment (industry, product type, problem domain)
  4. Education and certification requirements
  5. Soft skills and cultural indicators

Respond using ONLY this exact JSON format (no markdown, no extra text):
{{
  "match_score": 78,
  "match_reasons": [
    "Strong Python and FastAPI experience directly matches the backend stack",
    "3 years of ML engineering experience aligns with the mid-level requirement",
    "Open-source contributions demonstrate the collaborative culture fit"
  ],
  "gaps": [
    "No Kubernetes experience mentioned — the JD lists it as required",
    "No mention of system design at scale — the role needs 100k+ req/s experience"
  ],
  "apply_recommendation": "Strong candidate — apply with a cover letter that addresses the Kubernetes gap directly."
}}

Rules:
- match_score: integer 0–100 (0 = completely irrelevant, 100 = perfect fit)
- match_reasons: exactly 3 concrete reasons why this is a good match (skip if score < 30)
- gaps: exactly 2 most critical missing requirements (be specific, cite JD language)
- apply_recommendation: one honest sentence — should they apply, and if so, how?
- Do NOT invent information. Only reference what is present in the resume and JD texts.
"""
)
