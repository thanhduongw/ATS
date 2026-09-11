"""
PDF text extraction using PyMuPDF (fitz).
Extracts text blocks preserving layout structure.
Flags pages with low text density for OCR fallback.
"""

import logging
from dataclasses import dataclass

import fitz  # PyMuPDF

logger = logging.getLogger(__name__)

# Pages with fewer chars than this are considered "image-heavy" → need OCR
TEXT_DENSITY_THRESHOLD = 100  # chars per page


@dataclass
class PdfExtractionResult:
    """Result of PDF text extraction."""

    text: str
    page_count: int
    needs_ocr: bool
    low_density_pages: list[int]
    method: str = "pymupdf"


def extract_text_from_pdf(file_bytes: bytes) -> PdfExtractionResult:
    """Extract text from a PDF using PyMuPDF.

    Strategy:
    - Uses page.get_text("blocks") to extract text blocks with layout info.
    - Blocks are sorted top-to-bottom, left-to-right per page.
    - Flags pages where text density < 100 chars as needing OCR.

    Args:
        file_bytes: Raw PDF content.

    Returns:
        PdfExtractionResult with extracted text and OCR-needed flags.
    """
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    page_count = doc.page_count

    all_text_parts: list[str] = []
    low_density_pages: list[int] = []

    for page_idx in range(page_count):
        page = doc.load_page(page_idx)

        # Extract text blocks: (x0, y0, x1, y1, text, block_no, block_type)
        # block_type: 0 = text, 1 = image
        blocks = page.get_text("blocks")
        text_blocks = [b for b in blocks if b[6] == 0]  # Only text blocks

        # Sort by position: top to bottom, then left to right
        text_blocks.sort(key=lambda b: (b[1], b[0]))

        page_text = "\n".join(block[4].strip() for block in text_blocks if block[4].strip())

        # Check text density
        char_count = len(page_text.replace("\n", "").replace(" ", ""))
        if char_count < TEXT_DENSITY_THRESHOLD:
            low_density_pages.append(page_idx + 1)  # 1-based page number
            logger.debug(
                "Page %d has low text density (%d chars) — may need OCR",
                page_idx + 1,
                char_count,
            )

        if page_text:
            all_text_parts.append(page_text)

    doc.close()

    full_text = "\n\n".join(all_text_parts)
    needs_ocr = len(low_density_pages) > 0 and len(full_text.strip()) < TEXT_DENSITY_THRESHOLD

    logger.info(
        "PDF extracted: %d pages, %d chars, %d low-density pages, needs_ocr=%s",
        page_count,
        len(full_text),
        len(low_density_pages),
        needs_ocr,
    )

    return PdfExtractionResult(
        text=full_text,
        page_count=page_count,
        needs_ocr=needs_ocr,
        low_density_pages=low_density_pages,
    )
