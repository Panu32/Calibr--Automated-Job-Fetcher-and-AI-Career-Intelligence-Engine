"""
models/schemas.py
─────────────────────────────────────────────────────────────────────────────
Pydantic v2 data models (schemas) for the Calibr backend.

Every model that flows through the API — from resume uploads to job listings
to chat messages — is defined here. Pydantic v2 validates all data
automatically and integrates cleanly with FastAPI's request/response cycle.
─────────────────────────────────────────────────────────────────────────────
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field


# ─────────────────────────────────────────────────────────────────────────────
#  ResumeData
#  Represents a parsed resume that has been uploaded by a user.
# ─────────────────────────────────────────────────────────────────────────────

class ResumeData(BaseModel):
    """
    Stores everything Calibr knows about a user's uploaded resume.

    Fields:
        user_id         – Unique identifier for the user (e.g. MongoDB ObjectId
                          or any string token from the frontend session).
        filename        – Original name of the uploaded file (e.g. "john_doe_cv.pdf").
        raw_text        – The full plain-text content extracted from the PDF/DOCX.
                          This is what gets embedded and stored in ChromaDB.
        extracted_skills– A flat list of skill keywords parsed from the resume
                          (e.g. ["Python", "FastAPI", "SQL", "Docker"]).
        uploaded_at     – UTC timestamp of when the resume was uploaded.
                          Defaults to now so callers don't have to supply it.
    """

    user_id: str = Field(..., description="Unique identifier for the user")
    filename: str = Field(..., description="Original filename of the uploaded resume")
    raw_text: str = Field(..., description="Full plain text extracted from the resume")
    extracted_skills: list[str] = Field(
        default_factory=list,
        description="Skills parsed from the resume text"
    )
    uploaded_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="UTC timestamp when the resume was uploaded"
    )


# ─────────────────────────────────────────────────────────────────────────────
#  JobDescription
#  A lightweight model used when the user pastes a job description for analysis.
# ─────────────────────────────────────────────────────────────────────────────

class JobDescription(BaseModel):
    """
    Represents a job description provided by the user for comparison
    against their resume (used in skill-gap analysis).

    Fields:
        raw_text        – The full text of the job posting pasted by the user.
        parsed_skills   – Skills extracted from the job description text by the LLM.
        role_title      – The job title extracted or inferred from the description
                          (e.g. "Senior Backend Engineer").
    """

    raw_text: str = Field(..., description="Full text of the job description")
    parsed_skills: list[str] = Field(
        default_factory=list,
        description="Skills extracted from the job description"
    )
    role_title: str = Field(
        default="Unknown Role",
        description="Job title extracted from the description"
    )


# ─────────────────────────────────────────────────────────────────────────────
#  JobListing
#  Represents a single job posting fetched from Adzuna, JSearch, or any
#  external API. Stored in MongoDB and shown in the Jobs page.
# ─────────────────────────────────────────────────────────────────────────────

class JobListing(BaseModel):
    """
    A job listing fetched from an external source (Adzuna / JSearch).

    Fields:
        job_id          – Unique ID from the source API (used to deduplicate).
        title           – Job title (e.g. "Machine Learning Engineer").
        company         – Hiring company name.
        location        – City / country of the role.
        salary          – Salary range string if available (e.g. "£40k–£55k").
        match_score     – Float 0.0–1.0, cosine similarity between the job
                          description embedding and the user's resume embedding.
                          Computed by Calibr after fetching.
        date_fetched    – UTC timestamp when this listing was fetched.
        url             – Direct link to the job posting.
        description     – Full or truncated job description text.
        source          – Which API this came from ("adzuna" | "jsearch" | "mock").
    """

    job_id: str = Field(..., description="Unique ID from the source API")
    title: str = Field(..., description="Job title")
    company: str = Field(..., description="Hiring company name")
    location: str = Field(default="Remote", description="Job location")
    salary: Optional[str] = Field(
        default=None,
        description="Salary range if provided by the source"
    )
    match_score: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Cosine similarity score between job and user resume (0–1)"
    )
    date_fetched: datetime = Field(
        default_factory=datetime.utcnow,
        description="UTC timestamp when this listing was fetched from the API"
    )
    url: str = Field(..., description="Direct URL to the original job posting")
    description: str = Field(
        default="",
        description="Full or truncated description of the job"
    )
    source: str = Field(
        default="unknown",
        description="Source API: 'adzuna', 'jsearch', or 'mock'"
    )


# ─────────────────────────────────────────────────────────────────────────────
#  SkillGapResult
#  The output of the skill-gap analysis: what skills a user has,
#  what they're missing, and what to improve.
# ─────────────────────────────────────────────────────────────────────────────

class SkillGapResult(BaseModel):
    """
    Result of comparing a user's resume skills against a job description.

    Fields:
        has_skills      – Skills the user already possesses that match the job.
        missing_skills  – Skills required by the job that the user lacks entirely.
        weak_skills     – Skills both parties mention but the user's proficiency
                          appears limited (inferred by the LLM from context).
        recommendations – Actionable advice generated by Gemini:
                          e.g. ["Take a Docker course on Coursera",
                                "Build a REST API project to demonstrate FastAPI skills"].
    """

    has_skills: list[str] = Field(
        default_factory=list,
        description="Skills the user already has that the job requires"
    )
    missing_skills: list[str] = Field(
        default_factory=list,
        description="Skills required by the job that are absent from the resume"
    )
    weak_skills: list[str] = Field(
        default_factory=list,
        description="Skills where the user shows limited experience"
    )
    recommendations: list[str] = Field(
        default_factory=list,
        description="LLM-generated action items the user should take to close the gap"
    )


# ─────────────────────────────────────────────────────────────────────────────
#  ChatMessage
#  A single message in a conversation between the user and Calibr's AI.
# ─────────────────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    """
    Represents one turn in the RAG-powered chat conversation.

    Fields:
        role        – Either "user" (human) or "assistant" (Calibr's Gemini response).
                      Using Literal enforces only these two values at validation time.
        content     – The actual message text.
        timestamp   – UTC time the message was created. Defaults to now.
    """

    role: Literal["user", "assistant"] = Field(
        ...,
        description="Who sent the message: 'user' or 'assistant'"
    )
    content: str = Field(..., description="The message text")
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="UTC timestamp of when this message was created"
    )


# ─────────────────────────────────────────────────────────────────────────────
#  UserPreferences
#  Stores a user's job-search preferences so the scheduler and job-fetcher
#  can target relevant listings.
# ─────────────────────────────────────────────────────────────────────────────

class UserPreferences(BaseModel):
    """
    User-provided preferences that customize Calibr's job fetching and scoring.

    Fields:
        user_id             – User identifier (mirrors ResumeData.user_id).
        target_role         – The job role the user is searching for
                              (e.g. "Data Scientist", "DevOps Engineer").
        preferred_location  – Preferred work location or "Remote".
        experience_years    – Years of professional experience. Used by the LLM
                              to calibrate its recommendations and gap analysis.
    """

    user_id: str = Field(..., description="Unique identifier for the user")
    target_role: str = Field(
        ...,
        description="The job role the user is targeting (e.g. 'ML Engineer')"
    )
    preferred_location: str = Field(
        default="Remote",
        description="Preferred work location"
    )
    experience_years: int = Field(
        default=0,
        ge=0,
        description="Years of professional experience (0 = fresher)"
    )


# ─────────────────────────────────────────────────────────────────────────────
#  Authentication Schemas (Sign-in / Signup)
# ─────────────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    """Data required to create a new user account."""
    full_name: str = Field(..., min_length=2, max_length=50)
    email: str = Field(..., pattern=r"^\S+@\S+\.\S+$")
    password: str = Field(..., min_length=6, description="Minimum 6 characters")

class UserLogin(BaseModel):
    """Credentials required for logging in."""
    email: str = Field(..., pattern=r"^\S+@\S+\.\S+$")
    password: str = Field(...)

class GoogleLogin(BaseModel):
    """Data required for Google OAuth login."""
    token: str = Field(..., description="Google ID Token from frontend")

class UserResponse(BaseModel):
    """Public user profile data returned to the frontend."""
    id: str = Field(..., alias="_id") # MongoDB ObjectId as string
    full_name: str
    email: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        # Pydantic v2 configuration to allow population by field name/alias
        populate_by_name = True

class Token(BaseModel):
    """The bearer token returned after successful login."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class TokenData(BaseModel):
    """Data decoded from the JWT payload."""
    user_id: Optional[str] = None
    email: Optional[str] = None
