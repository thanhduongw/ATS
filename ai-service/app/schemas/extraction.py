"""
Pydantic schemas for CV text extraction requests and responses.
"""

from pydantic import BaseModel, Field


class TextExtractionRequest(BaseModel):
    """Request to extract text from a file stored in MinIO."""

    file_url: str = Field(
        ...,
        description="S3/MinIO URL of the file. "
        "e.g. http://minio:9000/ats-bucket/candidates/1/file.pdf",
        examples=["http://minio:9000/ats-bucket/candidates/1/cv.pdf"],
    )


class ExtractionMetadata(BaseModel):
    """Metadata about the extraction process."""

    file_type: str = Field(description="Detected file type: pdf, docx, png, jpeg")
    file_size_bytes: int = Field(description="File size in bytes")
    page_count: int | None = Field(None, description="Number of pages (PDF only)")
    extraction_method: str = Field(
        description="Method used: pymupdf, python-docx, paddleocr"
    )
    ocr_used: bool = Field(False, description="Whether OCR was applied")
    ocr_confidence: float | None = Field(
        None, description="OCR confidence score 0.0–1.0"
    )
    ocr_quality: str | None = Field(
        None, description="OCR quality: OK, LOW_QUALITY, NEEDS_REVIEW"
    )
    text_length: int = Field(0, description="Length of extracted text in characters")
    injection_detected: bool = Field(
        False, description="Whether prompt injection patterns were detected"
    )
    injection_patterns: list[str] = Field(
        default_factory=list,
        description="List of injection patterns found",
    )
    processing_time_ms: int = Field(description="Total processing time in milliseconds")
    error_code: str | None = Field(None, description="Error code if extraction failed")
    error_message: str | None = Field(
        None, description="Error message if extraction failed"
    )


class TextExtractionResponse(BaseModel):
    """Response from the text extraction endpoint."""

    status: str = Field(
        description="Extraction status: success or error"
    )
    text: str | None = Field(
        None, description="Extracted and normalized text content"
    )
    metadata: ExtractionMetadata
