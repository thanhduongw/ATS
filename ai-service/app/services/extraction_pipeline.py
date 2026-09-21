"""
CV Text Extraction Pipeline — Orchestrator.

Combines all Phase 1 modules into a single pipeline:
    File URL/bytes → Validate → Extract → OCR fallback → Normalize → Scan → Response
"""

import asyncio
import logging
import time
from functools import partial

from app.core.s3_client import get_s3_client
from app.schemas.extraction import ExtractionMetadata, TextExtractionResponse
from app.services.file_validator import FileErrorCode, validate_file
from app.services.pdf_extractor import extract_text_from_pdf
from app.services.docx_extractor import extract_text_from_docx
from app.services.ocr_engine import ocr_from_image, ocr_from_pdf
from app.services.text_normalizer import normalize_text
from app.services.injection_scanner import scan_for_injection

logger = logging.getLogger(__name__)


def _error_response(
    error_code: str, error_message: str, elapsed_ms: int
) -> TextExtractionResponse:
    """Build a standard error response."""
    return TextExtractionResponse(
        status="error",
        text=None,
        metadata=ExtractionMetadata(
            file_type="unknown",
            file_size_bytes=0,
            page_count=None,
            extraction_method="none",
            ocr_used=False,
            text_length=0,
            processing_time_ms=elapsed_ms,
            error_code=error_code,
            error_message=error_message,
        ),
    )


async def extract_text_from_url(file_url: str) -> TextExtractionResponse:
    """Extract text from a file stored in MinIO/S3.

    Downloads the file from MinIO using the S3 client, then delegates
    to the main extraction pipeline.

    Args:
        file_url: S3/MinIO URL (e.g. http://minio:9000/ats-bucket/candidates/1/cv.pdf)

    Returns:
        TextExtractionResponse with extracted text and metadata.
    """
    start = time.monotonic()
    loop = asyncio.get_event_loop()

    # --- Download file from MinIO ---
    try:
        s3 = get_s3_client()
        bucket, key = s3.parse_file_url(file_url)
        # boto3 is synchronous → run in executor
        file_bytes = await loop.run_in_executor(
            None, partial(s3.download_file_bytes, bucket, key)
        )
    except FileNotFoundError:
        elapsed_ms = int((time.monotonic() - start) * 1000)
        return _error_response(
            FileErrorCode.FILE_NOT_FOUND,
            f"File not found at: {file_url}",
            elapsed_ms,
        )
    except ValueError as e:
        elapsed_ms = int((time.monotonic() - start) * 1000)
        return _error_response(
            FileErrorCode.FILE_NOT_FOUND,
            str(e),
            elapsed_ms,
        )
    except Exception as e:
        elapsed_ms = int((time.monotonic() - start) * 1000)
        logger.error("Failed to download file from %s: %s", file_url, e)
        return _error_response(
            "DOWNLOAD_ERROR",
            f"Failed to download file: {e}",
            elapsed_ms,
        )

    # Determine filename from key
    filename = key.split("/")[-1] if "/" in key else key
    return await extract_text_from_bytes(file_bytes, filename)


async def extract_text_from_bytes(
    file_bytes: bytes, filename: str | None = None
) -> TextExtractionResponse:
    """Extract text from raw file bytes.

    Main extraction pipeline:
    1. Validate file (type, size, corruption)
    2. Extract text (PDF → PyMuPDF, DOCX → python-docx, image → OCR)
    3. OCR fallback if PDF has low text density
    4. Normalize text (Unicode NFC, clean formatting)
    5. Scan for prompt injection
    6. Build response

    Args:
        file_bytes: Raw file content.
        filename: Optional filename for logging.

    Returns:
        TextExtractionResponse with extracted text and metadata.
    """
    start = time.monotonic()
    loop = asyncio.get_event_loop()

    # ================================================================
    # 1. VALIDATE
    # ================================================================
    validation = await loop.run_in_executor(
        None, partial(validate_file, file_bytes, filename)
    )

    if not validation.valid:
        elapsed_ms = int((time.monotonic() - start) * 1000)
        return _error_response(
            validation.error_code or "VALIDATION_ERROR",
            validation.error_message or "File validation failed",
            elapsed_ms,
        )

    file_type = validation.file_type
    file_size = validation.file_size

    # ================================================================
    # 2. EXTRACT TEXT
    # ================================================================
    extracted_text = ""
    page_count = None
    extraction_method = "unknown"
    ocr_used = False
    ocr_confidence = None
    ocr_quality = None

    try:
        if file_type == "pdf":
            # First try PyMuPDF text extraction
            result = await loop.run_in_executor(
                None, partial(extract_text_from_pdf, file_bytes)
            )
            extracted_text = result.text
            page_count = result.page_count
            extraction_method = result.method

            # OCR fallback if text density is too low
            if result.needs_ocr:
                logger.info(
                    "PDF needs OCR (low-density pages: %s) — running PaddleOCR...",
                    result.low_density_pages,
                )
                ocr_result = await loop.run_in_executor(
                    None, partial(ocr_from_pdf, file_bytes)
                )
                # Use OCR text if it's substantially longer
                if len(ocr_result.text) > len(extracted_text) * 1.5:
                    extracted_text = ocr_result.text
                    extraction_method = ocr_result.method
                elif ocr_result.text:
                    # Append OCR text for low-density pages
                    extracted_text = f"{extracted_text}\n\n{ocr_result.text}"

                ocr_used = True
                ocr_confidence = ocr_result.confidence
                ocr_quality = ocr_result.quality

        elif file_type == "docx":
            result = await loop.run_in_executor(
                None, partial(extract_text_from_docx, file_bytes)
            )
            extracted_text = result.text
            extraction_method = result.method

        elif file_type in ("png", "jpeg"):
            # Direct OCR for images
            ocr_result = await loop.run_in_executor(
                None, partial(ocr_from_image, file_bytes)
            )
            extracted_text = ocr_result.text
            extraction_method = ocr_result.method
            ocr_used = True
            ocr_confidence = ocr_result.confidence
            ocr_quality = ocr_result.quality

    except Exception as e:
        elapsed_ms = int((time.monotonic() - start) * 1000)
        logger.error("Text extraction failed for %s: %s", filename, e, exc_info=True)
        return _error_response(
            "EXTRACTION_ERROR",
            f"Text extraction failed: {e}",
            elapsed_ms,
        )

    # ================================================================
    # 3. NORMALIZE TEXT
    # ================================================================
    normalized_text = normalize_text(extracted_text)

    # ================================================================
    # 4. SCAN FOR INJECTION
    # ================================================================
    scan_result = scan_for_injection(normalized_text)

    # ================================================================
    # 5. BUILD RESPONSE
    # ================================================================
    elapsed_ms = int((time.monotonic() - start) * 1000)

    logger.info(
        "Extraction complete: file=%s type=%s size=%d method=%s ocr=%s "
        "text_len=%d injection=%s time=%dms",
        filename,
        file_type,
        file_size,
        extraction_method,
        ocr_used,
        len(normalized_text),
        scan_result.injection_detected,
        elapsed_ms,
    )

    return TextExtractionResponse(
        status="success",
        text=normalized_text,
        metadata=ExtractionMetadata(
            file_type=file_type,
            file_size_bytes=file_size,
            page_count=page_count,
            extraction_method=extraction_method,
            ocr_used=ocr_used,
            ocr_confidence=ocr_confidence,
            ocr_quality=ocr_quality,
            text_length=len(normalized_text),
            injection_detected=scan_result.injection_detected,
            injection_patterns=scan_result.patterns_found,
            processing_time_ms=elapsed_ms,
        ),
    )
