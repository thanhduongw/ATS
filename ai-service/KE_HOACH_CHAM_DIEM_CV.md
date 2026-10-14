# Kế hoạch triển khai — Chấm điểm CV & nhận xét

> Tài liệu làm việc: yêu cầu đã chốt + kế hoạch triển khai. Cập nhật cột **Trạng thái** khi làm xong từng việc.
> Ngày lập: 2026-10-14.

---

## 1. Yêu cầu đã chốt

### 1.1. Chức năng sản phẩm

| Hạng mục | Quyết định |
|---|---|
| Người đọc kết quả | Chỉ nhân sự nội bộ |
| Quyền | **Xem**: Company Admin, Recruiter, Hiring Manager (HM chỉ hồ sơ phòng ban mình). **Chấm lại / chấm bù**: Admin + Recruiter |
| Kích hoạt | Tự động khi ứng viên nộp hồ sơ (`application.created`) + HR bấm "Chấm lại" + nút "Chấm tất cả hồ sơ của tin" (chấm bù hồ sơ cũ / chưa có điểm) |
| Luồng | **Gọi LLM 2 lần riêng**: (1) trích xuất CV theo schema `ExtractedCV` → lưu DB; (2) chấm điểm trên dữ liệu đã trích xuất (đã lọc thông tin cá nhân) |
| Model | `gemini-3.5-flash-lite` cho cả trích xuất và chấm. **Không dự phòng** — lỗi thì đánh dấu `FAILED` để HR chấm lại |
| Cách tính điểm | LLM xếp mức 0–4 cho từng khía cạnh; **Python** tính điểm 0–100 |
| Khung chấm | 5 khía cạnh cố định: Kỹ năng chuyên môn 35% · Kinh nghiệm liên quan 25% · Cấp bậc/số năm 15% · Học vấn/chứng chỉ 10% · Lĩnh vực/ngành 15%. JD không nhắc khía cạnh nào → bỏ, chia lại trọng số. Không dùng `benchmarkCriteria` của tin |
| Số năm kinh nghiệm | LLM chỉ **đọc** mốc thời gian; **Python tính** (`calculate_years_of_experience`, gộp khoảng chồng lấn). Bước chấm nhận số năm Python tính + số năm ứng viên tự ghi + ngày hiện tại |
| Kết quả | Điểm 0–100 + **3 mức xếp loại**: Phù hợp tốt / Tiềm năng / Chưa phù hợp. Ngưỡng tạm **≥70 / 50–69 / <50**, sau đó thay bằng ngưỡng hiệu chỉnh từ benchmark |
| Yêu cầu bắt buộc | Trượt → **chỉ cảnh báo** (không trừ điểm, không chặn trần) |
| Nhận xét | Chỉ **tóm tắt tổng quan**, luôn **tiếng Việt**, không trích bằng chứng. Câu mở đầu do Python ghép theo điểm + xếp loại (không mâu thuẫn với điểm), phần sau do LLM viết |
| Chỉnh điểm | HR **không** được sửa điểm AI |
| Chấm mù | Bước chấm **không** nhận: tên, email, SĐT, địa chỉ/location, ngày sinh, giới tính, link LinkedIn/GitHub/portfolio. Tên ứng viên trong văn bản tự do (summary, description) được che |
| Prompt | **Một tin nhắn duy nhất** (hướng dẫn + dữ liệu), `temperature=0`, `seed` cố định — giống hệt giữa sản phẩm và benchmark |
| Lưu trữ CV | **AWS S3**, bỏ MinIO. CV chấm là `application.resumeUrl` (bản chụp lúc nộp) |
| Kết quả trích xuất | Lưu DB, dùng chung cho chấm điểm và trang hồ sơ (bỏ cache `localStorage`) |
| Giao diện web HR | Cột điểm + nhãn ở danh sách hồ sơ · sắp xếp/lọc theo điểm (phía server) · thẻ chi tiết: điểm, nhãn, nhận xét, 5 thanh điểm khía cạnh, cảnh báo bắt buộc, nút Chấm lại |

### 1.2. Benchmark (phục vụ báo cáo / bảo vệ đồ án)

| Hạng mục | Quyết định |
|---|---|
| Dữ liệu | Hugging Face `cnamuangtoun/resume-job-description-fit` (3 nhãn No Fit / Potential Fit / Good Fit, tiếng Anh) |
| Quy mô | **Test 150** (50/nhãn, split test) + **Calib 60** (20/nhãn, split train, loại CV trùng với test) |
| Ngôn ngữ | Bản gốc tiếng Anh + bản dịch tiếng Việt |
| Dịch | `google/gemini-2.5-flash` (khác model chấm) |
| So sánh | Mốc không dùng AI (ngẫu nhiên, đếm từ khoá, TF-IDF) · model mở `qwen/qwen3-235b-a22b-instruct-2507` (qua quota, chấm cả EN và bản dịch VI) |
| Thí nghiệm thêm | Độ ổn định (chấm lặp cùng input) |
| Nơi chạy | **Toàn bộ trên Kaggle** (quota AI Kaggle Benchmarks, SDK `kaggle-benchmarks`); máy local chỉ chuẩn bị dữ liệu, tính chỉ số, xuất báo cáo |
| Nguyên tắc | Notebook **gọi đúng code chấm của ai-service** (provider `kbench`), không viết bản riêng |
| Ngưỡng | Hiệu chỉnh trên calib (tối ưu macro-F1) → ghi vào config sản phẩm |

### 1.3. Kết quả thăm dò Kaggle (`benchmark/kaggle/probe_result.json`)

- `kaggle-benchmarks` 0.6.1, 43 model; có `google/gemini-3.5-flash-lite`, `google/gemini-2.5-flash`, `qwen/qwen3-235b-a22b-instruct-2507`. **Không có Qwen3-8B.**
- `llm.prompt(message, schema, seed, temperature, reasoning, extra_api_params, …)` — **không có system prompt, không có max_tokens**. `llm.prompt` giữ lịch sử hội thoại → mỗi lời gọi phải nằm trong `kbench.chats.new()`.
- Structured output với Pydantic chạy tốt, ~1,8 s/lời gọi; 4 lần chấm cùng input cho **mức giống hệt nhau**.
- 6 lời gọi tốn ~$0,01 (quota $10/ngày, $100/tháng).
- LLM tính sai số năm kinh nghiệm ("2019–2023, 2023–nay" → "hơn 4 năm") → lý do để Python tính.

---

## 2. Luồng tổng thể

```
Ứng viên nộp hồ sơ ──► application.created (RabbitMQ)
        │                                   HR: "Chấm lại" / "Chấm tất cả hồ sơ của tin"
        ▼                                                │
ai-service ◄──────────────────────────────────────────────┘
  1. application summary + job posting (service Java) + tải CV từ S3 theo resumeUrl
  2. Trích text (Phase 1: PDF / DOCX / OCR)
  3. [LLM #1] ExtractedCV ──► cv_extractions (khoá: sha256 file + prompt version; có rồi thì dùng lại)
  4. Python: tính số năm · lọc trường cá nhân · che tên trong văn bản tự do
  5. [LLM #2] 5 khía cạnh (applicable, mức 0–4, lý do) + yêu cầu bắt buộc chưa đạt + tóm tắt tiếng Việt
  6. Python: điểm 0–100 · xếp loại · câu mở đầu nhận xét · cảnh báo
  7. ai_scores + ai_jobs ──► phát ai.scoring.completed
        ▼
application-service: lưu ai_score / ai_tier / ai_status vào hồ sơ ──► danh sách sắp xếp / lọc ở server
```

---

## 3. Kế hoạch theo giai đoạn

Thứ tự: **0 → 1 → 2 → 5 (benchmark, lấy ngưỡng) → 3 → 4 → 6**. Mỗi giai đoạn kết thúc bằng test của chính nó.

### Giai đoạn 0 — Nền tảng & lưu trữ S3

| # | File | Việc | Trạng thái |
|---|---|---|---|
| 0.1 | `docker-compose.yml` | Xoá service `minio` + volume `miniodata`; ai-service bỏ `S3_ENDPOINT/ACCESS/SECRET` MinIO, đọc khoá AWS từ `ai-service/.env`; bỏ `depends_on: minio` | ☑ |
| 0.2 | `app/core/config.py`, `.env.example` | `s3_endpoint` mặc định rỗng (AWS), thêm `s3_region`; model `gemini-3.5-flash-lite`, bỏ fallback; ngưỡng xếp loại (70/50); múi giờ cho "ngày hiện tại" | ☑ |
| 0.3 | `app/core/s3_client.py` | boto3 không `endpoint_url` khi rỗng; `parse_file_url` hiểu URL virtual-hosted `https://{bucket}.s3.{region}.amazonaws.com/{key}` (và path-style); **chỉ cho đọc bucket đã cấu hình**; bỏ tạo bucket lúc khởi động | ☑ |
| 0.4 | `candidate-service/.../S3Service.java` | Bỏ nhánh `saveLocally` — upload S3 lỗi thì báo lỗi cho người dùng (CV luôn nằm trên S3) | ☑ |
| 0.5 | `app/core/llm_client.py` | Chế độ một tin nhắn; `temperature=0`, `seed`; `use_fallback`; timeout Gemini; giá `gemini-3.5-flash-lite` trong `MODEL_COSTS`; **provider `kbench`** (import lười `kaggle_benchmarks`, gọi trong `kbench.chats.new()`) | ☑ |
| 0.6 | `app/core/auth.py` (mới) | Danh tính từ header `X-User-*` (gateway đã xoá header giả); `require_internal`, `require_hr` | ☑ |
| 0.7 | `app/core/java_services.py` (mới) + application-service | Gọi application-service (summary, danh sách hồ sơ theo tin) và recruitment-service (tin tuyển dụng). Lỗi mạng quy về `JavaServiceError`. **Thêm `resumeUrl` vào `ApplicationSummaryResponse`** (SYSTEM chỉ gọi được summary). recruitment-service không nhận SYSTEM → worker đọc tin qua `/public/jobs/{id}` (tin OPEN lúc vừa nộp); HR chấm lại/chấm bù dùng danh tính HR | ☑ |
| 0.8 | `app/main.py` | Khoá router AI cho nội bộ; khởi động worker; bỏ `ensure_bucket_exists` | ☑ |
| 0.9 | Frontend `features/ai/aiApi.ts` | Bỏ chú thích/logic MinIO | ☑ |

**Kết quả Giai đoạn 0:** ai-service 53 test qua (`tests/test_phase0_foundation.py` mới: URL S3, LLM một tin nhắn / không dự phòng / provider kbench, auth); candidate-service 10/10, application-service 13/13 (`mvn -o test`); frontend `tsc --noEmit` sạch; `docker compose config` hợp lệ. Sửa test cũ `test_no_bias_fields_in_schema` theo thiết kế (trích xuất giữ ngày sinh/giới tính, bước chấm loại ra).

**Cần người dùng làm:** điền `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` vào `ai-service/.env` (nên tạo IAM user chỉ có quyền `s3:GetObject` trên bucket `ats-system-cv-storage`).

### Giai đoạn 1 — Trích xuất CV lưu DB

| # | File | Việc | Trạng thái |
|---|---|---|---|
| 1.1 | `app/models`, `docker/postgres-init/init-databases.sql` | Bảng `cv_extractions`: `id`, `file_hash` (sha256), `prompt_version` (unique cùng `file_hash`), `candidate_id`, `resume_url`, `status`, `extracted` JSONB, `years_calculated`, `years_claimed`, `model`, `provenance` JSONB, `error_message`, `created_at`, `updated_at` | ☑ |
| 1.2 | `app/services/prompts/cv_extraction.py` | Dạng một tin nhắn; `PROMPT_VERSION = "v1.1"` | ☑ |
| 1.3 | `app/services/cv_extraction_engine.py` | `_parse_date` bổ sung: "hiện nay", "đến nay", "to present", "12.2020", "2020.12"…; hàm `get_or_extract(cv_bytes, …)` dùng lại theo hash | ☑ |
| 1.4 | `app/api/cv_extraction.py` | `GET /cv-extractions?applicationId=` (kiểm tra quyền qua application-service), `POST /cv-extractions/re-extract?applicationId=` (HR). **Bỏ tải URL tuỳ ý** (SSRF) | ☑ |
| 1.5 | Frontend `CandidateApplicationDetailPage.tsx`, `features/ai/aiApi.ts` | Đọc kết quả trích xuất qua API mới; xoá `features/ai/cvCacheService.ts` | ☑ |
| 1.6 | `tests/` | Test `_parse_date`, `calculate_years_of_experience`, `get_or_extract` (LLM giả, DB giả) | ☑ |
| 1.7 | `app/services/ocr_engine.py` | Sửa theo API PaddleOCR 3.x (`use_gpu` không còn → `ValueError`; dùng `predict()`, đọc `rec_texts`/`rec_scores`) để CV scan đọc được | ☑ |

**Kết quả Giai đoạn 1:** ai-service 102 test qua (`tests/test_phase1_extraction.py`: định dạng ngày, số năm, lưu trữ trên Postgres thật — DB riêng `ats_ai_test`, chạy đồng thời, lỗi LLM → FAILED rồi thử lại, API phân quyền); frontend `tsc` sạch. Chạy thật: CV trên S3 → PyMuPDF → `gemini-3.5-flash-lite` 14,3 s, ~$0,005; lần 2 lấy từ DB 0,01 s. OCR chạy thật được (ảnh PNG + PDF scan, độ tin cậy 0,99).

Ghi chú phát sinh:
- Số năm / ngày tháng tách ra `app/services/experience.py` (Python thuần, nhận `today` — chấm điểm tính lại theo ngày chấm).
- Bỏ endpoint `POST /extract-cv` (storage key); `GET /cv-extractions` lấy CV từ `resumeUrl` của hồ sơ, client không truyền URL.
- "Thử lại" (mọi nhân sự nội bộ) = GET — lần trước FAILED thì tự trích xuất lại; "Phân tích lại" (force) chỉ HR.
- **OCR tiếng Việt mất chữ dấu chồng** (ệ, ậ, ố…): từ điển ký tự của model PaddleOCR 3.x không có dải U+1EA0–U+1EF9 — giới hạn của model, chỉ ảnh hưởng CV scan/ảnh. Cần quyết định có thay OCR (vd gửi ảnh cho Gemini đọc) hay chấp nhận.
- **Postgres local chưa có database `ats_ai`** (volume tạo trước khi init SQL có dòng `CREATE DATABASE ats_ai`) → ai-service không kết nối được DB. Cần tạo DB (`CREATE DATABASE ats_ai;`) hoặc tạo lại volume.

### Giai đoạn 2 — Chấm điểm

| # | File | Việc | Trạng thái |
|---|---|---|---|
| 2.1 | `app/services/scoring/` (mới, **Python thuần** — không import DB/RabbitMQ) | `profile.py`: whitelist trường từ `ExtractedCV`, che tên trong văn bản tự do · `prompt.py`: một tin nhắn gồm JD (title, experienceRequired, description, requirements — **không** benefits), hồ sơ đã lọc, ngày hiện tại, số năm tính được / tự ghi · `engine.py`: `compute_score()`, xếp loại, câu mở đầu nhận xét | ☑ |
| 2.2 | `app/schemas/scoring.py` (mới) | Đầu ra LLM: 5 × `{dimension, applicable, level 0–4, reason}`, `must_have_unmet[]`, `summary`. Kết quả: `total_score`, `tier`, `dimensions[]` (trọng số gốc / hiệu dụng, điểm), `must_have_unmet`, `comment`, `provenance` | ☑ |
| 2.3 | `app/models`, SQL | Bảng `ai_scores` (1 dòng/hồ sơ, **không** cột chỉnh điểm): `application_id` unique, `job_posting_id`, `candidate_id`, `cv_extraction_id`, `ai_job_id`, `status` (PENDING/COMPLETED/FAILED), `total_score`, `tier`, `result` JSONB, `provenance` JSONB, `error_message`, thời gian. Ghi log vào `ai_jobs` | ☑ |
| 2.4 | `app/services/application_scoring.py` (mới) | Luồng 1–7. Bắt **mọi** exception → `FAILED` kèm lý do; `INSERT … ON CONFLICT` + khoá dòng (worker và Chấm lại không đụng nhau); chấm lại thất bại thì xoá điểm cũ, không để "điểm cũ + FAILED" | ☑ |
| 2.5 | `app/workers/scoring_worker.py` (mới) | Nghe `application.created` (queue `ai.application-created.queue`), giới hạn song song, luôn ack (không có DLQ) | ☑ |
| 2.6 | `app/api/application_scores.py` (mới) | `GET /scores/{applicationId}` (nội bộ, kiểm tra phạm vi), `POST /scores/{applicationId}/rescore` (HR), `POST /scores/rescore-posting?jobPostingId=` (HR, chấm bù các hồ sơ chưa có điểm/FAILED, chạy nền, trả số hồ sơ đưa vào hàng đợi) | ☑ |
| 2.7 | `tests/` | Lọc PII (mốc thời gian **không** bị che), `compute_score` (chia lại trọng số, xếp loại, cảnh báo), ghép prompt, luồng worker với LLM giả, xử lý lỗi, xung đột chấm đồng thời | ☑ |

**Kết quả Giai đoạn 2:** ai-service 128 test qua (`tests/test_phase2_scoring.py`: chấm mù — không lộ tên/SĐT/ngày sinh/giới tính/link, mốc thời gian không bị che; trọng số chia lại; ngưỡng; bắt buộc chỉ cảnh báo; luồng chấm trên Postgres thật — thành công, lỗi xoá điểm cũ, thiếu CV, tin đóng, trích xuất lỗi, 3 tiến trình đồng thời chỉ 1 chấm, PROCESSING quá hạn được chấm lại; worker; API phân quyền + chấm bù). Chạy thật (CV Java backend vs tin Frontend 5 năm React): 30/100 "Chưa phù hợp", 3 yêu cầu bắt buộc chưa đạt, 2 lần chấm cho mức giống hệt; ~$0,0018 / lần, 2–6 s.

Ghi chú phát sinh:
- Một hồ sơ chỉ một tiến trình chấm tại một thời điểm (`INSERT … ON CONFLICT … WHERE status <> PROCESSING`); PROCESSING/PENDING quá 10 phút coi là tiến trình chết → chấm lại được.
- Chấm bù: hồ sơ chưa có điểm, FAILED, hoặc PENDING/PROCESSING quá hạn → đánh dấu PENDING rồi chấm nền (giới hạn `SCORING_MAX_PARALLEL`).
- Gói `app/services/scoring/` không import DB/RabbitMQ (kiểm tra bằng test import) — dùng nguyên cho benchmark.
- Postgres local dùng image không có pgvector → bảng `cv_document_chunks` (RAG, chưa dùng) không tạo được; không ảnh hưởng tính năng chấm.

### Giai đoạn 5 — Benchmark trên Kaggle (`ai-service/benchmark/`)

| # | Bước | Chạy ở | Nội dung | Trạng thái |
|---|---|---|---|---|
| 5.1 | `prepare_data.py` | Local | Tải HF, lấy mẫu phân tầng test 150 / calib 60, loại CV trùng; đóng gói `app/services/scoring` + `cv_extraction` + dữ liệu thành Kaggle Dataset | ☑ |
| 5.2 | `kaggle/01_translate.ipynb` | Kaggle | Dịch văn bản duy nhất EN→VI bằng `gemini-2.5-flash`; chạy tiếp được; kiểm tra tỉ lệ độ dài, thuật ngữ, con số | ⏳ notebook xong, chờ chạy trên Kaggle |
| 5.3 | `kaggle/02_score.ipynb` | Kaggle | Mỗi model × ngôn ngữ: trích xuất → Python → chấm (đúng code ai-service, provider `kbench`); model `gemini-3.5-flash-lite`, `qwen3-235b-a22b-instruct-2507`; `on_failure="continue"`; lưu JSONL thô | ⏳ notebook xong, chờ chạy trên Kaggle |
| 5.4 | `kaggle/02_score.ipynb` (ô STABILITY) | Kaggle | 50 cặp test × thêm 2 lần chấm (flash-lite, tiếng Việt) | ⏳ notebook xong, chờ chạy trên Kaggle |
| 5.5 | `baselines.py` | Local | Ngẫu nhiên, đếm từ khoá, TF-IDF | ☑ |
| 5.6 | `evaluate.py` | Local | Ngưỡng trên calib (macro-F1); trên test: accuracy, macro-F1, P/R/F1 từng nhãn, ma trận nhầm lẫn, QWK, bootstrap CI 95%; McNemar (AI vs TF-IDF, EN vs VI, Gemini vs Qwen); độ ổn định; tỉ lệ lỗi trích xuất; chi phí, độ trễ | ☑ |
| 5.7 | `report.py` | Local | Báo cáo HTML + biểu đồ; **ghi ngưỡng hiệu chỉnh vào config** | ◐ report xong; ghi ngưỡng vào config sau khi có kết quả |

**Tiến độ Giai đoạn 5 (code):** dữ liệu 210 cặp (test 150 + calib 60; calib loại 2.414 cặp train trùng CV/JD với test) — 177 CV + 104 JD duy nhất, ~1,33 triệu ký tự; gói Kaggle `benchmark/build/ats-cv-scoring-benchmark.zip` (dữ liệu + đúng code ai-service + runner). Runner dịch / chấm chạy tiếp được sau khi hết quota (đọc output lần trước làm input). Đã chạy thử 2 notebook trên máy với `kaggle_benchmarks` giả lập + chuỗi runner → evaluate → report trên 210 cặp (`tests/test_benchmark.py`, 11 test). Baseline tiếng Anh (test 150): TF-IDF macro-F1 0,338, ngẫu nhiên 0,289, từ khoá 0,275 — bài toán khó, baseline gần mức đoán.

Ước tính thực tế: 281 lời gọi dịch + ~708 trích xuất (177 CV × 2 model × 2 ngôn ngữ) + 840 chấm + 100 chấm lặp ≈ 1.930 lời gọi.

Quota ước tính (ban đầu): ~420 trích xuất + ~840 chấm (2 model) + ~100 ổn định + <420 dịch ≈ **1.800 lời gọi** — vài USD với Gemini; giá Qwen đo ở lượt đầu, chia lượt theo ngày nếu cần.

### Giai đoạn 3 — application-service (sắp xếp / lọc phía server)

| # | Việc | Trạng thái |
|---|---|---|
| 3.1 | Consumer `ai.scoring.completed` → cập nhật `Application.aiScore`, `aiTier`, `aiStatus` | ☐ |
| 3.2 | Cột mới cho `applications` (theo cách quản lý schema hiện có của service) | ☐ |
| 3.3 | Endpoint danh sách: `sort=aiScore,asc|desc`, lọc `aiTier`; trả các trường AI trong `ApplicationResponse` | ☐ |
| 3.4 | Test service/listener | ☐ |

### Giai đoạn 4 — Frontend web HR

| # | Việc | Trạng thái |
|---|---|---|
| 4.1 | `ApplicationsPage`: cột badge điểm + xếp loại, sắp xếp, lọc theo xếp loại; nút "Chấm tất cả hồ sơ của tin" (Admin/Recruiter) | ☐ |
| 4.2 | `CandidateApplicationDetailPage`: thẻ AI (điểm, nhãn, nhận xét, 5 thanh khía cạnh, cảnh báo bắt buộc, trạng thái đang chấm / lỗi); nút Chấm lại chỉ Admin/Recruiter | ☐ |
| 4.3 | `npx tsc --noEmit` sạch | ☐ |

### Giai đoạn 6 — Kiểm thử tổng

| # | Việc | Trạng thái |
|---|---|---|
| 6.1 | Toàn bộ unit/integration test ai-service, application-service, candidate-service | ☐ |
| 6.2 | Thử tay end-to-end: nộp hồ sơ → điểm hiện ở danh sách + chi tiết; Chấm lại; Chấm tất cả; HM phòng ban khác không xem được; CV scan (OCR) | ☐ |

---

## 4. Rủi ro đã biết & cách xử lý

| Rủi ro | Xử lý |
|---|---|
| Trích xuất bỏ sót thông tin → chấm thiếu | Schema đầy đủ (mô tả, công nghệ, dự án, chứng chỉ…); benchmark đo tỉ lệ lỗi trích xuất riêng |
| LLM tính sai số năm | Python tính, đưa con số + ngày hiện tại vào prompt |
| Thiên vị | Bước chấm không nhận trường cá nhân; che tên trong văn bản tự do |
| Gemini free tier bị giới hạn lượt gọi | Worker giới hạn song song; lỗi → FAILED, HR chấm lại / chấm bù |
| Benchmark lệch sản phẩm | Cùng code, cùng prompt một tin nhắn, cùng `temperature`/`seed`, cùng model |
| Model trên Kaggle thay đổi theo thời gian | Ghi `model`, `prompt_version`, phiên bản `kaggle-benchmarks` vào từng kết quả |
| OCR (PaddleOCR 3.x) chưa tương thích code hiện tại | Việc 1.7; kiểm thử ở 6.2 |
