"""
Chấm điểm một hồ sơ ứng tuyển thật trong hệ thống.

Dùng chung cho:
- worker nghe `application.created` (danh tính SYSTEM, chạy nền);
- HR "Chấm lại" một hồ sơ, "Chấm tất cả hồ sơ của tin"; Admin "Chấm lại toàn bộ" (chuyển tiếp danh tính người bấm).

Luồng (theo nghiên cứu SSRC 2026, docs/KE_HOACH_AI_THEO_RESEARCH.md):
summary hồ sơ (+ resumeUrl) → tin tuyển dụng → JDFacts (lưu DB, dùng lại) → tải CV, đọc chữ, che PII → CVFacts (lưu DB,
dùng lại) → chính sách chứng chỉ suy từ JD → prompt B → 4 điểm 1–5 → code tính điểm 0–100 và xếp loại
→ lưu `ai_scores` + `ai_jobs` → phát `ai.scoring.completed`.
Sự kiện được phát ở mọi lần đổi trạng thái (PENDING / PROCESSING / COMPLETED / FAILED) để application-service
giữ bản sao điểm cho danh sách; `updatedAt` giúp bên nhận bỏ qua sự kiện đến muộn.

Bảo đảm:
- Một hồ sơ chỉ được chấm bởi một tiến trình tại một thời điểm: dòng `ai_scores` được "giành" bằng
  INSERT ... ON CONFLICT ... WHERE status <> PROCESSING (hoặc PROCESSING đã quá hạn — tiến trình chết).
- Mọi lỗi (service Java, S3, LLM, dữ liệu) đều kết thúc bằng FAILED kèm lý do, không bao giờ kẹt
  ở PROCESSING; lỗi thì xoá điểm cũ để không hiện "điểm cũ + FAILED".
"""

from __future__ import annotations

import json
import logging
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import or_, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.config import get_settings
from app.core.database import async_session_factory
from app.core.java_services import JavaServiceError, get_application_summary, get_posting, get_skill_names
from app.core.llm_client import LLMError, LLMManager, get_llm_manager
from app.core.public_errors import AI_BUSY, CITATION_MESSAGE, extraction_error_message, is_ai_overload
from app.models import AIJob, AIScore
from app.schemas.ssrc import CVFacts, JDFacts, ScoringProvenance
from app.services.facts_store import COMPLETED as FACTS_COMPLETED
from app.services.facts_store import CVUnavailableError, get_or_extract_cv, get_or_extract_jd
from app.services.job_info import JobInfo
from app.services.prompts.ssrc import PROMPT_B_VERSION, PROMPT_VERSIONS, prompt_b_hash
from app.services.scoring_ssrc import Thresholds, build_result, cert_policy_from_jd
from app.services.ssrc_pipeline import CitationError, InvalidOutputError, score_four

logger = logging.getLogger(__name__)

AI_SCORING_COMPLETED_ROUTING_KEY = "ai.scoring.completed"

PENDING = "PENDING"
PROCESSING = "PROCESSING"
COMPLETED = "COMPLETED"
FAILED = "FAILED"

# Quá thời gian này mà còn PROCESSING thì coi như tiến trình đã chết, cho phép chấm lại.
# [GIẢI THÍCH] Nếu một hồ sơ ở trạng thái PROCESSING quá 10 phút thì coi như tiến trình chấm đã chết
# (vd ai-service bị tắt giữa chừng) -> cho phép chấm lại.
STALE_PROCESSING = timedelta(minutes=10)


# [GIẢI THÍCH] Lỗi "hồ sơ đang được chấm ở nơi khác" -> API trả 409 cho người bấm sau.
class ScoringInProgressError(Exception):
    """Hồ sơ đang được một tiến trình khác chấm."""


# [GIẢI THÍCH] Lỗi nghiệp vụ có câu thông báo cho HR, vd "Hồ sơ không có CV đính kèm".
class ScoringFailure(Exception):
    """Lỗi có thông điệp dành cho HR (ghi vào ai_scores.error_message).

    `detail` = lỗi gốc (thường là tiếng Anh của Gemini), chỉ ghi log và ai_jobs.error_message.
    """

    def __init__(self, message: str, detail: str | None = None):
        super().__init__(message)
        self.detail = detail


# Ngưỡng xếp loại đọc từ cấu hình (.env / config.py) mỗi lần chấm.
def scoring_options() -> Thresholds:
    s = get_settings()
    return Thresholds(fit=s.scoring_fit_threshold, not_fit=s.scoring_not_fit_threshold)


def _today(tz_name: str) -> date:
    return datetime.now(ZoneInfo(tz_name)).date()


# [GIẢI THÍCH] "Giành quyền chấm" một hồ sơ bằng MỘT câu SQL:
#   INSERT ... ON CONFLICT (application_id) DO UPDATE ... WHERE status <> PROCESSING (hoặc đã quá 10 phút)
# - Chưa có dòng -> thêm mới với PROCESSING.
# - Đã có dòng và không ai đang chấm -> cập nhật thành PROCESSING.
# - Đang có người chấm -> câu lệnh không có tác dụng -> trả None -> ném ScoringInProgressError.
# Vì là một câu lệnh nên database đảm bảo hai người bấm cùng lúc thì chỉ một người thắng.
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


# [GIẢI THÍCH] Dùng cho nút "AI chấm hồ sơ của tin": đánh dấu PENDING (đang chờ) cho các hồ sơ chưa có điểm
# hoặc chấm lỗi, để giao diện hiện "Chờ chấm" ngay. Hồ sơ đã COMPLETED thì giữ nguyên (điều kiện where).
# `include_completed=True` (Admin "chấm lại toàn bộ"): đánh dấu cả hồ sơ đã COMPLETED, trừ hồ sơ đang PROCESSING.
async def mark_pending(session_factory: async_sessionmaker[AsyncSession], applications: list[dict],
                       *, include_completed: bool = False) -> None:
    """Chấm bù: đánh dấu PENDING cho hồ sơ chưa có điểm / FAILED (để giao diện hiện "đang chờ")."""
    if not applications:
        return
    now = datetime.utcnow()
    marked = []
    async with session_factory() as session:
        for app in applications:
            stmt = insert(AIScore).values(
                application_id=app["id"], job_posting_id=app["jobPostingId"], candidate_id=app["candidateId"],
                status=PENDING, created_at=now, updated_at=now,
            ).on_conflict_do_update(
                index_elements=[AIScore.application_id],
                set_={"status": PENDING, "updated_at": now},
                where=(AIScore.status != PROCESSING) if include_completed else (AIScore.status != COMPLETED),
            ).returning(AIScore.application_id, AIScore.job_posting_id, AIScore.status,
                        AIScore.total_score, AIScore.tier, AIScore.updated_at)
            row = (await session.execute(stmt)).one_or_none()
            if row is not None:
                marked.append(row)
        await session.commit()
    for row in marked:
        await _publish_status(row)


# [GIẢI THÍCH] Đổi từng loại lỗi kỹ thuật thành một câu tiếng Việt để HR đọc trên thẻ AI.
# isinstance(exc, X) = "lỗi này có thuộc loại X không" (giống instanceof của Java).
# Trả (câu cho HR, chi tiết kỹ thuật): câu cho HR không chép lỗi gốc của Gemini / service khác (tiếng Anh, mã HTTP,
# JSON); chi tiết kỹ thuật chỉ ghi log và ai_jobs.error_message.
def _failure_message(exc: Exception) -> tuple[str, str]:
    if isinstance(exc, ScoringFailure):
        return str(exc), (f"{exc} | {exc.detail}" if exc.detail else str(exc))
    if isinstance(exc, JavaServiceError):
        return ("Không đọc được thông tin hồ sơ hoặc tin tuyển dụng, vui lòng chấm lại sau ít phút.",
                f"JavaServiceError: {exc}")
    if isinstance(exc, CVUnavailableError):
        return "Không tải được file CV của hồ sơ, vui lòng kiểm tra CV rồi chấm lại.", f"CVUnavailableError: {exc}"
    if isinstance(exc, CitationError):
        return CITATION_MESSAGE, f"CitationError: {exc}"
    if isinstance(exc, InvalidOutputError):
        return "AI trả kết quả không hợp lệ, vui lòng chấm lại.", f"InvalidOutputError: {exc}"
    if isinstance(exc, LLMError):
        return f"Lỗi gọi AI: {AI_BUSY}.", f"LLMError: {exc}"
    return "Lỗi không xác định khi chấm điểm, vui lòng chấm lại.", f"{type(exc).__name__}: {exc}"


# [GIẢI THÍCH] Tên kỹ năng HR chọn cho tin (đưa vào JD để AI trích xuất thành yêu cầu bắt buộc).
# masterdata-service lỗi -> ghi cảnh báo và chấm tiếp không có danh sách kỹ năng, không làm hỏng cả lượt chấm.
async def _posting_skill_names(posting: dict) -> list[str]:
    try:
        return await get_skill_names(posting.get("skillIds") or [])
    except JavaServiceError as exc:
        logger.warning("Không lấy được tên kỹ năng của tin %s: %s", posting.get("id"), exc)
        return []


# [GIẢI THÍCH] Gửi sự kiện ai.scoring.completed lên RabbitMQ mỗi khi trạng thái chấm thay đổi
# (PENDING / PROCESSING / COMPLETED / FAILED). application-service nghe sự kiện này để chép điểm lên hồ sơ.
# updatedAt = thời điểm đổi trạng thái, giúp bên nhận bỏ qua sự kiện đến muộn.
# Gửi lỗi thì chỉ ghi cảnh báo, không làm hỏng việc chấm.
async def _publish_status(score) -> None:
    """`score`: AIScore hoặc dòng có cùng tên cột."""
    from app.core.rabbitmq import rabbitmq_manager
    try:
        await rabbitmq_manager.publish(AI_SCORING_COMPLETED_ROUTING_KEY, json.dumps({
            "applicationId": score.application_id,
            "jobPostingId": score.job_posting_id,
            "status": score.status,
            "totalScore": float(score.total_score) if score.total_score is not None else None,
            "tier": score.tier,
            "injectionDetected": bool((getattr(score, "result", None) or {}).get("injection_detected")),
            "updatedAt": score.updated_at.isoformat() if score.updated_at else None,
        }).encode())
    except Exception as exc:  # noqa: BLE001 — thông báo phụ trợ, không làm hỏng việc chấm
        logger.warning("Không phát được ai.scoring.completed cho hồ sơ %s: %s", score.application_id, exc)


# [GIẢI THÍCH] Ứng viên xoá dữ liệu cá nhân: gỡ dữ kiện CV khỏi các dòng điểm, xoá phần chi tiết kết quả
# (dẫn chứng trích nguyên văn từ CV) rồi xoá `cv_facts` của ứng viên. Giữ total_score / tier để thống kê không đổi.
async def purge_candidate_data(
    candidate_id: int,
    *,
    session_factory: async_sessionmaker[AsyncSession] = async_session_factory,
) -> int:
    from sqlalchemy import delete
    from app.models import CVFactsRecord
    async with session_factory() as session:
        await session.execute(
            update(AIScore).where(AIScore.candidate_id == candidate_id)
            .values(cv_facts_id=None, result=None, provenance=None, error_message=None)
        )
        removed = await session.execute(delete(CVFactsRecord).where(CVFactsRecord.candidate_id == candidate_id))
        await session.commit()
        return removed.rowcount or 0


# [GIẢI THÍCH] HÀM CHÍNH: chấm một hồ sơ từ đầu đến cuối. Cả 3 lối vào đều gọi hàm này:
#   (1) worker khi có hồ sơ mới, (2) nút Chấm lại, (3) nút AI chấm hồ sơ của tin.
# Thứ tự: lấy thông tin hồ sơ -> giành quyền chấm -> lấy tin tuyển dụng -> trích xuất JD (dùng lại nếu đã có)
# -> trích xuất CV (dùng lại nếu đã có) -> chấm (một lời gọi LLM + quy tắc code) -> lưu DB -> phát sự kiện.
# headers = danh tính người bấm (HR); None = chạy nền với danh tính SYSTEM.
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
    # Hỏi application-service: hồ sơ này thuộc tin nào, ứng viên nào, link CV ở đâu.
    summary = await get_application_summary(application_id, headers)
    job_posting_id, candidate_id = summary["jobPostingId"], summary["candidateId"]

    async with session_factory() as session:
        # Giành quyền chấm (PROCESSING), rồi báo "đang chấm" cho application-service.
        score_id = await _claim(session, application_id, job_posting_id, candidate_id)
        await _publish_status(await session.get(AIScore, score_id))
        # Tạo một dòng nhật ký trong bảng ai_jobs: ghi lại bước đang làm, thời gian, token, chi phí.
        job = AIJob(application_id=application_id, candidate_id=candidate_id, job_posting_id=job_posting_id,
                    status=PROCESSING, current_stage="FETCH", started_at=started)
        session.add(job)
        await session.commit()

        values: dict
        try:
            # Mọi bước bên dưới nằm trong try: bước nào lỗi cũng nhảy xuống except và ghi FAILED.
            resume_url = summary.get("resumeUrl")
            if not resume_url:
                raise ScoringFailure("Hồ sơ không có CV đính kèm")
            # Hỏi recruitment-service: nội dung tin tuyển dụng (tiêu đề, mô tả, yêu cầu).
            posting = await get_posting(job_posting_id, headers)

            # ----- TRÍCH XUẤT JD -----
            # Cùng nội dung JD đã trích xuất thì lấy từ DB (mọi CV của tin dùng chung một danh sách yêu cầu);
            # HR sửa JD thì nội dung đổi -> trích xuất lại. Lỗi được lưu FAILED trong jd_facts.
            job.current_stage = "JD_EXTRACT"
            job_info = JobInfo.from_posting(posting, await _posting_skill_names(posting))
            jd_row = await get_or_extract_jd(session_factory, job_info, job_posting_id, manager=manager)
            if jd_row.status != FACTS_COMPLETED:
                if jd_row.error_code == "CITATION_MISMATCH":
                    raise ScoringFailure(CITATION_MESSAGE, detail=jd_row.error_message)
                reason = AI_BUSY if is_ai_overload(jd_row.error_message) else "AI trả kết quả không hợp lệ, vui lòng chấm lại"
                raise ScoringFailure(f"Không trích xuất được JD: {reason}.", detail=jd_row.error_message)
            jd = JDFacts.model_validate(jd_row.result)

            # ----- TRÍCH XUẤT CV -----
            # CV này đã trích xuất rồi thì lấy từ DB (không gọi AI); chưa thì tải S3 -> đọc chữ -> che PII -> Gemini -> lưu.
            job.current_stage = "EXTRACT"
            cv_row = await get_or_extract_cv(session_factory, resume_url, candidate_id, manager=manager)
            job.extraction_model = cv_row.model
            job.extraction_prompt_version = cv_row.prompt_version
            meta = cv_row.text_metadata or {}
            job.ocr_used = bool(meta.get("ocr_used"))
            job.injection_detected = bool(meta.get("injection_detected"))
            if meta.get("pii_remaining"):
                job.guardrail_warnings = {"pii_remaining": meta["pii_remaining"]}
            if cv_row.status != FACTS_COMPLETED:
                raise ScoringFailure(extraction_error_message(cv_row.error_code, cv_row.error_message),
                                     detail=cv_row.error_message)
            cv = CVFacts.model_validate(cv_row.result)

            # ----- CHẤM (prompt B) -----
            # Chính sách chứng chỉ do code suy từ JD. AI chỉ cho điểm 1–5 từng tiêu chí; điểm 0–100 và xếp loại do code tính.
            job.current_stage = "SCORE"
            policy = cert_policy_from_jd(jd)
            out, stats = await score_four(cv, jd, policy, manager)
            result = build_result(
                out, policy, scoring_options(), scored_on=_today(get_settings().app_timezone),
                injection_detected=bool(meta.get("injection_detected")),
                injection_patterns=[str(p) for p in (meta.get("injection_patterns") or [])])
            provenance = ScoringProvenance(
                model=stats.model, prompt_versions=PROMPT_VERSIONS, prompt_hash=prompt_b_hash(),
                cv_facts_id=cv_row.id, jd_facts_id=jd_row.id, input_tokens=stats.input_tokens,
                output_tokens=stats.output_tokens, estimated_cost_usd=round(stats.estimated_cost_usd, 6),
                latency_ms=stats.latency_ms, retries=stats.retries, validation_retries=stats.validation_retries)
            values = {
                "status": COMPLETED, "cv_facts_id": cv_row.id, "jd_facts_id": jd_row.id,
                "total_score": result.total_score, "tier": result.tier.value,
                "result": result.model_dump(mode="json"), "provenance": provenance.model_dump(mode="json"),
                "error_message": None, "scored_at": datetime.utcnow(),
            }
            # Thành công: ghi nhật ký ai_jobs; token/chi phí gồm cả bước trích xuất nếu lần này có gọi AI mới.
            job.status = COMPLETED
            job.scoring_model = provenance.model
            job.scoring_prompt_version = PROMPT_B_VERSION
            in_tok, out_tok, cost = provenance.input_tokens, provenance.output_tokens, provenance.estimated_cost_usd
            for row in (jd_row, cv_row):
                if row.updated_at and row.updated_at >= started and row.provenance:
                    in_tok += row.provenance.get("input_tokens", 0)
                    out_tok += row.provenance.get("output_tokens", 0)
                    cost += row.provenance.get("estimated_cost_usd", 0.0)
            job.total_input_tokens, job.total_output_tokens = in_tok, out_tok
            job.estimated_cost_usd = round(cost, 4)
        # Bất kỳ lỗi nào ở trên: ghi FAILED + lý do tiếng Việt, xoá điểm cũ (total_score = None).
        except Exception as exc:  # noqa: BLE001 — mọi lỗi đều phải kết thúc bằng FAILED
            message, detail = _failure_message(exc)
            log = logger.warning if isinstance(exc, (ScoringFailure, JavaServiceError, CVUnavailableError)) \
                else logger.exception
            log("Chấm hồ sơ %s thất bại: %s", application_id, detail)
            values = {
                "status": FAILED, "total_score": None, "tier": None, "result": None, "provenance": None,
                "error_message": message[:2000], "scored_at": None,
            }
            job.status = FAILED
            job.error_message = detail[:2000]

        # Ghi kết quả (thành công hay thất bại) vào bảng ai_scores, lưu thời gian chạy vào nhật ký.
        job.completed_at = datetime.utcnow()
        job.total_latency_ms = int((job.completed_at - started).total_seconds() * 1000)
        await session.execute(
            update(AIScore).where(AIScore.id == score_id)
            .values(**values, ai_job_id=job.id, updated_at=datetime.utcnow())
        )
        await session.commit()
        score = (await session.execute(select(AIScore).where(AIScore.id == score_id))).scalar_one()
        await session.refresh(score)

    # Báo kết quả cuối cho application-service qua RabbitMQ.
    await _publish_status(score)
    return score
