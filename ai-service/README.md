# ai-service

AI Service cho hệ thống ATS — FastAPI (Python)

## Chức năng
- JD Generation + Benchmark Criteria
- CV Text Extraction (PDF/DOCX/OCR)
- CV Information Extraction (LLM → JSON)
- Matching & Scoring (RAG + LLM)
- Guardrail Validation
- Feedback Loop

## Tech Stack
- **Framework:** FastAPI
- **LLM:** GPT-4o-mini (primary), Gemini 3.7 Flash (fallback)
- **Embedding:** multilingual-e5-large-instruct (self-hosted)
- **OCR:** PaddleOCR PP-OCRv4
- **PDF:** PyMuPDF
- **Vector Store:** pgvector (PostgreSQL)
- **Message Queue:** RabbitMQ

## Chạy local
```bash
cd ai-service
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8088 --reload
```

## API Endpoints
- `GET  /api/v1/ai/health` — Health check
- `POST /api/v1/ai/jd/generate` — Sinh JD + benchmark
- `POST /api/v1/ai/benchmark/generate` — Sinh benchmark từ JD có sẵn
- `GET  /api/v1/ai/jobs/{jobId}/status` — Status xử lý AI
- `GET  /api/v1/ai/applications/{id}/score` — Lấy scorecard
- `POST /api/v1/ai/applications/{id}/rescore` — Trigger chấm lại
- `POST /api/v1/ai/feedback` — Recruiter feedback
