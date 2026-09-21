"""
Health check and system status endpoints.
"""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings, Settings
from app.core.database import get_db

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/health")
async def health_check(
    settings: Settings = Depends(get_settings),
):
    """Basic health check — always returns OK if the service is running."""
    return {
        "status": "ok",
        "service": settings.app_name,
        "version": settings.app_version,
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/health/detailed")
async def detailed_health_check(
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    """
    Detailed health check — verifies database connectivity and pgvector extension.
    """
    checks = {
        "service": "ok",
        "database": "unknown",
        "pgvector": "unknown",
    }

    # Check database
    try:
        result = await db.execute(text("SELECT 1"))
        result.scalar()
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {e}"
        logger.error("Database health check failed: %s", e)

    # Check pgvector extension
    try:
        result = await db.execute(
            text("SELECT extname FROM pg_extension WHERE extname = 'vector'")
        )
        row = result.scalar()
        checks["pgvector"] = "ok" if row else "not_installed"
    except Exception as e:
        checks["pgvector"] = f"error: {e}"
        logger.error("pgvector check failed: %s", e)

    overall = "ok" if all(v == "ok" for v in checks.values()) else "degraded"

    return {
        "status": overall,
        "service": settings.app_name,
        "version": settings.app_version,
        "timestamp": datetime.utcnow().isoformat(),
        "checks": checks,
    }
