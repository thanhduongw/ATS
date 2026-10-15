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
    # "Ngày hiện tại" đưa vào prompt chấm điểm tính theo múi giờ này.
    app_timezone: str = "Asia/Ho_Chi_Minh"

    # --- Database ---
    database_url: str = "postgresql+asyncpg://ats_user:ats_password@localhost:5432/ats_ai"

    # --- RabbitMQ ---
    rabbitmq_url: str = "amqp://ats_user:ats_password@localhost:5672/"

    # --- AWS S3 (cùng bucket/khoá với candidate-service) ---
    # Khoá để trống thì boto3 dùng chuỗi credential mặc định (biến môi trường, IAM role...).
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_s3_bucket: str = "ats-bucket"
    aws_s3_region: str = "us-east-1"
    # Chỉ đặt khi dùng dịch vụ tương thích S3; để trống = AWS S3.
    aws_s3_endpoint: str = ""

    # --- LLM API Keys ---
    openai_api_key: str = ""
    google_api_key: str = ""

    # --- Model Configuration ---
    primary_llm_model: str = "gemini-3.5-flash-lite"
    # Để trống = không dự phòng: lỗi thì hồ sơ được đánh dấu FAILED để HR chấm lại.
    fallback_llm_model: str = ""
    llm_temperature: float = 0.0
    llm_seed: int = 42
    embedding_model: str = "intfloat/multilingual-e5-large-instruct"

    # --- Chấm điểm ---
    # Ngưỡng xếp loại hiệu chỉnh bằng benchmark (Gemini, tiếng Việt, tập calib: tối ưu 43,15 / 63,75 → làm tròn).
    scoring_tier_good_min: float = 65.0
    scoring_tier_potential_min: float = 45.0
    scoring_max_parallel: int = 2

    # --- Service URLs (Java backend) ---
    recruitment_service_url: str = "http://localhost:8083"
    application_service_url: str = "http://localhost:8089"
    candidate_service_url: str = "http://localhost:8084"
    masterdata_service_url: str = "http://localhost:8082"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
        # Biến cũ còn sót trong .env (vd S3_ENDPOINT của MinIO) không làm service lỗi khi khởi động.
        "extra": "ignore",
    }


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()
