# Đối chiếu thiết kế `docs/UI` với code hiện tại — phiếu quyết định

> **Mục đích:** liệt kê từng điểm lệch giữa bản thiết kế HarmonyOS (`docs/UI/*.html`) và code trên nhánh `mobile` (đã pull `main` tới commit `2110742`), kèm các phương án thay đổi, công sức, rủi ro và đề xuất của Claude. Bạn điền quyết định vào ô **Quyết định của bạn** ở mỗi mục.
>
> **Cách đọc mã màn hình:** `DSxx` = hệ thống thiết kế, `Axx` = Quản trị doanh nghiệp, `Rxx` = Chuyên viên tuyển dụng (web), `Hxx` = Đại diện phòng ban (web), `Cxx` = Ứng viên (web), `Mxx/UCxx/URxx/UHxx` = Mobile (chung / ứng viên / chuyên viên tuyển dụng / đại diện phòng ban).
>
> **Thang công sức:** S = vài giờ đến 1 ngày · M = 2–5 ngày · L = trên 1 tuần (ước lượng thô cho 1 người, **chưa chắc**).
>
> **Cách điền quyết định:** đánh `x` vào một ô, ghi chú thêm nếu cần.
> - `Theo thiết kế`: sửa code cho giống thiết kế.
> - `Giữ code`: giữ nguyên code, bỏ qua phần đó của thiết kế.
> - `Hoãn`: làm sau, không thuộc đợt này.
> - `Khác`: phương án riêng của bạn (ghi vào ghi chú).

---

## Mục lục

- [A. Giao diện chung (theme, layout, menu)](#a-giao-diện-chung)
- [B. Quy trình tuyển dụng](#b-quy-trình-tuyển-dụng)
- [C. Quản trị doanh nghiệp & phân quyền](#c-quản-trị-doanh-nghiệp--phân-quyền)
- [D. Mobile](#d-mobile)
- [E. Bảng tổng hợp quyết định](#e-bảng-tổng-hợp-quyết-định)
- [F. Thứ tự triển khai đề xuất](#f-thứ-tự-triển-khai-đề-xuất)
- [G. Kết quả kiểm tra Đợt 0](#g-kết-quả-kiểm-tra-đợt-0)

---

## A. Giao diện chung

### A1. Màu thương hiệu web

| | |
|---|---|
| **Thiết kế** | Màu chính `#0a59f7` (xanh dương), nhấn `#0848c7`, chữ `#182431`, nền trang `#f1f3f5`; chữ phụ dùng `#182431` với độ trong suốt 60% / 40% (DS01) |
| **Code** | Màu chính `#0E7A5F` (xanh lá), header `#0B3B36`, chữ `#111827` — `frontend/src/app/theme.ts:4-43` |
| **Vì sao lệch** | Theme web được làm trước khi có bản thiết kế HarmonyOS |

**Phương án**
1. **Đổi token trong `theme.ts`** cho khớp DS01, rồi rà các chỗ dùng màu cứng (`#0E7A5F`, `GRADIENTS.*`) trong `frontend/src`. Công sức: **S–M**.
2. Giữ màu xanh lá, chỉ áp dụng bố cục mới. Công sức: 0.

**Rủi ro:** thấp. Chỉ ảnh hưởng hiển thị. Cần soát độ tương phản chữ trắng trên `#0a59f7`.

**Đề xuất của Claude:** Phương án 1 — **Theo thiết kế**.

**Quyết định của bạn:** [x] Theo thiết kế  [ ] Giữ code  [ ] Hoãn  [ ] Khác
Ghi chú: Theo đề xuất của Claude

---

### A2. Màu thương hiệu mobile

| | |
|---|---|
| **Thiết kế** | Giống web: `#0a59f7` (DS01, DS05) |
| **Code** | `primary: "#0E7A5F"` — `mobile/src/theme/colors.ts:14`. Ghi chú ở `colors.ts:2-4` nói mobile *cố ý khác web* |

**Phương án**
1. Đổi `primary`, `primaryDark`, `primarySoft` ở `colors.ts:14-18` sang tông xanh dương. Công sức: **S**.
2. Giữ nguyên.

**Rủi ro:** thấp. Ghi chú trong code cho thấy từng có quyết định giữ mobile khác web, nên cần xác nhận lại quyết định đó.

**Đề xuất của Claude:** **Theo thiết kế**, web và mobile dùng chung một bảng màu.

**Quyết định của bạn:** [x] Theo thiết kế  [ ] Giữ code  [ ] Hoãn  [ ] Khác
Ghi chú: Theo đề xuất của Claude

---

### A3. Thư viện component web

| | |
|---|---|
| **Thiết kế** | Bộ component riêng: nút bo tròn hoàn toàn, thẻ bo 20px, giao diện phẳng không bóng, ô nhập nền xám (DS02–DS04) |
| **Code** | Ant Design 6 (`frontend/package.json`: `"antd": "^6.5.1"`) |

**Phương án**
1. **Giữ Ant Design, tùy chỉnh theme token** (`borderRadius`, `controlHeight`, `boxShadow`, màu) qua `ConfigProvider` ở `frontend/src/app/ThemedApp.tsx`. Component nào khác nhiều thì viết wrapper. Công sức: **M**.
2. Bỏ Ant Design, tự viết bộ component. Công sức: **L+**.

**Rủi ro:** phương án 2 rất rủi ro vì phải viết lại toàn bộ bảng, form, modal, date picker.

**Đề xuất của Claude:** **Phương án 1**. Giữ Ant Design, chỉnh theme.

**Quyết định của bạn:** [x] Phương án 1  [ ] Phương án 2  [ ] Hoãn  [ ] Khác
Ghi chú:

---

### A4. Màu theo giai đoạn tuyển dụng

| | |
|---|---|
| **Thiết kế** | 6 giai đoạn, mỗi giai đoạn một màu cố định, dùng chung cho thẻ trạng thái, thanh tiến trình, phễu và biểu đồ (DS01, DS06) |
| **Code** | `stageNew/Screening/Interview/Offer/Hired/Rejected` — `frontend/src/app/theme.ts:37-42`, bộ màu khác thiết kế |

**Phương án:** gom màu giai đoạn về một chỗ duy nhất (`theme.ts`) và đổi giá trị. Mobile làm tương tự ở `mobile/src/lib/status.ts`. Công sức: **S**.

**Rủi ro:** thấp. Phụ thuộc vào [B1](#b1-giai-đoạn-tuyển-dụng-pipeline-tùy-biến-hay-6-giai-đoạn-cố-định).

**Đề xuất của Claude:** **Theo thiết kế**.

**Quyết định của bạn:** [x] Theo thiết kế  [ ] Giữ code  [ ] Hoãn  [ ] Khác
Ghi chú:

---

### A5. Font chữ

| | |
|---|---|
| **Thiết kế** | HarmonyOS Sans cho cả web và mobile (DS02) |
| **Code** | Font mặc định hệ thống / Ant Design |

**Phương án**
1. Dùng HarmonyOS Sans, có font dự phòng `system-ui`. Công sức: **S**.
2. Dùng font tương tự có giấy phép rõ ràng (ví dụ Inter, Be Vietnam Pro). Công sức: **S**.

**Rủi ro:** **chưa chắc** về giấy phép thương mại và việc tự host HarmonyOS Sans. Cần đọc giấy phép trước khi đóng gói font vào app.

**Đề xuất của Claude:** kiểm tra giấy phép trước. Nếu không rõ thì chọn **Phương án 2** (Be Vietnam Pro, hỗ trợ tiếng Việt tốt).

**Quyết định của bạn:** [ ] Phương án 1  [x] Phương án 2  [ ] Hoãn  [ ] Khác
Ghi chú: Be Vietnam Pro

---

### A6. Menu bên (sidebar) theo vai trò

| Vai trò | Thiết kế | Code (`frontend/src/layouts/AppLayout.tsx:60-117`) |
|---|---|---|
| Chuyên viên tuyển dụng (R01) | Việc của tôi · Yêu cầu tuyển dụng · Việc làm · Ứng viên · Lịch phỏng vấn · Thư mời · Danh mục · *Việc làm ghim* · Cài đặt; thanh trên có Ctrl K, Tạo mới, chuông | Tổng quan · Danh mục · nhóm Tuyển dụng (Yêu cầu, Tin) · Hồ sơ ứng viên · Lịch phỏng vấn · Đề nghị nhận việc · Thông báo · Cài đặt (`AppLayout.tsx:91-94`) |
| Đại diện phòng ban (H01) | Việc của tôi · Yêu cầu tuyển dụng · Ứng viên · Lịch phỏng vấn · Kết quả tuyển dụng · Cài đặt | Tổng quan · nhóm Tuyển dụng · Ứng viên phòng ban · Lịch phỏng vấn · Kết quả tuyển dụng (trỏ tới `/offers`) · Thông báo · Cài đặt (`AppLayout.tsx:97-105`) |
| Quản trị doanh nghiệp (A01) | Tổng quan · Người dùng · Thông tin doanh nghiệp · Trang tuyển dụng · Cài đặt | Tổng quan · Vận hành tuyển dụng (Yêu cầu, Tin, Hồ sơ, Phỏng vấn, Offer) · Quản trị (Người dùng, Danh mục, Nhật ký) · Thông báo · Cài đặt (`AppLayout.tsx:76-88`) |
| Ứng viên (C20) | Tổng quan · Đơn ứng tuyển · Lịch phỏng vấn · Thư mời nhận việc · Thông báo · Hồ sơ của tôi · Quyền riêng tư | Hồ sơ · Việc làm · Đơn · Lịch PV · Thư mời · Thông báo · Cài đặt (`AppLayout.tsx:107-115`) |

**Thay đổi cần làm:** viết lại `menuItems` trong `AppLayout.tsx`; thêm route cho màn chưa có (Việc của tôi, Thông tin doanh nghiệp, Trang tuyển dụng, Kết quả tuyển dụng riêng cho đại diện phòng ban, Quyền riêng tư); thêm tìm kiếm Ctrl K, menu Tạo mới, chuông thông báo trên thanh trên. Công sức: **M** (riêng khung layout).

**Rủi ro:**
- Menu của Admin theo thiết kế **không còn** mục vận hành tuyển dụng. Phần này gắn với [C1](#c1-admin-có-được-xem-hồ-sơ-ứng-viên-không).
- "Kết quả tuyển dụng" của đại diện phòng ban hiện đang trỏ vào trang offer (`AppLayout.tsx:102`). Thiết kế cấm đại diện phòng ban thấy lương trong thư mời (DS06), nên cần trang riêng (H16, H17).

**Đề xuất của Claude:** **Theo thiết kế**.

**Quyết định của bạn:** [x] Theo thiết kế  [ ] Giữ code  [ ] Hoãn  [ ] Khác
Ghi chú: không cần làm ctrl + K

---

### A7. Mẫu màn danh sách

| | |
|---|---|
| **Thiết kế** | Mọi màn chính theo cùng thứ tự: tiêu đề + nút chính → **tab trạng thái có số đếm** (tab cần xử lý đứng đầu, "Tất cả" đứng cuối) → thanh lọc ngang → bảng gọn 4–6 cột, cả dòng bấm được, không có nút thao tác trong bảng (DS04, DS06) |
| **Code** | Mỗi trang tự làm theo kiểu riêng, ví dụ `frontend/src/features/candidate/pages/ApplicationsPage.tsx` (663 dòng), `frontend/src/features/offer/pages/OffersPage.tsx` |

**Phương án:** tạo component dùng chung `ListPage` (header, tab có đếm, filter, bảng), rồi chuyển dần từng trang sang. Công sức: **M**.

**Rủi ro:** tab có số đếm cần API trả số lượng theo từng trạng thái. **Chưa chắc** các API list hiện tại có trả số này không. Nếu không có thì phải gọi nhiều request hoặc thêm endpoint đếm.

**Đề xuất của Claude:** **Theo thiết kế**.

**Quyết định của bạn:** [x] Theo thiết kế  [ ] Giữ code  [ ] Hoãn  [ ] Khác
Ghi chú:

---

### A8. Hồ sơ ứng viên: trang riêng, không dùng ngăn kéo bên phải

| | |
|---|---|
| **Thiết kế** | "Không dùng ngăn kéo bên phải; hồ sơ ứng viên là một trang riêng" (DS06). Trang hồ sơ có CV bên trái, các tab Điểm AI / Đánh giá / Phỏng vấn / Thư mời / Hoạt động bên phải, nút ‹ Trước / Sau › trong cùng giai đoạn (R11–R14, H09) |
| **Code** | Đã là trang riêng: `/candidates/:candidateId/applications/:applicationId` (`frontend/src/routes/AppRoutes.tsx:70`, `CandidateApplicationDetailPage.tsx`, 868 dòng) |

**Thay đổi cần làm:** sắp xếp lại bố cục theo thiết kế và thêm nút Trước / Sau. Công sức: **M**.

**Rủi ro:** thấp. Nút Trước / Sau cần biết danh sách và thứ tự ứng viên trong cùng giai đoạn.

**Đề xuất của Claude:** **Theo thiết kế**.

**Quyết định của bạn:** [x] Theo thiết kế  [ ] Giữ code  [ ] Hoãn  [ ] Khác
Ghi chú: không cần làm nút trước sau

---

## B. Quy trình tuyển dụng

### B1. Giai đoạn tuyển dụng: pipeline tùy biến hay 6 giai đoạn cố định

| | |
|---|---|
| **Thiết kế** | 6 giai đoạn cố định cho mọi vị trí: Ứng tuyển · Sàng lọc · Phỏng vấn · Thư mời · Đã tuyển (+ Từ chối). Không dùng "vòng 1/2" (DS06). Màn tạo tin ghi "Giai đoạn tuyển dụng: Cố định cho mọi vị trí" (R07) |
| **Code** | Pipeline cấu hình được trong masterdata, `StageType` có `APPLIED, CV_SCREENING, HR_SCREENING, TECHNICAL_INTERVIEW, HR_INTERVIEW, FINAL_INTERVIEW, OFFER, HIRED, REJECTED, CUSTOM` (`masterdata-service/src/main/java/iuh/fit/se/masterdata/pipeline/enums/StageType.java:4-13`). Mỗi `Application` lưu `currentStageId`, `currentStageName`, `currentStageOrder`, `currentStageType` (`application-service/.../application/Application.java:45-55`). Tin tuyển dụng gắn với một pipeline (`recruitment-service/.../posting/JobPosting.java`). Có 34 chỗ trong `frontend/src` + `mobile/src` dùng tên các loại stage |

**Phương án**
1. **Giữ backend, gộp ở giao diện.** Viết một hàm ánh xạ `stageType → 1 trong 6 nhóm` (ví dụ `CV_SCREENING, HR_SCREENING → Sàng lọc`; `*_INTERVIEW → Phỏng vấn`). Ẩn màn cấu hình pipeline khỏi Danh mục. Mọi tin mới dùng một pipeline mặc định có đúng 6 bước. Công sức: **S–M**.
2. **Cố định ở backend.** Bỏ pipeline, đổi `Application` thành enum 6 giá trị, viết Flyway migration chuyển dữ liệu cũ, sửa recruitment, application, dashboard, ai-service, notification. Công sức: **L**.
3. Giữ pipeline tùy biến, bỏ phần đó của thiết kế. Công sức: 0.

**Rủi ro**
- Phương án 2 phải migration dữ liệu thật trên nhiều database (mỗi service một DB). Dễ làm sai số liệu time-to-hire (`Application.java:66` dùng mốc HIRED) và phễu ở dashboard.
- Phương án 1 vẫn còn rủi ro nhỏ: nếu có pipeline cũ với stage `CUSTOM` thì không biết gộp vào nhóm nào. Cần quy tắc mặc định.

**Đề xuất của Claude:** **Phương án 1**.

**Quyết định của bạn:** [x] Phương án 1  [ ] Phương án 2  [ ] Phương án 3  [ ] Khác
Ghi chú:

---

### B2. Bước duyệt thư mời trước khi gửi

| | |
|---|---|
| **Thiết kế** | Bản nháp → **Gửi thư mời** (hộp xác nhận R27) → Đã gửi. Không có bước duyệt riêng. Màn chi tiết bản nháp có mục "Kiểm tra trước khi gửi": trong khung lương, còn suất, đã có đánh giá (R26) |
| **Code** | `DRAFT → submit → PENDING_APPROVAL → approve → APPROVED` (ứng viên chỉ thấy từ `APPROVED`). `submit` yêu cầu `DRAFT` (`offer-service/.../offer/OfferService.java:264-267`), `approve` yêu cầu `PENDING_APPROVAL` (`OfferService.java:278-281`). Cả hai đều chỉ cho HR/Admin (`OfferController.java:93-111`). Có thêm nhánh `reject` (`OfferController.java:113`) |

**Phương án**
1. **Giữ enum, gộp ở UI:** nút "Gửi thư mời" gọi lần lượt `submit` rồi `approve`. Không sửa backend. Công sức: **S**. Nhược điểm: nếu bước 2 lỗi, thư mời bị kẹt ở `PENDING_APPROVAL`.
2. **Thêm endpoint `PATCH /offers/{id}/send`** chuyển thẳng `DRAFT → APPROVED` trong một transaction, có kiểm tra khung lương và suất, phát event như `approve` (`OfferService.java:291`). Giữ `submit/approve` cho dữ liệu cũ. Công sức: **S–M**.
3. Giữ bước duyệt, thêm màn duyệt vào thiết kế.

**Rủi ro:** event và thông báo đang gắn với các trạng thái này (`notification-service/.../NotificationType.java:13-14`: `OFFER_PENDING_CONFIRMATION`, `OFFER_READY_FOR_CANDIDATE`). Phương án 2 phải phát đúng event `OFFER_READY_FOR_CANDIDATE`.

**Đề xuất của Claude:** **Phương án 2**.

**Quyết định của bạn:** [ ] Phương án 1  [x] Phương án 2  [ ] Phương án 3  [ ] Khác
Ghi chú:

---

### B3. Thu hồi thư mời

| | |
|---|---|
| **Thiết kế** | Thư mời đã gửi có nút "Thu hồi", bắt buộc nhập lý do, gửi email báo ứng viên, sau đó soạn được thư mời mới (R43, R44). Trạng thái "Đã thu hồi" (R25, UR16) |
| **Code** | Không có trạng thái thu hồi (`offer-service/.../offer/OfferStatus.java:4-9`), không có endpoint (`OfferController.java`). Chỉ có `DELETE /{id}` (`OfferController.java:141`), **chưa chắc** cho xoá ở trạng thái nào |

**Thay đổi cần làm**
- Thêm `WITHDRAWN` vào `OfferStatus`, thêm cột `withdraw_reason`, `withdrawn_at` (Flyway migration trong `offer-service/src/main/resources/db/migration`).
- Thêm `PATCH /offers/{id}/withdraw` (chỉ HR, chỉ khi `APPROVED` và ứng viên chưa phản hồi).
- Thêm event `OFFER_WITHDRAWN` và type tương ứng trong `NotificationType.java`.
- Mở lại suất: thư mời đã thu hồi không tính vào số suất đã dùng.

Công sức: **M**.

**Rủi ro:** quy tắc đếm suất ("Còn 2/2 suất", R23, R28). Cần tìm chỗ đếm suất hiện tại, **chưa chắc** nằm ở service nào.

**Đề xuất của Claude:** **Theo thiết kế**.

**Quyết định của bạn:** [ ] Theo thiết kế  [ ] Giữ code  [x] Hoãn  [ ] Khác
Ghi chú:

---

### B4. Thư mời hết hạn

| | |
|---|---|
| **Thiết kế** | Trạng thái "Hết hạn" (R25); ứng viên thấy đếm ngược "còn 3 ngày" (C16, UC09); HR nhận thông báo "Thư mời sắp hết hạn" (UR13) |
| **Code** | Có `responseDeadline` (`offer-service/.../offer/Offer.java:87-88`) nhưng không có trạng thái `EXPIRED`, cũng không có job quét hạn. Mẫu job đã có sẵn: `application-service/.../StaleApplicationReminderJob.java`, `interview-service/.../InterviewEvaluationPendingJob.java` |

**Thay đổi cần làm:** thêm `EXPIRED`; thêm job `@Scheduled` chuyển `APPROVED` quá hạn sang `EXPIRED`; chặn `accept/decline` khi đã hết hạn (`OfferService.java:319,353`); thêm thông báo nhắc trước hạn. Công sức: **S–M**.

**Rủi ro:** múi giờ (server và DB lưu `LocalDateTime`). Cần thống nhất múi giờ Việt Nam.

**Đề xuất của Claude:** **Theo thiết kế**.

**Quyết định của bạn:** [x] Theo thiết kế  [ ] Giữ code  [ ] Hoãn  [ ] Khác
Ghi chú:

---

### B5. Ứng viên rút đơn

| | |
|---|---|
| **Thiết kế** | Nút "Rút đơn ứng tuyển" ở chi tiết đơn (UC06). Khi chấp nhận một thư mời, các đơn khác vẫn giữ và ứng viên có thể rút (UC10) |
| **Code** | Không có endpoint rút đơn trong `application-service/.../application/ApplicationController.java:25-180` (chỉ có `reject` do HR thực hiện) |

**Thay đổi cần làm:** thêm `PATCH /applications/my/{id}/withdraw` (chỉ ứng viên sở hữu đơn). Chuyển đơn sang REJECTED kèm lý do "Ứng viên rút lui" (danh mục lý do đã có mục này ở UR06) hoặc thêm cờ `withdrawnByCandidate`. Huỷ các buổi phỏng vấn đang chờ. Công sức: **S–M**.

**Rủi ro:** phải huỷ buổi phỏng vấn ở `interview-service`, tức là thêm một event mới giữa hai service.

**Đề xuất của Claude:** **Theo thiết kế**, dùng REJECTED kèm lý do để không thêm trạng thái mới.

**Quyết định của bạn:** [x] Theo thiết kế  [ ] Giữ code  [ ] Hoãn  [ ] Khác
Ghi chú:

---

### B6. Hiển thị Điểm AI không thống nhất trong chính bản thiết kế

| | |
|---|---|
| **Thiết kế (web)** | "91 phù hợp · Đáp ứng 4/4 yêu cầu bắt buộc", các tiêu chí chấm theo mức x/4: Số năm kinh nghiệm, Học vấn & chứng chỉ, Kỹ năng chuyên môn, Kinh nghiệm liên quan, Lĩnh vực (H09, R14) |
| **Thiết kế (mobile)** | Mỗi mục chấm 0–100 và có mục **"Mức lương mong muốn 85"**, kèm Điểm mạnh / Cần làm rõ (UR03) |
| **Code** | Các chiều chấm điểm: `TECHNICAL_SKILLS, RELEVANT_EXPERIENCE, EDUCATION_CERTIFICATION, DOMAIN` (`ai-service/app/schemas/scoring.py:32-44`), **không có** chiều lương. Web đã có thẻ điểm ở `frontend/src/features/ai/components/AiScoreCard.tsx` |

**Phương án**
1. **Theo backend và màn web H09** cho cả mobile. Bỏ mục lương và thang 0–100 của UR03. Công sức: **S**.
2. Thêm chiều lương vào AI. Công sức: **L**, và phải sửa prompt, benchmark.

**Đề xuất của Claude:** **Phương án 1**.

**Quyết định của bạn:** [x] Phương án 1  [ ] Phương án 2  [ ] Khác
Ghi chú:

---

### B7. Màn "Việc của tôi" (danh sách việc cần làm)

| | |
|---|---|
| **Thiết kế** | Màn chính của nội bộ là danh sách việc cần làm, sắp theo ưu tiên, có tab "Của tôi / Cả nhóm". Ví dụ: viết đánh giá, duyệt đề xuất đổi giờ, sàng lọc hồ sơ quá 2 ngày, gửi thư mời, duyệt yêu cầu (R01, H01, UR01, UH01) |
| **Code** | Màn chính là `/dashboard` (`DashboardPage.tsx`, 709 dòng) với số liệu thống kê. **Chưa chắc** đã có API gộp việc cần làm. Dữ liệu đang nằm rải rác ở application (đơn cũ, `StaleApplicationReminderJob`), interview (đánh giá chưa nộp, đề xuất đổi giờ), offer (bản nháp), recruitment (yêu cầu chờ duyệt) |

**Phương án**
1. **Frontend tự gọi nhiều API rồi ghép lại.** Nhanh, nhưng phải gọi 4–5 request. Công sức: **M**.
2. **Thêm endpoint gộp** `GET /dashboard/my-tasks` trong `dashboard-service`, service này gọi sang các service khác. Công sức: **M–L**.

**Rủi ro:** phương án 2 làm `dashboard-service` phụ thuộc vào nhiều service khác, một service chậm thì cả màn chậm.

**Đề xuất của Claude:** làm **Phương án 1** trước, khi ổn định thì chuyển sang Phương án 2.

**Quyết định của bạn:** [x] Phương án 1  [ ] Phương án 2  [ ] Hoãn  [ ] Khác
Ghi chú:

---

### B8. Duyệt yêu cầu tuyển dụng: chốt khung lương

| | |
|---|---|
| **Thiết kế** | Khi duyệt, chuyên viên tuyển dụng nhập "Lương duyệt từ – đến", có cảnh báo nếu thấp hơn đề xuất, kèm ghi chú (R04). Màn tạo tin và soạn thư mời dùng lại khung này (R07, R24) |
| **Code** | `RequisitionStatus` đã có đủ trạng thái (`recruitment-service/.../requisition/RequisitionStatus.java:4`). **Chưa chắc** entity `JobRequisition` đã có trường lương duyệt tách riêng khỏi lương đề xuất |

**Thay đổi cần làm:** nếu chưa có thì thêm `approvedSalaryMin/Max` (migration) và nhận các trường này trong request duyệt. Công sức: **S–M**. Cần kiểm tra lại code trước khi làm.

**Đề xuất của Claude:** **Theo thiết kế**, sau khi đã kiểm tra entity.

**Quyết định của bạn:** [x] Theo thiết kế  [ ] Giữ code  [ ] Hoãn  [ ] Khác
Ghi chú:

---

## C. Quản trị doanh nghiệp & phân quyền

### C1. Admin có được xem hồ sơ ứng viên không

| | |
|---|---|
| **Thiết kế** | "Quản trị doanh nghiệp chỉ thấy số liệu tổng hợp, không mở hồ sơ ứng viên" (DS06). Bảng quyền A07: Admin **không** xem ứng viên, không phỏng vấn, không gửi thư mời. Menu Admin không có mục vận hành tuyển dụng (A01) |
| **Code — frontend** | `COMPANY_ADMIN` nằm trong `INTERNAL_ROLES` (`frontend/src/routes/AppRoutes.tsx:40`), được vào `/applications`, `/candidates/...`, `/offers`... (`AppRoutes.tsx:64-77`). Menu Admin có "Vận hành tuyển dụng" (`AppLayout.tsx:78-80`) |
| **Code — backend** | Admin được vượt qua hầu hết kiểm tra: `requireHr` và `requireInternal` đều cho `COMPANY_ADMIN` (`application-service/.../security/AuthorizationPolicy.java:22-24`); `requireSameDepartment` bỏ qua Admin (`:27`); `requireOwnerOrAdmin` (`:36`); và `case COMPANY_ADMIN -> true` (`:40`). Các service khác có `AuthorizationPolicy` tương tự |

**Phương án**
1. **Theo thiết kế ở cả UI và backend.** Bỏ Admin khỏi các route tuyển dụng và sửa `AuthorizationPolicy` ở application, candidate, interview, offer để Admin không đọc được dữ liệu cá nhân của ứng viên. `dashboard-service` vẫn cho Admin xem số liệu tổng hợp. Công sức: **M**.
2. Chỉ ẩn trên UI. Công sức: **S**. **Không an toàn**: Admin vẫn gọi API trực tiếp được (qua DevTools, Postman).
3. Giữ quyền Admin như hiện tại.

**Rủi ro**
- Phương án 1 làm mất một "tài khoản làm được mọi thứ", có thể gây khó khăn khi demo hoặc khi chuyên viên tuyển dụng nghỉ đột xuất. Cần sẵn tài khoản RECRUITER để demo.
- Test phân quyền hiện có có thể giả định Admin có toàn quyền và sẽ fail. Cần chạy lại test của từng service.
- Admin hiện cũng duyệt yêu cầu tuyển dụng và thư mời (`OfferController.java:101-111` ghi "HR hoặc Company Admin duyệt"). Theo bảng A07, Admin không còn duyệt nữa.

**Đề xuất của Claude:** **Phương án 1**. Nếu thiếu thời gian thì làm Phương án 2 trước, nhưng ghi rõ đây là nợ kỹ thuật.

**Quyết định của bạn:** [ ] Phương án 1  [x] Phương án 2  [ ] Phương án 3  [ ] Khác
Ghi chú:

---

### C2. Thêm người dùng: tạo trực tiếp hay gửi lời mời

| | |
|---|---|
| **Thiết kế** | Admin nhập họ tên, email công ty, vai trò, phòng ban, chức danh, lời nhắn. Hệ thống gửi email "Đặt mật khẩu & bắt đầu", link hết hạn sau 7 ngày. Tài khoản ở trạng thái "Chờ kích hoạt" (A03, A04). Mobile: "Nhân viên Vexo không cần đăng ký — hãy dùng lời mời gửi qua email công ty" (M03) |
| **Code** | `POST /admin/users` tạo tài khoản ngay, **Admin tự đặt mật khẩu tạm** (`auth-service/.../dto/request/CreateUserRequest.java:13`: `tempPassword`) — `AuthController.java:148-155`. `UserStatus` có `PENDING_VERIFICATION, ACTIVE, LOCKED, INACTIVE` (`auth-service/.../enums/UserStatus.java:4-7`) |

**Thay đổi cần làm**
- Bảng `user_invitations` (token băm, hạn dùng, người mời, lời nhắn) và migration trong auth-service.
- `POST /admin/invitations`, `POST /auth/invitations/{token}/accept` (đặt mật khẩu), `POST /admin/invitations/{id}/resend`.
- Email mời (dùng lại cơ chế gửi OTP đã có cho đăng ký và quên mật khẩu).
- Trang web `/invite/:token` và màn mobile tương ứng.

Công sức: **M**.

**Rủi ro:** bảo mật token (phải lưu bản băm và dùng một lần). Ích lợi là Admin không còn biết mật khẩu của người khác.

**Đề xuất của Claude:** **Theo thiết kế**.

**Quyết định của bạn:** [x] Theo thiết kế  [ ] Giữ code  [ ] Hoãn  [ ] Khác
Ghi chú:

---

### C3. Khoá tài khoản kèm chuyển giao việc

| | |
|---|---|
| **Thiết kế** | Trước khi khoá: liệt kê yêu cầu tuyển dụng người đó tạo, buổi phỏng vấn sắp tới, phiếu đánh giá chưa nộp. Chọn người nhận cho từng mục rồi bấm "Chuyển giao & khoá" (A05, A06) |
| **Code** | Chỉ đổi trạng thái: `PATCH /users/{id}/status` (`auth-service/.../controller/AuthController.java:157-165`). Không có API liệt kê hay chuyển giao. `application-service` có `assign-recruiter` (`ApplicationController.java:142,171`) |

**Phương án**
1. **Bản đầy đủ:** auth-service điều phối (saga), gọi recruitment (đổi người tạo yêu cầu), interview (đổi người phỏng vấn), application (đổi người phụ trách). Có bù trừ nếu một bước lỗi. Công sức: **L**.
2. **Bản rút gọn:** màn khoá hiện danh sách việc đang dở (chỉ đọc, gọi API từng service) kèm cảnh báo. Người dùng tự chuyển ở từng màn rồi mới khoá. Công sức: **M**.
3. Giữ code (khoá thẳng).

**Rủi ro:** Phương án 1 đụng 3–4 service; lỗi giữa chừng sẽ để dữ liệu không nhất quán.

**Đề xuất của Claude:** **Phương án 2** trước, Phương án 1 để sau.

**Quyết định của bạn:** [ ] Phương án 1  [x] Phương án 2  [ ] Phương án 3  [ ] Khác
Ghi chú:

---

### C4. Thông tin doanh nghiệp

| | |
|---|---|
| **Thiết kế** | Tên đầy đủ, tên hiển thị, mã số thuế, ngày thành lập, website, quy mô, email tuyển dụng, điện thoại, trụ sở, giới thiệu; logo, màu thương hiệu; **danh sách văn phòng** kèm số nhân sự; người phụ trách dữ liệu cá nhân; chính sách bảo mật (A08) |
| **Code** | `Company` chỉ có `name, address, phone, description, logoUrl, bannerUrl, dataRetentionMonths, createdAt` (`auth-service/.../entity/Company.java:13-36`). Địa điểm làm việc nằm trong danh mục masterdata (R41: "Địa điểm làm việc 3 mục") |

**Thay đổi cần làm:** thêm cột vào `Company` (mã số thuế, tên hiển thị, quy mô, email tuyển dụng, website, màu thương hiệu, người phụ trách dữ liệu, nội dung chính sách) kèm migration và DTO (`UpdateCompanyRequest`, `CompanyResponse`). Văn phòng dùng lại danh mục địa điểm của masterdata, không tạo bảng mới. Công sức: **S–M**.

**Rủi ro:** thấp.

**Đề xuất của Claude:** **Theo thiết kế**, văn phòng dùng lại masterdata.

**Quyết định của bạn:** [x] Theo thiết kế  [ ] Giữ code  [ ] Hoãn  [ ] Khác
Ghi chú:

---

### C5. Trình chỉnh trang tuyển dụng (CMS)

| | |
|---|---|
| **Thiết kế** | Các khối kéo đổi thứ tự (Ảnh bìa & khẩu hiệu, Vị trí nổi bật, Đời sống, Phúc lợi, Văn phòng, Chân trang), bật/ẩn từng khối, tự lưu nháp, xem trước máy tính/điện thoại, nút Xuất bản (A09–A11). Trang công khai C01 dựng từ các khối này |
| **Code** | Không có. Trang công khai `/careers` (`frontend/src/routes/AppRoutes.tsx:44-47`, `CompanyJobsPage.tsx`) lấy dữ liệu từ `PublicCompanyController` (`auth-service/.../controller/PublicCompanyController.java:18`) |

**Phương án**
1. **Làm đầy đủ:** bảng `career_page_blocks` (kiểu khối, thứ tự, JSON nội dung, bản nháp / bản đã xuất bản), API CRUD và publish, upload ảnh lên S3 (đã có S3 ở candidate/ai-service), trình chỉnh kéo thả (đã có `@hello-pangea/dnd` trong `frontend/package.json`). Công sức: **L**.
2. **Trang cố định:** dựng C01 với bố cục cố định, nội dung lấy từ C4 và danh sách tin. Không có trình chỉnh. Công sức: **S–M**.

**Rủi ro:** Phương án 1 dễ phình phạm vi (ảnh, xem trước, phiên bản).

**Đề xuất của Claude:** **Phương án 2** trước, **hoãn** Phương án 1.

**Quyết định của bạn:** [ ] Phương án 1  [x] Phương án 2  [ ] Hoãn  [ ] Khác
Ghi chú:

---

### C6. Nhật ký hệ thống (audit log)

| | |
|---|---|
| **Thiết kế** | Không có màn nhật ký. Chỉ có "Lịch sử tài khoản" trong chi tiết người dùng (A05) và tab "Hoạt động" trong hồ sơ ứng viên (R13) |
| **Code** | Có trang `/audit-logs` cho Admin (`frontend/src/routes/AppRoutes.tsx:96`, `AuditLogPage.tsx`) và có phát audit event (ví dụ `OfferService.java:291`) |

**Phương án**
1. **Giữ**, đặt vào mục Cài đặt của Admin. Áp style mới. Công sức: **S**.
2. Bỏ màn này, chỉ giữ lịch sử theo đối tượng.

**Rủi ro:** nếu giữ thì nhật ký có thể chứa tên hoặc email ứng viên, mâu thuẫn với C1. **Chưa chắc** payload audit có chứa dữ liệu cá nhân không.

**Đề xuất của Claude:** **Phương án 1**, kiểm tra payload trước.

**Quyết định của bạn:** [x] Phương án 1  [ ] Phương án 2  [ ] Khác
Ghi chú: đặt thành một navbar mới — *đã xác nhận: nghĩa là một **mục riêng "Nhật ký hệ thống" trên menu bên của Admin**, ngang hàng Người dùng / Thông tin doanh nghiệp (không phải thanh điều hướng ngang).*

---

### C7. Quyền của đại diện phòng ban với thư mời và lương

| | |
|---|---|
| **Thiết kế** | "Đại diện phòng ban không thấy lương trong thư mời; chỉ thấy ứng viên của phòng mình" (DS06). Đề xuất lương trong phiếu đánh giá chỉ chuyên viên tuyển dụng thấy (H14) |
| **Code** | Route `/offers/:id` mở cho mọi vai trò nội bộ (`frontend/src/routes/AppRoutes.tsx:86-88`); menu đại diện phòng ban trỏ "Kết quả tuyển dụng" vào `/offers` (`AppLayout.tsx:102`). Phần đánh giá đã giấu lương với người không phải HR (`interview-service/.../InterviewEvaluationService.java:138`). **Chưa chắc** `OfferResponse` có lọc lương theo vai trò hay không |

**Thay đổi cần làm:** kiểm tra `offer-service` khi người gọi là HIRING_MANAGER. Nếu đang trả lương thì lọc bỏ hoặc chặn. Làm trang "Kết quả tuyển dụng" riêng (H16, H17) không chứa lương. Công sức: **S–M**.

**Rủi ro:** lộ thông tin lương. Đây là rủi ro bảo mật **nếu** API đang trả lương cho đại diện phòng ban.

**Đề xuất của Claude:** **Theo thiết kế**, ưu tiên cao.

**Quyết định của bạn:** [x] Theo thiết kế  [ ] Giữ code  [ ] Hoãn  [ ] Khác
Ghi chú:

---

## D. Mobile

### D1. Khu Chuyên viên tuyển dụng trên mobile

| | |
|---|---|
| **Thiết kế** | 4 tab: **Việc của tôi · Ứng viên · Lịch · Thêm**; thông báo nằm ở chuông góc phải. Các màn: UR01–UR19 (việc cần làm, danh sách và lọc ứng viên, tìm kiếm, hồ sơ với tab Điểm AI / Đánh giá, chuyển giai đoạn, từ chối, chi tiết việc làm, lịch tuần, duyệt đề xuất đổi giờ, viết đánh giá, yêu cầu tuyển dụng, thư mời, thông báo) |
| **Code** | 3 tab: home · requisitions · applications (`mobile/app/(hr)/_layout.tsx:13-24`, có ghi chú "sẽ đổi ở đợt 8"). Màn chính chỉ là chỗ giữ chỗ (`mobile/app/(hr)/index.tsx:4`). Đã có sẵn component UI dùng lại được: `mobile/src/components/ui/*` (bottom-sheet, status-chip, search-and-filters, query-list…) |

**Thay đổi cần làm:** đổi cấu trúc tab và dựng khoảng 15 màn. Có thể tái dùng hook và API đã có trong `mobile/src/features/*`. Công sức: **L**.

**Rủi ro:** khối lượng lớn. Theo DS06, mobile chỉ dùng để xem và thao tác nhanh, nên **không** làm màn tạo tin, lên lịch hay soạn thư mời trên mobile. Giữ nguyên ranh giới này để tránh phình phạm vi.

**Đề xuất của Claude:** **Theo thiết kế**.

**Quyết định của bạn:** [x] Theo thiết kế  [ ] Giữ code  [ ] Hoãn  [ ] Khác
Ghi chú:

---

### D2. Khu Đại diện phòng ban trên mobile

| | |
|---|---|
| **Thiết kế** | 4 tab: Việc của tôi · Ứng viên · Lịch · Thêm. Các màn: UH01–UH14 (xác nhận hoặc đề xuất đổi giờ phỏng vấn, xem CV, viết và nộp đánh giá, đánh giá người khác bị ẩn, kết quả tuyển dụng, sửa yêu cầu tuyển dụng) |
| **Code** | 2 tab: todo · interviews (`mobile/app/(hm)/_layout.tsx:13-18`). Màn chính chỉ là chỗ giữ chỗ (`mobile/app/(hm)/index.tsx:5`). Đã có component hành động phỏng vấn: `mobile/src/features/interviews/interview-actions.tsx` |

**Thay đổi cần làm:** đổi tab và dựng khoảng 12 màn. Công sức: **L**.

**Đề xuất của Claude:** **Theo thiết kế**.

**Quyết định của bạn:** [x] Theo thiết kế  [ ] Giữ code  [ ] Hoãn  [ ] Khác
Ghi chú:

---

### D3. Khu Ứng viên trên mobile

| | |
|---|---|
| **Thiết kế** | 5 tab: Việc làm · Đơn ứng tuyển · Lịch · Thông báo · Tôi; ứng tuyển 1 chạm bằng CV mặc định (UC18); đổi CV (UC03); chào mừng gia nhập kèm checklist giấy tờ (UC15) |
| **Code** | Đã đủ 5 tab (`mobile/app/(candidate)/_layout.tsx:28-53`) và các màn con: `jobs/apply`, `interviews/schedule`, `offers/[id]`, `offers/welcome` (`_layout.tsx:58-64`) |

**Thay đổi cần làm:** soát lại từng màn theo UC01–UC18 (bố cục, chữ, trạng thái trống và lỗi). Bổ sung "CV mặc định" nếu backend chưa có khái niệm này (**chưa chắc**). Công sức: **M**.

**Đề xuất của Claude:** **Theo thiết kế**.

**Quyết định của bạn:** [x] Theo thiết kế  [ ] Giữ code  [ ] Hoãn  [ ] Khác
Ghi chú:

---

### D4. Thông báo đẩy có nút hành động

| | |
|---|---|
| **Thiết kế** | Thông báo trên màn khoá có nút "Chọn giờ", "Xem thư mời", "Viết đánh giá" (M04, DS06). Cài đặt bật/tắt từng loại thông báo (M10, UC12) |
| **Code** | Đã cài `expo-notifications` (`mobile/package.json:21`) và có bảng định tuyến thông báo (`mobile/src/lib/notification-routes.ts`). **Không thấy** đoạn đăng ký push token (`getExpoPushTokenAsync`) trong `mobile/src`. Backend `notification-service` chưa thấy chỗ lưu device token hay gửi qua Expo Push |

**Thay đổi cần làm:** đăng ký token khi đăng nhập; thêm API lưu token trong notification-service; gửi qua Expo Push API khi có event; khai báo notification category kèm nút hành động; lưu tuỳ chọn bật/tắt theo loại. Công sức: **M–L**.

**Rủi ro:** muốn test thật phải build dev client (Expo Go hạn chế push). Trên iOS cần tài khoản Apple Developer.

**Đề xuất của Claude:** **Hoãn sang đợt 2**.

**Quyết định của bạn:** [ ] Theo thiết kế  [ ] Giữ code  [x] Hoãn  [ ] Khác
Ghi chú:

---

### D5. Đăng nhập bằng Google trên mobile

| | |
|---|---|
| **Thiết kế** | Nút "Tiếp tục với Google" (M02) |
| **Code** | Backend đã có OAuth2: `POST /auth/oauth2/exchange` (`auth-service/.../controller/AuthController.java:98`), `OAuth2PreLoginController.java:22`; web có `OAuth2CallbackPage`. Mobile chưa có |

**Thay đổi cần làm:** dùng `expo-auth-session` hoặc `expo-web-browser`, xử lý redirect URI theo scheme của app, gọi endpoint `exchange`. Công sức: **M**.

**Rủi ro:** cấu hình redirect URI trên Google Console cho cả iOS và Android.

**Đề xuất của Claude:** **Hoãn sang đợt 2**.

**Quyết định của bạn:** [ ] Theo thiết kế  [ ] Giữ code  [x] Hoãn  [ ] Khác
Ghi chú:

---

### D6. Đăng nhập bằng vân tay / khuôn mặt

| | |
|---|---|
| **Thiết kế** | "Đăng nhập bằng vân tay / khuôn mặt sau lần đầu" (M02); công tắc trong cài đặt (M10) |
| **Code** | Chưa có `expo-local-authentication` trong `mobile/package.json`. Đã có `expo-secure-store` (`package.json:23`) để lưu token |

**Thay đổi cần làm:** thêm thư viện; khi bật sinh trắc học thì khoá refresh token trong secure store bằng sinh trắc học. Công sức: **S–M**.

**Đề xuất của Claude:** **Hoãn**.

**Quyết định của bạn:** [ ] Theo thiết kế  [ ] Giữ code  [x] Hoãn  [ ] Khác
Ghi chú:

---

### D7. Báo mất kết nối mạng

| | |
|---|---|
| **Thiết kế** | Banner "Không có kết nối mạng · dữ liệu lúc 10:02", nút Thử lại; báo trước rằng thao tác sẽ không được lưu (M06) |
| **Code** | Không thấy xử lý trạng thái mạng trong `mobile/src` |

**Thay đổi cần làm:** thêm `@react-native-community/netinfo`, nối với `onlineManager` của React Query, làm component banner. Công sức: **S**.

**Đề xuất của Claude:** **Theo thiết kế**, ưu tiên thấp.

**Quyết định của bạn:** [x] Theo thiết kế  [ ] Giữ code  [ ] Hoãn  [ ] Khác
Ghi chú:

---

## E. Bảng tổng hợp quyết định

| Mã | Nội dung | Công sức | Rủi ro | Đề xuất của Claude | Quyết định của bạn |
|---|---|---|---|---|---|
| A1 | Màu thương hiệu web | S–M | Thấp | Theo thiết kế | Theo thiết kế |
| A2 | Màu thương hiệu mobile | S | Thấp | Theo thiết kế | Theo thiết kế |
| A3 | Thư viện component web | M | Thấp | Giữ Ant Design, chỉnh theme | Phương án 1 (giữ Ant Design) |
| A4 | Màu theo giai đoạn | S | Thấp | Theo thiết kế | Theo thiết kế |
| A5 | Font chữ | S | Giấy phép | Kiểm tra giấy phép, dự phòng Be Vietnam Pro | Phương án 2 (Be Vietnam Pro) |
| A6 | Menu bên theo vai trò | M | Trung bình | Theo thiết kế | Theo thiết kế, **không làm Ctrl K** |
| A7 | Mẫu màn danh sách | M | Thấp | Theo thiết kế | Theo thiết kế |
| A8 | Bố cục trang hồ sơ ứng viên | M | Thấp | Theo thiết kế | Theo thiết kế, **không làm nút Trước/Sau** |
| B1 | 6 giai đoạn cố định | S–M / L | **Cao** nếu sửa DB | Gộp ở giao diện | Phương án 1 (gộp ở giao diện) |
| B2 | Bỏ bước duyệt thư mời | S–M | Trung bình | Thêm endpoint `send` | Phương án 2 (endpoint `send`) |
| B3 | Thu hồi thư mời | M | Trung bình | Theo thiết kế | **Hoãn** |
| B4 | Thư mời hết hạn | S–M | Thấp | Theo thiết kế | Theo thiết kế |
| B5 | Ứng viên rút đơn | S–M | Trung bình | Theo thiết kế (REJECTED + lý do) | Theo thiết kế |
| B6 | Thống nhất hiển thị Điểm AI | S | Thấp | Theo backend / H09 | Phương án 1 (theo backend / H09) |
| B7 | Màn Việc của tôi | M | Trung bình | Frontend ghép API trước | Phương án 1 (frontend ghép API) |
| B8 | Chốt lương khi duyệt yêu cầu | S–M | Thấp | Theo thiết kế (kiểm tra entity trước) | Theo thiết kế |
| C1 | Admin không xem hồ sơ ứng viên | M | **Cao** (quyền) | Theo thiết kế, cả backend | **Phương án 2 (chỉ ẩn UI — nợ kỹ thuật)** |
| C2 | Mời người dùng qua email | M | Trung bình | Theo thiết kế | Theo thiết kế |
| C3 | Khoá kèm chuyển giao việc | M / L | Cao (bản đầy đủ) | Bản rút gọn | Phương án 2 (bản rút gọn) |
| C4 | Thông tin doanh nghiệp | S–M | Thấp | Theo thiết kế | Theo thiết kế |
| C5 | Trình chỉnh trang tuyển dụng | L | Phình phạm vi | Trang cố định, hoãn CMS | Phương án 2 (trang cố định) |
| C6 | Nhật ký hệ thống | S | Thấp | Giữ, chuyển vào Cài đặt | Phương án 1 — mục riêng trên menu bên Admin |
| C7 | Đại diện phòng ban không thấy lương | S–M | **Cao** (lộ lương) | Theo thiết kế, ưu tiên cao | Theo thiết kế |
| D1 | Mobile – Chuyên viên tuyển dụng | L | Khối lượng | Theo thiết kế | Theo thiết kế |
| D2 | Mobile – Đại diện phòng ban | L | Khối lượng | Theo thiết kế | Theo thiết kế |
| D3 | Mobile – Ứng viên | M | Thấp | Theo thiết kế | Theo thiết kế |
| D4 | Thông báo đẩy | M–L | Trung bình | Hoãn đợt 2 | **Hoãn** |
| D5 | Google trên mobile | M | Trung bình | Hoãn đợt 2 | **Hoãn** |
| D6 | Sinh trắc học | S–M | Thấp | Hoãn | **Hoãn** |
| D7 | Báo mất mạng | S | Thấp | Theo thiết kế, ưu tiên thấp | Theo thiết kế |

---

## F. Thứ tự triển khai đề xuất

Đã cập nhật theo quyết định của bạn.

1. **Đợt 0 — Kiểm tra trước khi làm:** ✅ đã xong, xem [mục G](#g-kết-quả-kiểm-tra-đợt-0).
2. **Đợt 1 — Nền tảng và an toàn:** A1–A5, A6 (không Ctrl K), A7, B1 (gộp ở giao diện), B6, C1 (ẩn trên UI), **C7 (sửa backend)**.
3. **Đợt 2 — Luồng chính theo thiết kế:** A8 (không nút Trước/Sau), B2, B4, B5, B7, B8 (chỉ làm UI), C2, C4, C6 (mục riêng trên menu bên), D1, D2, D3, D7.
4. **Đợt 3 — Bổ sung:** C3 (bản rút gọn), C5 (trang cố định).
5. **Hoãn:** B3, D4, D5, D6.
6. **Nợ kỹ thuật ghi nhận:** C1 mới chỉ ẩn trên UI; backend vẫn cho `COMPANY_ADMIN` đọc hồ sơ ứng viên (`application-service/src/main/java/iuh/fit/se/application/security/AuthorizationPolicy.java:22-40`).

---

## G. Kết quả kiểm tra Đợt 0

Các điểm trước đây ghi "chưa chắc" đã được kiểm tra bằng cách đọc code (chưa chạy ứng dụng).

### G1. C7 — Đại diện phòng ban **có** nhận được lương qua API → phải sửa backend

- `GET /api/offer/offers` và `GET /api/offer/offers/{id}` cho mọi vai trò nội bộ (`requireInternal`) — `offer-service/src/main/java/iuh/fit/se/offer/offer/OfferController.java:26-38, 67-73`.
- Với `HIRING_MANAGER`, service chỉ giới hạn theo phòng ban, **không lọc lương** — `OfferService.java:73-75` (danh sách), `OfferService.java:399-405` (chi tiết).
- Hàm chuyển đổi trả `salaryOffered` cho mọi người gọi nội bộ — `OfferService.java:552-559`.
- `GET /{id}/pdf` cũng mở cho Đại diện phòng ban (cùng `assertCanView`) và PDF có lương — `OfferController.java:56-65`, `OfferService.java:141-149`.

**Hướng sửa:** khi người gọi là `HIRING_MANAGER`, trả `salaryOffered`, `allowance` (và các trường tiền khác) là `null`; chặn `GET /{id}/pdf` với vai trò này. Trên web, trang "Kết quả tuyển dụng" (H16, H17) không gọi API offer chi tiết.

### G2. B8 — Đã có sẵn trường lương duyệt → chỉ cần làm giao diện

- `JobRequisition` có `expectedSalaryMin/Max` và `approvedSalaryMin/Max` — `recruitment-service/src/main/java/iuh/fit/se/recruitment/requisition/JobRequisition.java:62-72`.
- Request duyệt đã nhận `approvedSalaryMin` — `.../requisition/dto/JobRequisitionApproveRequest.java:10`.
- Tin tuyển dụng đã ưu tiên lấy lương duyệt — `.../posting/JobPostingService.java:110-116`.

### G3. A7 — Không có API đếm theo trạng thái

- Không có endpoint dạng `/count` hay `/status-counts` trong các controller; chỉ có `/summary` của từng bản ghi và `dashboard/summary` (`dashboard-service/.../DashboardController.java:26`).
- API danh sách trả `totalItems` — `application-service/src/main/java/iuh/fit/se/application/common/PageResponse.java:7-13`.

**Hướng làm:** giai đoạn đầu, mỗi tab gọi danh sách với `size=1` và đọc `totalItems` (N tab = N request). Sau đó thêm endpoint đếm gộp nếu chậm.

### G4. C6 — Audit log có thể chứa ghi chú tự do

- Đa số bản ghi chỉ có ID và tên giai đoạn — `ApplicationService.java:421-422`.
- Nhưng có ghi chú do người dùng nhập: lý do từ chối hồ sơ (`ApplicationService.java:465-466`), lý do từ chối offer (`OfferService.java:308-309`). Nội dung này **có thể** chứa thông tin ứng viên.

**Kết luận:** rủi ro thấp, giữ màn nhật ký như đã chọn. Lưu ý thêm nếu sau này sửa C1 ở backend.

### G5. D3 — Mỗi ứng viên chỉ có **một** CV

- `Candidate` chỉ có một trường `cvFileUrl` — `candidate-service/src/main/java/iuh/fit/se/candidate/candidate/Candidate.java:44`. Không có khái niệm "CV mặc định" hay danh sách CV.
- Thiết kế UC03 và UC12 cho chọn giữa nhiều CV ("2 tệp · mặc định").

**Hướng làm (cần bạn chốt, xem G7):**
- (a) Giữ 1 CV: "Ứng tuyển 1 chạm" dùng CV hiện có; "Đổi CV" = tải CV mới thay thế. Không sửa backend.
- (b) Hỗ trợ nhiều CV: thêm bảng `candidate_cvs`, đánh dấu mặc định, đơn ứng tuyển lưu CV đã dùng. Sửa candidate-service, application-service, ai-service (trích xuất CV theo tệp). Công sức **M–L**.

### G6. A5 — Be Vietnam Pro

Font phát hành trên Google Fonts theo giấy phép SIL Open Font License, dùng và đóng gói vào app được. Không cần kiểm tra thêm.

### G7. Điểm mới cần bạn chốt

| Mã | Câu hỏi | Đề xuất của Claude | Quyết định của bạn |
|---|---|---|---|
| G5 / D3 | Một CV hay nhiều CV cho mỗi ứng viên? | (a) Giữ 1 CV | [x] (a) Giữ 1 CV  [ ] (b) Nhiều CV |

---

## Ghi chú về phạm vi tài liệu

- Tài liệu chỉ dựa trên đọc code tĩnh và bản thiết kế. **Chưa chạy** ứng dụng hay test.
- Ước lượng công sức là ước lượng thô, **chưa chắc**.
- Các mã màn hình lấy từ tiêu đề của từng khung trong `docs/UI/*.html`.

### G8. Mặc định Claude sẽ áp dụng (không cần xác nhận, sửa nếu bạn muốn khác)

| Chỗ | Mặc định |
|---|---|
| B4 — thư mời hết hạn | Đơn ứng tuyển giữ nguyên ở giai đoạn Thư mời; HR soạn thư mời mới nếu muốn. Không tự chuyển sang Từ chối. |
| B2 — dữ liệu cũ | Thư mời đang ở `PENDING_APPROVAL` vẫn duyệt được bằng `approve` cũ; giao diện mới chỉ dùng `send`. Không viết migration đổi trạng thái. |
| B5 — rút đơn | Chuyển sang Từ chối với lý do "Ứng viên rút lui"; chỉ cho rút khi chưa ở giai đoạn Đã tuyển. |
| C2 — tạo trực tiếp | Giữ endpoint `POST /admin/users` cho seed/test, nhưng giao diện chỉ còn luồng mời. |
| D3 — đổi CV | Tải CV mới thay CV cũ; các đơn đã nộp **không** bị đổi CV (cần kiểm tra application có lưu bản CV riêng không trước khi làm). |

