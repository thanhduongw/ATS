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

# Upgrade pip
RUN pip install --no-cache-dir --upgrade pip

# Install PyTorch CPU first (cached layer ~196MB)
RUN pip install --no-cache-dir --default-timeout=1000 --retries=5 \
    --index-url https://download.pytorch.org/whl/cpu torch>=2.2.0 \
    --extra-index-url https://pypi.org/simple

# Install PaddlePaddle & PaddleOCR (cached layer ~200MB)
RUN pip install --no-cache-dir --default-timeout=1000 --retries=5 \
    paddlepaddle>=2.6.0 paddleocr>=2.8.0

# Install remaining dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --default-timeout=1000 --retries=5 \
    --extra-index-url https://download.pytorch.org/whl/cpu \
    -r requirements.txt

# Pre-download PaddleOCR models (Vietnamese + English) to avoid runtime download
# This adds ~500MB to image but ensures fast cold starts
RUN python -c "\
from paddleocr import PaddleOCR; \
PaddleOCR(lang='vi', use_textline_orientation=True); \
print('PaddleOCR vi models downloaded successfully')"

# Pre-download sentence-transformers embedding model (Phase 4)
# This adds ~560MB to image but avoids download on first startup
RUN python -c "\
from sentence_transformers import SentenceTransformer; \
SentenceTransformer('intfloat/multilingual-e5-large-instruct'); \
print('Embedding model downloaded successfully')"

# Copy application code
COPY . .

EXPOSE 8088

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8088"]
