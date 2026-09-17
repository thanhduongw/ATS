"""
API endpoints for AI-powered JD Generation & Benchmark (Phase 3).

Endpoints:
1. POST /jd/generate         — Generate JD + benchmark from basic input (sync, < 10s target)
2. POST /benchmark/generate  — Generate benchmark criteria from existing JD text
"""

import logging

from fastapi import APIRouter

from app.schemas.jd_generation import (
    BenchmarkGenerateRequest,
    BenchmarkGenerateResponse,
    JDGenerateRequest,
    JDGenerateResponse,
)
from app.services.jd_generation_engine import generate_benchmark, generate_jd

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/jd/generate",
    response_model=JDGenerateResponse,
    summary="Sinh mô tả công việc (JD) + tiêu chí đánh giá từ thông tin cơ bản",
    description=(
        "Nhận input cơ bản (tiêu đề vị trí, cấp bậc, kỹ năng, kinh nghiệm, ghi chú) "
        "và sử dụng AI để sinh ra JD hoàn chỉnh (overview, responsibilities, requirements, benefits) "
        "kèm bộ tiêu chí đánh giá ứng viên (benchmark criteria). "
        "Target response time < 10 giây."
    ),
)
async def api_generate_jd(request: JDGenerateRequest) -> JDGenerateResponse:
    """Generate JD + benchmark criteria from basic input."""
    logger.info(
        "JD generation request: title='%s' level=%s skills=%s",
        request.title,
        request.level,
        request.skills,
    )
    return await generate_jd(request)


@router.post(
    "/benchmark/generate",
    response_model=BenchmarkGenerateResponse,
    summary="Sinh tiêu chí đánh giá ứng viên từ JD có sẵn",
    description=(
        "Nhận nội dung JD đầy đủ (mô tả + yêu cầu + quyền lợi) "
        "và sinh ra bộ 4-5 tiêu chí đánh giá ứng viên với trọng số (tổng = 100%). "
        "Dùng cho trường hợp JD đã viết sẵn, chỉ cần sinh benchmark."
    ),
)
async def api_generate_benchmark(
    request: BenchmarkGenerateRequest,
) -> BenchmarkGenerateResponse:
    """Generate benchmark criteria from existing JD text."""
    logger.info(
        "Benchmark generation request: jd_length=%d chars",
        len(request.job_description),
    )
    return await generate_benchmark(request)
