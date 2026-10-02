"""
Retrieval API — Phase 4, Task 4.7 + 4.8.

Task 4.7: Per-application semantic retrieval (used in Phase 5 RAG scoring).
Task 4.8: Cross-application Talent Pool Search (HR can find candidates globally).

These are internal/dev-only endpoints, not exposed through API Gateway auth.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services import chunk_repository
from app.services.retrieval_service import retrieve_for_criterion, search_talent_pool

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================================
# Request / Response schemas — Per-Application Retrieval
# ============================================================

class RetrievalTestRequest(BaseModel):
    """Request body for the retrieval test endpoint."""
    application_id: int = Field(..., alias="applicationId", description="Application ID to search chunks from")
    criterion_text: str = Field(..., alias="criterionText", description="Benchmark criterion text to search for")
    top_k: int = Field(3, alias="topK", description="Number of top results to return")
    chunk_types: list[str] | None = Field(None, alias="chunkTypes", description="Filter by chunk types")

    model_config = {"populate_by_name": True}


class ChunkResponse(BaseModel):
    """A single chunk in the response."""
    chunk_type: str = Field(..., alias="chunkType")
    content: str
    similarity: float | None = None
    metadata: dict = Field(default_factory=dict)

    model_config = {"populate_by_name": True}


class RetrievalTestResponse(BaseModel):
    """Response from the retrieval test endpoint."""
    application_id: int = Field(..., alias="applicationId")
    criterion_text: str = Field(..., alias="criterionText")
    chunks: list[ChunkResponse]

    model_config = {"populate_by_name": True}


class ChunkListResponse(BaseModel):
    """Response listing all chunks for an application."""
    application_id: int = Field(..., alias="applicationId")
    total_chunks: int = Field(..., alias="totalChunks")
    chunks: list[ChunkResponse]

    model_config = {"populate_by_name": True}


# ============================================================
# Request / Response schemas — Talent Pool Search (Task 4.8)
# ============================================================

class TalentPoolSearchRequest(BaseModel):
    """Request body for Talent Pool Search.

    HR enters a free-text description of the candidate they're looking for.
    The system searches across ALL indexed CVs in the system.
    """
    query: str = Field(
        ...,
        min_length=3,
        description="Free-text description of the desired candidate profile. "
                    "Can be in Vietnamese or English.",
        examples=[
            "Ứng viên biết làm Digital Marketing và thiết kế Photoshop",
            "Java Spring Boot backend engineer with microservices experience",
        ],
    )
    top_k: int = Field(
        10,
        alias="topK",
        ge=1,
        le=50,
        description="Maximum number of candidates to return (1–50).",
    )
    min_similarity: float = Field(
        0.0,
        alias="minSimilarity",
        ge=0.0,
        le=1.0,
        description="Minimum cosine similarity threshold. "
                    "Candidates below this score are excluded. "
                    "Recommended: 0.70 for meaningful results.",
    )
    job_posting_id: int | None = Field(
        None,
        alias="jobPostingId",
        description="If provided, restrict search to candidates who applied "
                    "to this specific job posting. If null, search ALL candidates.",
    )

    model_config = {"populate_by_name": True}


class TalentCandidateResult(BaseModel):
    """A single candidate result from Talent Pool Search."""
    candidate_id: int = Field(..., alias="candidateId")
    application_id: int = Field(..., alias="applicationId")
    top_similarity: float = Field(
        ...,
        alias="topSimilarity",
        description="Best cosine similarity score (0.0–1.0) between the query and this candidate's CV chunks.",
    )
    best_chunk_type: str = Field(
        ...,
        alias="bestChunkType",
        description="Type of the most relevant chunk: SKILL_SUMMARY, WORK_EXPERIENCE, EDUCATION, PROJECT, CERTIFICATION.",
    )
    best_chunk_content: str = Field(
        ...,
        alias="bestChunkContent",
        description="The actual text excerpt from the CV that matched the query best.",
    )
    rank: int = Field(..., description="1-based rank of this candidate in the results list.")

    model_config = {"populate_by_name": True}


class TalentPoolSearchResponse(BaseModel):
    """Response from the Talent Pool Search endpoint."""
    query: str = Field(..., description="The original search query.")
    total_found: int = Field(..., alias="totalFound", description="Total number of matching candidates found.")
    job_posting_id: int | None = Field(None, alias="jobPostingId", description="Job posting filter applied (if any).")
    candidates: list[TalentCandidateResult]

    model_config = {"populate_by_name": True}


# ============================================================
# Endpoints
# ============================================================

@router.post(
    "/retrieval/test",
    response_model=RetrievalTestResponse,
    summary="Test semantic retrieval for a criterion",
    description=(
        "Embeds the criterion text and searches for the most relevant "
        "CV chunks using pgvector cosine similarity. "
        "This endpoint is for testing Phase 4 retrieval."
    ),
)
async def test_retrieval(
    request: RetrievalTestRequest,
    session: AsyncSession = Depends(get_db),
):
    """Test the retrieval pipeline: criterion → embed → similarity search → chunks."""
    try:
        results = await retrieve_for_criterion(
            session=session,
            criterion_text=request.criterion_text,
            application_id=request.application_id,
            top_k=request.top_k,
            chunk_types=request.chunk_types,
        )

        return RetrievalTestResponse(
            application_id=request.application_id,
            criterion_text=request.criterion_text,
            chunks=[
                ChunkResponse(
                    chunk_type=r.chunk_type,
                    content=r.content,
                    similarity=r.similarity,
                    metadata=r.metadata,
                )
                for r in results
            ],
        )
    except Exception as e:
        logger.exception("Retrieval test failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/talent-pool/search",
    response_model=TalentPoolSearchResponse,
    summary="[Task 4.8] Talent Pool Search — tìm ứng viên thông minh trong toàn kho",
    description=(
        "HR nhập mô tả bằng ngôn ngữ tự nhiên (tiếng Việt hoặc tiếng Anh). "
        "Hệ thống tìm kiếm ngữ nghĩa trên TOÀN BỘ kho CV đã được lập chỉ mục, "
        "trả về danh sách ứng viên phù hợp nhất kèm đoạn bằng chứng từ CV. "
        "Hỗ trợ lọc theo job_posting_id và ngưỡng độ tương đồng tối thiểu."
    ),
    tags=["Retrieval (Phase 4)"],
)
async def talent_pool_search(
    request: TalentPoolSearchRequest,
    session: AsyncSession = Depends(get_db),
):
    """Talent Pool Search: query → embed → global pgvector search → ranked candidates."""
    try:
        results = await search_talent_pool(
            session=session,
            query=request.query,
            top_k=request.top_k,
            min_similarity=request.min_similarity,
            job_posting_id=request.job_posting_id,
        )

        return TalentPoolSearchResponse(
            query=request.query,
            total_found=len(results),
            job_posting_id=request.job_posting_id,
            candidates=[
                TalentCandidateResult(
                    candidate_id=r.candidate_id,
                    application_id=r.application_id,
                    top_similarity=round(r.top_similarity, 4),
                    best_chunk_type=r.best_chunk_type,
                    best_chunk_content=r.best_chunk_content,
                    rank=r.rank,
                )
                for r in results
            ],
        )
    except Exception as e:
        logger.exception("Talent pool search failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/chunks/{application_id}",
    response_model=ChunkListResponse,
    summary="Get all chunks for an application",
    description="Returns all CV document chunks stored for a given application ID.",
)
async def get_chunks(
    application_id: int,
    session: AsyncSession = Depends(get_db),
):
    """List all chunks for an application (for debugging/verification)."""
    try:
        db_chunks = await chunk_repository.get_chunks_by_application(
            session=session,
            application_id=application_id,
        )

        return ChunkListResponse(
            application_id=application_id,
            total_chunks=len(db_chunks),
            chunks=[
                ChunkResponse(
                    chunk_type=c.chunk_type,
                    content=c.content,
                    similarity=None,
                    metadata={
                        "db_id": c.id,
                        "has_embedding": c.embedding is not None,
                    },
                )
                for c in db_chunks
            ],
        )
    except Exception as e:
        logger.exception("Get chunks failed")
        raise HTTPException(status_code=500, detail=str(e))

