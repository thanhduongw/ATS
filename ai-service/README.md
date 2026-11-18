# ai-service

AI Service của hệ thống ATS — FastAPI (Python). Chấm mức độ phù hợp giữa CV và tin tuyển dụng (JD) theo quy trình của
nghiên cứu SSRC 2026 (thư mục [`research/`](research/README.md)); kết quả là điểm 0–100 và xếp loại **Phù hợp /
Chưa phân loại / Không phù hợp** để HR tham khảo. AI chỉ gợi ý; HR là người quyết định.

## Quy trình chấm

```
hồ sơ (resumeUrl) + tin tuyển dụng
  → JDFacts   : yêu cầu của JD, mỗi yêu cầu kèm câu trích nguyên văn         (lưu `jd_facts`, theo sha256 nội dung JD)
  → đọc chữ CV: PDF / DOCX / ảnh (OCR), chuẩn hoá, quét chèn lệnh
  → che PII   : tên, email, SĐT, link, ngày sinh, địa chỉ… trước khi gửi AI   (`app/services/privacy.py`)
  → CVFacts   : dữ kiện CV (kinh nghiệm, kỹ năng, học vấn, chứng chỉ, dự án, ngoại ngữ) kèm câu trích (lưu `cv_facts`, theo sha256 file)
  → chính sách chứng chỉ do code suy từ JD: REQUIRED / PREFERRED / NOT_SPECIFIED
  → prompt B  : AI chấm 4 tiêu chí 1–5 (Kinh nghiệm làm việc, Kỹ năng, Học vấn, Chứng chỉ) kèm lý do và câu trích
  → code kiểm tra câu trích (sai thì hỏi lại AI 1 lần, vẫn sai → FAILED) và quy tắc chấm
  → điểm 0–100 = trung bình các tiêu chí có điểm × 20; xếp loại theo ngưỡng
  → `ai_scores` + `ai_jobs`; phát sự kiện `ai.scoring.completed`
```

**Xếp loại** (ngưỡng trong `.env`): Phù hợp ≥ `SCORING_FIT_THRESHOLD` (70) · Chưa phân loại từ `SCORING_NOT_FIT_THRESHOLD`
(60) đến dưới 70 · Không phù hợp dưới 60. Đủ 70 nhưng có tiêu chí = 1 điểm thì hạ về Chưa phân loại (chỉ hạ, không nâng);
CV nghi chèn lệnh vào AI thì không tự xếp Phù hợp. Chứng chỉ không áp dụng (JD không nêu) thì điểm chia cho 3 tiêu chí.

**Prompt B giữ nguyên văn** từ `research/data/prompts/prompt_B.txt` và `research/prompts.py` (chép sang
`app/services/prompts/`); `tests/test_ssrc_prompt.py` so sánh từng ký tự với `research.prompts.score_prompt("B", …)`.
Mã trong `app/` không import từ `research/`.

## Tech stack
- **Framework:** FastAPI, SQLAlchemy (async), PostgreSQL
- **LLM:** Google Gemini qua `google-genai` (`response_json_schema`); model đặt bằng `PRIMARY_LLM_MODEL`
- **OCR:** PaddleOCR PP-OCRv4 · **PDF:** PyMuPDF · **DOCX:** python-docx
- **Tìm kiếm vector:** pgvector + `gemini-embedding-001` (Talent Pool, gợi ý ứng viên theo tin, phát hiện CV trùng)
- **Message queue:** RabbitMQ (nghe `application.created`, `cv.uploaded`, `candidate.data_deleted`, `candidate.deleted`; phát `ai.scoring.completed`)

## Chạy local
```bash
cd ai-service
pip install -r requirements.txt
cp .env.example .env        # điền GOOGLE_API_KEY, DATABASE_URL, RABBITMQ_URL, AWS_*
uvicorn app.main:app --host 0.0.0.0 --port 8088 --reload
```
Khi khởi động, `app/core/schema_migrate.py` tạo bảng còn thiếu và chuyển cấu trúc cũ (SQL idempotent).

## API (qua API Gateway, tiền tố `/api/v1/ai`)
| Method | Đường dẫn | Ai gọi | Việc |
|:---|:---|:---|:---|
| GET | `/health`, `/health/detailed` | — | Kiểm tra sức khỏe |
| GET | `/scores/{applicationId}` | nhân sự nội bộ có quyền xem hồ sơ | Điểm AI của hồ sơ (404 = chưa chấm) |
| POST | `/scores/{applicationId}/rescore` | Admin, Recruiter | Chấm lại ngay (10–40 giây) |
| POST | `/scores/rescore-posting?jobPostingId=` | Admin, Recruiter | Chấm bù hồ sơ chưa có điểm / lỗi của một tin (nền) |
| POST | `/scores/rescore-all` | Admin | Chấm lại **toàn bộ** hồ sơ có CV (nền) — dùng sau khi đổi cách chấm |
| GET | `/cv-extractions?applicationId=` | nhân sự nội bộ có quyền xem hồ sơ | Dữ kiện CV (`CVFacts`) của hồ sơ |
| POST | `/cv-extractions/re-extract?applicationId=` | Admin, Recruiter | Trích xuất lại CV |
| POST | `/talent/search` | HR | Tìm ứng viên Talent Pool bằng câu hỏi tự nhiên |
| GET | `/talent/suggest?jobPostingId=` | HR | Gợi ý ứng viên Talent Pool cho một tin |
| GET | `/duplicates` · POST `/duplicates/{id}/dismiss\|confirm` | HR | Cặp ứng viên nghi trùng |
| GET | `/embeddings/status` · POST `/embeddings/backfill` | Admin | Trạng thái và lập lại chỉ mục vector |

**Tìm kiếm vector dựa trên `cv_facts`.** Đoạn văn bản để embed lấy từ câu trích của CV đã che thông tin cá nhân. Số năm
kinh nghiệm (`experience_years`, ước từ phần "Kinh nghiệm" của văn bản CV) và danh sách kỹ năng chỉ để lọc, là ước lượng
chứ không phải trường có cấu trúc; chức danh không còn được lưu. Tên/email/SĐT chỉ lưu dạng băm
(`cv_facts.text_metadata.identity`) để phát hiện trùng. Sau khi đổi cách chấm cần chấm lại hồ sơ (để có `cv_facts`)
rồi gọi `POST /embeddings/backfill?force=true`.

## Cấu hình chính (`.env`)
`GOOGLE_API_KEY`, `PRIMARY_LLM_MODEL`, `FALLBACK_LLM_MODEL` (để trống = không dự phòng), `SCORING_FIT_THRESHOLD`,
`SCORING_NOT_FIT_THRESHOLD`, `SCORING_MAX_PARALLEL`, `DATABASE_URL`, `RABBITMQ_URL`, `AWS_*`, địa chỉ các service Java.

## Kiểm thử
```bash
.venv/Scripts/python.exe -m pytest tests/test_ssrc_prompt.py -q     # từng file
```
`test_ssrc_flow.py` và `test_scores_api.py` cần Postgres (`TEST_DATABASE_URL`, mặc định `ats_ai_test`); không có thì tự bỏ qua.
Test thực nghiệm của bài báo nằm ở `research/tests/`.

## Sau khi triển khai
Khởi động lại ai-service rồi gọi `POST /api/v1/ai/scores/rescore-all` bằng tài khoản Admin để chấm lại mọi hồ sơ
(điểm cũ theo cách 5 tiêu chí 0–4 không đọc được theo cấu trúc mới). Kiểm số hồ sơ COMPLETED / FAILED trong `ai_scores`,
rồi chấm lại các hồ sơ lỗi (nút "Chấm lại" hoặc `POST /scores/{id}/rescore`).
