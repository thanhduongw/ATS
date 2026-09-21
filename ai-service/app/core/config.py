"""
AI Service — Configuration using pydantic-settings.
Loads from environment variables / .env file.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # --- Application ---
    app_name: str = "ATS AI Service"
    app_version: str = "0.1.0"
    debug: bool = False

    # --- Database ---
    database_url: str = "postgresql+asyncpg://ats_user:ats_password@localhost:5432/ats_ai"

    # --- RabbitMQ ---
    rabbitmq_url: str = "amqp://ats_user:ats_password@localhost:5672/"

    # --- MinIO / S3 ---
    s3_endpoint: str = "http://localhost:9000"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_bucket: str = "ats-bucket"

    # --- LLM API Keys ---
    openai_api_key: str = ""
    google_api_key: str = ""

    # --- Model Configuration ---
    primary_llm_model: str = "gpt-4o-mini"
    fallback_llm_model: str = "gemini-2.0-flash"
    embedding_model: str = "intfloat/multilingual-e5-large-instruct"

    # --- Service URLs (Java backend) ---
    recruitment_service_url: str = "http://localhost:8083"
    application_service_url: str = "http://localhost:8089"
    candidate_service_url: str = "http://localhost:8084"
    masterdata_service_url: str = "http://localhost:8082"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
    }


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()
