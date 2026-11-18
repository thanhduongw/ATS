# Kế hoạch: làm lại module AI chấm CV theo `ai-service/research` (SSRC 2026)

Chốt với người dùng ngày 18/11/2026. Làm trên nhánh **`ai-service`** (tạo từ `dev`).
Mục tiêu: cách chấm của sản phẩm khớp bài báo SSRC — trích xuất CV/JD thành dữ kiện có trích dẫn, chấm 4 tiêu chí 1–5
bằng **prompt B (Rubric + Evidence) giữ nguyên văn**, rồi code quy ra 0–100 và xếp loại.

## 0. Quyết định đã chốt

| # | Quyết định |
|---|---|
| 1 | Thay hẳn cách chấm v2 (5 tiêu chí 0–4) bằng cách của `research/`. |
| 2 | Dùng **prompt B** (`research/data/prompts/prompt_B.txt` + phần dữ liệu chung `_common_data` trong `research/prompts.py`), **giữ nguyên văn**, kể cả câu "CERTIFICATIONS_POLICY ĐÃ ĐƯỢC NGƯỜI NGHIÊN CỨU XÁC NHẬN". Không đưa số năm do code tính vào prompt. |
| 3 | AI trả điểm 1–5 từng tiêu chí; code tính **điểm 0–100 = trung bình các tiêu chí có điểm × 20** (trọng số bằng nhau; Chứng chỉ N/A thì chia 3). |
| 4 | Xếp loại theo ngưỡng: **Phù hợp ≥ 70 · Chưa phân loại 60 – < 70 · Không phù hợp < 60** (đặt trong `.env`). Đủ 70 nhưng có tiêu chí **= 1** → hạ về **Chưa phân loại** (chỉ hạ, không nâng). CV nghi chèn lệnh → không tự xếp Phù hợp (giữ như hiện nay). |
| 5 | Chính sách chứng chỉ do **code suy từ JD đã trích xuất**: có yêu cầu CERTIFICATIONS `REQUIRED` → `REQUIRED`; chỉ có `PREFERRED` → `PREFERRED`; không có → `NOT_SPECIFIED`. |
| 6 | Câu trích dẫn khi chấm không khớp → hỏi lại Gemini 1 lần (như research) → vẫn sai thì hồ sơ **FAILED**, HR thấy: "AI trích dẫn không khớp nội dung CV/JD, vui lòng chấm lại." |
| 7 | Giữ quy tắc research: JD `PREFERRED` mà CV không có chứng chỉ → Chứng chỉ phải = 3 (code kiểm tra). |
| 8 | **Bỏ hẳn `ExtractedCV`**; chỉ còn `CVFacts`. Khối "Phân tích CV" ở trang chi tiết hồ sơ hiển thị `CVFacts`. |
| 9 | Chuyển xong thì **chấm lại toàn bộ** hồ sơ. |
| 10 | Thẻ AI web: điểm + xếp loại + lý do, 4 dòng tiêu chí "x/5" bấm mở lý do / trích CV / trích JD. **Không có dòng chú thích cuối thẻ.** Mobile tương tự, gọn hơn. |
| 11 | Danh sách hồ sơ giữ badge điểm + xếp loại, bộ lọc, sắp xếp (application-service gần như không đổi). |
| 12 | **Giữ nguyên `ai-service/research/`** (hồ sơ thực nghiệm của bài báo). Không sửa, không import từ sản phẩm — chép logic sang `app/`. |
| 13 | Xoá cách chấm cũ, `benchmark/`, các test cũ và file thừa (mục 6). |

> **Hệ quả của quyết định 8 — người dùng đã đồng ý (18/11/2026):** bỏ nút **"AI đọc CV"** ở trang danh sách hồ sơ
> (`ApplicationsPage.tsx` → `AiCvUploadModal` → `POST /v1/ai/extract-cv/upload`), vốn điền sẵn form tạo ứng viên từ tên, email,
> SĐT, kỹ năng… của `ExtractedCV`. HR nhập form tay, vẫn tải CV lên như thường.

## 1. Trường dữ liệu (chép từ `research/schema.py`)

- **CVFacts**: `facts[] {category ∈ WORK_EXPERIENCE|SKILLS|EDUCATION|CERTIFICATIONS|PROJECT|LANGUAGE, quote (nguyên văn CV), note}`, `limitations[]`.
- **JDFacts**: `job_title`, `requirements[] {dimension ∈ WORK_EXPERIENCE|SKILLS|EDUCATION|CERTIFICATIONS, priority ∈ REQUIRED|PREFERRED, requirement, quote (nguyên văn JD)}`, `limitations[]`.
- **ScoreFour**: `work_experience | skills | education | certifications` → `{score 1–5 | null (chỉ Chứng chỉ khi NOT_SPECIFIED), reason, cv_evidence[], jd_evidence[]}`.

Nhãn tiếng Việt: Kinh nghiệm làm việc · Kỹ năng · Học vấn · Chứng chỉ. Nhóm dữ kiện CV: thêm Dự án · Ngoại ngữ.

## 2. ai-service

### 2.1 Luồng mới

```
summary hồ sơ (resumeUrl) → tin tuyển dụng (JobInfo.as_text: tiêu đề, kinh nghiệm, mô tả, yêu cầu, kỹ năng HR chọn)
→ JDFacts (lưu theo sha256 nội dung JD + phiên bản prompt)
→ tải CV từ S3 → đọc chữ (extraction_pipeline: PDF/DOCX/OCR, chuẩn hoá, quét chèn lệnh — GIỮ)
→ che PII tự động (privacy.redact của research) → CVFacts (lưu theo sha256 file + phiên bản prompt)
→ suy chính sách chứng chỉ → prompt B → ScoreFour → kiểm tra → điểm 0–100, xếp loại → ai_scores → ai.scoring.completed
```

### 2.2 Việc cụ thể

1. **Schema** `app/schemas/ssrc.py`: chép `CVFacts`, `JDFacts`, `Requirement`, `Fact`, `Rating`, `ScoreFour`, `validate_scoring`
   từ `research/schema.py`. Thêm `ScoreResult` mới (lưu vào `ai_scores.result`):
   `total_score, tier, tier_label, tier_reason, cert_policy, criteria[4] {key, label, score, applicable, reason, cv_evidence, jd_evidence},
   injection_detected, injection_patterns, scored_on`. Provenance: `model, prompt versions, prompt_hash, cv_facts_id, jd_facts_id,
   input/output tokens, cost, latency_ms, retries, validation_retries`.
2. **Prompt** `app/services/prompts/ssrc.py`: chép nguyên văn `cv_extraction_prompt`, `jd_extraction_prompt`, `_common_data`,
   và đọc nội dung prompt B (chép `prompt_B.txt` vào `app/services/prompts/ssrc_prompt_B.txt`). Giữ hằng phiên bản của research
   (`ssrc-cv-extract-v1`, `ssrc-jd-extract-v1`, `ssrc-rubric-evidence-v1`); lưu `sha256` prompt vào provenance.
   Kiểm tra bằng test: prompt sinh ra trùng ký tự với `research.prompts.score_prompt("B", …)` cho cùng đầu vào.
3. **Gemini**: schema có `extra="forbid"` / `Literal` → dùng cách `response_json_schema` như `research/gemini_client.py`
   (đưa vào `app/core/llm_client.py`, thay cho `response_schema`). Bỏ `KbenchClient`.
4. **Kiểm tra trích dẫn** (chép từ `research/pipeline.py`): `quote_in_source`; CV: loại dữ kiện có quote sai, hết dữ kiện → lỗi;
   JD: quote sai → lỗi; chấm: evidence phải nằm trong `facts[].quote` / `requirements[].quote`, prompt B thiếu `jd_evidence`
   ở tiêu chí JD có yêu cầu → lỗi, quy tắc PREFERRED = 3. Sai lần đầu → gửi lại kèm đoạn "YÊU CẦU SỬA…" như research, 1 lần.
5. **Che PII**: chép `privacy.redact` (sản phẩm không có bước người duyệt — ghi rõ trong tài liệu). `remaining_contact_indicators`
   còn dấu hiệu thì chỉ ghi cảnh báo vào ai_jobs, không chặn.
6. **Lưu DB**: bảng mới `cv_facts` (unique `file_hash, prompt_version`; `resume_url, candidate_id, status, result, provenance,
   text_metadata, error_code, error_message, timestamps`) và `jd_facts` (unique `content_hash, prompt_version`). Cơ chế
   INSERT … ON CONFLICT, FAILED lần sau thử lại — như `cv_extraction_store.py` / `jd_extraction_store.py` hiện nay.
   `create_all` không sửa bảng cũ → viết SQL idempotent lúc khởi động: thêm cột `ai_scores.cv_facts_id`, `jd_facts_id`;
   bỏ cột `cv_extraction_id`; `DROP TABLE IF EXISTS cv_extractions, jd_extractions, ai_feedback, cv_document_chunks`.
7. **Điểm và xếp loại** `app/services/scoring_ssrc.py` (Python thuần): tổng = mean × 20 (1 chữ số thập phân), ngưỡng
   `SCORING_FIT_THRESHOLD=70`, `SCORING_NOT_FIT_THRESHOLD=60` (thay `SCORING_THRESHOLD`/`SCORING_UNCERTAINTY`), luật
   "có tiêu chí = 1", luật chèn lệnh. `tier_reason` tiếng Việt nêu luật đã áp dụng.
8. **`application_scoring.py`**: giữ khung (giành quyền, ai_jobs, FAILED có lý do tiếng Việt, phát sự kiện — dạng sự kiện
   **không đổi**), thay phần giữa bằng luồng 2.1. Token/chi phí ai_jobs cộng cả bước trích xuất khi có gọi mới.
9. **API**: `GET /cv-extractions?applicationId=` và `POST /cv-extractions/re-extract` trả `CVFacts` (giữ đường dẫn).
   Thêm `POST /scores/rescore-all` (chỉ `COMPANY_ADMIN`): đánh dấu PENDING + chấm nền mọi hồ sơ có CV.
   Xoá `/extract-cv/upload`, `/extract-text`, `/extract-text/upload`.
10. **Xoá dữ liệu ứng viên** (`candidate.data_deleted`): xoá `cv_facts` của ứng viên, xoá `result/provenance` ở ai_scores (giữ
    điểm, xếp loại như hiện nay).
11. **Lỗi hiển thị** (`public_errors.py`): thêm câu cho lỗi trích dẫn (quyết định 6); giữ câu quá tải / file hỏng.

## 3. application-service

Không đổi logic (điểm 0–100 và FIT / NOT_FIT / UNCLASSIFIED giữ nguyên). Chỉ kiểm tra `AiScoringListener` / `applyAiScore`
vẫn nhận đúng sự kiện. **Không đụng 3 file đang sửa dở chưa commit** (`ApplicationService.java`, `RecruitmentServiceClient.java`,
`ApplicationWithdrawTest.java`) — không stage, không commit chúng.

## 4. Web (`frontend/`)

1. `features/ai/types.ts`: thay type `ScoreResult`/`ScoredDimension`/`RequirementResult`/`CVExtraction*` bằng type mới.
2. `AiScoreCard.tsx`: điểm tròn + xếp loại + "Lý do xếp loại"; 4 dòng `Collapse` "Kỹ năng · 4/5" (Chứng chỉ N/A → "Không áp dụng"),
   mở ra: lý do, "Trích từ CV", "Trích từ JD". Bỏ yêu cầu bắt buộc, "Chấm bởi", trọng số, **và đoạn chú thích cuối thẻ**.
   Hồ sơ đã xoá dữ liệu cá nhân (COMPLETED, `result = null`) → hiện điểm + xếp loại kèm "Chi tiết đã xoá theo yêu cầu của ứng viên"
   (không báo lỗi).
3. `CvParseResultPanel.tsx` / khối "Phân tích CV" ở `CandidateApplicationDetailPage.tsx`: hiển thị `CVFacts` theo 6 nhóm
   (mỗi dữ kiện: ghi chú + câu trích in nghiêng), kèm `limitations`.
4. Xoá `AiCvUploadModal.tsx`, nút "AI đọc CV" và state liên quan (`aiUploadOpen`, `aiPrefill`, `aiPrefillFile`…) ở
   `ApplicationsPage.tsx`, và `extractCvFromUpload` trong `aiApi.ts` (đã được đồng ý — xem mục 0).
5. `AiScoreBadge` và bộ lọc xếp loại giữ nguyên. Giữ bố cục, phông chữ theo `docs/UI`; chữ tiếng Việt có dấu.

## 5. Mobile (`mobile/`, theo `mobile/CLAUDE.md`)

1. `src/types/api.ts` `AiScoreDetail` theo dạng mới (endpoint không có type sinh — ngoại lệ đã ghi sẵn).
2. `application-screen.tsx` AiTab: điểm + xếp loại + lý do; 4 dòng "x/5" (N/A → "Không áp dụng"), chạm mở lý do và câu trích.
   Sửa lỗi cũ: COMPLETED + `result = null` không hiện "đang chấm"; PENDING/PROCESSING thì `refetchInterval` 5 giây.
3. Chuỗi mới vào `src/lib/strings.ts`; màu qua token. `npm run typecheck && npm run lint`.

## 6. Dọn dẹp (sau khi luồng mới chạy được)

Xoá: `app/schemas/cv_extraction.py`, `jd_extraction.py`, `scoring.py` (cũ), `scoring_llm.py`, `extraction.py` (nếu hết dùng);
`app/services/cv_extraction_engine.py`, `cv_extraction_store.py`, `jd_extraction_engine.py`, `jd_extraction_store.py`,
`experience.py` (nếu hết dùng), `prompts/cv_extraction.py`, `prompts/jd_extraction.py`, `scoring/` (giữ `JobInfo` → chuyển chỗ);
`app/api/extraction.py`; `benchmark/`; `alembic/`, `alembic.ini`; model `AIFeedback`, `CVDocumentChunk`; test cũ
(`test_phase*`, `test_scoring_*`, `test_schemas_*`, `test_jd_extraction.py`, `test_benchmark.py`); cấu hình thừa
(`embedding_model`, `candidate_service_url`, `CV_UPLOADED_QUEUE`, khai báo `AI_SCORING_COMPLETED_QUEUE`), `python-dotenv`,
`pgvector` trong `requirements.txt`. Giữ `test_scoring_watchdog.py`, `test_public_errors.py`.

## 7. Dữ liệu, script, tài liệu

- `scripts/demo-data/seed.py`: dòng SQL dời mốc thời gian đang cập nhật `cv_extractions` → đổi sang `cv_facts`; rà chỗ đọc kết quả chấm.
- Viết lại `ai-service/README.md`; cập nhật `docs/ai_service_explained.md`; thêm mục **"Cơ sở thiết kế"** (trích xuất theo 4 tiêu chí
  chấm của nghiên cứu + Dự án, Ngoại ngữ làm bằng chứng; bỏ PII để chấm mù; trích nguyên văn + code kiểm tra để giảm bịa;
  khác biệt: sản phẩm ẩn danh tự động, research có người duyệt). Không tự bịa trích dẫn tài liệu.
- Sau khi deploy: khởi động lại ai-service, gọi `POST /scores/rescore-all`, kiểm số hồ sơ COMPLETED / FAILED, chấm lại lỗi.

## 8. Kiểm tra và commit

- `cd ai-service && .venv/Scripts/python.exe -m pytest tests/<file>.py -q` từng file; `cd frontend && npx tsc -b --noEmit`;
  `cd mobile && npm run typecheck && npm run lint`.
- Chạy thật 2–3 hồ sơ (Gemini thật), xem thẻ AI trên web (`localhost:3000`) và Expo web (`19006`).
- Nhánh `ai-service` tạo từ `dev`; commit theo lớp: `feat(ai): …` (ai-service) → `feat(web): …` → `feat(mobile): …` →
  `chore(ai): remove legacy scoring …`. Tiếng Anh, **không `Co-Authored-By`, không dòng "Generated with Claude Code"**.
  Chỉ push / tạo PR khi người dùng bảo.
