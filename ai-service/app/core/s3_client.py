"""
S3 / MinIO client for downloading CV files.
Uses boto3 synchronously — wrap with run_in_executor for async contexts.
"""

import logging
from functools import lru_cache
from urllib.parse import urlparse

import boto3
from botocore.config import Config as BotoConfig
from botocore.exceptions import ClientError

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class S3Client:
    """Manages S3/MinIO operations for the ai-service."""

    def __init__(self):
        settings = get_settings()
        self._client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            region_name="us-east-1",
            config=BotoConfig(
                signature_version="s3v4",
                retries={"max_attempts": 3, "mode": "standard"},
            ),
        )
        self._default_bucket = settings.s3_bucket
        self._endpoint = settings.s3_endpoint

    def download_file_bytes(self, bucket: str, key: str) -> bytes:
        """Download a file from S3/MinIO and return its raw bytes."""
        try:
            response = self._client.get_object(Bucket=bucket, Key=key)
            return response["Body"].read()
        except ClientError as e:
            error_code = e.response["Error"]["Code"]
            if error_code == "NoSuchKey":
                raise FileNotFoundError(f"File not found: s3://{bucket}/{key}") from e
            raise

    def get_file_info(self, bucket: str, key: str) -> dict:
        """Get metadata (content-type, size) for a file in S3/MinIO."""
        try:
            response = self._client.head_object(Bucket=bucket, Key=key)
            return {
                "content_type": response.get("ContentType", ""),
                "content_length": response.get("ContentLength", 0),
            }
        except ClientError as e:
            error_code = e.response["Error"]["Code"]
            if error_code in ("404", "NoSuchKey"):
                raise FileNotFoundError(f"File not found: s3://{bucket}/{key}") from e
            raise

    def parse_file_url(self, file_url: str) -> tuple[str, str]:
        """Parse a MinIO/S3 URL into (bucket, key).

        Handles multiple URL formats:
        - http://minio:9000/ats-bucket/candidates/1/file.pdf   (internal Docker)
        - http://localhost:9000/ats-bucket/candidates/1/file.pdf (external)
        - s3://ats-bucket/candidates/1/file.pdf                 (S3 scheme)

        Returns:
            Tuple of (bucket_name, object_key)
        """
        parsed = urlparse(file_url)

        if parsed.scheme == "s3":
            return parsed.netloc, parsed.path.lstrip("/")

        # HTTP URL: path = /bucket/key/...
        path = parsed.path.strip("/")
        parts = path.split("/", 1)
        if len(parts) == 2:
            return parts[0], parts[1]

        raise ValueError(
            f"Cannot parse bucket/key from URL: {file_url}. "
            f"Expected format: http://host:port/bucket/key or s3://bucket/key"
        )

    def ensure_bucket_exists(self, bucket: str | None = None) -> None:
        """Create bucket if it doesn't exist (idempotent)."""
        bucket = bucket or self._default_bucket
        try:
            self._client.create_bucket(Bucket=bucket)
            logger.info("Created S3 bucket: %s", bucket)
        except ClientError as e:
            error_code = e.response["Error"]["Code"]
            if error_code in ("BucketAlreadyOwnedByYou", "BucketAlreadyExists"):
                return
            logger.warning("Could not create bucket %s: %s", bucket, e)


@lru_cache
def get_s3_client() -> S3Client:
    """Cached S3Client singleton."""
    return S3Client()
