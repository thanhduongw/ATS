"""
recruitment_client.py - Phase 5 helper.

Read-only access to ats_recruitment database to fetch job_posting.benchmark_criteria.

Design rationale:
  - In a true microservices architecture, ai-service should call recruitment-service
    via HTTP (GET /api/v1/recruitment/jobs/{id}/criteria).
  - However, in this deployment recruitment-service does NOT expose a criteria endpoint.
  - To maintain zero-downtime compatibility without modifying Java services,
    ai-service reads the benchmark_criteria column directly from the ats_recruitment
    database using a dedicated read-only async engine.
  - This engine is isolated from ats_ai and handles its own connection pooling.
"""

from __future__ import annotations

import json
import logging
from typing import Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.schemas.jd_generation import BenchmarkCriterion

logger = logging.getLogger(__name__)

_recruitment_engine: Optional[AsyncEngine] = None
_recruitment_sessionmaker: Optional[sessionmaker] = None


def get_recruitment_engine() -> AsyncEngine:
    """Get or create the lazy-initialized AsyncEngine for ats_recruitment."""
    global _recruitment_engine, _recruitment_sessionmaker
    if _recruitment_engine is None:
        settings = get_settings()
        url = settings.recruitment_database_url
        logger.info(
            "Connecting to ats_recruitment database: %s",
            url.split("@")[-1] if "@" in url else url,
        )
        _recruitment_engine = create_async_engine(
            url,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
            echo=False,
        )
        _recruitment_sessionmaker = sessionmaker(
            _recruitment_engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )
    return _recruitment_engine


async def fetch_benchmark_criteria(job_posting_id: int) -> list[BenchmarkCriterion]:
    """Fetch benchmark_criteria from job_posting table in ats_recruitment DB.

    Args:
        job_posting_id: ID of the job posting to fetch criteria for.

    Returns:
        List of BenchmarkCriterion objects parsed from the JSONB column.
        Returns empty list if not found or criteria is null.
    """
    get_recruitment_engine()
    assert _recruitment_sessionmaker is not None

    async with _recruitment_sessionmaker() as session:
        result = await session.execute(
            text(
                "SELECT benchmark_criteria FROM job_posting WHERE id = :job_id"
            ),
            {"job_id": job_posting_id},
        )
        row = result.fetchone()

    if not row or not row[0]:
        logger.warning(
            "No benchmark_criteria found in ats_recruitment for job_posting_id=%d",
            job_posting_id,
        )
        return []

    raw_data = row[0]
    if isinstance(raw_data, str):
        try:
            raw_data = json.loads(raw_data)
        except json.JSONDecodeError:
            logger.error("Failed to parse benchmark_criteria JSON: %s", raw_data)
            return []

    if not isinstance(raw_data, list):
        logger.error(
            "benchmark_criteria is not a list for job_posting_id=%d: %s",
            job_posting_id,
            type(raw_data),
        )
        return []

    criteria = []
    for item in raw_data:
        try:
            criteria.append(BenchmarkCriterion(**item))
        except Exception as e:
            logger.warning("Failed to parse criterion item %s: %s", item, e)

    logger.info(
        "Loaded %d benchmark criteria from ats_recruitment for job_posting_id=%d",
        len(criteria),
        job_posting_id,
    )
    return criteria
