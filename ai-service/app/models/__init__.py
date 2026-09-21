"""
SQLAlchemy ORM models for AI Service tables.
"""

from datetime import datetime
from sqlalchemy import (
    BigInteger, Boolean, Column, DateTime, Integer, Numeric,
    String, Text, ForeignKey,
)
from sqlalchemy.dialects.postgresql import JSONB
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
    """Vector embeddings for CV chunks — used for RAG retrieval."""

    __tablename__ = "cv_document_chunks"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    application_id = Column(BigInteger, nullable=False, index=True)
    candidate_id = Column(BigInteger, nullable=False)
    chunk_type = Column(String(50), nullable=False)
    # SKILL | WORK_EXPERIENCE | PROJECT | EDUCATION | CERTIFICATION
    content = Column(Text, nullable=False)
    embedding = Column(Vector(1024))
    created_at = Column(DateTime, default=datetime.utcnow)


class AIFeedback(Base):
    """Stores recruiter feedback on AI scoring results."""

    __tablename__ = "ai_feedback"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    application_id = Column(BigInteger, nullable=False)
    ai_job_id = Column(BigInteger, ForeignKey("ai_jobs.id"))
    user_id = Column(BigInteger, nullable=False)
    action = Column(String(50), nullable=False)
    # ACCEPT | OVERRIDE_SCORE | REPORT_ISSUE
    original_score = Column(Numeric(5, 2))
    corrected_score = Column(Numeric(5, 2))
    comment = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
