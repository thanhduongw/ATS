"""
Skill Normalization Service — Phase 4, Task 4.4.

Normalizes raw skill strings from CV extraction into canonical names.
Uses a 3-step pipeline:
  1. Exact match (case-insensitive)
  2. Alias dictionary lookup
  3. Embedding similarity (cosine >= threshold) — uses EmbeddingService

Unmatched skills are kept as-is (free-text).
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

from app.services.embedding_service import embedding_service

logger = logging.getLogger(__name__)

# Path to the alias dictionary
_ALIAS_FILE = Path(__file__).parent.parent.parent / "data" / "skill_aliases.json"

# Loaded at module level (lightweight JSON — no model needed)
_alias_dict: dict[str, str] = {}
_canonical_skills: set[str] = set()

# Cached canonical skill embeddings (populated on first use)
_canonical_embeddings: dict[str, list[float]] = {}
_embeddings_cached = False


def _load_aliases() -> None:
    """Load the alias dictionary from JSON file."""
    global _alias_dict, _canonical_skills

    if _alias_dict:
        return  # Already loaded

    try:
        with open(_ALIAS_FILE, "r", encoding="utf-8") as f:
            _alias_dict = json.load(f)

        # Collect all canonical skill names (the values)
        _canonical_skills = set(_alias_dict.values())

        logger.info(
            "Loaded %d skill aliases mapping to %d canonical skills",
            len(_alias_dict), len(_canonical_skills),
        )
    except FileNotFoundError:
        logger.warning("Skill alias file not found: %s", _ALIAS_FILE)
    except Exception as e:
        logger.error("Failed to load skill aliases: %s", e)


async def _ensure_canonical_embeddings() -> None:
    """Pre-compute embeddings for all canonical skill names.

    Called once on first normalization request. Results are cached
    in memory for the lifetime of the process.
    """
    global _canonical_embeddings, _embeddings_cached

    if _embeddings_cached:
        return

    if not embedding_service.is_loaded:
        logger.warning("Embedding model not loaded — skipping embedding-based normalization")
        _embeddings_cached = True
        return

    if not _canonical_skills:
        _embeddings_cached = True
        return

    canonical_list = sorted(_canonical_skills)
    logger.info("Pre-computing embeddings for %d canonical skills...", len(canonical_list))

    # Use "passage: " prefix for stored canonical skill embeddings
    texts = [f"passage: {skill}" for skill in canonical_list]
    vectors = await embedding_service.embed_texts(texts)

    for skill, vec in zip(canonical_list, vectors):
        _canonical_embeddings[skill] = vec

    _embeddings_cached = True
    logger.info("Canonical skill embeddings cached (%d skills)", len(_canonical_embeddings))


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors.

    Assumes vectors are already L2-normalized (sentence-transformers
    returns normalized vectors when normalize_embeddings=True).
    """
    return sum(x * y for x, y in zip(a, b))


async def normalize_skill(
    skill: str,
    similarity_threshold: float = 0.85,
) -> str:
    """Normalize a single skill string to its canonical name.

    Pipeline:
    1. Exact match against canonical names (case-insensitive)
    2. Alias dictionary lookup (case-insensitive)
    3. Embedding similarity with canonical skills (cosine >= threshold)
    4. Return original if no match found

    Args:
        skill: Raw skill string from CV extraction.
        similarity_threshold: Minimum cosine similarity for embedding match.

    Returns:
        Canonical skill name, or the original string if unmatched.
    """
    _load_aliases()

    skill_lower = skill.strip().lower()

    if not skill_lower:
        return skill

    # Step 1: Exact match against canonical names
    for canonical in _canonical_skills:
        if canonical.lower() == skill_lower:
            return canonical

    # Step 2: Alias dictionary lookup
    if skill_lower in _alias_dict:
        return _alias_dict[skill_lower]

    # Step 3: Embedding similarity
    if embedding_service.is_loaded and _canonical_embeddings:
        await _ensure_canonical_embeddings()

        try:
            # Embed the query skill with "query: " prefix
            query_vec = await embedding_service.embed_query(skill)

            best_match: str | None = None
            best_score: float = 0.0

            for canonical, canonical_vec in _canonical_embeddings.items():
                score = _cosine_similarity(query_vec, canonical_vec)
                if score > best_score:
                    best_score = score
                    best_match = canonical

            if best_match and best_score >= similarity_threshold:
                logger.debug(
                    "Skill '%s' matched to '%s' via embedding (cosine=%.3f)",
                    skill, best_match, best_score,
                )
                return best_match

        except Exception as e:
            logger.warning("Embedding-based skill match failed for '%s': %s", skill, e)

    # Step 4: No match — return original
    return skill


async def normalize_skills(
    skills: list[str],
    similarity_threshold: float = 0.85,
) -> list[str]:
    """Normalize a list of skill strings.

    Deduplicates after normalization (e.g. ["ReactJS", "React.js"] → ["React"]).

    Args:
        skills: List of raw skill strings.
        similarity_threshold: Minimum cosine similarity for embedding match.

    Returns:
        Deduplicated list of canonical skill names.
    """
    _load_aliases()
    await _ensure_canonical_embeddings()

    seen: set[str] = set()
    normalized: list[str] = []

    for skill in skills:
        canonical = await normalize_skill(skill, similarity_threshold)
        canonical_lower = canonical.lower()
        if canonical_lower not in seen:
            seen.add(canonical_lower)
            normalized.append(canonical)

    if len(normalized) != len(skills):
        logger.info(
            "Skill normalization: %d raw → %d unique (deduplicated %d)",
            len(skills), len(normalized), len(skills) - len(normalized),
        )

    return normalized
