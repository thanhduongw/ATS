"""
File validation module.
Checks file type (magic bytes), size limits, and basic corruption detection.
"""

import io
import logging
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


class FileErrorCode(str, Enum):
    """Error codes for file validation failures."""

    INVALID_FILE_TYPE = "INVALID_FILE_TYPE"
    INVALID_FILE_SIZE = "INVALID_FILE_SIZE"
    FILE_NOT_FOUND = "FILE_NOT_FOUND"
    FILE_CORRUPT = "FILE_CORRUPT"


# Magic bytes → file type mapping
_MAGIC_SIGNATURES: list[tuple[bytes, str]] = [
    (b"%PDF", "pdf"),
    (b"PK\x03\x04", "docx"),      # ZIP format (DOCX/XLSX/PPTX are ZIPs)
    (b"\x89PNG\r\n\x1a\n", "png"),
    (b"\xff\xd8\xff", "jpeg"),
]


@dataclass
class ValidationResult:
    """Result of file validation."""

    valid: bool
    file_type: str | None = None
    file_size: int = 0
    error_code: str | None = None
    error_message: str | None = None


def detect_file_type(file_bytes: bytes) -> str | None:
    """Detect file type from magic bytes (first 8 bytes).

    Returns:
        File type string ('pdf', 'docx', 'png', 'jpeg') or None if unknown.
    """
    for magic, file_type in _MAGIC_SIGNATURES:
        if file_bytes[: len(magic)] == magic:
            return file_type
    return None


def _verify_pdf(file_bytes: bytes) -> None:
    """Verify PDF is not corrupt by opening with PyMuPDF."""
    import fitz

    doc = fitz.open(stream=file_bytes, filetype="pdf")
    if doc.page_count == 0:
        doc.close()
        raise ValueError("PDF has 0 pages")
    doc.close()


def _verify_docx(file_bytes: bytes) -> None:
    """Verify DOCX is not corrupt by opening with python-docx."""
    from docx import Document

    Document(io.BytesIO(file_bytes))


def _verify_image(file_bytes: bytes) -> None:
    """Verify image is not corrupt by opening with Pillow."""
    from PIL import Image

    img = Image.open(io.BytesIO(file_bytes))
    img.verify()


_VERIFIERS = {
    "pdf": _verify_pdf,
    "docx": _verify_docx,
    "png": _verify_image,
    "jpeg": _verify_image,
}


def validate_file(
    file_bytes: bytes, filename: str | None = None
) -> ValidationResult:
    """Validate a file for processing.

    Checks:
    1. File size ≤ 10MB
    2. File type is PDF, DOCX, PNG, or JPEG (via magic bytes)
    3. File is not corrupt (can be opened successfully)

    Args:
        file_bytes: Raw file content.
        filename: Optional filename for logging.

    Returns:
        ValidationResult with valid=True or error details.
    """
    file_size = len(file_bytes)
    log_name = filename or "<unknown>"

    # --- Size check ---
    if file_size == 0:
        logger.warning("Empty file: %s", log_name)
        return ValidationResult(
            valid=False,
            file_size=0,
            error_code=FileErrorCode.FILE_CORRUPT,
            error_message="File is empty (0 bytes)",
        )

    if file_size > MAX_FILE_SIZE:
        logger.warning(
            "File too large: %s (%d bytes, max %d)", log_name, file_size, MAX_FILE_SIZE
        )
        return ValidationResult(
            valid=False,
            file_size=file_size,
            error_code=FileErrorCode.INVALID_FILE_SIZE,
            error_message=(
                f"File size {file_size:,} bytes exceeds maximum "
                f"{MAX_FILE_SIZE:,} bytes (10 MB)"
            ),
        )

    # --- Type check (magic bytes) ---
    file_type = detect_file_type(file_bytes)
    if file_type is None:
        logger.warning("Unsupported file type: %s", log_name)
        return ValidationResult(
            valid=False,
            file_size=file_size,
            error_code=FileErrorCode.INVALID_FILE_TYPE,
            error_message="Unsupported file type. Allowed: PDF, DOCX, PNG, JPG",
        )

    # --- Corruption check ---
    verifier = _VERIFIERS.get(file_type)
    if verifier:
        try:
            verifier(file_bytes)
        except Exception as e:
            logger.warning("Corrupt file: %s — %s", log_name, e)
            return ValidationResult(
                valid=False,
                file_type=file_type,
                file_size=file_size,
                error_code=FileErrorCode.FILE_CORRUPT,
                error_message=f"File appears corrupt or unreadable: {e}",
            )

    logger.info("File validated OK: %s (type=%s, size=%d)", log_name, file_type, file_size)
    return ValidationResult(valid=True, file_type=file_type, file_size=file_size)
