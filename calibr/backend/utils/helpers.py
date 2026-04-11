"""
utils/helpers.py
─────────────────────────────────────────────────────────────────────────────
Calibr – Small Utility Functions

A collection of stateless helper functions used across the backend services.
No external libraries required beyond Python's standard library.

Functions:
    clean_json_response   – Strip markdown fences from an LLM text response
    safe_json_parse       – Parse JSON with a safe fallback default
    chunk_text_simple     – Split a long string into overlapping chunks
    today_string          – Return today's date as "YYYY-MM-DD"
    format_chat_history   – Format a list of message dicts as a readable string
─────────────────────────────────────────────────────────────────────────────
"""

# ── Standard library only — no pip dependencies ───────────────────────────────
import json
import logging
from datetime import date

# ── Module-level logger ───────────────────────────────────────────────────────
logger = logging.getLogger("calibr.utils.helpers")


# ─────────────────────────────────────────────────────────────────────────────
#  1. clean_json_response
#  Strip markdown code fences that Gemini/LLMs often wrap around JSON output.
# ─────────────────────────────────────────────────────────────────────────────

def clean_json_response(text: str) -> str:
    """
    Strip markdown code fences from an LLM response so the result can be
    parsed with json.loads().

    LLMs frequently return JSON wrapped like:
        ```json
        {"key": "value"}
        ```
    or just:
        ```
        {"key": "value"}
        ```

    This function removes those fences and any surrounding whitespace.

    Args:
        text: Raw string from an LLM response.

    Returns:
        Clean JSON string ready for json.loads().

    Example:
        >>> raw = "```json\\n{\"score\": 85}\\n```"
        >>> clean_json_response(raw)
        '{"score": 85}'
    """
    # Strip leading/trailing whitespace first
    cleaned = text.strip()

    # Remove opening ```json or ``` fence
    if cleaned.startswith("```json"):
        cleaned = cleaned[len("```json"):].lstrip()
    elif cleaned.startswith("```"):
        cleaned = cleaned[len("```"):].lstrip()

    # Remove closing ``` fence
    if cleaned.endswith("```"):
        cleaned = cleaned[: -len("```")].rstrip()

    return cleaned.strip()


# ─────────────────────────────────────────────────────────────────────────────
#  2. safe_json_parse
#  Try json.loads(); return a default value if anything goes wrong.
# ─────────────────────────────────────────────────────────────────────────────

def safe_json_parse(text: str, default):
    """
    Attempt to parse a JSON string and return a safe default on any error.

    Useful when consuming LLM output that might sometimes be malformed or
    contain extra prose before/after the JSON block.

    Args:
        text:    The string to parse. Will be cleaned via clean_json_response()
                 before parsing so markdown fences are handled automatically.
        default: Value to return if parsing fails (e.g. {}, [], None, False).

    Returns:
        Parsed Python object on success, `default` on any error.

    Example:
        >>> safe_json_parse('{"score": 85}', default={})
        {'score': 85}
        >>> safe_json_parse("not json at all", default=[])
        []
    """
    try:
        cleaned = clean_json_response(text)
        return json.loads(cleaned)
    except Exception as exc:
        logger.warning(
            "safe_json_parse: JSON parsing failed — returning default. "
            f"Error: {exc!r}. Raw text (first 200 chars): {text[:200]!r}"
        )
        return default


# ─────────────────────────────────────────────────────────────────────────────
#  3. chunk_text_simple
#  Split long text into overlapping fixed-size chunks without any library.
# ─────────────────────────────────────────────────────────────────────────────

def chunk_text_simple(
    text: str,
    chunk_size: int = 500,
    overlap: int = 50,
) -> list[str]:
    """
    Split `text` into overlapping chunks of approximately `chunk_size`
    characters, with `overlap` characters of context carried into each
    subsequent chunk.

    No external library required — pure Python string slicing.

    Why overlapping chunks?
        When text is split at exact boundaries, important context that spans
        a boundary (e.g. a sentence) can be cut off. Overlap ensures that
        the tail of chunk N is the head of chunk N+1, preserving that context
        for embedding / retrieval use cases.

    Args:
        text:       The input text to chunk (e.g. resume raw text).
        chunk_size: Target character length of each chunk (default 500).
        overlap:    Number of characters to repeat at the start of the next
                    chunk (default 50). Must be < chunk_size.

    Returns:
        List of non-empty string chunks. Returns an empty list if text is
        empty or whitespace-only.

    Example:
        >>> chunks = chunk_text_simple("A" * 1200, chunk_size=500, overlap=50)
        >>> len(chunks)   # 3 chunks
        3
        >>> len(chunks[0])
        500
    """
    # Guard: nothing to chunk
    if not text or not text.strip():
        return []

    # Clamp overlap so it's always < chunk_size (avoids infinite loops)
    if overlap >= chunk_size:
        overlap = max(0, chunk_size - 1)

    chunks: list[str] = []
    start = 0
    text_len = len(text)

    while start < text_len:
        end = start + chunk_size
        chunk = text[start:end]

        # Only add non-empty chunks
        if chunk.strip():
            chunks.append(chunk)

        if end >= text_len:
            break  # Reached the end of text

        # Move forward by (chunk_size - overlap) so the next chunk
        # starts `overlap` characters before the current chunk's end.
        start += chunk_size - overlap

    return chunks


# ─────────────────────────────────────────────────────────────────────────────
#  4. today_string
#  Return today's date formatted as "YYYY-MM-DD" for date_fetched fields.
# ─────────────────────────────────────────────────────────────────────────────

def today_string() -> str:
    """
    Return today's date as a "YYYY-MM-DD" formatted string.

    Used when stamping job listings with a date_fetched field so the
    scheduler and API endpoints can distinguish today's jobs from older ones.

    Returns:
        Date string in ISO format, e.g. "2025-04-07".

    Example:
        >>> today_string()
        '2025-04-07'   # (will vary by actual date)
    """
    return date.today().isoformat()   # uses Python's built-in ISO format


# ─────────────────────────────────────────────────────────────────────────────
#  5. format_chat_history
#  Format a list of {role, content} message dicts as a readable string for
#  injection into an LLM prompt.
# ─────────────────────────────────────────────────────────────────────────────

def format_chat_history(messages: list[dict]) -> str:
    """
    Convert a list of chat message dicts into a human-readable multi-line
    string suitable for injecting into an LLM prompt as conversation context.

    Each dict is expected to have:
        "role"    → "user" or "assistant"
        "content" → the message text

    Roles are formatted as:
        user      → "User: <content>"
        assistant → "Assistant: <content>"
        other     → "<Role capitalised>: <content>"

    Args:
        messages: List of {"role": str, "content": str} dicts, typically from
                  MongoDB chat history, ordered chronologically (oldest first).

    Returns:
        Formatted multi-line string. Returns an empty string if the list is
        empty or None.

    Example:
        >>> msgs = [
        ...     {"role": "user",      "content": "What skills am I missing?"},
        ...     {"role": "assistant", "content": "You are missing Docker."},
        ... ]
        >>> print(format_chat_history(msgs))
        User: What skills am I missing?
        Assistant: You are missing Docker.
    """
    if not messages:
        return ""

    lines: list[str] = []

    for msg in messages:
        role    = msg.get("role", "unknown")
        content = msg.get("content", "").strip()

        # Capitalise the role label for display
        if role == "user":
            label = "User"
        elif role == "assistant":
            label = "Assistant"
        else:
            label = role.capitalize()

        lines.append(f"{label}: {content}")

    return "\n".join(lines)
