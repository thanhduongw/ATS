"""
Text normalization for extracted CV content.

Rules:
- Unicode NFC normalization (compose diacritics)
- Fix common Vietnamese OCR errors
- Normalize non-standard hyphens/dashes
- Remove PDF tracking artifacts (e.g. #HRJ#uuid#)
- Clean whitespace/formatting artifacts
- NEVER remove meaningful content
"""

import logging
import re
import unicodedata

logger = logging.getLogger(__name__)

# Common OCR errors for Vietnamese characters
_VIETNAMESE_OCR_FIXES: list[tuple[str, str]] = [
    ("ð", "đ"),
    ("Ð", "Đ"),
    # Ligature fixes
    ("ﬁ", "fi"),
    ("ﬂ", "fl"),
    ("ﬀ", "ff"),
    ("ﬃ", "ffi"),
    ("ﬄ", "ffl"),
]

# Soft hyphen: when between word characters, replace with real hyphen
# (e.g. "zero­downtime" → "zero-downtime")
_SOFT_HYPHEN_BETWEEN_WORDS = re.compile(r"(\w)\u00ad(\w)")

# Non-standard hyphens/dashes → standard hyphen-minus
_NONSTANDARD_HYPHENS: list[tuple[str, str]] = [
    ("\u2010", "-"),   # Hyphen
    ("\u2011", "-"),   # Non-breaking hyphen
    ("\u2012", "-"),   # Figure dash
    ("\u2013", "-"),   # En dash (–)
    ("\u2014", "-"),   # Em dash (—)
    ("\u2015", "-"),   # Horizontal bar
    ("\ufe63", "-"),   # Small hyphen-minus
    ("\uff0d", "-"),   # Fullwidth hyphen-minus
]

# Zero-width and invisible characters to remove
_INVISIBLE_CHARS = re.compile(
    r"[\u200b\u200c\u200d\u200e\u200f"  # Zero-width space/joiner/mark
    r"\u202a\u202b\u202c\u202d\u202e"   # Directional formatting
    r"\ufeff"                            # BOM / ZWNBSP
    r"\u00ad"                            # Soft hyphen (standalone)
    r"\u2060\u2061\u2062\u2063\u2064"    # Word joiner etc
    r"\ufff9\ufffa\ufffb"               # Interlinear annotation
    r"\u0000-\u0008\u000b\u000c"        # C0 control chars (except \t \n \r)
    r"\u000e-\u001f\u007f"              # More C0 + DEL
    r"\u0080-\u009f"                     # C1 control chars
    r"]"
)

# PDF tracking artifacts / watermarks from recruitment platforms
# e.g. #HRJ#2eb5f3ff-1e8e-42d3-9102-aafa1f3b460d#
_TRACKING_ARTIFACTS = re.compile(
    r"#[A-Z]{2,10}#[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}#",
    re.IGNORECASE,
)

# Bullet point normalization
_BULLET_PATTERN = re.compile(r"^[\u2022\u2023\u25e6\u2043\u2219\u25cf\u25cb\u25aa\u25a0\u25a1\u25ba\u25b6►●○•◦‣⁃∙▪▫■□]\s*", re.MULTILINE)

# Multiple blank lines → max 2
_MULTI_BLANK_LINES = re.compile(r"\n{3,}")

# Multiple spaces → single space (but not newlines)
_MULTI_SPACES = re.compile(r"[^\S\n]+")

# Tab characters
_TABS = re.compile(r"\t+")


def normalize_text(text: str) -> str:
    """Normalize extracted text for downstream processing.

    Pipeline:
    1. Unicode NFC normalization (compose combining marks)
    2. Soft-hyphen between words → real hyphen (before removal)
    3. Remove invisible/zero-width characters
    4. Normalize non-standard hyphens/dashes
    5. Fix common Vietnamese OCR errors
    6. Remove PDF tracking artifacts
    7. Normalize bullet points → '- '
    8. Clean whitespace (collapse spaces, limit blank lines)
    9. Strip leading/trailing whitespace

    Args:
        text: Raw extracted text.

    Returns:
        Normalized text. Content is preserved — only formatting is cleaned.
    """
    if not text:
        return ""

    original_len = len(text)

    # 1. Unicode NFC normalization
    # Converts decomposed Vietnamese diacritics (e.g. base + combining mark)
    # into precomposed form (single codepoint)
    text = unicodedata.normalize("NFC", text)

    # 2. Soft-hyphen between word characters → real hyphen
    # e.g. "zero\u00addowntime" → "zero-downtime"
    # Must run BEFORE invisible char removal to detect context
    text = _SOFT_HYPHEN_BETWEEN_WORDS.sub(r"\1-\2", text)

    # 3. Remove invisible characters (remaining standalone soft-hyphens included)
    text = _INVISIBLE_CHARS.sub("", text)

    # 4. Normalize non-standard hyphens/dashes
    for wrong, correct in _NONSTANDARD_HYPHENS:
        text = text.replace(wrong, correct)

    # 5. Fix Vietnamese OCR errors
    for wrong, correct in _VIETNAMESE_OCR_FIXES:
        text = text.replace(wrong, correct)

    # 6. Remove PDF tracking artifacts / watermarks
    text = _TRACKING_ARTIFACTS.sub("", text)

    # 7. Normalize bullet points → '- '
    text = _BULLET_PATTERN.sub("- ", text)

    # 8. Clean whitespace
    # Tabs → space
    text = _TABS.sub(" ", text)
    # Multiple spaces → single space (preserve newlines)
    text = _MULTI_SPACES.sub(" ", text)
    # Multiple blank lines → max 2 newlines
    text = _MULTI_BLANK_LINES.sub("\n\n", text)

    # 9. Strip each line + overall
    lines = [line.strip() for line in text.split("\n")]
    text = "\n".join(lines).strip()

    logger.debug(
        "Text normalized: %d → %d chars (%.0f%% retained)",
        original_len,
        len(text),
        (len(text) / original_len * 100) if original_len > 0 else 0,
    )

    return text
