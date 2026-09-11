"""
AI Service — Main FastAPI Application
Entry point for the ATS AI microservice.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.rabbitmq import rabbitmq_manager
from app.api.health import router as health_router
from app.api.extraction import router as extraction_router
from app.api.cv_extraction import router as cv_extraction_router

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
    try:
        await rabbitmq_manager.connect()
        logger.info("RabbitMQ connected successfully.")
    except Exception as e:
        logger.warning("RabbitMQ connection failed (service will start without queue): %s", e)

    try:
        from app.core.s3_client import get_s3_client
        get_s3_client().ensure_bucket_exists()
        logger.info("S3 default bucket checked/created successfully.")
    except Exception as e:
        logger.warning("S3 bucket check failed: %s", e)

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
    app.include_router(extraction_router, prefix="/api/v1/ai", tags=["Text Extraction"])
    app.include_router(cv_extraction_router, prefix="/api/v1/ai", tags=["CV Extraction"])

    return app


# Create the app instance (used by uvicorn)
app = create_app()
