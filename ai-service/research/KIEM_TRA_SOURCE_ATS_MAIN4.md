# Kết quả đọc ATS-main(4).zip (phần AI)

Tập tin ZIP người dùng cung cấp làm mốc, không suy đoán source trên GitHub đã đồng bộ với ZIP.

| Tập tin gốc | Chức năng thực tế | Có sửa không? |
|---|---|---|
| `app/core/config.py` | Đọc GOOGLE_API_KEY, `primary_llm_model=gemini-3.5-flash-lite`, temperature=0 và seed=42 | Không |
| `app/core/llm_client.py` | Gemini SDK `google-genai`, Pydantic `response_schema`, retry, không fallback nếu tắt | Không; nghiên cứu tái sử dụng `GeminiClient` và `LLMManager` |
| `app/services/pdf_extractor.py` | Đọc PDF bằng PyMuPDF; đánh dấu trang text nghèo | Không; nghiên cứu tái sử dụng |
| `app/services/cv_extraction_engine.py` | CV text → Gemini → `ExtractedCV`; BẢN GỐC gửi CV text trước khi redaction | Không; nghiên cứu dùng `research/privacy.py` để kiểm soát PII trước mọi gọi API |
| `app/services/jd_extraction_engine.py` | JD → Gemini → `ExtractedJD` cho production | Không; nghiên cứu dùng `research/schema.py` riêng |
| `app/services/scoring/engine.py` | Pipeline scoring v2 production | Không |
| `app/services/scoring/prompt.py` | Prompt 5 tiêu chí production, không phải prompt nghiên cứu SSRC | Không |
| `app/services/scoring/rules.py`, `aggregate.py` | Chấm mức 0–4, gộp 0–100, tier | Không |
| `app/schemas/scoring_llm.py` | LLM chấm 3 chiều + kiểm tra yêu cầu; không trả 4 điểm trực tiếp | Không |
| `app/services/application_scoring.py`, `app/workers/scoring_worker.py` | Xử lý ứng tuyển, database/queue/S3 | Không |

**Lý do không chỉnh production:** nếu đổi schema `ScoreResult` hoặc 0–100 thành 4 chiều 1–5, API/worker/DB/UI hiện tại có thể không đọc được kết quả. Đề tài SSRC tập trung AI-Human agreement; nên module `ai-service/research` độc lập và không triển khai thành tính năng tuyển dụng tự động khi chưa có kiểm chứng.

## File mới

- `research/schema.py`: CVFacts, JDFacts, ScoreFour (4 mức điểm 1–5).
- `research/privacy.py`: tạo dữ liệu ẩn danh sơ bộ và buộc người dùng duyệt trước khi gửi API.
- `research/prompts.py`: prompt extract CV/JD, Baseline và Rubric + Evidence; có thể thay bằng prompt nghiên cứu riêng.
- `research/pipeline.py`: quote validation, fallback off, fingerprint cache, riêng từng lời gọi API.
- `research/run.py`: CLI prepare, approve, run, status, export.
- `research/preflight.py` và `research/data/pairs.csv` từ bộ 100 CV (Phase 1).
- `research/data/jd_policies.csv`: bổ sung xác minh Certifications.
- `research/tests/test_study.py`: logic và mock API.

**Kiểm tra đã thực hiện:** 100/100 PDF đọc được text qua PyMuPDF, manifest 100/100, 10/10 unit test, trích xuất local 1 CV, dry-run chặn JD/policy chưa xác nhận.

**Chưa kiểm thử:** Gemini API live (chưa có key và JD thật), môi trường Windows của người dùng, chất lượng ẩn danh thủ công và chất lượng chấm so với người thật. Kết quả sẽ chỉ có sau khi user chạy và được kiểm tra.
