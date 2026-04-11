"""
services/parser.py
─────────────────────────────────────────────────────────────────────────────
Calibr – Resume Parsing Service

Responsibilities:
  1. Extract plain text from uploaded PDF or DOCX resume files.
  2. Use Google Gemini (gemini-flash-latest) to intelligently extract skills
     from that raw text and return them as a clean Python list.
  3. Provide a single high-level parse_resume() function that the resume
     router can call with raw file bytes and a filename.

No embeddings happen here — that is handled by embedder.py.
─────────────────────────────────────────────────────────────────────────────
"""

# ── Standard library ──────────────────────────────────────────────────────────
import io
import json
import logging
import re

# ── Third-party: PDF parsing ──────────────────────────────────────────────────
from pypdf import PdfReader                           # reads PDF bytes page-by-page

# ── Third-party: DOCX parsing ─────────────────────────────────────────────────
from docx import Document                             # reads DOCX paragraphs

# ── Third-party: LangChain ────────────────────────────────────────────────────
from langchain_core.messages import HumanMessage

# ── Standard library: environment ─────────────────────────────────────────────
import os
from langchain_groq import ChatGroq

# ── Module-level logger ───────────────────────────────────────────────────────
logger = logging.getLogger("calibr.parser")


# ─────────────────────────────────────────────────────────────────────────────
#  Helper: build the Groq LLM client
# ─────────────────────────────────────────────────────────────────────────────
def get_llm():
    # Groq API - free tier, blazing fast
    # Get free key at console.groq.com
    return ChatGroq(
        model=os.getenv("GROQ_MODEL", 
                        "llama-3.1-8b-instant"),
        api_key=os.getenv("GROQ_API_KEY"),
        temperature=0.1
    )


# ─────────────────────────────────────────────────────────────────────────────
#  Function 1: extract_text_from_pdf
# ─────────────────────────────────────────────────────────────────────────────
def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extract all readable text from a PDF file supplied as raw bytes.

    Why bytes? FastAPI UploadFile gives us bytes via await file.read(),
    so we wrap them in io.BytesIO to make pypdf happy without writing to disk.

    Process:
        1. Wrap bytes in an in-memory BytesIO buffer.
        2. Open with PdfReader — handles multi-page PDFs automatically.
        3. Extract text from every page and join with newlines.
        4. Collapse multiple consecutive whitespace characters to a single space
           and strip leading/trailing whitespace.

    Args:
        file_bytes: Raw bytes of the PDF file.

    Returns:
        A single clean string containing all text across all pages.
        Returns an empty string if extraction fails (logged as error).
    """
    try:
        # Wrap raw bytes in a buffer so pypdf can seek through it
        buffer = io.BytesIO(file_bytes)

        # Open the PDF — PdfReader handles encrypted PDFs too (with no password)
        reader = PdfReader(buffer)

        page_texts = []
        for page_num, page in enumerate(reader.pages):
            # extract_text() can return None for image-only pages
            page_text = page.extract_text() or ""
            page_texts.append(page_text)
            logger.debug(f"PDF page {page_num + 1}: extracted {len(page_text)} chars")

        # Join all pages and normalise whitespace
        full_text = "\n".join(page_texts)
        full_text = re.sub(r"\s+", " ", full_text).strip()

        logger.info(f"PDF extraction complete — {len(full_text)} chars from {len(reader.pages)} pages")
        return full_text

    except Exception as e:
        logger.error(f"Failed to extract text from PDF: {e}")
        return ""  # return empty string so the caller can still proceed gracefully


# ─────────────────────────────────────────────────────────────────────────────
#  Function 2: extract_text_from_docx
# ─────────────────────────────────────────────────────────────────────────────
def extract_text_from_docx(file_bytes: bytes) -> str:
    """
    Extract all readable text from a DOCX file supplied as raw bytes.

    DOCX files store content in XML inside a ZIP archive. python-docx handles
    this transparently — we just wrap bytes in BytesIO and open with Document().

    Process:
        1. Wrap bytes in BytesIO.
        2. Open with python-docx Document.
        3. Iterate over all paragraphs, join their text with newlines.
        4. Strip extra whitespace.

    Args:
        file_bytes: Raw bytes of the DOCX file.

    Returns:
        A single clean string of the document's text content.
        Returns an empty string if extraction fails (logged as error).

    Note:
        Tables, headers, and footers in DOCX are not in paragraphs. If a
        resume uses heavy table formatting, some content may be missed.
        This is acceptable for the MVP.
    """
    try:
        buffer = io.BytesIO(file_bytes)

        # Open the document — python-docx unpacks the XML automatically
        doc = Document(buffer)

        # doc.paragraphs gives every paragraph element in order
        # paragraph.text is the plain string content of that paragraph
        para_texts = [para.text for para in doc.paragraphs if para.text.strip()]

        full_text = "\n".join(para_texts)
        full_text = re.sub(r"\s+", " ", full_text).strip()

        logger.info(f"DOCX extraction complete — {len(full_text)} chars from {len(doc.paragraphs)} paragraphs")
        return full_text

    except Exception as e:
        logger.error(f"Failed to extract text from DOCX: {e}")
        return ""


# ─────────────────────────────────────────────────────────────────────────────
#  Function 3: extract_skills_with_gemini
# ─────────────────────────────────────────────────────────────────────────────
def extract_skills_with_gemini(text: str) -> list[str]:
    """
    Use Google Gemini (gemini-flash-latest) to extract a comprehensive list of
    skills from resume text.

    Why Gemini instead of regex/keyword matching?
        - Resumes don't follow a fixed format. A person might write
          "built REST APIs with FastAPI" — the skill is "FastAPI" but
          there's no keyword label. Gemini understands context.
        - Gemini also catches soft skills like "team leadership" that
          keyword lists miss.

    Process:
        1. Truncate text to 8000 chars to stay within free-tier token limits.
        2. Build a prompt instructing Gemini to return a JSON array only.
        3. Call Gemini and get the response string.
        4. Strip any markdown code fences (```json ... ```) Gemini sometimes adds.
        5. Parse the JSON and return the list.

    Args:
        text: Plain text extracted from the resume.

    Returns:
        A list of skill strings, e.g. ["Python", "FastAPI", "Docker", "Git"].
        Returns an empty list if parsing fails (with a warning log).
    """
    if not text.strip():
        logger.warning("extract_skills_with_gemini received empty text — returning []")
        return []

    try:
        llm = get_llm()

        # Truncate to avoid hitting free-tier token limits
        # 8000 chars ≈ ~2000 tokens, well within gemini-flash's context window
        truncated_text = text[:8000]

        prompt = f"""From the following resume text, extract ALL technical skills, tools, 
frameworks, programming languages, databases, cloud platforms, and soft skills.

Return ONLY a valid JSON array of strings with no explanation. 
Example format: ["Python", "FastAPI", "PostgreSQL", "Docker", "Team Leadership"]

Resume Text:
{truncated_text}"""

        # Send the prompt as a HumanMessage to the chat model
        response = llm.invoke([HumanMessage(content=prompt)])

        # response.content is the raw string from Gemini
        raw = response.content.strip()

        # ── Strip markdown code fences if Gemini wraps its answer ──────────
        # Gemini sometimes returns: ```json\n["Python", ...]\n```
        # We need to remove those fences before JSON parsing.
        raw = re.sub(r"^```(?:json)?\s*", "", raw)   # remove opening fence
        raw = re.sub(r"\s*```$", "", raw)             # remove closing fence
        raw = raw.strip()

        # ── Parse the JSON array ────────────────────────────────────────────
        skills = json.loads(raw)

        # Ensure it's actually a list of strings (Gemini should comply, but validate)
        if not isinstance(skills, list):
            logger.warning("Gemini returned non-list JSON — returning []")
            return []

        # Filter out any non-string entries and strip whitespace
        skills = [str(s).strip() for s in skills if s]

        logger.info(f"Gemini extracted {len(skills)} skills from resume text")
        return skills

    except json.JSONDecodeError as e:
        logger.warning(f"Failed to parse Gemini skill JSON: {e} | Raw response: {raw[:200]}")
        return []  # safe fallback — the resume still gets stored, just without skills

    except Exception as e:
        logger.error(f"extract_skills_with_gemini failed unexpectedly: {e}")
        return []


# ─────────────────────────────────────────────────────────────────────────────
#  Function 4: parse_resume  (main entry point for the resume router)
# ─────────────────────────────────────────────────────────────────────────────
def parse_resume(file_bytes: bytes, filename: str) -> dict:
    """
    High-level function that orchestrates the full resume parsing pipeline.

    Steps:
        1. Detect file type from the filename extension (.pdf or .docx).
        2. Call the appropriate extractor to get raw text.
        3. Call extract_skills_with_gemini() on that text.
        4. Return a dict suitable for constructing a ResumeData schema.

    This is the only function the resume router needs to import from this module.

    Args:
        file_bytes: Raw bytes of the uploaded resume file.
        filename  : Original filename from the upload (e.g. "john_cv.pdf").
                    Used only to determine file type.

    Returns:
        A dict with two keys:
            {
                "raw_text"        : str,        # full extracted text
                "extracted_skills": list[str],  # skills parsed by Gemini
            }

    Raises:
        ValueError: If the file extension is not .pdf or .docx.
    """
    # Normalise filename to lowercase for safe extension comparison
    name_lower = filename.lower().strip()

    logger.info(f"parse_resume called for file: {filename}")

    # ── Step 1: Extract raw text based on file type ─────────────────────────
    if name_lower.endswith(".pdf"):
        logger.info("Detected PDF — using pypdf extractor")
        raw_text = extract_text_from_pdf(file_bytes)

    elif name_lower.endswith(".docx"):
        logger.info("Detected DOCX — using python-docx extractor")
        raw_text = extract_text_from_docx(file_bytes)

    else:
        # We only support PDF and DOCX for now
        raise ValueError(
            f"Unsupported file type: '{filename}'. "
            "Please upload a .pdf or .docx file."
        )

    # Guard: if extraction returned nothing, log and return early
    if not raw_text:
        logger.warning(f"No text extracted from '{filename}' — returning empty result")
        return {"raw_text": "", "extracted_skills": []}

    # ── Step 2: Extract skills using Gemini ──────────────────────────────────
    extracted_skills = extract_skills_with_gemini(raw_text)

    logger.info(
        f"parse_resume complete for '{filename}' — "
        f"{len(raw_text)} chars, {len(extracted_skills)} skills"
    )

    # ── Step 3: Return structured dict for the router ─────────────────────────
    return {
        "raw_text": raw_text,
        "extracted_skills": extracted_skills,
    }
