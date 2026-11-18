"""
Schema tìm kiếm vector (pgvector) của ai-service — tạo/nâng cấp lúc khởi động, an toàn khi chạy lại.

`init-databases.sql` chỉ chạy khi volume Postgres còn trống, còn `create_all` không sửa bảng đã có,
nên bảng vector dùng DDL idempotent riêng (CREATE ... IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).

Postgres không có extension `vector` (image không phải pgvector/pgvector) thì chỉ ghi cảnh báo và
`vector_enabled()` trả False: các tính năng tìm kiếm tự tắt, chấm điểm CV vẫn chạy bình thường.
"""

from __future__ import annotations

import logging

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

logger = logging.getLogger(__name__)

_enabled = False


def vector_enabled() -> bool:
    return _enabled


def _statements(dim: int) -> list[str]:
    return [
        "CREATE EXTENSION IF NOT EXISTS vector",
        # Chunk CV: theo ứng viên + file CV (file_hash), không còn gắn cứng với một hồ sơ ứng tuyển.
        """CREATE TABLE IF NOT EXISTS cv_document_chunks (
            id BIGSERIAL PRIMARY KEY,
            application_id BIGINT,
            candidate_id BIGINT NOT NULL,
            file_hash VARCHAR(64),
            chunk_type VARCHAR(50) NOT NULL,
            content TEXT NOT NULL,
            embedding vector(%d),
            model VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""" % dim,
        "ALTER TABLE cv_document_chunks ALTER COLUMN application_id DROP NOT NULL",
        "ALTER TABLE cv_document_chunks ADD COLUMN IF NOT EXISTS file_hash VARCHAR(64)",
        "ALTER TABLE cv_document_chunks ADD COLUMN IF NOT EXISTS model VARCHAR(100)",
        "CREATE INDEX IF NOT EXISTS idx_cv_chunks_candidate ON cv_document_chunks (candidate_id)",
        "CREATE INDEX IF NOT EXISTS idx_cv_chunks_embedding ON cv_document_chunks USING hnsw (embedding vector_cosine_ops)",
        # Hồ sơ tìm kiếm: một dòng / ứng viên (CV mới nhất) — lọc SQL (số năm, kỹ năng) + embedding cả hồ sơ.
        """CREATE TABLE IF NOT EXISTS candidate_search_profile (
            candidate_id BIGINT PRIMARY KEY,
            latest_file_hash VARCHAR(64) NOT NULL,
            total_years NUMERIC(4,1),
            skills TEXT[] NOT NULL DEFAULT '{}',
            titles TEXT[] NOT NULL DEFAULT '{}',
            doc_embedding vector(%d),
            model VARCHAR(100),
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""" % dim,
        "CREATE INDEX IF NOT EXISTS idx_search_profile_embedding ON candidate_search_profile USING hnsw (doc_embedding vector_cosine_ops)",
        "CREATE INDEX IF NOT EXISTS idx_search_profile_skills ON candidate_search_profile USING gin (skills)",
        # Phát hiện ứng viên trùng: tên chuẩn hoá + băm email/SĐT; bảng cặp nghi trùng.
        "ALTER TABLE candidate_search_profile ADD COLUMN IF NOT EXISTS name_norm VARCHAR(200)",
        "ALTER TABLE candidate_search_profile ADD COLUMN IF NOT EXISTS email_hash VARCHAR(64)",
        "ALTER TABLE candidate_search_profile ADD COLUMN IF NOT EXISTS phone_hash VARCHAR(64)",
        "ALTER TABLE candidate_search_profile ADD COLUMN IF NOT EXISTS profile JSONB",
        "ALTER TABLE candidate_search_profile ADD COLUMN IF NOT EXISTS profile_version VARCHAR(30)",
        "ALTER TABLE candidate_search_profile ADD COLUMN IF NOT EXISTS search_text TEXT",
        "CREATE INDEX IF NOT EXISTS idx_search_profile_file ON candidate_search_profile (latest_file_hash)",
        "CREATE INDEX IF NOT EXISTS idx_search_profile_email ON candidate_search_profile (email_hash)",
        "CREATE INDEX IF NOT EXISTS idx_search_profile_phone ON candidate_search_profile (phone_hash)",
        """CREATE TABLE IF NOT EXISTS duplicate_candidates (
            id BIGSERIAL PRIMARY KEY,
            candidate_a BIGINT NOT NULL,
            candidate_b BIGINT NOT NULL,
            score NUMERIC(5,4) NOT NULL,
            signals TEXT[] NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
            reviewed_by BIGINT,
            reviewed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT uq_duplicate_pair UNIQUE (candidate_a, candidate_b),
            CONSTRAINT ck_duplicate_order CHECK (candidate_a < candidate_b)
        )""",
        """CREATE TABLE IF NOT EXISTS jd_embeddings (
            content_hash VARCHAR(64) NOT NULL,
            model VARCHAR(100) NOT NULL,
            task VARCHAR(30) NOT NULL,
            embedding vector(%d) NOT NULL,
            job_posting_id BIGINT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (content_hash, model, task)
        )""" % dim,
        "CREATE INDEX IF NOT EXISTS idx_duplicate_a ON duplicate_candidates (candidate_a)",
        "CREATE INDEX IF NOT EXISTS idx_duplicate_b ON duplicate_candidates (candidate_b)",
    ]


async def ensure_vector_schema(engine: AsyncEngine, dim: int) -> bool:
    """Tạo/nâng cấp bảng vector. Trả True nếu dùng được, False nếu thiếu extension hoặc lỗi."""
    global _enabled
    try:
        async with engine.begin() as conn:
            for stmt in _statements(dim):
                await conn.execute(text(stmt))
        _enabled = True
    except Exception as exc:  # noqa: BLE001
        _enabled = False
        logger.warning("Tìm kiếm vector bị tắt (không tạo được schema pgvector): %s", exc)
    return _enabled
