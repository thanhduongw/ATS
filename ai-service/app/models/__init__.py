"""
SQLAlchemy ORM models for AI Service tables.
"""

from datetime import datetime
from sqlalchemy import (
    BigInteger, Boolean, Column, DateTime, Integer, Numeric,
    String, Text, ForeignKey, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB

from app.core.database import Base


class AIJob(Base):
    """Tracks each AI processing run for a CV/application."""

    __tablename__ = "ai_jobs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    application_id = Column(BigInteger, nullable=False, index=True)
    candidate_id = Column(BigInteger, nullable=False)
    job_posting_id = Column(BigInteger, nullable=False)

    status = Column(String(50), nullable=False, default="QUEUED")
    # QUEUED | PROCESSING | COMPLETED | FAILED | PENDING_BENCHMARK
    current_stage = Column(String(50))

    started_at = Column(DateTime)
    completed_at = Column(DateTime)

    # Provenance
    extraction_model = Column(String(100))
    extraction_prompt_version = Column(String(20))
    scoring_model = Column(String(100))
    scoring_prompt_version = Column(String(20))

    # Quality
    extraction_confidence = Column(Numeric(3, 2))
    ocr_used = Column(Boolean, default=False)
    injection_detected = Column(Boolean, default=False)
    guardrail_warnings = Column(JSONB)

    # Cost tracking
    total_input_tokens = Column(Integer)
    total_output_tokens = Column(Integer)
    estimated_cost_usd = Column(Numeric(6, 4))
    total_latency_ms = Column(Integer)

    error_message = Column(Text)
    retry_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class AIScore(Base):
    """Điểm phù hợp CV ↔ JD mới nhất của mỗi hồ sơ ứng tuyển (một dòng / hồ sơ).

    status: PENDING (đã xếp hàng chấm bù) | PROCESSING | COMPLETED | FAILED.
    HR không chỉnh điểm AI nên không có cột override.
    """

    __tablename__ = "ai_scores"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    application_id = Column(BigInteger, nullable=False, unique=True)
    job_posting_id = Column(BigInteger, nullable=False, index=True)
    candidate_id = Column(BigInteger, nullable=False)
    cv_facts_id = Column(BigInteger)   # cv_facts.id đã dùng để chấm (null khi ứng viên xoá dữ liệu)
    jd_facts_id = Column(BigInteger)   # jd_facts.id đã dùng để chấm
    ai_job_id = Column(BigInteger, ForeignKey("ai_jobs.id"))
    status = Column(String(20), nullable=False)
    total_score = Column(Numeric(5, 1))
    tier = Column(String(20))
    result = Column(JSONB)       # ScoreResult (app/schemas/ssrc.py)
    provenance = Column(JSONB)   # ScoringProvenance
    error_message = Column(Text)
    scored_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CVFactsRecord(Base):
    """Dữ kiện CV (`CVFacts`) trích từ CV đã che PII — một dòng cho mỗi (file CV, phiên bản prompt).

    Khoá theo sha256 nội dung file nên cùng một CV nộp vào nhiều tin chỉ gọi LLM một lần.
    """

    __tablename__ = "cv_facts"
    __table_args__ = (UniqueConstraint("file_hash", "prompt_version", name="uq_cv_facts_file_prompt"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    file_hash = Column(String(64), nullable=False)
    prompt_version = Column(String(40), nullable=False)
    resume_url = Column(Text, index=True)
    candidate_id = Column(BigInteger, index=True)
    status = Column(String(20), nullable=False)   # COMPLETED | FAILED
    model = Column(String(100))
    result = Column(JSONB)          # CVFacts
    provenance = Column(JSONB)      # model, prompt_version, token, chi phí, độ trễ
    text_metadata = Column(JSONB)   # bước đọc file (OCR, chèn lệnh) + cảnh báo PII còn sót
    error_code = Column(String(50))
    error_message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class JDFactsRecord(Base):
    """Yêu cầu của JD (`JDFacts`) — một dòng cho mỗi (nội dung JD, phiên bản prompt).

    Khoá theo mã băm NỘI DUNG JD: mọi CV của cùng một JD dùng chung một bản; HR sửa JD thì trích xuất lại.
    """

    __tablename__ = "jd_facts"
    __table_args__ = (UniqueConstraint("content_hash", "prompt_version", name="uq_jd_facts_content_prompt"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    content_hash = Column(String(64), nullable=False)
    prompt_version = Column(String(40), nullable=False)
    job_posting_id = Column(BigInteger)  # tin đầu tiên có nội dung này (chỉ để tra cứu)
    status = Column(String(20), nullable=False)   # COMPLETED | FAILED
    model = Column(String(100))
    result = Column(JSONB)          # JDFacts
    provenance = Column(JSONB)
    error_code = Column(String(50))
    error_message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
