"""
prompts/skill_gap_prompt.py
─────────────────────────────────────────────────────────────────────────────
Calibr – Skill Gap Analysis Prompt

This prompt is the heart of Calibr's career intelligence engine.
It instructs Gemini to act as a senior technical recruiter and produce
a structured JSON assessment of how well a candidate's resume matches
a specific job description.

Kept in its own file so the prompt text can be tweaked independently
of the Python logic in services/skill_gap.py.
─────────────────────────────────────────────────────────────────────────────
"""

from langchain_core.prompts import PromptTemplate


# ─────────────────────────────────────────────────────────────────────────────
#  SKILL_GAP_PROMPT
#
#  input_variables:
#    resume_skills  – comma-separated list of skills extracted from the resume
#    jd_skills      – comma-separated list of skills parsed from the job posting
#    resume_text    – full plain text of the resume (for nuanced context)
#    jd_text        – full plain text of the job description (same reason)
#
#  Why pass both the skill lists AND the full texts?
#    The skill lists give Gemini a quick inventory to compare.
#    The full texts let it pick up on experience depth, years of usage,
#    how centrally a skill is featured — things that a flat list misses.
#    "Familiar with Docker" ≠ "Led migration of 40 microservices to Docker".
#
#  Output format:
#    Strict JSON so services/skill_gap.py can parse it with json.loads().
#    Double-braces {{ }} are Python f-string escapes — they render as { }.
# ─────────────────────────────────────────────────────────────────────────────

SKILL_GAP_PROMPT = PromptTemplate(
    input_variables=["resume_skills", "jd_skills", "resume_text", "jd_text"],
    template="""
You are an expert career coach and senior technical recruiter with 15+ years of experience.

A candidate has the following skills extracted from their resume:
{resume_skills}

The job description requires these skills:
{jd_skills}

Full Resume (for context on depth and experience):
{resume_text}

Full Job Description (for context on priority and usage):
{jd_text}

Carefully analyze the skill gap between the candidate and this role.
Consider:
  - How prominently each skill is featured in the resume vs the job description
  - Whether experience level matches (junior skill vs senior requirement)
  - Which missing skills are dealbreakers vs nice-to-haves
  - What the candidate can realistically do in 1–3 months to close the gap

Respond using ONLY this exact JSON format (no markdown, no extra text):
{{
  "has_skills": ["skill1", "skill2"],
  "missing_skills": ["skill1", "skill2"],
  "weak_skills": ["skill1", "skill2"],
  "recommendations": [
    "Take a Docker course on Coursera — it appears 4 times in the JD as a core requirement",
    "Build a deployed FastAPI project to demonstrate backend architecture skills",
    "Contribute to an open-source ML library to strengthen your Python depth"
  ],
  "overall_match_percentage": 72,
  "summary": "2–3 sentence honest, encouraging, and specific assessment of the candidate's fit for this role."
}}

Rules:
- has_skills: skills present in both the resume AND the job description
- missing_skills: skills the JD requires that are completely absent from the resume
- weak_skills: skills mentioned in both but where the resume shows limited experience
- recommendations: at least 3 specific, actionable steps — mention WHY each matters for this role
- overall_match_percentage: integer 0–100 based on weighted skill overlap and experience depth
- summary: honest but encouraging — mention the biggest strength AND the biggest gap
- Do NOT invent skills. Only use skills explicitly present in the provided texts.
"""
)
