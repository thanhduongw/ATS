"""
SQLAlchemy ORM models for AI Service tables.
"""

from datetime import datetime
from sqlalchemy import (
    BigInteger, Boolean, Column, DateTime, Integer, Numeric,
    String, Text, ForeignKey, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from pgvector.sqlalchemy import Vector

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


class CVDocumentChunk(Base):
    """Đoạn CV + embedding — dùng cho tìm kiếm vector (Talent Pool, gợi ý theo JD, phát hiện trùng).

    Khoá theo (candidate_id, file_hash): một CV chỉ embed một lần dù nộp vào nhiều tin.
    Bảng do `app/core/vector_schema.py` tạo/nâng cấp (DDL riêng, không qua create_all).
    """

    __tablename__ = "cv_document_chunks"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    application_id = Column(BigInteger, nullable=True, index=True)  # không còn bắt buộc
    candidate_id = Column(BigInteger, nullable=False, index=True)
    file_hash = Column(String(64))
    chunk_type = Column(String(50), nullable=False)
    # SUMMARY | SKILLS | WORK_EXPERIENCE | PROJECT | EDUCATION | CERTIFICATION
    content = Column(Text, nullable=False)
    embedding = Column(Vector(1024))
    model = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)


class CandidateSearchProfile(Base):
    """Hồ sơ tìm kiếm của ứng viên (CV mới nhất): trường để lọc SQL + embedding cả hồ sơ."""

    __tablename__ = "candidate_search_profile"

    candidate_id = Column(BigInteger, primary_key=True, autoincrement=False)
    latest_file_hash = Column(String(64), nullable=False)
    total_years = Column(Numeric(4, 1))
    skills = Column(ARRAY(Text), nullable=False, default=list)
    titles = Column(ARRAY(Text), nullable=False, default=list)
    doc_embedding = Column(Vector(1024))
    model = Column(String(100))
    # Dùng phát hiện ứng viên trùng: email/SĐT ghi trong CV lưu dạng băm sha256 (chỉ cần so bằng),
    # tên lưu dạng chuẩn hoá (bỏ dấu, chữ thường) để so gần đúng.
    name_norm = Column(String(200))
    email_hash = Column(String(64), index=True)
    phone_hash = Column(String(64), index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class JDEmbedding(Base):
    """Embedding của JD, khoá theo nội dung JD (không theo id tin): mọi tin cùng nội dung dùng chung một vector,
    HR sửa JD thì mã băm đổi và tự embed lại — cùng cách làm với jd_extractions."""

    __tablename__ = "jd_embeddings"

    content_hash = Column(String(64), primary_key=True)
    model = Column(String(100), primary_key=True)
    task = Column(String(30), primary_key=True)  # RETRIEVAL_QUERY | RETRIEVAL_DOCUMENT
    embedding = Column(Vector(1024), nullable=False)
    job_posting_id = Column(BigInteger)  # tin đầu tiên có nội dung này (chỉ để tra cứu)
    created_at = Column(DateTime, default=datetime.utcnow)


class DuplicateCandidate(Base):
    """Cặp ứng viên nghi là cùng một người. candidate_a < candidate_b. HR xác nhận hoặc bỏ qua; không tự gộp."""

    __tablename__ = "duplicate_candidates"
    __table_args__ = (UniqueConstraint("candidate_a", "candidate_b", name="uq_duplicate_pair"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    candidate_a = Column(BigInteger, nullable=False, index=True)
    candidate_b = Column(BigInteger, nullable=False, index=True)
    score = Column(Numeric(5, 4), nullable=False)
    signals = Column(ARRAY(Text), nullable=False)  # SAME_FILE | SAME_EMAIL | SAME_PHONE | SIMILAR_PROFILE
    status = Column(String(20), nullable=False, default="PENDING")  # PENDING | DISMISSED | CONFIRMED
    reviewed_by = Column(BigInteger)
    reviewed_at = Column(DateTime)
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
