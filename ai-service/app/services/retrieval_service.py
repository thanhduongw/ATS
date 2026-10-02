"""
Retrieval Service — Phase 4, Task 4.5 + 4.8.

Provides semantic search over CV chunks for a given criterion text.
This is the direct input for Phase 5 RAG scoring — each criterion
retrieves its top-k most relevant chunks from the CV.

Task 4.8 extends this with cross-application Talent Pool Search.
"""

from __future__ import annotations

import logging
import time

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.chunk_repository import (
    SimilarChunk,
    TalentPoolCandidate,
    similarity_search,
    talent_pool_search,
)
from app.services.embedding_service import embedding_service

logger = logging.getLogger(__name__)


async def retrieve_for_criterion(
    session: AsyncSession,
    criterion_text: str,
    application_id: int,
    top_k: int = 3,
    chunk_types: list[str] | None = None,
) -> list[SimilarChunk]:
    """Retrieve the most relevant CV chunks for a benchmark criterion.

    Pipeline:
    1. Embed the criterion text with "query: " prefix
    2. Cosine similarity search in cv_document_chunks (pgvector HNSW)
    3. Return top-k chunks sorted by similarity (highest first)

    This function is the bridge between Phase 4 (Vector Storage)
    and Phase 5 (RAG Scoring). Phase 5 will call this for each
    benchmark criterion and feed the results into the LLM prompt.

    Args:
        session: Async database session.
        criterion_text: The benchmark criterion to search for.
            Example: "Kinh nghiệm lập trình Java Spring Boot tối thiểu 2 năm"
        application_id: The application whose CV chunks to search.
        top_k: Number of most similar chunks to return.
        chunk_types: Optional filter by chunk type(s).

    Returns:
        List of SimilarChunk objects with similarity scores.
    """
    start = time.monotonic()

    # Step 1: Embed the criterion text
    query_vector = await embedding_service.embed_query(criterion_text)

    # Step 2: Similarity search
    results = await similarity_search(
        session=session,
        query_vector=query_vector,
        application_id=application_id,
        top_k=top_k,
        chunk_types=chunk_types,
    )

    elapsed_ms = int((time.monotonic() - start) * 1000)
    logger.info(
        "Retrieval for criterion '%s' (app=%d): %d chunks in %d ms "
        "(top similarity: %.3f)",
        criterion_text[:60],
        application_id,
        len(results),
        elapsed_ms,
        results[0].similarity if results else 0.0,
    )

    return results


async def search_talent_pool(
    session: AsyncSession,
    query: str,
    top_k: int = 10,
    min_similarity: float = 0.0,
    job_posting_id: int | None = None,
) -> list[TalentPoolCandidate]:
    """Search across ALL candidates in the talent pool using semantic similarity.

    HR enters a free-text description and the system finds the most
    relevant candidates from the entire CV database.

    Pipeline:
    1. Embed the query with "query: " prefix
    2. Two-phase HNSW search: ANN scan → Python groupby per candidate_id
    3. Filter by min_similarity threshold
    4. Return top-k candidates ranked by similarity (highest first)

    Args:
        session: Async database session.
        query: Free-text search query in any language.
            Example: "Ứng viên biết làm Digital Marketing và thiết kế Photoshop"
        top_k: Maximum number of candidates to return.
        min_similarity: Minimum cosine similarity threshold (0.0–1.0).
            Candidates below this threshold are excluded. Default 0.0 (no filter).
        job_posting_id: If provided, restrict search to candidates who applied
            to this specific job posting. If None, search all candidates.

    Returns:
        List of TalentPoolCandidate sorted by top_similarity descending.
    """
    start = time.monotonic()

    # Step 1: Embed the query text
    query_vector = await embedding_service.embed_query(query)

    # Step 2: Global talent pool search
    results = await talent_pool_search(
        session=session,
        query_vector=query_vector,
        top_k=top_k,
        min_similarity=min_similarity,
        job_posting_id=job_posting_id,
    )

    elapsed_ms = int((time.monotonic() - start) * 1000)
    logger.info(
        "Talent pool search for '%s': %d candidates in %d ms "
        "(job_posting_id=%s, min_sim=%.2f)",
        query[:60],
        len(results),
        elapsed_ms,
        job_posting_id,
        min_similarity,
    )

    return results

