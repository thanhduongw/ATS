"""
AWS S3 client for downloading CV files.
Uses boto3 synchronously — wrap with run_in_executor for async contexts.

ai-service chỉ ĐỌC, và chỉ đọc bucket đã cấu hình (AWS_S3_BUCKET): URL trỏ sang bucket khác
hoặc host lạ bị từ chối, nên không thể dùng service này để đọc dữ liệu ngoài phạm vi CV.
"""

import logging
import re
from functools import lru_cache
from urllib.parse import unquote, urlparse

import boto3
from botocore.config import Config as BotoConfig
from botocore.exceptions import ClientError

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# Giới hạn trùng với file_validator.MAX_FILE_SIZE; đọc dư 1 byte để biết file vượt giới hạn.
MAX_DOWNLOAD_BYTES = 10 * 1024 * 1024

# {bucket}.s3.amazonaws.com | {bucket}.s3.{region}.amazonaws.com | {bucket}.s3-{region}.amazonaws.com
_VIRTUAL_HOSTED = re.compile(r"^(?P<bucket>.+)\.s3([.-][a-z0-9-]+)?\.amazonaws\.com$")
# s3.amazonaws.com | s3.{region}.amazonaws.com | s3-{region}.amazonaws.com  (path-style)
_PATH_STYLE = re.compile(r"^s3([.-][a-z0-9-]+)?\.amazonaws\.com$")


class S3Client:
    """Đọc CV từ AWS S3 cho ai-service."""

    def __init__(self):
        settings = get_settings()
        kwargs = {
            "region_name": settings.aws_s3_region,
            "config": BotoConfig(signature_version="s3v4", retries={"max_attempts": 3, "mode": "standard"}),
        }
        if settings.aws_s3_endpoint:
            kwargs["endpoint_url"] = settings.aws_s3_endpoint
        if settings.aws_access_key_id and settings.aws_secret_access_key:
            kwargs["aws_access_key_id"] = settings.aws_access_key_id
            kwargs["aws_secret_access_key"] = settings.aws_secret_access_key
        self._client = boto3.client("s3", **kwargs)
        self._bucket = settings.aws_s3_bucket
        self._endpoint = settings.aws_s3_endpoint.rstrip("/")

    @property
    def bucket(self) -> str:
        return self._bucket

    def download(self, key: str) -> bytes:
        """Tải một object trong bucket đã cấu hình. Quá 10 MB thì báo lỗi, không đọc hết vào bộ nhớ."""
        try:
            response = self._client.get_object(Bucket=self._bucket, Key=key)
        except ClientError as e:
            if e.response["Error"]["Code"] in ("NoSuchKey", "404"):
                raise FileNotFoundError(f"Không tìm thấy file trên S3: {key}") from e
            raise
        body = response["Body"].read(MAX_DOWNLOAD_BYTES + 1)
        if len(body) > MAX_DOWNLOAD_BYTES:
            raise ValueError("File CV vượt quá 10 MB")
        return body

    def key_from_url(self, file_url: str) -> str:
        """Lấy object key từ URL CV, chỉ chấp nhận bucket đã cấu hình.

        Hỗ trợ:
        - s3://{bucket}/{key}
        - https://{bucket}.s3.{region}.amazonaws.com/{key}   (dạng candidate-service tạo ra)
        - https://s3.{region}.amazonaws.com/{bucket}/{key}
        - {AWS_S3_ENDPOINT}/{bucket}/{key}                   (khi cấu hình endpoint riêng)
        """
        bucket, key = parse_s3_url(file_url, self._endpoint)
        if bucket != self._bucket:
            raise ValueError(f"CV không nằm trong bucket được phép ({self._bucket})")
        return key

    def download_url(self, file_url: str) -> bytes:
        return self.download(self.key_from_url(file_url))


def parse_s3_url(file_url: str, endpoint: str = "") -> tuple[str, str]:
    """Tách (bucket, key) từ URL S3. Host không phải S3 (và không phải endpoint cấu hình) → ValueError."""
    parsed = urlparse((file_url or "").strip())
    host = (parsed.hostname or "").lower()
    path = unquote(parsed.path.lstrip("/"))

    if parsed.scheme == "s3":
        bucket, key = parsed.netloc, path
    elif parsed.scheme in ("http", "https") and (m := _VIRTUAL_HOSTED.match(host)):
        bucket, key = m.group("bucket"), path
    elif parsed.scheme in ("http", "https") and (
        _PATH_STYLE.match(host) or (endpoint and file_url.startswith(endpoint + "/"))
    ):
        bucket, _, key = path.partition("/")
    else:
        raise ValueError(f"Không phải URL S3 hợp lệ: {file_url}")

    if not bucket or not key:
        raise ValueError(f"URL S3 thiếu bucket hoặc key: {file_url}")
    return bucket, key


@lru_cache
def get_s3_client() -> S3Client:
    """Cached S3Client singleton."""
    return S3Client()
