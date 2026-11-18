"""Chuyển cấu trúc DB của ai-service sang quy trình SSRC (idempotent, chạy mỗi lần khởi động).

`create_all` chỉ tạo bảng còn thiếu, không sửa bảng cũ, nên các thay đổi trên bảng đã có viết bằng SQL ở đây:
- thêm `ai_scores.cv_facts_id`, `ai_scores.jd_facts_id`, bỏ `ai_scores.cv_extraction_id` (kèm khoá ngoại);
- nới cột phiên bản prompt của `ai_jobs` (tên phiên bản SSRC dài hơn 20 ký tự);
- xoá bảng của cách chấm cũ.
Điểm chấm cũ (cách v2, thang 0–4) trong `ai_scores.result` không đọc được theo cấu trúc mới: bản ghi COMPLETED cũ cần
được chấm lại bằng `POST /scores/rescore-all`.
"""

from __future__ import annotations

import logging

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from app.core.database import Base

logger = logging.getLogger(__name__)

MIGRATION_SQL = [
    "ALTER TABLE IF EXISTS ai_scores ADD COLUMN IF NOT EXISTS cv_facts_id BIGINT",
    "ALTER TABLE IF EXISTS ai_scores ADD COLUMN IF NOT EXISTS jd_facts_id BIGINT",
    "ALTER TABLE IF EXISTS ai_scores DROP COLUMN IF EXISTS cv_extraction_id",
    "ALTER TABLE IF EXISTS ai_jobs ALTER COLUMN extraction_prompt_version TYPE VARCHAR(40)",
    "ALTER TABLE IF EXISTS ai_jobs ALTER COLUMN scoring_prompt_version TYPE VARCHAR(40)",
    "DROP TABLE IF EXISTS cv_extractions, jd_extractions, ai_feedback",
]


async def migrate(engine: AsyncEngine) -> None:
    """Tạo bảng mới rồi áp SQL chuyển đổi. Mỗi lệnh chạy riêng để lệnh lỗi không chặn các lệnh sau."""
    from app.models import AIJob, AIScore, CVFactsRecord, JDFactsRecord

    tables = [CVFactsRecord.__table__, JDFactsRecord.__table__, AIJob.__table__, AIScore.__table__]
    async with engine.begin() as conn:
        await conn.run_sync(lambda c: Base.metadata.create_all(c, tables=tables))
    for sql in MIGRATION_SQL:
        try:
            async with engine.begin() as conn:
                await conn.execute(text(sql))
        except Exception as exc:  # noqa: BLE001
            logger.warning("Lệnh chuyển đổi DB lỗi (%s): %s", sql, exc)
