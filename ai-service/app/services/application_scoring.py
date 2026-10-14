"""
Chấm điểm một hồ sơ ứng tuyển thật trong hệ thống.

Dùng chung cho:
- worker nghe `application.created` (danh tính SYSTEM, chạy nền);
- HR "Chấm lại" một hồ sơ và "Chấm tất cả hồ sơ của tin" (chuyển tiếp danh tính HR).

Luồng: summary hồ sơ (+ resumeUrl) → tin tuyển dụng → trích xuất CV (lưu DB, dùng lại)
→ chấm (Python thuần + một lời gọi LLM) → lưu `ai_scores` + `ai_jobs` → phát `ai.scoring.completed`.

Bảo đảm:
- Một hồ sơ chỉ được chấm bởi một tiến trình tại một thời điểm: dòng `ai_scores` được "giành" bằng
  INSERT ... ON CONFLICT ... WHERE status <> PROCESSING (hoặc PROCESSING đã quá hạn — tiến trình chết).
- Mọi lỗi (service Java, S3, LLM, dữ liệu) đều kết thúc bằng FAILED kèm lý do, không bao giờ kẹt
  ở PROCESSING; lỗi thì xoá điểm cũ để không hiện "điểm cũ + FAILED".
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta

from sqlalchemy import or_, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.config import get_settings
from app.core.database import async_session_factory
from app.core.java_services import JavaServiceError, get_application_summary, get_posting
from app.core.llm_client import LLMError, LLMManager, get_llm_manager
from app.models import AIJob, AIScore
from app.services.cv_extraction_store import COMPLETED as EXTRACTION_COMPLETED
from app.services.cv_extraction_store import CVUnavailableError, get_or_extract
from app.services.experience import today_in
from app.services.scoring.engine import (
    NoApplicableDimensionError,
    ScoringOptions,
    Thresholds,
    score_candidate,
)
from app.services.scoring.prompt import JobInfo

logger = logging.getLogger(__name__)

AI_SCORING_COMPLETED_ROUTING_KEY = "ai.scoring.completed"

PENDING = "PENDING"
PROCESSING = "PROCESSING"
COMPLETED = "COMPLETED"
FAILED = "FAILED"

# Quá thời gian này mà còn PROCESSING thì coi như tiến trình đã chết, cho phép chấm lại.
STALE_PROCESSING = timedelta(minutes=10)


class ScoringInProgressError(Exception):
    """Hồ sơ đang được một tiến trình khác chấm."""


class ScoringFailure(Exception):
    """Lỗi có thông điệp dành cho HR (ghi vào ai_scores.error_message)."""


def scoring_options() -> ScoringOptions:
    s = get_settings()
    return ScoringOptions(thresholds=Thresholds(s.scoring_tier_good_min, s.scoring_tier_potential_min))


async def _claim(session: AsyncSession, application_id: int, job_posting_id: int, candidate_id: int) -> int:
    now = datetime.utcnow()
    stmt = insert(AIScore).values(
        application_id=application_id, job_posting_id=job_posting_id, candidate_id=candidate_id,
        status=PROCESSING, created_at=now, updated_at=now,
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=[AIScore.application_id],
        set_={"status": PROCESSING, "job_posting_id": job_posting_id, "candidate_id": candidate_id,
              "updated_at": now},
        where=or_(AIScore.status != PROCESSING, AIScore.updated_at < now - STALE_PROCESSING),
    ).returning(AIScore.id)
    score_id = (await session.execute(stmt)).scalar_one_or_none()
    await session.commit()
    if score_id is None:
        raise ScoringInProgressError(f"Hồ sơ {application_id} đang được chấm")
    return score_id


async def mark_pending(session_factory: async_sessionmaker[AsyncSession], applications: list[dict]) -> None:
    """Chấm bù: đánh dấu PENDING cho hồ sơ chưa có điểm / FAILED (để giao diện hiện "đang chờ")."""
    if not applications:
        return
    now = datetime.utcnow()
    async with session_factory() as session:
        for app in applications:
            stmt = insert(AIScore).values(
                application_id=app["id"], job_posting_id=app["jobPostingId"], candidate_id=app["candidateId"],
                status=PENDING, created_at=now, updated_at=now,
            ).on_conflict_do_update(
                index_elements=[AIScore.application_id],
                set_={"status": PENDING, "updated_at": now},
                where=AIScore.status != COMPLETED,
            )
            await session.execute(stmt)
        await session.commit()


def _failure_message(exc: Exception) -> str:
    if isinstance(exc, ScoringFailure):
        return str(exc)
    if isinstance(exc, JavaServiceError):
        return f"Không đọc được thông tin hồ sơ / tin tuyển dụng: {exc}"
    if isinstance(exc, CVUnavailableError):
        return f"Không tải được file CV: {exc}"
    if isinstance(exc, LLMError):
        return f"Lỗi gọi AI (có thể do quá tải hoặc hết hạn mức): {exc}"
    if isinstance(exc, NoApplicableDimensionError):
        return str(exc)
    return f"Lỗi không xác định khi chấm điểm: {type(exc).__name__}: {exc}"


async def _publish_completed(score: AIScore) -> None:
    from app.core.rabbitmq import rabbitmq_manager
    try:
        await rabbitmq_manager.publish(AI_SCORING_COMPLETED_ROUTING_KEY, json.dumps({
            "applicationId": score.application_id,
            "jobPostingId": score.job_posting_id,
            "status": score.status,
            "totalScore": float(score.total_score) if score.total_score is not None else None,
            "tier": score.tier,
        }).encode())
    except Exception as exc:  # noqa: BLE001 — thông báo phụ trợ, không làm hỏng việc chấm
        logger.warning("Không phát được ai.scoring.completed cho hồ sơ %s: %s", score.application_id, exc)


async def score_application(
    application_id: int,
    headers: dict[str, str] | None = None,
    *,
    session_factory: async_sessionmaker[AsyncSession] = async_session_factory,
    manager: LLMManager | None = None,
) -> AIScore:
    """Chấm (hoặc chấm lại) một hồ sơ. `headers=None` = chạy nền với danh tính SYSTEM.

    Raises:
        JavaServiceError: không đọc được summary hồ sơ (chưa có gì để ghi lại).
        ScoringInProgressError: hồ sơ đang được tiến trình khác chấm.
    """
    started = datetime.utcnow()
    manager = manager or get_llm_manager()
    summary = await get_application_summary(application_id, headers)
    job_posting_id, candidate_id = summary["jobPostingId"], summary["candidateId"]

    async with session_factory() as session:
        score_id = await _claim(session, application_id, job_posting_id, candidate_id)
        job = AIJob(application_id=application_id, candidate_id=candidate_id, job_posting_id=job_posting_id,
                    status=PROCESSING, current_stage="FETCH", started_at=started)
        session.add(job)
        await session.commit()

        values: dict
        try:
            resume_url = summary.get("resumeUrl")
            if not resume_url:
                raise ScoringFailure("Hồ sơ không có CV đính kèm")
            posting = await get_posting(job_posting_id, headers)

            job.current_stage = "EXTRACT"
            extraction = await get_or_extract(session_factory, resume_url, candidate_id, manager=manager)
            job.extraction_model = extraction.model
            job.extraction_prompt_version = extraction.prompt_version
            job.ocr_used = bool((extraction.text_metadata or {}).get("ocr_used"))
            job.injection_detected = bool((extraction.text_metadata or {}).get("injection_detected"))
            if extraction.status != EXTRACTION_COMPLETED:
                raise ScoringFailure(f"Không trích xuất được CV: {extraction.error_message}")

            job.current_stage = "SCORE"
            names = [summary.get("candidateName") or ""]
            result, provenance = await score_candidate(
                JobInfo.from_posting(posting),
                extraction.result["extracted_cv"],
                manager,
                today_in(get_settings().app_timezone),
                candidate_names=names,
                options=scoring_options(),
                extraction_id=extraction.id,
                extraction_prompt_version=extraction.prompt_version,
            )
            values = {
                "status": COMPLETED, "cv_extraction_id": extraction.id, "total_score": result.total_score,
                "tier": result.tier.value, "result": result.model_dump(mode="json"),
                "provenance": provenance.model_dump(mode="json"), "error_message": None,
                "scored_at": datetime.utcnow(),
            }
            job.status = COMPLETED
            job.scoring_model = provenance.model
            job.scoring_prompt_version = provenance.prompt_version
            job.total_input_tokens = provenance.input_tokens
            job.total_output_tokens = provenance.output_tokens
            job.estimated_cost_usd = round(provenance.estimated_cost_usd, 4)
        except Exception as exc:  # noqa: BLE001 — mọi lỗi đều phải kết thúc bằng FAILED
            message = _failure_message(exc)
            log = logger.warning if isinstance(exc, (ScoringFailure, JavaServiceError, CVUnavailableError)) \
                else logger.exception
            log("Chấm hồ sơ %s thất bại: %s", application_id, message)
            values = {
                "status": FAILED, "total_score": None, "tier": None, "result": None, "provenance": None,
                "error_message": message[:2000], "scored_at": None,
            }
            job.status = FAILED
            job.error_message = message[:2000]

        job.completed_at = datetime.utcnow()
        job.total_latency_ms = int((job.completed_at - started).total_seconds() * 1000)
        await session.execute(
            update(AIScore).where(AIScore.id == score_id)
            .values(**values, ai_job_id=job.id, updated_at=datetime.utcnow())
        )
        await session.commit()
        score = (await session.execute(select(AIScore).where(AIScore.id == score_id))).scalar_one()
        await session.refresh(score)

    await _publish_completed(score)
    return score
