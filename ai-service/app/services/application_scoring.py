"""
Chấm điểm một hồ sơ ứng tuyển thật trong hệ thống.

Dùng chung cho:
- worker nghe `application.created` (danh tính SYSTEM, chạy nền);
- HR "Chấm lại" một hồ sơ và "Chấm tất cả hồ sơ của tin" (chuyển tiếp danh tính HR).

Luồng: summary hồ sơ (+ resumeUrl) → tin tuyển dụng → trích xuất CV (lưu DB, dùng lại)
→ chấm (Python thuần + một lời gọi LLM) → lưu `ai_scores` + `ai_jobs` → phát `ai.scoring.completed`.
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
from app.schemas.jd_extraction import ExtractedJD
from app.services.jd_extraction_store import COMPLETED as JD_EXTRACTION_COMPLETED
from app.services.jd_extraction_store import get_or_extract_jd
from app.services.scoring.aggregate import Thresholds
from app.services.scoring.engine import score_candidate
from app.services.scoring.prompt import JobInfo

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
    """Lỗi có thông điệp dành cho HR (ghi vào ai_scores.error_message)."""


# [GIẢI THÍCH] Đọc ngưỡng xếp loại T và δ (khởi đầu 62,5 và 5) từ cấu hình (.env / config.py) mỗi lần chấm.
def scoring_options() -> Thresholds:
    s = get_settings()
    return Thresholds(threshold=s.scoring_threshold, uncertainty=s.scoring_uncertainty)


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
async def mark_pending(session_factory: async_sessionmaker[AsyncSession], applications: list[dict]) -> None:
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
                where=AIScore.status != COMPLETED,
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
def _failure_message(exc: Exception) -> str:
    if isinstance(exc, ScoringFailure):
        return str(exc)
    if isinstance(exc, JavaServiceError):
        return f"Không đọc được thông tin hồ sơ / tin tuyển dụng: {exc}"
    if isinstance(exc, CVUnavailableError):
        return f"Không tải được file CV: {exc}"
    if isinstance(exc, LLMError):
        return f"Lỗi gọi AI (có thể do quá tải hoặc hết hạn mức): {exc}"
    return f"Lỗi không xác định khi chấm điểm: {type(exc).__name__}: {exc}"


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
            "updatedAt": score.updated_at.isoformat() if score.updated_at else None,
        }).encode())
    except Exception as exc:  # noqa: BLE001 — thông báo phụ trợ, không làm hỏng việc chấm
        logger.warning("Không phát được ai.scoring.completed cho hồ sơ %s: %s", score.application_id, exc)


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

            # ----- TRÍCH XUẤT JD (Bước 1) -----
            # get_or_extract_jd: cùng nội dung JD đã tách rồi thì lấy từ DB (mọi CV của tin dùng chung một danh sách
            # yêu cầu); HR sửa JD thì nội dung đổi -> tách lại. Lỗi LLM được lưu FAILED trong jd_extractions.
            job.current_stage = "JD_EXTRACT"
            job_info = JobInfo.from_posting(posting)
            jd_row = await get_or_extract_jd(session_factory, job_info, job_posting_id, manager=manager)
            if jd_row.status != JD_EXTRACTION_COMPLETED:
                raise ScoringFailure(f"Không trích xuất được JD: {jd_row.error_message}")
            jd = ExtractedJD.model_validate(jd_row.result)

            # ----- TRÍCH XUẤT CV -----
            # get_or_extract: CV này đã trích xuất rồi thì lấy từ DB (không gọi AI); chưa thì tải S3 -> đọc chữ -> gọi Gemini -> lưu.
            job.current_stage = "EXTRACT"
            extraction = await get_or_extract(session_factory, resume_url, candidate_id, manager=manager)
            job.extraction_model = extraction.model
            job.extraction_prompt_version = extraction.prompt_version
            # Ghi vào nhật ký: CV có phải đọc bằng OCR (ảnh scan) không, có bị nghi chèn lệnh không.
            job.ocr_used = bool((extraction.text_metadata or {}).get("ocr_used"))
            job.injection_detected = bool((extraction.text_metadata or {}).get("injection_detected"))
            # Trích xuất thất bại thì dừng, không chấm trên dữ liệu hỏng.
            if extraction.status != EXTRACTION_COMPLETED:
                raise ScoringFailure(f"Không trích xuất được CV: {extraction.error_message}")

            # ----- CHẤM (Bước 3–6) -----
            # names: tên ứng viên, KHÔNG gửi cho AI mà dùng để tìm và CHE tên trong đoạn văn (chấm mù).
            job.current_stage = "SCORE"
            names = [summary.get("candidateName") or ""]
            # Đưa vào danh sách yêu cầu JD + KẾT QUẢ TRÍCH XUẤT CV (không phải file gốc). Trả về:
            #   result = điểm, xếp loại, lý do, 5 tiêu chí, yêu cầu bắt buộc;
            #   provenance = model, phiên bản prompt, bản trích xuất CV và JD, token, chi phí.
            # Không tính được điểm (không tiêu chí nào chấm được) thì vẫn COMPLETED với xếp loại Chưa phân loại.
            result, provenance = await score_candidate(
                jd,
                extraction.result["extracted_cv"],
                manager,
                today_in(get_settings().app_timezone),
                candidate_names=names,
                thresholds=scoring_options(),
                extraction_id=extraction.id,
                extraction_prompt_version=extraction.prompt_version,
                jd_extraction_id=jd_row.id,
                jd_extraction_prompt_version=jd_row.prompt_version,
            )
            values = {
                "status": COMPLETED, "cv_extraction_id": extraction.id, "total_score": result.total_score,
                "tier": result.tier.value, "result": result.model_dump(mode="json"),
                "provenance": provenance.model_dump(mode="json"), "error_message": None,
                "scored_at": datetime.utcnow(),
            }
            # Thành công: values ở trên là các giá trị sẽ ghi vào bảng ai_scores; ghi thêm thông tin vào nhật ký.
            job.status = COMPLETED
            job.scoring_model = provenance.model
            job.scoring_prompt_version = provenance.prompt_version
            job.total_input_tokens = provenance.input_tokens
            job.total_output_tokens = provenance.output_tokens
            job.estimated_cost_usd = round(provenance.estimated_cost_usd, 4)
        # Bất kỳ lỗi nào ở trên: ghi FAILED + lý do tiếng Việt, xoá điểm cũ (total_score = None).
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
