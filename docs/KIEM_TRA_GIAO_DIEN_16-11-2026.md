# Báo cáo kiểm tra giao diện toàn hệ thống ATS — 16/11/2026

> Phạm vi: kiểm tra thủ công trên trình duyệt (Chrome) toàn bộ chức năng web của 4 vai trò
> **Ứng viên · HR (Chuyên viên tuyển dụng) · Trưởng bộ phận (Đại diện phòng ban) · Admin**,
> cùng app mobile (chạy Expo web) cho Ứng viên, HR, Trưởng bộ phận.
> Môi trường: local, 10 service Spring Boot + ai-service + web Vite + Expo web, Postgres/RabbitMQ/Redis trong Docker.
> Tài khoản demo: `admin.company@test.net`, `hr.recruiter@test.net`, `dept.manager@test.net` (mật khẩu `Password123!`).

Mức độ:
- 🔴 **Nghiêm trọng** — làm hỏng luồng demo hoặc sai nghiệp vụ cốt lõi, sửa trước khi bảo vệ.
- 🟠 **Trung bình** — sai logic / thiếu sót dễ bị hội đồng hỏi.
- 🟡 **Nhẹ** — giao diện, câu chữ, dữ liệu demo.

---

## Mục lục

1. [Lỗi nghiêm trọng](#1-lỗi-nghiêm-trọng-)
2. [Bảo mật & phân quyền](#2-bảo-mật--phân-quyền)
3. [Lỗi nghiệp vụ mức trung bình](#3-lỗi-nghiệp-vụ-mức-trung-bình-)
4. [Giao diện, câu chữ, dữ liệu demo](#4-giao-diện-câu-chữ-dữ-liệu-demo-)
5. [Những phần đã chạy đúng](#5-những-phần-đã-chạy-đúng)
6. [Chưa kiểm được](#6-chưa-kiểm-được)
7. [Chức năng nên bổ sung](#7-chức-năng-nên-bổ-sung)
8. [Thứ tự sửa đề xuất (còn 9 ngày)](#8-thứ-tự-sửa-đề-xuất-còn-9-ngày)
9. [Dữ liệu thử nghiệm đã tạo khi kiểm tra](#9-dữ-liệu-thử-nghiệm-đã-tạo-khi-kiểm-tra)

---

## 1. Lỗi nghiêm trọng 🔴

### 1.1. Trưởng bộ phận không nộp được đánh giá khi bấm từ "Việc của tôi"
- **Hiện tượng:** Trang *Việc của tôi* → "Viết đánh giá" → điền đủ → *Nộp đánh giá* → lỗi 403
  `Role HIRING_MANAGER cannot perform this action` (thông báo tiếng Anh). Không có nút *Lưu nháp*.
- **Nguyên nhân:** link thiếu `?interviewId=`, nên trang đánh giá chuyển sang chế độ "HR chấm theo hồ sơ"
  và gọi `POST /api/interview/applications/{id}/evaluations` (chỉ HR được gọi).
  - `frontend/src/features/home/pages/MyWorkPage.tsx:273`
  - `frontend/src/features/home/pages/MyWorkPage.tsx:380`
- **Cách sửa:**
  - Thêm `?interviewId=${iv.id}` vào `to:` ở cả 2 dòng trên (giống `InterviewDetailPage.tsx:157`).
  - Trong `EvaluationFormPage.tsx`: nếu người dùng **không phải HR** mà không có `interviewId`
    → tự tìm buổi phỏng vấn của mình trong hồ sơ hoặc hiện thông báo "Chọn buổi phỏng vấn cần đánh giá",
    không cho điền form vô ích.

### 1.2. Buổi phỏng vấn chỉ có HR làm người phỏng vấn bị kẹt mãi
- **Hiện tượng:** HR lên lịch và chọn chính HR là người phỏng vấn → trạng thái "Chờ người phỏng vấn xác nhận"
  nhưng không có nút *Xác nhận* ở đâu cả → ứng viên không bao giờ thấy lịch.
- **Nguyên nhân:** `frontend/src/features/interview/pages/InterviewDetailPage.tsx:150`
  chỉ hiện nút khi `!isHr && amInterviewer`. Backend (`assertAssignedHmOrHr`) vẫn cho HR xác nhận.
- **Cách sửa (chọn 1):**
  - Đổi điều kiện thành `amInterviewer && iv.status === "SCHEDULED"`; hoặc
  - Backend: khi tạo lịch mà **người tạo là HR và nằm trong danh sách người phỏng vấn** → tự đánh dấu HR đã xác nhận;
    nếu **toàn bộ** người phỏng vấn là HR → chuyển thẳng sang `HM_CONFIRMED`.
  - Thêm vào tab *Cần xử lý* của HR các buổi mà HR là người phỏng vấn chưa xác nhận.

### 1.3. Ứng viên xin dời lịch → HR không dời được
- **Hiện tượng:**
  - Nút *Đổi giờ* → lỗi "Không dời được lịch ở trạng thái hiện tại" (trạng thái `CANDIDATE_DECLINED`).
  - Nút *Đặt lịch mới* mở form trống: mất link họp, người phỏng vấn reset về mặc định,
    không hiện lý do / khung giờ ứng viên đề xuất.
  - Sau khi tạo lịch mới, buổi cũ vẫn `CANDIDATE_DECLINED` → nằm mãi ở tab *Cần xử lý*.
- **Cách sửa:**
  - Backend `InterviewService.reschedule`: cho phép dời khi trạng thái là `CANDIDATE_DECLINED`
    (đặt lại về `SCHEDULED`, xoá lý do từ chối cũ, giữ người phỏng vấn).
  - Hoặc giữ *Đặt lịch mới* nhưng: truyền `?replaceInterviewId=` để prefill (link, người phỏng vấn, thời lượng, hình thức),
    hiện lý do của ứng viên ở đầu trang, và khi tạo xong thì **huỷ/đóng buổi cũ** (`CANCELLED` hoặc `RESCHEDULED`).
  - Ẩn nút *Đổi giờ* ở các trạng thái không cho phép.

### 1.4. HR demo không duyệt được yêu cầu tuyển dụng mới
- **Hiện tượng:** Trưởng bộ phận tạo yêu cầu → người duyệt luôn là
  `nguyenthixuanquynh1901@gmail.com`, không phải `hr.recruiter@test.net` → HR demo không thấy nút Duyệt.
  Admin cũng không vào được trang yêu cầu trên web.
- **Nguyên nhân:** `frontend/src/features/recruitment/pages/RequisitionFormPage.tsx:91`
  tự gán `approvers[0]`, không có ô chọn người duyệt.
- **Cách sửa:**
  - Thêm ô *Người duyệt* (Select, mặc định HR phụ trách phòng ban hoặc HR đầu tiên) vào form; hoặc
  - Cho **mọi RECRUITER** duyệt được (bỏ ràng buộc `approverId` ở `requireAssignedOrAdmin`, chỉ ghi lại ai duyệt).
  - Cho Admin xem/duyệt yêu cầu trên web (route `/recruitment/requisitions/:id` cho `COMPANY_ADMIN`)
    vì backend đã cho phép.
  - Ngắn hạn cho demo: sửa seed để tài khoản HR demo đứng đầu danh sách.

### 1.5. Đơn nộp qua mobile không được AI chấm điểm
- **Hiện tượng:** Đơn nộp qua app mobile (đơn #26) `ai_status` rỗng, `GET /api/v1/ai/scores/26` → 404,
  màn HR hiện "Hồ sơ chưa được AI chấm". Đơn nộp qua web cùng tin được chấm ngay.
- **Cách sửa:** so sánh API mobile gọi khi ứng tuyển với API web
  (`mobile/app/(candidate)/jobs/apply.tsx` vs trang apply web). Đảm bảo cả hai đi qua cùng service method
  phát sự kiện `ApplicationSubmitted` lên RabbitMQ cho ai-service. Nếu mobile dùng endpoint khác,
  gom về một endpoint hoặc phát event ở tầng service chung.

### 1.6. AI chấm sai: CV lập trình viên được "Phù hợp" cho vị trí Thực tập sinh Nhân sự
- **Hiện tượng:** cùng một CV Backend Developer:
  - Chuyên viên Tuyển dụng → 33,3 "Chưa phân loại" (nhận xét lại nói "hoàn toàn không phù hợp").
  - Thực tập sinh Nhân sự → **75 "Phù hợp"**, dù nhận xét ghi "thiên về kỹ thuật phần mềm backend".
- **Nguyên nhân nghi ngờ:** JD thực tập sinh yêu cầu rất ít (không kinh nghiệm, không kỹ năng bắt buộc) nên mọi
  required check đều MET và điểm trung bình cao; trong khi chiều "mức độ phù hợp chuyên môn" không đủ trọng số.
- **Cách sửa:**
  - Thêm điều kiện cứng: nếu chiều *Kỹ năng chuyên môn / lĩnh vực* thấp (vd. ≤ 1/4) → không được FIT.
  - Khi JD có ít yêu cầu bắt buộc → giảm trọng số của required checks, tăng trọng số đánh giá lĩnh vực.
  - Khi nhận xét của LLM có kết luận "không phù hợp" mà điểm ≥ ngưỡng → hạ về UNCLASSIFIED để HR xem tay.
  - Chạy lại benchmark trên v2 và đưa số liệu vào báo cáo (benchmark hiện tại 15/10 là của v1).
  - Ngưỡng hiển thị đang là 67,5 trong khi tài liệu ghi T=62.5 → thống nhất một con số.

### 1.7. CV chèn lệnh vào AI không được cảnh báo cho HR
- **Hiện tượng:** ai-service phát hiện (`Prompt injection detected: patterns=['ignore_instructions']`,
  `injection=True`) nhưng màn hồ sơ HR chỉ hiện 0 điểm "Chưa phân loại" với nhận xét bình thường.
- **Cách sửa:** lưu cờ `injectionDetected` + danh sách pattern vào kết quả chấm; frontend hiện
  banner đỏ "CV có nội dung bất thường nhằm điều khiển AI — cần HR xem tay" ở tab *Điểm AI* và badge ở danh sách.
  Đây là điểm cộng lớn khi demo phần bảo mật AI.

### 1.8. "Xoá dữ liệu cá nhân" không xoá thật
- **Hiện tượng:** Ứng viên gõ xác nhận "XOA DU LIEU" → về trang đăng nhập nhưng:
  tài khoản vẫn `ACTIVE`, vẫn đăng nhập được; HR vẫn thấy đơn ứng tuyển + họ tên trên danh sách và Kanban;
  CV trên S3 còn nguyên; trang hồ sơ của chính ứng viên trả 400.
  Trong khi giao diện ghi "Xoá hồ sơ, CV và đơn ứng tuyển. Không khôi phục được."
- **Nguyên nhân:** `candidate-service/.../CandidateService.java:356` `requestOwnDataDeletion` chỉ set `deletedAt`.
- **Cách sửa:**
  - Phát sự kiện `CandidateDeletionRequested` → application-service ẩn danh hoá đơn (tên → "Ứng viên đã xoá dữ liệu",
    xoá email/phone), interview/offer ẩn tên, ai-service xoá bản trích xuất CV, xoá file S3.
  - auth-service chuyển tài khoản sang `DELETED`/`DISABLED`, thu hồi refresh token.
  - Hoặc đổi câu chữ thành "Gửi yêu cầu xoá — bộ phận tuyển dụng xử lý trong 30 ngày" nếu không kịp làm.

---

## 2. Bảo mật & phân quyền

### 2.1. 🔴 Upload CV không kiểm tra nội dung thật của file
- **Hiện tượng:** `test-samples/fake_cv_executable.pdf` (đầu file `MZ` — file .exe) được nhận làm CV, lưu lên S3.
  `S3Service.java:53` dùng `file.getContentType()` do client gửi.
- **Cách sửa:** trong candidate-service kiểm tra magic bytes (`%PDF-`, `PK\x03\x04` cho docx) bằng Apache Tika
  hoặc tự đọc 8 byte đầu; từ chối nếu không khớp đuôi file. ai-service đã có `file_validator.py` — có thể tái dùng logic.

### 2.2. 🟠 Ảnh đại diện / logo cho phép SVG
- SVG có thể chứa `<script>`; ảnh phục vụ thẳng từ S3 public. **Sửa:** chỉ nhận PNG/JPEG/WEBP,
  hoặc nếu giữ SVG thì sanitize (DOMPurify server-side) và trả `Content-Type: image/svg+xml` + `Content-Disposition: attachment`.
  Dòng hướng dẫn cũng đang ghi "JPG, PNG, WEBP" nhưng lỗi lại nói "JPG, PNG, WEBP hoặc SVG" → thống nhất.

### 2.3. 🟠 Trưởng bộ phận tạo được mục danh mục qua API
- `POST /api/masterdata/skills` với token HIRING_MANAGER → 200 (đã tạo "HM hack skill", đã ẩn lại).
  Trái với bảng *Vai trò & quyền* (HM không có quyền "Sửa danh mục").
- **Sửa:** masterdata-service các endpoint POST/PUT/PATCH → `requireHrOrAdmin(actor)`.
  Rà lại toàn bộ controller masterdata (15 controller).

### 2.4. 🟠 Quyền Admin không thống nhất giữa web và mobile
- Web: Admin bị chặn ở `/recruitment/*`, `/masterdata`. Mobile: Admin đăng nhập vào khu `/hr`,
  thấy và có thể duyệt yêu cầu tuyển dụng.
- **Sửa:** quyết định rõ quyền Admin (đề xuất: Admin được *xem* và *duyệt* yêu cầu, quản lý danh mục),
  rồi áp dụng giống nhau ở `AppRoutes.tsx`, `AppLayout` menu, mobile `app/_layout.tsx` (điều hướng theo role)
  và cập nhật `frontend/docs/TEST_ACCOUNTS.md` (đang ghi Admin quản lý master data).

### 2.5. 🟠 Người được mời chưa kích hoạt vẫn xuất hiện trong danh sách người phỏng vấn
- **Sửa:** API lấy danh sách người phỏng vấn lọc `status = ACTIVE`.

### 2.6. 🟠 Đồng ý xử lý dữ liệu không bắt buộc ở backend & mobile
- `POST /api/auth/register` không cần trường consent; app mobile ứng tuyển không có ô đồng ý (web bắt buộc).
- **Sửa:** thêm `consentAccepted: true` bắt buộc ở `CandidateRegistrationRequest` và request ứng tuyển;
  lưu `consentAt` (web C18 đã hiển thị ngày đồng ý). Thêm checkbox ở mobile.

### 2.7. 🟡 Lỗi backend lộ chi tiết kỹ thuật / sai mã lỗi
- Body JSON hỏng → `"Đã có lỗi xảy ra: JSON parse error: Invalid UTF-8 middle byte…"`.
- Đường dẫn API không tồn tại → 500 (nên 404). Offer đã xoá → 400 (nên 404). Đăng nhập sai → 400 (nên 401).
- **Sửa:** trong `GlobalExceptionHandler` của từng service: map `HttpMessageNotReadableException` → 400 "Dữ liệu gửi lên không hợp lệ",
  `NoResourceFoundException` → 404, `EntityNotFound` → 404; không nối `ex.getMessage()` vào câu trả về.

### Những phần phân quyền đã đúng (để ghi vào báo cáo)
- Ứng viên A xem đơn / thư mời / lịch / .ics / PDF của ứng viên B → 403.
- Không token → 401; JWT giả → 401; tự gắn `X-User-Role: RECRUITER` → vẫn 403 (gateway ghi đè).
- Trưởng bộ phận chỉ thấy dữ liệu phòng mình (403 với phòng khác), lương trong thư mời bị ẩn (`salaryOffered: null`).
- OTP, token mời, token đặt lại mật khẩu đều lưu dạng băm (bcrypt / SHA-256); link mời chỉ dùng 1 lần.

---

## 3. Lỗi nghiệp vụ mức trung bình 🟠

| # | Lỗi | Cách sửa |
|---|---|---|
| 3.1 | HR chuyển hồ sơ Ứng tuyển → Thư mời chỉ bằng 3 cú bấm, không cần phỏng vấn; chỉ có cảnh báo cam khi gửi thư. | Chặn "Chuyển sang Thư mời" khi chưa có ít nhất 1 đánh giá đã nộp, hoặc bắt nhập lý do bỏ qua phỏng vấn (lưu vào lịch sử). Nếu giữ thiết kế hiện tại thì chuẩn bị câu trả lời cho hội đồng. |
| 3.2 | **Ứng viên rút đơn bị coi là "Từ chối"**: thông báo gửi ứng viên "đã chuyển sang giai đoạn: Từ chối", HR thấy nhãn Từ chối, tab Từ chối đếm cả đơn rút; mobile còn vẽ tiến trình đã qua Sàng lọc + PV và ghi "Hồ sơ chưa phù hợp: Ứng viên tự rút". | Thêm trạng thái `WITHDRAWN` riêng (hoặc `rejectionReason = WITHDRAWN` được xử lý riêng): nhãn "Đã rút", thông báo "Bạn đã rút đơn…", tab riêng hoặc lọc riêng; mobile dừng thanh tiến trình ở giai đoạn lúc rút. |
| 3.3 | Tin **đang tuyển** không sửa được: form khoá và nói "chọn Sửa lại ở trang việc làm" nhưng trang việc làm không có nút đó. | Thêm nút *Sửa lại* cho tin `OPEN`/`PAUSED`: hoặc cho sửa trực tiếp các trường không ảnh hưởng (mô tả, quyền lợi, hạn nộp) mà không đổi trạng thái; hoặc chuyển về `EDITING` (tạm ẩn khỏi trang công khai) rồi đăng lại. |
| 3.4 | Form tạo yêu cầu (trưởng bộ phận) lưu được khoảng lương ngược "20 – 10 tr". (Hộp duyệt của HR thì đã chặn đúng.) | Validate `expectedSalaryMin <= expectedSalaryMax` ở `RequisitionFormPage.tsx` và ở backend `JobRequisitionService`. |
| 3.5 | Tạo thư mời khi tin đã hết suất → chỉ hiện "Lưu thư mời thất bại", toast biến mất nhanh. Backend có câu rõ "Tin tuyển dụng này đã dùng hết 1 suất tuyển…". | Hiện `err.response.data.error/message` trong toast; tốt hơn: kiểm tra số suất ngay khi mở form soạn thư (đã có ở màn So sánh) và hiện cảnh báo ở đầu form. |
| 3.6 | Trang *Việc làm* hiện **0 việc làm** khi application-service lỗi (dù recruitment-service vẫn chạy). | Tải danh sách tin và số ứng viên độc lập (`Promise.allSettled`); nếu đếm lỗi thì hiện "—" ở cột ứng viên. |
| 3.7 | Ứng viên đã nhận việc vẫn ứng tuyển tiếp; đơn khác của họ vẫn mở (đơn #18 vẫn ở "Thư mời" không có thư). Ngược lại, ứng viên đã **rút** đơn thì không ứng tuyển lại được vào chính việc đó. | Khi ứng viên chấp nhận offer: hiện nhắc HR các đơn đang mở khác (hoặc tự đóng). Quyết định có cho ứng tuyển lại sau khi rút không — nếu có thì mở lại khi đơn cũ ở `WITHDRAWN`. |
| 3.8 | Lịch đã qua (05/11, 09/11, 12/11) vẫn ở tab *Cần xử lý* / *Sắp tới*; buổi #10 `COMPLETED` trước giờ hẹn. | Job định kỳ (Spring `@Scheduled`) đánh dấu `EXPIRED` cho lịch chưa xác nhận đã qua giờ; tab *Sắp tới* lọc `scheduledAt >= now`. Chặn hoàn tất/đánh giá trước giờ phỏng vấn ở backend (frontend đã ẩn nút). |
| 3.9 | Trang *Lịch phỏng vấn* của ứng viên (web) không hiện link họp hoặc địa điểm; mobile chỉ ghi "Tại văn phòng". Buổi đã huỷ (chưa tới ngày) bị xếp vào "Đã diễn ra". | Thêm dòng link họp / địa điểm (tên + địa chỉ) và nút "Vào phòng họp" khi gần giờ; nhóm "Đã huỷ" riêng. |
| 3.10 | Ứng viên thêm bằng *Thêm ứng viên* ở trang Ứng viên không xuất hiện ở danh sách (trang liệt kê theo đơn) và Ctrl+K không tìm ra. | Sau khi tạo, bắt chọn luôn tin tuyển dụng (giống nút *Thêm ứng viên* ở trang việc làm), hoặc thêm tab "Kho ứng viên chưa gắn việc". Ctrl+K tìm cả bảng candidate. |
| 3.11 | **Nhật ký hệ thống thiếu**: sửa thông tin công ty, thêm văn phòng, xuất bản trang tuyển dụng, đổi/đặt lại mật khẩu, nộp đánh giá, gửi/nhận/từ chối thư mời. Lịch sử yêu cầu tuyển dụng chỉ ghi "tạo yêu cầu" (thiếu yêu cầu sửa, gửi lại, duyệt, từ chối). Tab *Hoạt động* hồ sơ chỉ ghi đổi giai đoạn. | Gọi `auditEventPublisher.publish(...)` ở các service tương ứng (auth: company/careers/password; interview: evaluation; offer: send/accept/decline). Hiển thị lịch sử yêu cầu tuyển dụng từ audit log thay vì chỉ `createdAt`. |
| 3.12 | Tổng quan Admin: đổi sang Quý 3 thì bảng *Theo phòng ban* vẫn số Quý 4; vào chi tiết phòng ban thì quý reset về Quý 4. "Thời gian tuyển trung bình" phòng Nhân sự: Admin 54 ngày, trang Kết quả của trưởng bộ phận 0 ngày. | Truyền `quarter` vào API bảng phòng ban và vào URL chi tiết (`?quarter=`). Dùng chung một hàm tính thời gian tuyển trong dashboard-service cho cả 2 màn. |
| 3.13 | Trang *Việc của tôi* của trưởng phòng Nhân sự, khối "Vị trí đang tuyển của phòng" hiện cả Frontend Developer (phòng CNTT). | Lọc theo `departmentId` của người dùng. |
| 3.14 | Admin không đổi được vai trò / phòng ban của người dùng (chi tiết người dùng chỉ đọc). | Thêm nút "Đổi vai trò / phòng ban" ở `/admin/users/:id` (cảnh báo nếu còn việc đang phụ trách). |
| 3.15 | Đăng ký, mời người dùng, quên mật khẩu mất 5–8 giây vì gửi email đồng bộ. | Gửi email qua RabbitMQ (notification-service đã có) hoặc `@Async`; trả về ngay. |
| 3.16 | Bấm "Chấm lại" AI một lần gửi 2 request `POST /scores/{id}/rescore`. | Kiểm tra handler bị gắn 2 lần / không disable nút khi đang chạy; dùng cờ `loading`. |
| 3.17 | Thông báo không ghi tên vị trí ("Hồ sơ của bạn đã chuyển sang…"), ứng viên nhiều đơn không biết đơn nào. | Thêm `jobTitle` vào nội dung thông báo. |
| 3.18 | Chuông thông báo không giảm sau "Đánh dấu tất cả đã đọc" (phải tải lại trang). | Sau khi gọi API, cập nhật store/query `unreadCount` (invalidate React Query hoặc set state chung). |
| 3.19 | Kéo thẻ Kanban vào ô "Kéo vào đây để từ chối" không phản hồi (công cụ test kéo được giữa các cột nhưng không thả vào ô từ chối được) — **cần tự thử bằng chuột**. | Nếu đúng là lỗi: kiểm tra `onDrop` của vùng từ chối mở hộp thoại lý do. |

---

## 4. Giao diện, câu chữ, dữ liệu demo 🟡

### 4.1. Tiếng Anh / tiếng Việt không dấu lọt ra giao diện
| Ở đâu | Hiện tại | Nên là |
|---|---|---|
| Đổi mật khẩu sai | `Current password is invalid` | "Mật khẩu hiện tại không đúng" |
| Đăng nhập tài khoản bị khoá | `Tai khoan da bi khoa` | "Tài khoản đã bị khoá. Liên hệ quản trị viên." |
| Phân quyền | `Role HIRING_MANAGER cannot perform this action` | "Bạn không có quyền thực hiện thao tác này" |
| Validation đăng ký (backend) | `Password must contain 8 to 72 characters`, `Email is invalid` | Việt hoá message trong các DTO |
| API đăng ký / quên mật khẩu | `Candidate account created…`, `If the email exists…` | Việt hoá |
| Nhật ký hệ thống | `New status: ACTIVE/LOCKED`, "Người dùng #14" | "Trạng thái mới: Hoạt động", hiện tên thay vì mã |
| Thông báo HR | "Offer #7 … Accept/Decline", "(application #21)" | "Thư mời của Nguyễn A…", bỏ mã nội bộ |
| Danh mục kỹ năng | "Technical", "Soft skill" | "Chuyên môn", "Kỹ năng mềm" |
| AI đọc CV | "name, email, work_experience…", khối "dành cho developer", "3năm" | Nhãn tiếng Việt, ẩn khối developer, "3 năm" |

**Cách làm nhanh:** tạo một file hằng số message ở mỗi service (hoặc `messages_vi.properties`)
và một `mapError()` ở frontend dịch theo mã lỗi.

### 4.2. Tìm kiếm không bỏ dấu
- Ctrl+K: "kiem thu" không ra "Kiểm Thử". Trang việc làm công khai: "tuyen dung" chỉ ra tin không dấu.
- **Sửa:** Postgres `CREATE EXTENSION unaccent;` và tìm `unaccent(lower(col)) LIKE unaccent(lower(:q))`,
  hoặc thêm cột `search_text` không dấu.

### 4.3. Dữ liệu demo cần làm sạch
- Tin "Thuc tap sinh Nhan su (HR Intern)", quyền lợi "Ho tro an trua…", trụ sở "TP. Ho Chi Minh" → thêm dấu.
- Ảnh bìa trang tuyển dụng đang là **sơ đồ kiến trúc hệ thống**; thẻ "Chia sẻ kỹ thuật thứ S…" bị cắt chữ → thay ảnh trong `/admin/careers`.
- Thông tin công ty thiếu Mã số thuế, Website, Email tuyển dụng.
- Phần lớn đơn seed chưa có điểm AI ("—") → chạy chấm lại hàng loạt trước demo.
- Benefit trong tin mâu thuẫn với khung lương duyệt (16–21 tr vs "15–22 tr"), ngày phép (12 vs "15").
- Tên giai đoạn không thống nhất giữa các tin: "Sàng lọc CV / Phỏng vấn kỹ thuật / Đề nghị nhận việc" vs "Sàng lọc / Phỏng vấn / Thư mời" (ứng viên nhìn thấy cả tên nội bộ).

### 4.4. Lỗi hiển thị nhỏ
- Toast thông báo đè lên ô tìm kiếm trên header (HR) → đặt `message.config({ top: 72 })`.
- Lỗi "Vui lòng tải lên CV" nằm khuất trong hộp *Thêm ứng viên* → `scrollToFirstError`.
- Menu sắp xếp "Lương cao n…" bị cắt; cột trạng thái lịch phỏng vấn bị cắt chữ.
- Hạn phản hồi thư mời mặc định **00:00** ("phản hồi trước 00:00 ngày 23/11") → mặc định 17:00 hoặc 23:59.
- Địa điểm phỏng vấn mặc định "Chi nhánh Cần Thơ" dù tin ở Hà Nội → mặc định theo `workLocationId` của tin.
- Lưới giờ phỏng vấn 60 phút chỉ tô 1 ô 30 phút.
- "Ngày bắt đầu mong muốn" cho chọn ngày đã qua → `disabledDate={d => d.isBefore(dayjs(), 'day')}`.
- Phúc lợi bị tách chip ở dấu phẩy giữa câu → chỉ tách theo xuống dòng.
- Loại hợp đồng vừa có "Thử việc" vừa có ô "Thời gian thử việc"; "Chính thức" và "Không xác định thời hạn" trùng nghĩa → rút gọn danh mục.
- `/offers` của trưởng bộ phận có tiêu đề "Kết quả tuyển dụng" (trùng `/results`) và tab "Bản nháp" không dùng.
- Thông báo "Ứng tuyển thành công" khi HR thêm ứng viên vào tin → "Đã thêm ứng viên vào tin".
- Giới hạn file khác nhau: ứng viên 5 MB, "AI đọc CV" 20 MB.
- Hồ sơ ứng viên vẫn hỏi *Ngày sinh*, *Giới tính* trong khi AI đã bỏ 2 trường này để tránh thiên lệch → cân nhắc bỏ hoặc ghi "không bắt buộc, không dùng để đánh giá".
- Bấm "Xác nhận" ở *Việc của tôi* (trưởng bộ phận) chỉ chuyển sang trang lịch, phải bấm lần 2.
- Mobile: tiêu đề "Xác nhận phỏng vấn" cho buổi đã hoàn tất; dòng "Hình thức" hiện tên địa điểm; thương hiệu "ATS" (web là "TechCorp Vietnam").

---

## 5. Những phần đã chạy đúng

**Ứng viên:** đăng ký + OTP, đăng nhập/đăng xuất, quên mật khẩu (OTP), đổi mật khẩu (bắt đăng nhập lại),
hồ sơ (validate SĐT, lưu được), ảnh đại diện (chặn sai định dạng, gỡ ảnh), thay CV, danh sách việc làm
(lọc theo phòng ban/địa điểm/hình thức/loại hình có đếm, sắp xếp lương, trạng thái rỗng + "Xoá bộ lọc"),
ứng tuyển kèm CV, chặn ứng tuyển trùng, xem đơn + tiến trình, rút đơn, đồng ý / xin dời lịch kèm lý do,
.ics hợp lệ, xem thư mời, tải PDF, chấp nhận (có checkbox đồng ý) → trang chào mừng, từ chối kèm lý do,
thông báo + đánh dấu đã đọc, trang Quyền riêng tư.

**HR:** việc của tôi, duyệt / yêu cầu sửa / từ chối yêu cầu tuyển dụng (có kiểm khung lương), tạo tin từ yêu cầu
(prefill đúng), vòng đời tin Nháp → Chờ duyệt → Đang tuyển → Tạm dừng → Đóng, Kanban kéo giữa cột,
chọn nhiều + từ chối hàng loạt, so sánh ứng viên (cảnh báo hết suất), thêm ứng viên có sẵn vào tin,
thêm ứng viên mới (chặn email trùng), AI đọc CV + điền vào hồ sơ, chấm lại AI, xuất Excel,
lên lịch (ô bận không chọn được, 2 hình thức), duyệt đề xuất đổi giờ, thêm người phỏng vấn, huỷ buổi,
lịch tuần, viết đánh giá (không thấy đánh giá người khác trước khi nộp), ghi chú hồ sơ,
thư mời (lưu nháp, sửa, kiểm tra trước khi gửi, gửi, xoá nháp), danh mục (chặn trùng, ẩn mục),
Ctrl+K (có dấu), cài đặt + đổi mật khẩu, thông báo dẫn đúng trang.

**Trưởng bộ phận:** tạo yêu cầu (validate đủ), sửa & gửi lại sau khi bị yêu cầu sửa, xác nhận lịch,
đề xuất giờ khác, đánh giá (lưu nháp, validate đủ tiêu chí + nhận xét) khi vào từ trang buổi phỏng vấn,
kết quả tuyển dụng của phòng, chỉ thấy dữ liệu phòng mình.

**Admin:** tổng quan + đổi quý, chi tiết phòng ban, danh sách / tìm người dùng, mời người dùng (validate phòng ban,
xem trước email), kích hoạt từ lời mời (mật khẩu yếu bị chặn, link dùng 1 lần), khoá / mở khoá, gửi email đặt lại
mật khẩu, ma trận vai trò & quyền, thông tin doanh nghiệp (validate email, lưu), thêm văn phòng,
trình sửa trang tuyển dụng (bật/tắt khối, tự lưu, nút Xuất bản chỉ bật khi có thay đổi, xuất bản), nhật ký + tìm kiếm.

**Mobile:** đăng nhập 3 vai trò; Ứng viên 8 màn + ứng tuyển nhanh (bắt chọn nguồn); HR 14 màn + chuyển giai đoạn;
Trưởng bộ phận 8 màn — không có lỗi API/JS khi tải.

---

## 6. Chưa kiểm được

- Kéo thẻ Kanban vào ô từ chối (công cụ tự động không thả được — tự thử bằng chuột).
- Hộp thoại đăng nhập lại khi phiên hết hạn (C34) — không giả lập được vì token giữ trong bộ nhớ.
- Đăng nhập bằng Google (cần tài khoản thật).
- Thông báo realtime qua WebSocket (`/ws/info` từng trả 0 một lần).
- App mobile trên điện thoại thật (đã kiểm qua Expo web) và giao diện web ở màn hình nhỏ.

---

## 7. Chức năng nên bổ sung

Xếp theo giá trị cho buổi bảo vệ / độ khả thi trong 9 ngày.

### Nên làm (nhỏ, tăng điểm rõ)
1. **Cảnh báo CV bất thường (prompt injection) cho HR** — banner + badge (xem 1.7). Minh hoạ trực tiếp phần bảo mật AI.
2. **Nút "Chấm lại tất cả" cho một tin tuyển dụng** — để dữ liệu demo có đủ điểm AI và HR dùng khi sửa JD.
3. **Trạng thái "Đã rút đơn"** riêng (xem 3.2).
4. **Tự hết hạn lịch phỏng vấn / thư mời** bằng job định kỳ (lịch quá giờ chưa xác nhận → Hết hạn; offer quá hạn → EXPIRED đã có, kiểm tra job chạy).
5. **Nhắc lịch phỏng vấn qua email** trước 24 giờ và 1 giờ (notification-service + `@Scheduled`).
6. **Ô chọn người duyệt** trong form yêu cầu tuyển dụng (xem 1.4).
7. **Kiểm tra magic bytes khi upload** (xem 2.1).
8. **Gửi email bất đồng bộ** (xem 3.15) — demo mượt hơn hẳn.
9. **Script reset dữ liệu demo** (`docker/postgres-init` + SQL seed có dấu, có điểm AI) để trước buổi bảo vệ đưa hệ thống về trạng thái sạch.

### Nên có (trung bình)
10. **Sửa tin đang tuyển** (xem 3.3) và **mở lại tin đã đóng**.
11. **Đổi vai trò / phòng ban người dùng** cho Admin (xem 3.14).
12. **Lịch sử thay đổi đầy đủ** (audit) cho yêu cầu tuyển dụng, hồ sơ, thư mời (xem 3.11) — giáo viên đã yêu cầu "truy vết vòng đời".
13. **Tìm kiếm không dấu** (xem 4.2).
14. **Ẩn danh hoá thật khi xoá dữ liệu** (xem 1.8) — đáp ứng Nghị định 13/2023 về bảo vệ dữ liệu cá nhân, có thể nhắc trong báo cáo.
15. **Đồng bộ lịch** (gửi kèm .ics trong email mời phỏng vấn; đã có endpoint .ics).
16. **Báo cáo xuất PDF/Excel** cho trang Kết quả tuyển dụng (số liệu cho phòng ban).

### Có thì tốt (nếu còn thời gian)
17. Push notification trên mobile (Expo Notifications) cho lịch phỏng vấn và thư mời.
18. Trang "Kho ứng viên" (talent pool) — tìm ứng viên cũ để mời ứng tuyển vị trí mới.
19. Mẫu email chỉnh được bởi HR (notification-service đã có phần template ở web cũ).
20. Thống kê nguồn tuyển dụng (CareerBuilder, TopCV…) — dữ liệu nguồn đã có.
21. Chế độ "chỉ đọc khi service lỗi" (degraded mode) cho các trang tổng hợp.

---

## 8. Thứ tự sửa đề xuất (còn 9 ngày)

| Ngày | Việc |
|---|---|
| 16–17/11 | 1.1, 1.2, 1.3, 1.4 (kẹt luồng demo) · 2.3 · 3.4 · 3.5 · việt hoá thông báo lỗi chính (4.1) |
| 17/11 | 1.5 (mobile không chấm AI) · 1.7 (cảnh báo injection) · 2.1 (magic bytes) |
| 18/11 | 1.6 (AI chấm sai) + chạy lại benchmark v2 · làm sạch dữ liệu demo (4.3) · script reset |
| 19/11 | 3.2 (đã rút đơn) · 3.8 (lịch hết hạn) · 3.9 · 3.15 (email bất đồng bộ) · deploy |
| 20–24/11 | Viết báo cáo; chỉ sửa lỗi nhỏ nhóm 4 nếu còn thời gian |
| 25/11 | Nộp |

Các mục 1.8, 3.11, 3.12, 3.14 và phần lớn mục 7 có thể đưa vào chương *Hướng phát triển* của báo cáo nếu không kịp.

---

## 9. Dữ liệu thử nghiệm đã tạo khi kiểm tra

Mật khẩu chung: `Password123!`

- Tài khoản ứng viên: `uv.kiemthu1611@example.com`, `uv.xoa1611@example.com` (đã "xoá dữ liệu" — vẫn đăng nhập được, xem 1.8).
- Tài khoản trưởng bộ phận được mời: `moi.kiemthu1611@example.com` (Ban Giám đốc).
- Ứng viên thêm tay: "Kiểm Trùng Email" (`them.thucong1611@example.com`).
- Đơn ứng tuyển #18–#26; buổi phỏng vấn #13–#16 (#16 đã lùi giờ về 07:00 16/11 trong DB để đánh giá); thư mời #7 (đã nhận), #8 (đã từ chối), #9 (đã xoá).
- Yêu cầu tuyển dụng REQ-007 (đã duyệt, người duyệt đổi trong DB), REQ-008 (đã từ chối, người duyệt đổi trong DB).
- Tin #5 và #6 (đều đã đóng).
- Văn phòng "Văn phòng kiểm thử 16/11" (đang bật); kỹ năng "HM hack skill" (đã ẩn).
- Trong DB local đã ghi OTP/token đã biết cho các tài khoản thử nghiệm ở trên.
- File `Downloads\ho-so-ung-tuyen.xlsx` được tải về khi kiểm *Xuất Excel*.

Nên xoá/ẩn các bản ghi này (hoặc chạy script reset) trước buổi demo.
