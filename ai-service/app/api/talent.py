"""
API Talent Pool (chỉ Admin / Recruiter).

- POST /talent/search   tìm ứng viên đã đồng ý lưu hồ sơ bằng ngôn ngữ tự nhiên + bộ lọc

Chỉ trả ứng viên đã đồng ý RIÊNG cho Talent Pool (candidate-service quyết định mỗi lần tìm) và đã được lập chỉ mục.
"""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import SYSTEM_HEADERS, CurrentUser, current_user, require_hr, require_internal
from app.core.database import async_session_factory, get_db
from app.core.java_services import (
    JavaServiceError, get_posting, get_skill_names, get_talent_pool_eligible, list_applications,
)
from app.core.vector_schema import vector_enabled
from app.services.embeddings import EmbeddingError
from app.services.jd_embedding import get_or_embed_jd
from app.services.job_info import JobInfo
from app.services.talent_search import (
    ParsedQuery, SearchFilters, embed_search_query, parse_query, search_candidates, similarity_for_candidates,
)

router = APIRouter()


class TalentSearchRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=500, description="Câu tìm kiếm tự nhiên")
    # Bộ lọc chọn trên giao diện: nếu có thì thắng kết quả LLM tách từ câu hỏi.
    min_years: float | None = Field(None, ge=0, le=50, alias="minYears")
    skills: list[str] | None = Field(None, max_length=8)
    pool_status: Literal["IN_POOL", "ALL"] = Field("ALL", alias="poolStatus")
    limit: int = Field(20, ge=1, le=50)

    model_config = {"populate_by_name": True}


def _result_dto(h, c: dict, *, contact: bool = True) -> dict:
    """Một kết quả tìm / gợi ý. `contact=False` (Hiring Manager): không trả email, số điện thoại."""
    return {
        "candidateId": h.candidate_id,
        "fullName": c.get("fullName"),
        "email": c.get("email") if contact else None, "phone": c.get("phone") if contact else None,
        "currentPosition": c.get("currentPosition"), "poolStatus": c.get("poolStatus"),
        "tags": c.get("tags") or [],
        "score": round(h.score, 4),
        "totalYears": h.total_years, "skills": h.skills[:15], "titles": h.titles[:3],
        "matched": {"type": h.matched_type, "text": h.matched_text},
    }


async def _load_job(job_posting_id: int, user: CurrentUser) -> tuple[dict, JobInfo]:
    """Đọc tin bằng danh tính người gọi: recruitment-service tự chặn tin ngoài phạm vi (Hiring Manager chỉ thấy phòng mình)."""
    try:
        posting = await get_posting(job_posting_id, user.headers())
    except JavaServiceError as exc:
        if exc.status_code in (401, 403):
            raise HTTPException(status_code=403, detail="Bạn không có quyền xem tin tuyển dụng này") from exc
        if exc.status_code == 404:
            raise HTTPException(status_code=404, detail="Không tìm thấy tin tuyển dụng") from exc
        raise HTTPException(status_code=502, detail="Không đọc được tin tuyển dụng") from exc
    try:
        skills = await get_skill_names(posting.get("skillIds") or [])
    except JavaServiceError:
        skills = []  # thiếu tên kỹ năng chỉ làm JD kém chi tiết hơn, không đáng lỗi
    return posting, JobInfo.from_posting(posting, skills)


async def _jd_vector(job_posting_id: int, job: JobInfo) -> list[float]:
    try:
        return await get_or_embed_jd(async_session_factory, job, job_posting_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except EmbeddingError as exc:
        raise HTTPException(status_code=503, detail="Dịch vụ embedding tạm thời không dùng được") from exc


async def load_job_and_vector(job_posting_id: int, user: CurrentUser) -> tuple[JobInfo, list[float]]:
    """Đọc tin (theo quyền người gọi) và lấy vector JD. Lỗi → HTTPException."""
    _, job = await _load_job(job_posting_id, user)
    return job, await _jd_vector(job_posting_id, job)


def _parsed_dto(p: ParsedQuery) -> dict:
    return {"semanticQuery": p.semantic_query, "minYears": p.min_years, "skills": p.required_skills}


# [GIẢI THÍCH] Tìm trong kho: (1) LLM tách "3 năm", "Kafka" thành bộ lọc cứng; (2) hỏi candidate-service ai được phép
# xuất hiện (đã đồng ý, chưa xoá); (3) xếp hạng bằng vector; (4) ghép thông tin hiển thị từ candidate-service.
@router.post("/talent/search", summary="Tìm ứng viên trong Talent Pool bằng ngôn ngữ tự nhiên (HR)")
async def search(req: TalentSearchRequest, user: CurrentUser = Depends(current_user),
                 db: AsyncSession = Depends(get_db)) -> dict:
    require_hr(user)
    if not vector_enabled():
        raise HTTPException(status_code=503, detail="Tìm kiếm vector chưa bật (Postgres thiếu pgvector)")

    try:
        eligible = await get_talent_pool_eligible(user.headers(), "IN_POOL" if req.pool_status == "IN_POOL" else None)
    except JavaServiceError as exc:
        raise HTTPException(status_code=502, detail="Không đọc được danh sách ứng viên") from exc
    by_id = {c["id"]: c for c in eligible}

    parsed = await parse_query(req.query)
    min_years = req.min_years if req.min_years is not None else parsed.min_years
    filters = SearchFilters(
        min_years=min_years if min_years and min_years > 0 else None,  # 0 = giao diện gỡ bộ lọc số năm
        skills=[s.strip() for s in req.skills if s.strip()] if req.skills is not None else parsed.required_skills,
    )
    try:
        qvec = await embed_search_query(parsed.semantic_query)
    except EmbeddingError as exc:
        raise HTTPException(status_code=503, detail="Dịch vụ embedding tạm thời không dùng được") from exc

    hits = await search_candidates(db, qvec, list(by_id), filters, req.limit)

    results = [_result_dto(h, by_id[h.candidate_id]) for h in hits]
    return {
        "query": req.query,
        "applied": {"semanticQuery": parsed.semantic_query,
                    "minYears": filters.min_years, "skills": filters.skills},
        "parsed": _parsed_dto(parsed),
        "eligibleTotal": len(by_id),
        "results": results,
    }


# [GIẢI THÍCH] Gợi ý cho một tin: lấy vector của JD, tìm trong kho (đã đồng ý) những người GẦN JD nhất,
# bỏ người đã ứng tuyển tin này. Admin / Recruiter xem đủ; Hiring Manager chỉ gợi ý được cho tin phòng mình
# (recruitment-service chặn tin phòng khác) và không thấy email / số điện thoại.
@router.get("/talent/suggest", summary="Gợi ý ứng viên trong Talent Pool cho một tin tuyển dụng")
async def suggest(
    job_posting_id: int = Query(..., alias="jobPostingId"),
    limit: int = Query(10, ge=1, le=30),
    user: CurrentUser = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_internal(user)
    if not vector_enabled():
        raise HTTPException(status_code=503, detail="Tìm kiếm vector chưa bật (Postgres thiếu pgvector)")
    _, job = await _load_job(job_posting_id, user)
    jd_vector = await _jd_vector(job_posting_id, job)

    try:
        # Danh sách kho đọc bằng danh tính hệ thống (Hiring Manager không được đọc cả kho); quyền đã kiểm ở trên.
        eligible = await get_talent_pool_eligible(SYSTEM_HEADERS)
        applied = {a["candidateId"] for a in await list_applications(job_posting_id, user.headers())}
    except JavaServiceError as exc:
        raise HTTPException(status_code=502, detail="Không đọc được dữ liệu ứng viên") from exc
    by_id = {c["id"]: c for c in eligible if c["id"] not in applied}

    hits = await search_candidates(db, jd_vector, list(by_id), SearchFilters(), limit)
    return {
        "jobPostingId": job_posting_id,
        "eligibleTotal": len(eligible),
        "alreadyApplied": len(eligible) - len(by_id),
        "results": [_result_dto(h, by_id[h.candidate_id], contact=user.is_hr) for h in hits],
    }


# [GIẢI THÍCH] Độ tương đồng CV ↔ JD của MỌI hồ sơ trong một tin (hiện thành cột ở danh sách hồ sơ). Tính lúc gọi từ
# vector đã lưu nên luôn khớp CV/JD mới nhất; chỉ để HIỂN THỊ VÀ SẮP XẾP, không thay điểm AI và không loại hồ sơ nào.
@router.get("/postings/{job_posting_id}/similarity", summary="Độ tương đồng CV-JD của các hồ sơ trong một tin")
async def posting_similarity(
    job_posting_id: int, user: CurrentUser = Depends(current_user), db: AsyncSession = Depends(get_db),
) -> dict:
    require_internal(user)
    if not vector_enabled():
        raise HTTPException(status_code=503, detail="Tìm kiếm vector chưa bật (Postgres thiếu pgvector)")
    _, job = await _load_job(job_posting_id, user)
    jd_vector = await _jd_vector(job_posting_id, job)
    try:
        applications = await list_applications(job_posting_id, user.headers())
    except JavaServiceError as exc:
        raise HTTPException(status_code=502, detail="Không đọc được danh sách hồ sơ") from exc

    sims = await similarity_for_candidates(db, jd_vector, [a["candidateId"] for a in applications])
    items = [{"applicationId": a["id"], "candidateId": a["candidateId"],
              "similarity": round(sims[a["candidateId"]], 4)}
             for a in applications if a["candidateId"] in sims]
    return {"jobPostingId": job_posting_id, "total": len(applications), "indexed": len(items), "items": items}
