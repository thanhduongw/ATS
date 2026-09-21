"""
API endpoints for LLM-based CV extraction (Phase 2).

Endpoints:
1. POST /extract-cv         — Extract from MinIO via storage_key (production path)
2. POST /extract-cv/upload  — Extract from uploaded file (test convenience)
"""

import logging

from fastapi import APIRouter, File, UploadFile

from app.schemas.cv_extraction import CVExtractionRequest, CVExtractionResponse
from app.services.cv_extraction_engine import (
    extract_cv_from_file_bytes,
    extract_cv_from_storage_key,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/extract-cv",
    response_model=CVExtractionResponse,
    summary="Extract structured CV data from a file in MinIO",
    description=(
        "Accepts a MinIO storage key, downloads the file, extracts text (Phase 1), "
        "then uses LLM (GPT-4o-mini with Gemini fallback) to parse the CV into "
        "structured JSON with confidence scoring and evidence mapping. "
        "The storage_key is resolved against the configured bucket — "
        "no arbitrary URLs accepted (SSRF safe)."
    ),
)
async def extract_cv(request: CVExtractionRequest) -> CVExtractionResponse:
    """Extract structured CV data from a file stored in MinIO."""
    logger.info("CV extraction request: storage_key=%s", request.storage_key)
    return await extract_cv_from_storage_key(request.storage_key)


@router.post(
    "/extract-cv/upload",
    response_model=CVExtractionResponse,
    summary="Extract structured CV data from an uploaded file",
    description=(
        "Upload a CV file directly (multipart/form-data) and extract structured data. "
        "This endpoint bypasses MinIO — useful for testing and demos. "
        "Supports PDF, DOCX, PNG, and JPEG files up to 10 MB. "
        "Uses LLM (GPT-4o-mini with Gemini fallback) for extraction."
    ),
)
async def extract_cv_upload(
    file: UploadFile = File(
        ..., description="CV file (PDF, DOCX, PNG, or JPEG)"
    ),
) -> CVExtractionResponse:
    """Extract structured CV data from a directly uploaded file."""
    logger.info(
        "CV extraction upload: filename=%s content_type=%s",
        file.filename,
        file.content_type,
    )
    file_bytes = await file.read()
    return await extract_cv_from_file_bytes(file_bytes, filename=file.filename)
