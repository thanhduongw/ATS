# ============================================================
# ai-service Dockerfile — Python FastAPI + PaddleOCR
# ============================================================
FROM python:3.11-slim AS base

# Prevent Python from writing .pyc and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies for PDF parsing, image processing, and OCR
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        gcc libpq-dev \
        libgl1 libglib2.0-0 libgomp1 \
        poppler-utils \
        curl && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download PaddleOCR models (Vietnamese + English) to avoid runtime download
# This adds ~500MB to image but ensures fast cold starts
RUN python -c "\
from paddleocr import PaddleOCR; \
PaddleOCR(lang='vi', use_textline_orientation=True); \
print('PaddleOCR vi models downloaded successfully')"

# Copy application code
COPY . .

EXPOSE 8088

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8088"]
