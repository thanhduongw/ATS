"""
Prompt injection scanner for CV text.

Detects common injection patterns and invisible character attacks.
Flags suspicious content but does NOT reject — AI scoring should
still process the CV, just with a warning logged to ai_jobs.
"""

import logging
import re
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

# --- Injection pattern regexes (case-insensitive) ---
_INJECTION_PATTERNS: list[tuple[str, re.Pattern]] = [
    (
        "ignore_instructions",
        re.compile(
            r"ignore\s+(all\s+)?(previous|above|prior|earlier|preceding)\s+"
            r"(instructions|prompts|rules|commands|directives)",
            re.IGNORECASE,
        ),
    ),
    (
        "system_prompt",
        re.compile(r"system\s+prompt", re.IGNORECASE),
    ),
    (
        "role_override",
        re.compile(
            r"(you\s+are\s+now|act\s+as|pretend\s+(to\s+be|you\s+are)|"
            r"your\s+new\s+role\s+is)",
            re.IGNORECASE,
        ),
    ),
    (
        "disregard_instructions",
        re.compile(
            r"(disregard|forget|override|bypass|skip)\s+"
            r"(all\s+)?(instructions|rules|guidelines|constraints|restrictions)",
            re.IGNORECASE,
        ),
    ),
    (
        "do_not_follow",
        re.compile(r"do\s+not\s+follow\s+(the\s+)?(instructions|rules)", re.IGNORECASE),
    ),
    (
        "output_manipulation",
        re.compile(
            r"(always\s+score|give\s+(me\s+)?a?\s*(perfect|100|high|maximum)\s+score|"
            r"rate\s+(this|me)\s+(as\s+)?(excellent|perfect|10|100))",
            re.IGNORECASE,
        ),
    ),
    (
        "prompt_leak",
        re.compile(
            r"(print|show|reveal|output|display)\s+(the\s+)?"
            r"(system\s+)?(prompt|instructions|rules)",
            re.IGNORECASE,
        ),
    ),
    (
        "delimiter_attack",
        re.compile(
            r"(###|```|---)\s*(END|BEGIN|SYSTEM|ASSISTANT|USER|IGNORE)",
            re.IGNORECASE,
        ),
    ),
]

# Invisible character patterns
_INVISIBLE_CHAR_NAMES: list[tuple[str, str]] = [
    ("zero_width_space", "\u200b"),
    ("zero_width_non_joiner", "\u200c"),
    ("zero_width_joiner", "\u200d"),
    ("right_to_left_override", "\u202e"),
    ("left_to_right_override", "\u202d"),
    ("right_to_left_embedding", "\u202b"),
    ("left_to_right_embedding", "\u202a"),
    ("pop_directional_formatting", "\u202c"),
    ("word_joiner", "\u2060"),
]


@dataclass
class ScanResult:
    """Result of prompt injection scan."""

    injection_detected: bool
    patterns_found: list[str] = field(default_factory=list)
    invisible_chars_found: bool = False
    invisible_char_types: list[str] = field(default_factory=list)
    details: list[str] = field(default_factory=list)


def scan_for_injection(text: str) -> ScanResult:
    """Scan text for prompt injection patterns and invisible character attacks.

    This scanner is intentionally conservative — it flags but does NOT reject.
    The goal is to log warnings for manual review, not to block CVs.

    Args:
        text: Text content to scan (already extracted from CV).

    Returns:
        ScanResult with detected patterns and invisible characters.
    """
    if not text:
        return ScanResult(injection_detected=False)

    patterns_found: list[str] = []
    details: list[str] = []

    # --- Check injection patterns ---
    for pattern_name, regex in _INJECTION_PATTERNS:
        matches = regex.findall(text)
        if matches:
            patterns_found.append(pattern_name)
            # Log first match for context
            first_match = regex.search(text)
            if first_match:
                start = max(0, first_match.start() - 20)
                end = min(len(text), first_match.end() + 20)
                context = text[start:end].replace("\n", " ")
                details.append(f"{pattern_name}: '...{context}...'")

    # --- Check invisible characters ---
    invisible_char_types: list[str] = []
    for char_name, char in _INVISIBLE_CHAR_NAMES:
        if char in text:
            invisible_char_types.append(char_name)
            # Count occurrences
            count = text.count(char)
            details.append(f"Invisible char '{char_name}': {count} occurrences")

    invisible_found = len(invisible_char_types) > 0

    injection_detected = len(patterns_found) > 0 or invisible_found

    if injection_detected:
        logger.warning(
            "Prompt injection detected: patterns=%s, invisible_chars=%s",
            patterns_found,
            invisible_char_types,
        )

    return ScanResult(
        injection_detected=injection_detected,
        patterns_found=patterns_found,
        invisible_chars_found=invisible_found,
        invisible_char_types=invisible_char_types,
        details=details,
    )
