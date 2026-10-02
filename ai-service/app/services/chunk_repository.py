"""
CV Chunk Repository â€” Phase 4, Task 4.3 + 4.8.

Handles CRUD operations for cv_document_chunks with pgvector.
Provides cosine similarity search using the HNSW index.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from sqlalchemy import delete, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import CVDocumentChunk
from app.services.chunking_service import CVChunk

logger = logging.getLogger(__name__)


@dataclass
class SimilarChunk:
    """A chunk returned from similarity search, with its score."""
    chunk_type: str
    content: str
    similarity: float  # 0.0 â€“ 1.0 (cosine similarity)
    metadata: dict


@dataclass
class TalentPoolCandidate:
    """A candidate result from talent pool search (cross-application)."""
    candidate_id: int
    application_id: int
    top_similarity: float   # Best similarity score across all this candidate's chunks
    best_chunk_type: str    # e.g. SKILL_SUMMARY, WORK_EXPERIENCE
    best_chunk_content: str # The most relevant text excerpt from their CV
    rank: int               # 1-based rank in result list


async def save_chunks(
    session: AsyncSession,
    application_id: int,
    candidate_id: int,
    chunks: list[CVChunk],
) -> list[CVDocumentChunk]:
    """Save CV chunks to the database.

    Uses upsert pattern: deletes existing chunks for the same application_id
    before inserting new ones. This ensures idempotency.

    Args:
        session: Async database session.
        application_id: Application ID the chunks belong to.
        candidate_id: Candidate ID the chunks belong to.
        chunks: List of CVChunk objects with embeddings populated.

    Returns:
        List of persisted CVDocumentChunk ORM objects.
    """
    # Delete existing chunks for this application (upsert pattern)
    await session.execute(
        delete(CVDocumentChunk).where(
            CVDocumentChunk.application_id == application_id
        )
    )

    db_chunks: list[CVDocumentChunk] = []
    for chunk in chunks:
        db_chunk = CVDocumentChunk(
            application_id=application_id,
            candidate_id=candidate_id,
            chunk_type=chunk.chunk_type,
            content=chunk.content,
            embedding=chunk.embedding,
        )
        session.add(db_chunk)
        db_chunks.append(db_chunk)

    await session.flush()  # Assign IDs without committing

    logger.info(
        "Saved %d chunks for application_id=%d (candidate_id=%d)",
        len(db_chunks), application_id, candidate_id,
    )
    return db_chunks


async def get_chunks_by_application(
    session: AsyncSession,
    application_id: int,
) -> list[CVDocumentChunk]:
    """Get all chunks for a given application."""
    stmt = (
        select(CVDocumentChunk)
        .where(CVDocumentChunk.application_id == application_id)
        .order_by(CVDocumentChunk.id)
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def similarity_search(
    session: AsyncSession,
    query_vector: list[float],
    application_id: int,
    top_k: int = 3,
    chunk_types: list[str] | None = None,
) -> list[SimilarChunk]:
    """Cosine similarity search using pgvector.

    Uses the <=> operator (cosine distance) with the HNSW index.
    Returns chunks sorted by similarity (highest first).

    Args:
        session: Async database session.
        query_vector: Query embedding vector (1024 dims).
        application_id: Restrict search to chunks from this application.
        top_k: Number of most similar chunks to return.
        chunk_types: Optional filter by chunk type(s).

    Returns:
        List of SimilarChunk(chunk_type, content, similarity, metadata).
    """
    # Build the query using raw SQL for pgvector cosine distance
    # cosine_distance = 1 - cosine_similarity, so similarity = 1 - distance
    vector_str = "[" + ",".join(str(v) for v in query_vector) + "]"

    type_filter = ""
    type_params: dict = {}
    if chunk_types:
        # Use ANY(:chunk_types) with a proper parameter to avoid SQL injection.
        type_filter = "AND chunk_type = ANY(:chunk_types)"
        type_params["chunk_types"] = list(chunk_types)

    sql = text(f"""
        SELECT id, chunk_type, content,
               1 - (embedding <=> CAST(:query_vec AS vector)) AS similarity
        FROM cv_document_chunks
        WHERE application_id = :app_id
          AND embedding IS NOT NULL
          {type_filter}
        ORDER BY embedding <=> CAST(:query_vec AS vector)
        LIMIT :top_k
    """)

    result = await session.execute(
        sql,
        {
            "query_vec": vector_str,
            "app_id": application_id,
            "top_k": top_k,
            **type_params,
        },
    )

    similar_chunks: list[SimilarChunk] = []
    for row in result:
        similar_chunks.append(SimilarChunk(
            chunk_type=row.chunk_type,
            content=row.content,
            similarity=float(row.similarity),
            metadata={"db_id": row.id},
        ))

    logger.info(
        "Similarity search for application_id=%d returned %d chunks "
        "(top similarity: %.3f)",
        application_id,
        len(similar_chunks),
        similar_chunks[0].similarity if similar_chunks else 0.0,
    )
    return similar_chunks


async def talent_pool_search(
    session: AsyncSession,
    query_vector: list[float],
    top_k: int = 10,
    min_similarity: float = 0.0,
    job_posting_id: int | None = None,
) -> list[TalentPoolCandidate]:
    """Global talent pool search across ALL candidates â€” two-phase HNSW strategy.

    Why two-phase instead of DISTINCT ON?
    â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    The naive DISTINCT ON approach forces PostgreSQL to ORDER BY (candidate_id,
    distance) simultaneously, which **cannot use the HNSW index** (index only
    accelerates single-column distance ordering). This causes a full sequential
    scan + sort on the entire table â€” O(N) with large constant.

    Two-phase strategy:
      Phase 1 â€” SQL: ORDER BY distance ONLY  â†’  HNSW index is used  âš¡
      Phase 2 â€” Python: groupby candidate_id  â†’  O(M) where M â‰ª N

    Complexity: O(log N) for HNSW + O(M) Python groupby, vs O(N log N) sequential.

    Args:
        session: Async database session.
        query_vector: Query embedding vector (1024 dims).
        top_k: Maximum number of unique candidates to return.
        min_similarity: Minimum cosine similarity threshold (0.0â€“1.0).
            Candidates with best similarity below this are excluded.
        job_posting_id: If provided, restrict to candidates who applied
            to this specific job posting. If None, search all candidates.

    Returns:
        List of TalentPoolCandidate sorted by top_similarity descending.
    """
    vector_str = "[" + ",".join(str(v) for v in query_vector) + "]"

    # Má»©c 1 fix: increase HNSW ef_search for better recall.
    # Default ef_search=40 may miss relevant candidates in dense regions.
    # 200 gives ~99% recall while staying well within acceptable latency.
    await session.execute(text("SET LOCAL hnsw.ef_search = 200"))

    # Over-fetch factor: we need top_k UNIQUE candidates. Since multiple chunks
    # per candidate will appear in raw ANN results, fetch (top_k Ã— avg_chunks)
    # rows to ensure enough unique candidates survive after dedup.
    # avg ~5 chunks/candidate â†’ 10Ã— safety factor is very conservative.
    ann_limit = top_k * 10

    # Optional filter by job_posting_id via ai_jobs lookup.
    job_filter = ""
    params: dict = {"query_vec": vector_str, "limit": ann_limit}
    if job_posting_id is not None:
        job_filter = """
            AND application_id IN (
                SELECT application_id FROM ai_jobs
                WHERE job_posting_id = :job_posting_id AND status = 'COMPLETED'
            )
        """
        params["job_posting_id"] = job_posting_id

    # â”€â”€â”€ Phase 1: HNSW ANN scan â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    # Simple ORDER BY distance â€” pgvector HNSW index is activated here.
    # No DISTINCT, no multi-column sort â†’ clean index scan.
    sql = text(f"""
        SELECT
            candidate_id,
            application_id,
            chunk_type,
            content,
            1 - (embedding <=> CAST(:query_vec AS vector)) AS similarity
        FROM cv_document_chunks
        WHERE embedding IS NOT NULL
          {job_filter}
        ORDER BY embedding <=> CAST(:query_vec AS vector)
        LIMIT :limit
    """)

    result = await session.execute(sql, params)
    rows = result.fetchall()

    # â”€â”€â”€ Phase 2: Python groupby â€” pick best chunk per candidate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    # For each candidate_id, keep the chunk with the highest similarity score.
    # This is equivalent to DISTINCT ON but done in O(M) Python instead of
    # O(N log N) SQL sort, where M = ann_limit â‰ª total_rows.
    best: dict[int, TalentPoolCandidate] = {}
    for row in rows:
        sim = float(row.similarity)
        if sim < min_similarity:
            continue  # skip below-threshold chunks early
        cid = row.candidate_id
        if cid not in best or sim > best[cid].top_similarity:
            best[cid] = TalentPoolCandidate(
                candidate_id=cid,
                application_id=row.application_id,
                top_similarity=sim,
                best_chunk_type=row.chunk_type,
                best_chunk_content=row.content,
                rank=0,  # will be assigned after sorting
            )

    # Final sort by similarity DESC, take top_k, assign 1-based rank
    ranked = sorted(best.values(), key=lambda c: c.top_similarity, reverse=True)[:top_k]
    for i, candidate in enumerate(ranked):
        candidate.rank = i + 1

    logger.info(
        "Talent pool search (two-phase): %d candidates from %d ANN rows "
        "(ann_limit=%d, min_sim=%.2f, job=%s)",
        len(ranked),
        len(rows),
        ann_limit,
        min_similarity,
        job_posting_id,
    )
    return ranked
