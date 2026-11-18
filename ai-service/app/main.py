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

    # Worker chấm điểm phải luôn nghe hàng đợi application.created: nếu RabbitMQ chưa sẵn sàng lúc
    # khởi động thì thử lại định kỳ thay vì chạy tiếp mà không có worker (hồ sơ nộp sau đó sẽ nằm
    # mãi trong hàng đợi, không được chấm).
    async def _start_queue_worker() -> None:
        import asyncio
        from app.workers.scoring_worker import start_scoring_worker
        delay = 5
        while True:
            try:
                await rabbitmq_manager.connect()
                await start_scoring_worker()
                logger.info("RabbitMQ connected successfully.")
                break
            except Exception as e:  # noqa: BLE001
                logger.warning("RabbitMQ chưa sẵn sàng (%s) — thử lại sau %ss", e, delay)
                await asyncio.sleep(delay)
                delay = min(delay * 2, 60)

        # Canh gác: kết nối rớt giữa chừng mà thư viện không đăng ký lại consumer (xem app/workers/scoring_watchdog.py).
        from app.workers.scoring_watchdog import watch
        from app.workers.scoring_worker import APPLICATION_CREATED_QUEUE
        await watch(rabbitmq_manager, start_scoring_worker, APPLICATION_CREATED_QUEUE)

    import asyncio
    queue_task = asyncio.create_task(_start_queue_worker())

    yield

    # --- Shutdown ---
    queue_task.cancel()
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

    return app


# Create the app instance (used by uvicorn)
app = create_app()
