"""
API endpoints for CV text extraction.

Provides two endpoints:
1. POST /extract-text       — Extract text from file in MinIO (production path)
2. POST /extract-text/upload — Extract text from uploaded file (test convenience)
"""

import logging

from fastapi import APIRouter, File, UploadFile

from app.schemas.extraction import TextExtractionRequest, TextExtractionResponse
from app.services.extraction_pipeline import (
    extract_text_from_bytes,
    extract_text_from_url,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/extract-text",
    response_model=TextExtractionResponse,
    summary="Extract text from a file in MinIO",
    description=(
        "Accepts a MinIO/S3 file URL, downloads the file, and extracts raw text. "
        "Supports PDF (text + OCR fallback), DOCX, and images (PNG/JPEG via OCR). "
        "Text is normalized (Unicode NFC, Vietnamese diacritics) and scanned for "
        "prompt injection patterns."
    ),
)
async def extract_text(request: TextExtractionRequest) -> TextExtractionResponse:
    """Extract text from a file stored in MinIO/S3."""
    logger.info("Extract text request: %s", request.file_url)
    return await extract_text_from_url(request.file_url)


@router.post(
    "/extract-text/upload",
    response_model=TextExtractionResponse,
    summary="Extract text from an uploaded file",
    description=(
        "Upload a file directly (multipart/form-data) and extract text. "
        "This endpoint bypasses MinIO — useful for testing. "
        "Supports PDF, DOCX, PNG, and JPEG files up to 10 MB."
    ),
)
async def extract_text_upload(
    file: UploadFile = File(..., description="CV file (PDF, DOCX, PNG, or JPEG)"),
) -> TextExtractionResponse:
    """Extract text from a directly uploaded file (test convenience endpoint)."""
    logger.info("Extract text upload: filename=%s, content_type=%s", file.filename, file.content_type)

    file_bytes = await file.read()
    return await extract_text_from_bytes(file_bytes, filename=file.filename)
