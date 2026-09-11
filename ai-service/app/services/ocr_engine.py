"""
OCR engine using PaddleOCR PP-OCRv4.
Supports Vietnamese + English text recognition from PDF pages and images.

PaddleOCR is initialized lazily (singleton) to avoid loading ~500MB models
on every request. OCR calls are CPU-bound and run in thread pool executor.
"""

import io
import logging
from dataclasses import dataclass, field
from functools import lru_cache

import cv2
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)


@dataclass
class OcrPageResult:
    """OCR result for a single page/image."""

    text: str
    confidence: float  # 0.0–1.0
    line_count: int


@dataclass
class OcrResult:
    """Aggregated OCR result."""

    text: str
    confidence: float  # Mean confidence across all pages
    quality: str  # OK, LOW_QUALITY, NEEDS_REVIEW
    page_results: list[OcrPageResult] = field(default_factory=list)
    method: str = "paddleocr"


@lru_cache(maxsize=1)
def _get_paddle_ocr():
    """Lazy singleton for PaddleOCR instance.

    Models are pre-downloaded during Docker build, so this
    just loads them into memory (~500MB, takes ~5s first time).
    """
    from paddleocr import PaddleOCR

    logger.info("Initializing PaddleOCR (PP-OCRv4, lang=vi)...")
    ocr = PaddleOCR(
        lang="vi",
        use_textline_orientation=True,
        use_gpu=False,
    )
    logger.info("PaddleOCR initialized successfully.")
    return ocr


def _preprocess_image(img: np.ndarray) -> np.ndarray:
    """Preprocess image for better OCR quality.

    Pipeline:
    1. Convert to grayscale
    2. Adaptive thresholding (Gaussian)
    3. Denoise (fastNlMeansDenoising)
    """
    # Convert to grayscale if needed
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img.copy()

    # Denoise
    denoised = cv2.fastNlMeansDenoising(gray, h=10, templateWindowSize=7, searchWindowSize=21)

    # Adaptive thresholding for better contrast
    binary = cv2.adaptiveThreshold(
        denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
    )

    # Convert back to BGR for PaddleOCR (expects color image)
    return cv2.cvtColor(binary, cv2.COLOR_GRAY2BGR)


def _classify_quality(confidence: float) -> str:
    """Classify OCR quality based on mean confidence."""
    if confidence >= 0.7:
        return "OK"
    elif confidence >= 0.5:
        return "LOW_QUALITY"
    else:
        return "NEEDS_REVIEW"


def _run_ocr_on_image(img: np.ndarray, preprocess: bool = True) -> OcrPageResult:
    """Run PaddleOCR on a single image (numpy array).

    Args:
        img: Image as numpy array (BGR format).
        preprocess: Whether to apply image preprocessing.

    Returns:
        OcrPageResult with extracted text and confidence.
    """
    ocr = _get_paddle_ocr()

    if preprocess:
        processed = _preprocess_image(img)
    else:
        processed = img

    # PaddleOCR returns: list[list[line]], where each line = [bbox, (text, conf)]
    result = ocr.ocr(processed)

    lines: list[str] = []
    confidences: list[float] = []

    if result and result[0]:
        for line in result[0]:
            if line and len(line) >= 2:
                text_conf = line[1]  # (text, confidence)
                text = text_conf[0].strip()
                conf = float(text_conf[1])

                if text:
                    lines.append(text)
                    confidences.append(conf)

    page_text = "\n".join(lines)
    mean_conf = sum(confidences) / len(confidences) if confidences else 0.0

    return OcrPageResult(
        text=page_text,
        confidence=round(mean_conf, 4),
        line_count=len(lines),
    )


def ocr_from_pdf(file_bytes: bytes) -> OcrResult:
    """Run OCR on all pages of a PDF.

    Converts each page to a 300 DPI image, then runs PaddleOCR.

    Args:
        file_bytes: Raw PDF content.

    Returns:
        OcrResult with aggregated text from all pages.
    """
    import fitz

    doc = fitz.open(stream=file_bytes, filetype="pdf")
    page_results: list[OcrPageResult] = []

    for page_idx in range(doc.page_count):
        page = doc.load_page(page_idx)

        # Render page to image at 300 DPI for OCR quality
        mat = fitz.Matrix(300 / 72, 300 / 72)  # 72 DPI → 300 DPI
        pix = page.get_pixmap(matrix=mat)

        # Convert to numpy array
        img_data = pix.tobytes("ppm")
        img_array = np.frombuffer(img_data, dtype=np.uint8)

        # Decode PPM to numpy via OpenCV
        nparr = np.frombuffer(pix.samples, dtype=np.uint8).reshape(
            pix.height, pix.width, pix.n
        )

        # Convert RGB to BGR for OpenCV
        if pix.n == 4:  # RGBA
            img_bgr = cv2.cvtColor(nparr, cv2.COLOR_RGBA2BGR)
        elif pix.n == 3:  # RGB
            img_bgr = cv2.cvtColor(nparr, cv2.COLOR_RGB2BGR)
        else:
            img_bgr = nparr

        logger.debug("OCR processing page %d/%d (%dx%d)", page_idx + 1, doc.page_count, pix.width, pix.height)
        page_result = _run_ocr_on_image(img_bgr)
        page_results.append(page_result)

    doc.close()

    return _aggregate_results(page_results)


def ocr_from_image(file_bytes: bytes) -> OcrResult:
    """Run OCR on a single image file (PNG/JPEG).

    Args:
        file_bytes: Raw image content.

    Returns:
        OcrResult with extracted text.
    """
    # Convert bytes to numpy array
    nparr = np.frombuffer(file_bytes, dtype=np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        logger.error("Failed to decode image for OCR")
        return OcrResult(text="", confidence=0.0, quality="NEEDS_REVIEW")

    logger.debug("OCR processing image (%dx%d)", img.shape[1], img.shape[0])
    page_result = _run_ocr_on_image(img)

    return _aggregate_results([page_result])


def _aggregate_results(page_results: list[OcrPageResult]) -> OcrResult:
    """Aggregate OCR results from multiple pages."""
    all_text_parts: list[str] = []
    all_confidences: list[float] = []

    for pr in page_results:
        if pr.text.strip():
            all_text_parts.append(pr.text)
        if pr.line_count > 0:
            all_confidences.append(pr.confidence)

    full_text = "\n\n".join(all_text_parts)
    mean_confidence = (
        sum(all_confidences) / len(all_confidences) if all_confidences else 0.0
    )
    quality = _classify_quality(mean_confidence)

    logger.info(
        "OCR complete: %d pages, %d chars, confidence=%.2f, quality=%s",
        len(page_results),
        len(full_text),
        mean_confidence,
        quality,
    )

    return OcrResult(
        text=full_text,
        confidence=round(mean_confidence, 4),
        quality=quality,
        page_results=page_results,
    )
