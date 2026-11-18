"""
AI Service — Main FastAPI Application
Entry point for the ATS AI microservice.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.auth import internal_only
from app.core.rabbitmq import rabbitmq_manager
from app.api.health import router as health_router
from app.api.extraction import router as extraction_router
from app.api.cv_extraction import router as cv_extraction_router
from app.api.application_scores import router as application_scores_router
from app.api.embeddings import router as embeddings_router
from app.api.talent import router as talent_router
from app.api.duplicates import router as duplicates_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown hooks."""
    settings = get_settings()
    logger.info("Starting %s v%s", settings.app_name, settings.app_version)

    # --- Startup ---
    # Bảng mới của ai-service: tạo nếu chưa có. init-databases.sql chỉ chạy khi volume Postgres
    # còn trống, nên DB đã tồn tại sẽ không có các bảng thêm sau.
    try:
        from app.core.database import Base, engine
        from app.models import AIJob, AIScore, CVExtraction, JDExtraction
        tables = [CVExtraction.__table__, JDExtraction.__table__, AIJob.__table__, AIScore.__table__]
        async with engine.begin() as conn:
            await conn.run_sync(lambda c: Base.metadata.create_all(c, tables=tables))
    except Exception as e:
        logger.warning("Không tạo được bảng của ai-service: %s", e)

    # Bảng vector (tìm kiếm): DDL idempotent; thiếu pgvector thì tính năng tìm kiếm tự tắt, phần còn lại vẫn chạy.
    try:
        from app.core.database import engine as _engine
        from app.core.vector_schema import ensure_vector_schema
        await ensure_vector_schema(_engine, settings.embedding_dimensions)
    except Exception as e:
        logger.warning("Không khởi tạo được schema vector: %s", e)

    try:
        await rabbitmq_manager.connect()
        logger.info("RabbitMQ connected successfully.")
        from app.workers.scoring_worker import start_scoring_worker
        await start_scoring_worker()
        from app.workers.candidate_events import start_candidate_event_workers
        await start_candidate_event_workers()
    except Exception as e:
        logger.warning("RabbitMQ connection failed (service will start without queue): %s", e)

    yield

    # --- Shutdown ---
    await rabbitmq_manager.disconnect()
    logger.info("AI Service shutdown complete.")


def create_app() -> FastAPI:
    """Application factory."""
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        docs_url="/api/v1/ai/docs",
        redoc_url="/api/v1/ai/redoc",
        openapi_url="/api/v1/ai/openapi.json",
        lifespan=lifespan,
    )

    # CORS is handled centrally by API Gateway (globalcors)

    # --- Routers ---
    app.include_router(health_router, prefix="/api/v1/ai", tags=["Health"])
    # Các công cụ AI chỉ dành cho nhân sự nội bộ (danh tính do api-gateway gắn vào header).
    internal = [Depends(internal_only)]
    app.include_router(extraction_router, prefix="/api/v1/ai", tags=["Text Extraction"], dependencies=internal)
    app.include_router(cv_extraction_router, prefix="/api/v1/ai", tags=["CV Extraction"], dependencies=internal)
    app.include_router(application_scores_router, prefix="/api/v1/ai", tags=["CV Scoring"], dependencies=internal)
    app.include_router(embeddings_router, prefix="/api/v1/ai", tags=["Search Index"], dependencies=internal)
    app.include_router(talent_router, prefix="/api/v1/ai", tags=["Talent Pool"], dependencies=internal)
    app.include_router(duplicates_router, prefix="/api/v1/ai", tags=["Duplicates"], dependencies=internal)

    return app


# Create the app instance (used by uvicorn)
app = create_app()
