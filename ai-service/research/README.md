# Module AI nghiên cứu SSRC-II’2026 — 100 CV x 2 prompts

**Không thay thế phần production** `app/services/scoring/` (5 tiêu chí 0–4 và tổng 0–100).
Module này nằm tại `ai-service/research/`, chạy độc lập với FastAPI/Java/RabbitMQ/PostgreSQL.
Nó dùng lại `app/services/pdf_extractor.py` và `app/core/llm_client.py` của **ATS-main(4)**.

## 1. Nội dung đã lập trình

- 4 tiêu chí: Work Experience, Skills, Education, Certifications, mỗi tiêu chí **1–5**.
- Certifications: JD có **REQUIRED** hoặc **PREFERRED** đều phải chấm; `NOT_SPECIFIED` là **N/A** (JSON `null`, CSV trống + `certifications_na=YES`). Với `PREFERRED`, nếu CV không có chứng chỉ thì điểm **3**, không phạt ứng viên. Đây là quy tắc do nhóm nghiên cứu xác định.
- 2 cấu hình **A = Baseline**, **B = Rubric + Evidence**; sử dụng **CÙNG JSON** CV/JD và model Gemini; kết quả mỗi cặp 2 JSON riêng, có prompt hash, model, token, timestamp và ID.
- Quy trình: CV PDF → đọc text local → che thông tin cá nhân (bản sơ bộ) → **bạn kiểm tra/thực sự ẩn danh** → xác nhận duyệt → Gemini trích CV JSON; JD TXT → Gemini trích JD JSON; cùng dữ liệu → Gemini chấm hai prompt → `CSV` phục vụ so sánh với người chấm.
- Cache theo content hash + prompt hash + model, không gọi lại bước thành công nếu không đổi đầu vào. Lỗi thì không tạo điểm giả.
- Không dùng điểm con người để tạo prompt hoặc chấm AI; con người chấm độc lập.

**Prompt:** Bản phân phối này đã bao gồm `research/data/prompts/prompt_A.txt` (Baseline) và `prompt_B.txt` (Rubric + Evidence), theo phiên bản ngắn gọn đã thống nhất. `research/prompts.py` tự đọc hai tệp và nối dữ liệu JSON, schema và quy tắc Certifications chung. Không chỉnh sửa prompt giữa một đợt chạy chính thức.

## 2. Sao chép phần AI vào ATS

Đây là ZIP **chỉ chứa thư mục `research/`**. Giải nén vào thư mục `ATS-main/ai-service/`, để có:

```
ATS-main/
  ai-service/
    app/                          # ATS production, GIỮ NGUYÊN
    requirements.txt
    research/
      run.py                      # CLI đầy đủ
      pipeline.py                 # API/caching/validation
      schema.py                   # 4 tiêu chí 1–5
      prompts.py                  # hai cấu hình + trích xuất JSON
      privacy.py                  # che PII local + quote validator
      preflight.py                # có sẵn từ Phase 1
      data/
        pairs.csv                # 100 cặp CV–JD
        jd_sources.csv
        jd_policies.csv          # cần verified=YES sau khi kiểm tra JD
        prompts/prompt_A.txt và prompt_B.txt
        jds/JD-*.txt             # hiện là PLACEHOLDER
        cvs/Backend/*.pdf        # người dùng giải nén RIÊNG, KHÔNG có trong ZIP code
        cvs/Frontend/*.pdf
        cvs/Fullstack/*.pdf
      private/review/*.txt        # file CV ẩn danh cần đọc lại thủ công, KHÔNG commit
      output/extracted/           # cache trích xuất, KHÔNG commit
      output/scores/              # mỗi cặp 2 JSON, KHÔNG commit
      output/results_100_pairs_2_prompts.csv
```

Nếu có folder `research/` cũ, **sao lưu** trước rồi ghi đè các file cùng tên; **không xoá** thư mục `data/cvs/` chứa PDF và `private/` nếu đang dùng.

## 3. Cài Python và thư viện trên Windows + VS Code

Mở VS Code, `File > Open Folder` → `ATS-main/ai-service`. Terminal PowerShell chạy:

```powershell
py -3.11 --version
py -3.11 -m venv .venv-research
.\.venv-research\Scripts\python.exe -m pip install --upgrade pip
.\.venv-research\Scripts\python.exe -m pip install -r research\requirements-research.txt
.\.venv-research\Scripts\python.exe -m unittest discover -s research\tests -v
```

Không cần cài OCR/PaddleOCR, database, RabbitMQ, Railway hay chạy FastAPI để thực nghiệm.

## 4. Chuẩn bị 100 CV và 6 JD nguyên văn

Giải nén `CV_SSRC_2026_100_CV_DA_DOI_TEN.tar.zst` bằng 7-Zip (nếu cần: `.zst` → `.tar` → folder), đặt `Backend/`, `Frontend/`, `Fullstack/` vào `research/data/cvs/`. Kiểm tra 49 + 8 + 43 = **100 PDF**.

**Bắt buộc:** Mở sáu file `research/data/jds/JD-*.txt` và **dán toàn văn JD thật** từ nguồn tuyển dụng bạn đã chốt; hiện tại chúng là `DAN_NGUYEN_VAN_JD_..._VAO_DAY` để cảnh báo, tuyệt đối không dùng làm đầu vào giả. `jd_sources.csv` chứa URL tương ứng.

Sau đó mở `research/data/jd_policies.csv`: so sánh nội dung yêu cầu chứng chỉ/ngoại ngữ ở mỗi JD, chốt `cert_policy` là `REQUIRED`, `PREFERRED` hoặc `NOT_SPECIFIED`. **Chỉ đặt `verified=YES` khi đã kiểm chứng**, đặc biệt TOEIC/khả năng tiếng Anh tương đương tại JD-FE-01 và JD-FS-02. Mặc định `verified=NO` nên live run **sẽ bị chặn**.

```powershell
.\.venv-research\Scripts\python.exe -m research.preflight
.\.venv-research\Scripts\python.exe -m research.preflight --require-jds
```

## 5. Ẩn danh CV TRƯỚC KHI gửi Gemini

```powershell
# thử một cặp trước:
.\.venv-research\Scripts\python.exe -m research.run prepare --pair PAIR-001
```

Mở `research/private/review/<CV_ID>.txt` trong VS Code. **Đọc kỹ từng dòng**; xóa hoặc thay thế tên người, ngày sinh, địa chỉ, số liên lạc, email, link cá nhân, ID và bất kỳ chi tiết định danh nào còn sót. Regex tự động không bảo đảm ẩn danh hoàn toàn; không gửi PDF gốc lên API. Chỉ giữ lại dữ kiện học vấn, kinh nghiệm, dự án, kỹ năng có liên quan tới nghiên cứu.

```powershell
# Chỉ sau khi đã xem và sửa xong file của PAIR-001:
.\.venv-research\Scripts\python.exe -m research.run approve --pair PAIR-001 --confirm-reviewed
```

Lệnh này lưu hash vào `private/approvals.json`. Nếu nội dung file bị sửa sau khi duyệt, quá trình gọi Gemini sẽ **chặn** và yêu cầu duyệt lại.

Để làm đủ 100 CV:

```powershell
.\.venv-research\Scripts\python.exe -m research.run prepare
# XEM XÉT VÀ CHỈNH SỬA 100 FILE review/CV-*.txt
.\.venv-research\Scripts\python.exe -m research.run approve --confirm-reviewed
```

**Quyền sử dụng:** Chỉ đưa CV vào API sau khi nhóm xác nhận có quyền dùng cho nghiên cứu và gửi đến dịch vụ bên ngoài. Không tải lên GitHub các file PDF, bản CV đã lọc, JSON hay output chứa thông tin nhạy cảm. `research/.gitignore` ngăn các đường dẫn này, nhưng vẫn cần kiểm tra `git status` trước khi push.

## 6. API key và chạy Gemini

Tạo `research/.env` từ `research/.env.example` và thay API key thật (không gửi key vào chat):

```powershell
Copy-Item research\.env.example research\.env
notepad research\.env
```

Model mặc định: `gemini-3.5-flash-lite`. Gemini SDK được gọi từ `app/core/llm_client.py`, trả JSON qua Pydantic, temperature=0 theo config ATS (`app/core/config.py`); **không fallback** sang model khác để giữ phép so sánh. Độ lặp lại tuyệt đối không được bảo đảm.

**Kiểm tra không tốn token** (cần JD/policy + CV đã approved):

```powershell
.\.venv-research\Scripts\python.exe -m research.run run --pair PAIR-001 --dry-run
```

**Chạy 1 cặp → 2 prompt:**

```powershell
.\.venv-research\Scripts\python.exe -m research.run run --pair PAIR-001
```

Kỳ vọng nếu cache trống: 1 CV extraction + 1 JD extraction + **2 scoring** = 4 cuộc gọi Gemini. Kiểm tra file:

```
research/output/extracted/cv/CV-....json
research/output/extracted/jd/JD-....json
research/output/scores/PAIR-001__A.json
research/output/scores/PAIR-001__B.json
```

**Sau khi xem thử đầu ra và đồng ý:**

```powershell
.\.venv-research\Scripts\python.exe -m research.run run --limit 10 --dry-run
.\.venv-research\Scripts\python.exe -m research.run run --limit 10
# Khi 100 CV/JD đã sẵn sàng:
.\.venv-research\Scripts\python.exe -m research.run run --dry-run
.\.venv-research\Scripts\python.exe -m research.run run
```

**Số lượt gọi tối đa từ cache rỗng**: **100** CV extraction + **6** JD extraction + **200** điểm (100 cặp × 2 prompt) = **306** lượt Gemini trước retry. Nếu cache có sẵn, số lượt thực tế ít hơn. Chi phí phụ thuộc token thực tế và bảng giá ở thời điểm chạy; không đặt mức giá giả.

Lệnh lỗi không tạo cache thành công; khi sửa nguyên nhân (VD hạn mức 429), chạy lại **cùng lệnh** sẽ bỏ qua cache còn hợp lệ, tiếp tục. Không ghi đè tên các CV/JD đã chốt trong chừng mực dữ liệu thực nghiệm đang chạy. Không đưa human scores vào prompt.

**Xuất CSV:**

```powershell
.\.venv-research\Scripts\python.exe -m research.run export
.\.venv-research\Scripts\python.exe -m research.run status
```

Kỳ vọng `200/200` dòng kết quả nếu cả 100 cặp đều chạy thành công. CSV chứa điểm từng tiêu chí (số nguyên 1–5 hoặc trống với Cert N/A), lý do, bằng chứng, model, phiên bản prompt, thời điểm, và flag `certifications_na`.

CSV này chỉ là **điểm AI**, chưa phải phân tích thống kê và **không phải điểm chuẩn của con người**. Sau đó kết hợp bảng chấm độc lập từ Excel, thống nhất phương pháp trước khi tính các chỉ số đối sánh.

## 7. Các file quan trọng để kiểm tra lỗi

| File | Dùng làm gì? |
|---|---|
| `preflight.py` | Kiểm tra manifest 100, PDF, JD (không API) |
| `privacy.py` | Xóa thông tin liên hệ sơ bộ, xác nhận bằng người thật |
| `schema.py` | CV/JD JSON + 4 điểm (1–5) + rule Certificates N/A |
| `prompts.py` | Prompt A/B, prompt extraction và prompt hash |
| `pipeline.py` | Gọi Gemini SDK ATS, cache, kiểm quote, checkpoint, xuất CSV |
| `run.py` | CLI `prepare`, `approve`, `run`, `export`, `status` |
| `data/jd_policies.csv` | Chốt trạng thái Certifications theo từng JD |
| `tests/test_study.py` | Test nghiệp vụ + cache không gọi lại API |

## 8. Giới hạn đã biết của phiên bản này

1. Không có nguyên văn prompt chính thức của nhóm, nên mặc định dùng bản đề xuất trong `prompts.py` cho đến khi bạn thay bằng prompt chính thức.
2. Sáu JD vẫn là placeholder; không thể tạo **kết quả thực nghiệm hợp lệ** nếu chưa thêm nguyên văn.
3. Không có API key của bạn; không có cuộc gọi Gemini live nào được thực hiện trong gói này. Test chỉ kiểm tra logic local và mock API.
4. Hệ thống từ chối trích dẫn Gemini không khớp nguồn. Khi gặp `StudyError` quote mismatch, cần xem dữ liệu **nội bộ** và quyết định cải thiện prompt/extraction; tuyệt đối không điền tay để tạo số liệu giả.
5. Không thay scoring production; không có endpoint mới hiển thị 4 điểm trên website. Dữ liệu AI nghiên cứu được lưu trong `research/output` để phân tích trước.
6. Chưa chọn chỉ số thống kê hoặc cách gộp hai người chấm, đúng yêu cầu chưa chốt phương pháp của bạn.
