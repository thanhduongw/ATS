# Kế hoạch triển khai giao diện theo `docs/UI`

> **Đầu vào:** các quyết định đã chốt trong `docs/learning/02-doi-chieu-thiet-ke-ui.md` (mục E, G7, G8).
> **Nguồn sự thật về giao diện:** 6 file trong `docs/UI/` — `Interactive UI Prototype.html` (DS01–DS06), `Admin.html` (A01–A11), `HR.html` (R01–R47), `Department.html` (H01–H17), `Candidate.html` (C01–C34), `Mobile.html` (M, UC, UR, UH).
> **Trạng thái:** đã chốt X1–X6, Q1–Q7 theo đề xuất. Đang thực hiện **Đợt 1** trên nhánh `mobile`.

---

## Mục lục

- [0. Nguyên tắc tuân thủ HTML](#0-nguyên-tắc-tuân-thủ-html)
- [1. Xung đột cần bạn xác nhận trước khi code](#1-xung-đột-cần-bạn-xác-nhận-trước-khi-code)
- [2. Đợt 1 — Nền tảng và an toàn](#2-đợt-1--nền-tảng-và-an-toàn)
- [3. Đợt 2 — Luồng chính](#3-đợt-2--luồng-chính)
- [4. Đợt 3 — Bổ sung](#4-đợt-3--bổ-sung)
- [5. Ma trận phủ màn hình (169 màn)](#5-ma-trận-phủ-màn-hình-169-màn)
- [6. Định nghĩa "xong" cho một màn](#6-định-nghĩa-xong-cho-một-màn)
- [7. Rủi ro và cách giảm](#7-rủi-ro-và-cách-giảm)

---

## 0. Nguyên tắc tuân thủ HTML

Các quy tắc dưới đây lấy từ DS06 "Quy tắc dùng" và áp dụng cho **mọi** task.

### 0.1 Cách dùng file HTML khi làm một màn
1. Mở đúng khung (board) theo mã màn, ví dụ `R24 · Soạn thư mời`.
2. Chép **đúng chữ tiếng Việt** trên màn: tiêu đề, nhãn, nút, câu thông báo, trạng thái trống và lỗi. Không tự đặt lại câu chữ. Chữ dùng chung vào `frontend/src/i18n/dictionaries.ts` (web) và `mobile/src/lib/strings.ts` (mobile).
3. Giữ đúng **thứ tự khối** và **loại vùng chứa**: trang riêng, hộp thoại nhỏ (web) hoặc bảng trượt (mobile).
4. Dữ liệu trong HTML (Vexo, Hồ Ngọc Mai, số liệu) **chỉ là mẫu**, không chép cứng vào code.
5. Mỗi PR hoặc commit ghi rõ mã màn đã làm.

### 0.2 Quy tắc chung từ DS06 (dùng làm checklist khi review)

| Nhóm | Quy tắc |
|---|---|
| Trang, hộp thoại, bảng trượt | Nội dung dài hoặc nhiều trường (tạo yêu cầu, soạn thư mời, đánh giá, lên lịch, thêm ứng viên) → **trang mới**. Xác nhận hoặc 1–3 trường → hộp thoại nhỏ (web) / bảng trượt (mobile). **Không dùng ngăn kéo bên phải.** Hành động không hoàn tác được (từ chối, khoá) luôn có bước xác nhận với **nút đỏ**. |
| Màn chính và danh sách | Mỗi mục menu có một màn chính dạng danh sách. Tab chỉ dùng cho trạng thái, **có số đếm**; tab cần xử lý đứng đầu, "Tất cả" đứng cuối. Bộ lọc nằm ngang dưới tab: ô tìm kiếm trước, rồi các ô chọn. Bảng gọn 4–6 cột, **không có nút thao tác nhanh trong bảng**; cả dòng bấm được, mũi tên ở cuối. Dòng cần chú ý tô nền nhạt (cam: cần làm, tím: cần sửa). |
| Viết chữ | Toàn bộ tiếng Việt, chỉ viết hoa chữ đầu câu. Tên vai trò: **Ứng viên, Chuyên viên tuyển dụng, Đại diện phòng ban, Quản trị doanh nghiệp**. Giai đoạn: Ứng tuyển · Sàng lọc · Phỏng vấn · Thư mời · Đã tuyển (+ Từ chối). Không dùng "vòng 1/2". Nút là động từ ("Gửi lời mời", "Nộp đánh giá"). |
| Định dạng | Tiền `30.000.000 ₫` hoặc `30 – 42 triệu`; "tr" chỉ dùng trong bảng hẹp. Ngày `27/10/2026`, trong năm hiện tại rút gọn `27/10`. Giờ 24h `14:00 – 15:00`. Mốc gần dùng thời gian tương đối ("10 phút trước", "Hôm qua"). Nối thông tin phụ bằng dấu `·`. |
| Quyền hiển thị | Đại diện phòng ban không thấy lương trong thư mời và chỉ thấy ứng viên phòng mình. Đánh giá của người khác bị khoá tới khi mình nộp. Quản trị doanh nghiệp chỉ thấy số liệu tổng hợp. **Điểm AI chỉ hiện cho nội bộ.** |
| Mobile | Chỉ xem và thao tác nhanh. Tạo tin, lên lịch, soạn thư mời làm trên web. Form dài tự lưu nháp, chỉ một nút chính ở đáy. Ứng tuyển 1 chạm bằng CV mặc định. |

### 0.3 Token thiết kế (DS01, DS02) — nguồn duy nhất cho màu, chữ, kích thước

| Token | Giá trị |
|---|---|
| Thương hiệu / nhấn / nền 10% / nền 6% | `#0a59f7` / `#0848c7` / `#0a59f719` / `#0a59f70f` |
| Xanh đậm / xanh đậm 2 | `#061a44` / `#0b2f78` |
| Chữ chính / phụ 60% / mờ 40% / đường kẻ 10% / nền ô 5% | `#182431` / `#18243199` / `#18243166` / `#1824311a` / `#1824310c` |
| Nền trang / trắng | `#f1f3f5` / `#ffffff` |
| Thành công / cảnh báo / lỗi / tím | `#00a06b` / `#ff7500` / `#fa2a2d` / `#7c4dff`, mỗi màu kèm nền nhạt như DS01 |
| Dải màu AI (chỉ cho điểm AI và nhãn AI) | `linear-gradient(135deg, #42cbf7, #2a7dff 40%, #a479ff 75%, #ff678c)` |
| Bo góc | thẻ nhỏ 6 · ô biểu tượng 12 · ô nhập mobile 16 · thẻ/bảng 20 · thẻ lớn 24 · hộp thoại 28 · bảng trượt 32 · nút/chip = nửa chiều cao |
| Bóng | Phẳng; chỉ nút phân đoạn, toast, hộp thoại và bảng trượt có bóng (giá trị theo DS02) |
| Khung web | Thanh bên 232px · thanh trên 60px · lề 24px · khoảng cách khối 16px · thiết kế 1440px |
| Khung mobile | Rộng 390px · lề 16px · khoảng cách thẻ 10–12px · nút chính cao 46–50px · thanh tab 64px + 26px vạch home |
| Font | **Be Vietnam Pro** (quyết định A5, thay cho HarmonyOS Sans trong HTML) |

### 0.4 Lỗi chữ trong HTML — KHÔNG chép nguyên văn

Bản HTML có lỗi thay thế hàng loạt: chữ **"quản lý"** bị thay thành **"đại diện phòng ban"** ở một số chỗ. Khi gặp các câu dưới đây, dùng nghĩa đúng ở cột phải.

| Màn | Chữ trong HTML | Dùng |
|---|---|---|
| A04 | "Đăng tin, **đại diện phòng ban** ứng viên, lên lịch…" | "Đăng tin, **quản lý** ứng viên, lên lịch…" |
| A04 | "**Đại diện phòng ban** người dùng, thông tin doanh nghiệp…" | "**Quản lý** người dùng, thông tin doanh nghiệp…" |
| A07 | "Đăng và **đại diện phòng ban** việc làm", "**Đại diện phòng ban** người dùng" | "Đăng và **quản lý** việc làm", "**Quản lý** người dùng" |
| H05 | "Nắm vững TypeScript và **đại diện phòng ban** trạng thái" | dữ liệu mẫu, không dùng |
| R41 | Cấp bậc: "…, Trưởng nhóm, **Đại diện phòng ban**" | "…, Trưởng nhóm, **Quản lý**" |
| R37 | "**Đại diện phòng ban** chấm 1–5 sao" (tiêu chí phỏng vấn) | "**Người phỏng vấn** chấm 1–5" (khớp câu ở cuối R37) |

Gặp chỗ nào nghi ngờ tương tự thì ghi vào PR và hỏi lại, không đoán.

---

## 1. Xung đột cần bạn xác nhận trước khi code

Các quyết định ở file 02 **mâu thuẫn với quy ước đã ghi trong repo**. Cần chốt trước, nếu không thì người khác (hoặc AI khác) đọc quy ước cũ sẽ "sửa ngược" lại.

| # | Xung đột | Quy ước hiện có | Quyết định mới | Việc cần làm | Đề xuất của Claude |
|---|---|---|---|---|---|
| X1 | Nguồn thiết kế mobile | `mobile/CLAUDE.md:129-135`: theo canvas "ATS TechCorp — HarmonyOS redesign" (artboard M01–M20, Mobile v2 N26–N36); "web giữ Ant Design, không đồng bộ ngược — mobile và web cố ý trông khác nhau" | `docs/UI/Mobile.html` (M, UC, UR, UH) là nguồn; web và mobile dùng chung bảng màu (A1, A2) | Sửa mục "Giao diện" trong `mobile/CLAUDE.md` và `mobile/AGENTS.md`: trỏ sang `docs/UI` | Cập nhật quy ước |
| X2 | Màu mobile | Bảng "Các con số đã chốt" (`mobile/CLAUDE.md`): màu chính `#0E7A5F`, tím PV `#8A2BE2`, xanh lá `#00CB87` | `#0a59f7`, tím `#7c4dff`, thành công `#00a06b` (DS01) | Cập nhật bảng trong `mobile/CLAUDE.md` và `mobile/src/theme/colors.ts` | Theo DS01 |
| X3 | Phạm vi màn mobile | `mobile/CLAUDE.md`: "Phạm vi màn vẫn theo `docs/mobile/MOBILE_V1_PLAN.md`"; "M15 (dashboard HR) và M17 (pipeline) — kế hoạch đã loại" | D1, D2: làm khu Chuyên viên tuyển dụng (UR01–UR19) và Đại diện phòng ban (UH01–UH14) | Ghi phạm vi mới vào `MOBILE_V1_PLAN.md` hoặc file kế hoạch mới | Cập nhật phạm vi |
| X4 | Thư viện mới trên mobile | `mobile/CLAUDE.md` quy tắc 6: "Không thêm thư viện mới ngoài mục 4 của `MOBILE_V1_PLAN.md`" | D7 (báo mất mạng) cần `@react-native-community/netinfo` hoặc `expo-network` (native, phải build lại dev build) | (a) Bổ sung thư viện vào mục 4; hoặc (b) chỉ phát hiện mất mạng khi request lỗi, không cần thư viện | **(b)** trước: hiện banner M06 khi request lỗi mạng, không thêm thư viện |
| X5 | Gradient AI trên mobile | `mobile/CLAUDE.md` "Không gradient cho nút AI" (`expo-linear-gradient` là native module) | DS01: điểm AI dùng dải màu AI | Vẽ gradient bằng `react-native-svg` (đã có) cho huy hiệu điểm AI | Dùng `react-native-svg`, không thêm thư viện |
| X6 | Chiều cao nút và ô nhập mobile | `mobile/CLAUDE.md`: cao 44 vì vùng chạm | DS02: vùng chạm tối thiểu 40, nút chính 46–50 | Giữ 44 cho ô nhập và nút phụ; nút chính ở đáy dùng 48 | Giữ 44, nút chính 48 |

**Quyết định của bạn cho X1–X6:**
X1: [x] Đồng ý  [ ] Khác — Ghi chú: theo đề xuất
X2: [x] Đồng ý  [ ] Khác — Ghi chú: theo đề xuất
X3: [x] Đồng ý  [ ] Khác — Ghi chú: theo đề xuất
X4: [ ] (a)  [x] (b)  — Ghi chú: theo đề xuất
X5: [x] Đồng ý  [ ] Khác — Ghi chú: theo đề xuất
X6: [x] Đồng ý  [ ] Khác — Ghi chú: theo đề xuất

---

## 2. Đợt 1 — Nền tảng và an toàn

**Mục tiêu:** dựng nền tảng giao diện dùng chung (theme, layout, mẫu danh sách, quy tắc 6 giai đoạn) và chặn lộ lương. Sau đợt này, mọi màn mới chỉ việc ghép component.

### T1.1 Theme web theo DS01–DS02 · A1, A3, A4, A5

**Màn tham chiếu:** DS01, DS02, DS03.

**Việc**
1. Viết lại `frontend/src/app/theme.ts`: `COLORS` theo bảng 0.3; bỏ `GRADIENTS.stat*` và `hero` xanh lá; thêm `AI_GRADIENT`; `SHADOWS` theo DS02 (phẳng).
2. Đặt token Ant Design trong `atsTheme` (`ConfigProvider` ở `frontend/src/app/ThemedApp.tsx:11`): `colorPrimary`, `borderRadius` (thẻ 20, nút = nửa chiều cao), `controlHeight` 38 (ô nhập DS03), `fontFamily` Be Vietnam Pro, `colorText`, `colorBgLayout #f1f3f5`, `boxShadow` none cho Card.
3. Nạp Be Vietnam Pro (400/500/600/700/800) từ Google Fonts trong `frontend/index.html`.
4. Thêm `STAGE_COLORS` cho 6 giai đoạn, dùng chung cho thẻ, thanh tiến trình, phễu và biểu đồ (A4).
5. Tìm và thay màu cứng: `grep -rn "#0E7A5F\|#10B981\|#0B3B36\|GRADIENTS\." frontend/src`.

**Xong khi:** các component trong DS03 (nút chính, phụ, trung tính, nguy hiểm; thẻ trạng thái; ô nhập; ô chọn; công tắc; nút phân đoạn) hiển thị giống HTML khi so cạnh nhau. `npm run build` và `npm run lint` của `frontend` không lỗi.

---

### T1.2 Bộ component web dùng chung · A3, A7

**Màn tham chiếu:** DS03, DS04.

| Component | Mô tả theo HTML | File (đề xuất) |
|---|---|---|
| `StatusTag` | Chấm tròn + chữ, cao 22px, chỉ dùng cho trạng thái; bảng màu theo DS06 "Màu trạng thái" | sửa `frontend/src/components/ui/StatusTag.tsx` |
| `LabelTag` | Nhãn phân loại không có chấm (Kỹ thuật, Tuyển gấp, Java) | mới, `components/ui/LabelTag.tsx` |
| `AiScoreBadge` | Số điểm trên nền dải màu AI, có biến thể "91 phù hợp" | gộp `frontend/src/components/AiScoreBadge.tsx` và `features/ai/components/AiScoreBadge.tsx` thành 1 |
| `Avatar` / `AvatarGroup` | Chữ cái đầu trên màu cố định theo người (DS01 "Ảnh đại diện"), nhóm chồng −8px | mới |
| `IconTile` | Ô biểu tượng 36px, nền 12% màu | mới |
| `StageBar` | Thanh 6 giai đoạn cao 8px kèm số đếm | mới |
| `StatCard` | Thẻ chỉ số: nhãn, số 26/800, mô tả, chênh lệch (+1 / −3) | sửa `components/ui/StatCard.tsx` |
| `InlineNotice` | Thông báo trong trang (xanh / cam / đỏ / tím) | mới |
| `ConfirmDialog` | Hộp thoại nhỏ bo 28, tối đa 1–3 trường, nút đỏ cho hành động không hoàn tác | mới |
| `ListPage` | Khung màn chính: tiêu đề + nút chính → tab trạng thái có số đếm → thanh lọc ngang → bảng gọn → dòng bấm được, mũi tên cuối dòng; hỗ trợ tô nền dòng cam/tím | mới, `components/ui/ListPage.tsx` |
| `StatusTabs` | Tab có số đếm, đọc `totalItems` (mục G3 file 02) | mới |

**Xong khi:** trang mẫu DS04 "Mẫu màn chính (danh sách)" (màn Người dùng) dựng lại được chỉ bằng các component trên.

---

### T1.3 Khung ứng dụng và menu theo vai trò · A6, C1, C6

**Màn tham chiếu:** DS04 "Khung ứng dụng nội bộ", R01, H01, A01, C20, C27, C28, R30, R31, R32.

**Việc**
1. Viết lại `frontend/src/layouts/AppLayout.tsx`:
   - Thanh bên 232px, logo "Vexo Software · Tuyển dụng" (lấy tên công ty từ API, không cứng).
   - Thanh trên 60px: ô tìm kiếm **không có Ctrl K** (A6) — ô này chỉ để trang trí hay bỏ hẳn, xem câu hỏi Q1; nút **Tạo mới** (R30) cho Chuyên viên tuyển dụng; chuông thông báo kèm số; ảnh đại diện.
2. Menu theo vai trò, đúng thứ tự trong HTML:

| Vai trò | Menu (đúng chữ HTML) | Ghi chú |
|---|---|---|
| Chuyên viên tuyển dụng | Việc của tôi · Yêu cầu tuyển dụng (số) · Việc làm (số) · Ứng viên · Lịch phỏng vấn · Thư mời (số) · Danh mục · *Việc làm ghim* · Cài đặt | R01 |
| Đại diện phòng ban | Việc của tôi · Yêu cầu tuyển dụng · Ứng viên · Lịch phỏng vấn (số) · Kết quả tuyển dụng · Cài đặt | H01 |
| Quản trị doanh nghiệp | Tổng quan · Người dùng · Thông tin doanh nghiệp · Trang tuyển dụng · **Nhật ký hệ thống** · Cài đặt | A01 + C6 |
| Ứng viên (cổng) | Tổng quan · Đơn ứng tuyển · Lịch phỏng vấn (số) · Thư mời nhận việc (số) · Thông báo (số) · Hồ sơ của tôi · Quyền riêng tư · Đăng xuất | C20 |

3. **C1 (ẩn trên UI):** trong `frontend/src/routes/AppRoutes.tsx:40,64-77`, bỏ `COMPANY_ADMIN` khỏi các route tuyển dụng (`/applications`, `/candidates/...`, `/interviews`, `/offers`, `/recruitment/*`). Nếu Admin vào bằng URL thì chuyển về `/dashboard`. Ghi chú nợ kỹ thuật ngay tại `AppRoutes.tsx`.
4. Thêm route `/admin/company` (A08), `/admin/careers` (C5 trang cố định — xem T3.2), `/admin/users/:id` (A05).
5. Chuông thông báo dạng popover (C27, R31) dùng lại `features/notification/components/NotificationBell.tsx`.

**Xong khi:** đăng nhập lần lượt 4 vai trò, menu đúng thứ tự và chữ như bảng trên; Admin không còn thấy mục vận hành tuyển dụng.

---

### T1.4 Quy tắc 6 giai đoạn ở giao diện · B1

**Màn tham chiếu:** DS01 "Giai đoạn tuyển dụng", DS06 "Màu trạng thái", R09, UR02.

**Việc**
1. Tạo hàm dùng chung `toFixedStage(stageType) → APPLIED | SCREENING | INTERVIEW | OFFER | HIRED | REJECTED`:
   - `APPLIED → Ứng tuyển`
   - `CV_SCREENING, HR_SCREENING → Sàng lọc`
   - `TECHNICAL_INTERVIEW, HR_INTERVIEW, FINAL_INTERVIEW → Phỏng vấn`
   - `OFFER → Thư mời`, `HIRED → Đã tuyển`, `REJECTED → Từ chối`
   - `CUSTOM` → dựa vào thứ tự (`currentStageOrder`) giữa các stage đã biết; nếu không xác định thì xếp vào **Sàng lọc** và ghi log.
2. Web: thay `STAGE_TYPE_LABEL` và `stageTypeTagColor` ở `frontend/src/app/statusLabels.ts:180-223`. Sửa các chỗ đang dùng tên stage: `ApplicationsPage.tsx`, `CandidateApplicationDetailPage.tsx`, `features/interview/scheduleEligibility.ts`.
3. Mobile: thay `STAGE_TONE` ở `mobile/src/lib/status.ts:28-39` và nhãn ở `mobile/src/lib/strings.ts`.
4. Ẩn `PipelinePanel` (`features/masterdata/components/PipelinePanel.tsx`) khỏi màn Danh mục — R41 không có mục pipeline.
5. Tạo tin mới (R07) dùng pipeline mặc định, không cho chọn ("Giai đoạn tuyển dụng · Cố định cho mọi vị trí").
6. **Chuyển giai đoạn** (R34, UR05): nút chọn đích là 1 trong 6 nhóm. Frontend tự chọn stage cụ thể đầu tiên của nhóm đó trong pipeline của tin.

**Xong khi:** không còn chữ "Sàng lọc CV", "Phỏng vấn kỹ thuật"… trên giao diện; thẻ, phễu và thanh tiến trình chỉ có 6 nhóm.

**Rủi ro:** `scheduleEligibility.ts` đang dựa vào tên stage để quyết định có cho lên lịch không. Phải giữ logic cũ (dựa trên `stageType` gốc), chỉ đổi phần hiển thị.

---

### T1.5 Chặn lương với Đại diện phòng ban · C7 (sửa backend)

**Màn tham chiếu:** DS06 "Quyền hiển thị", H16, H17, UH10.

**Việc — `offer-service`**
1. Ở `OfferService.toResponse` (`offer-service/src/main/java/iuh/fit/se/offer/offer/OfferService.java:547-570`), thêm tham số vai trò. Khi là `HIRING_MANAGER`, trả `salaryOffered = null`, `allowance = null` và mọi trường tiền khác `null`. Áp dụng cho cả `getAll` (`:63-107`) và `getById` (`:110-118`).
2. `GET /{id}/pdf` (`OfferController.java:56-65`): chặn `HIRING_MANAGER` (trả 403).
3. Viết test: với `HIRING_MANAGER` cùng phòng ban, response không có lương; gọi PDF bị 403. Với `RECRUITER`, response vẫn đủ lương.

**Việc — frontend:** trang "Kết quả tuyển dụng" của Đại diện phòng ban (H16, H17 — làm ở T2.6) không hiện cột lương.

**Xong khi:** `mvn test` của `offer-service` qua; gọi API bằng token Đại diện phòng ban không thấy số tiền.

---

### T1.6 Theme mobile theo DS01, DS05 · A2, A4 (phụ thuộc X1, X2, X5, X6)

**Việc**
1. Sửa `mobile/src/theme/colors.ts`: `primary #0a59f7`, `primaryDark #0848c7`, `primarySoft #0a59f719`; tím `#7c4dff`, thành công `#00a06b`… theo bảng 0.3. Giữ quy tắc tương phản đã có (chữ phụ đặc).
2. `mobile/src/theme/paper.ts`: nối token mới.
3. `StatusChip` và `STAGE_TONE` theo 6 giai đoạn (T1.4).
4. Huy hiệu điểm AI dùng `react-native-svg` để vẽ dải màu AI (X5).
5. Cập nhật `mobile/CLAUDE.md` theo X1–X6.

**Xong khi:** các mẫu ở DS05 (thanh tab ứng viên, thanh tab nội bộ, tiêu đề lớn, thanh điều hướng, chip tìm kiếm, thẻ ứng viên, thẻ việc làm, thẻ buổi phỏng vấn, danh sách cài đặt, thanh hành động cố định, bảng trượt, dòng thông báo) hiển thị đúng như HTML.

---

### T1.7 Tab trạng thái có số đếm · A7

Dùng `totalItems` của API danh sách (mục G3 file 02): mỗi tab gọi `size=1` kèm bộ lọc trạng thái. Làm trong `StatusTabs` (T1.2) với cache TanStack hoặc RTK Query để không gọi lặp.

**Xong khi:** R02, R06, R16, R25, R40, H04, H08, H11, A03 hiện số trên tab đúng với số dòng thật.

---

## 3. Đợt 2 — Luồng chính

### T2.1 Cổng ứng viên web · D3 web, B5, B4

| Màn | Việc | File chính |
|---|---|---|
| C01 | Trang tuyển dụng cố định (xem T3.2) | `features/public/pages/CompanyJobsPage.tsx` |
| C02, C31 | Danh sách việc làm có bộ lọc bên trái (Phòng ban, Địa điểm, Hình thức, Loại hình kèm số), "Sắp xếp: Mới nhất", trạng thái không có kết quả | `CompanyJobsPage.tsx` |
| C03, C29, C30 | Chi tiết việc làm; khối "Các bước tuyển dụng"; "Việc làm tương tự"; trạng thái "Bạn đã ứng tuyển … Xem đơn ứng tuyển"; tin đã đóng | `JobDetailApplyPage.tsx` |
| C04–C08 | Bố cục 2 cột (ảnh trái, form phải); C04 hiện "Ứng tuyển: <tên việc>" khi quay lại từ tin; C08 có 6 ô mã | `features/auth/pages/*` |
| C09, C10, C34 | Biểu mẫu ứng tuyển dùng CV hiện có, nút "Tải CV khác (PDF, DOCX ≤ 5 MB)"; trang thành công có 3 bước "Tiếp theo"; hộp thoại phiên hết hạn **giữ dữ liệu đang nhập** | `JobDetailApplyPage.tsx`, `ApplySuccessPage.tsx`, `services/axiosClient.ts` |
| C20 | Tổng quan ứng viên: Việc cần làm, Phỏng vấn sắp tới, Đơn gần đây, Việc làm gợi ý | mới `features/candidate/pages/CandidateHomePage.tsx` |
| C11, C12, C32, C33 | Đơn ứng tuyển (tab Tất cả · Đang xử lý · Có thư mời · Đã đóng); chi tiết đơn có tiến trình 5 bước; trống; lỗi tải ("không hiện số 0") | `MyApplicationsPage.tsx`, `CandidateApplicationDetailPage.tsx` phía ứng viên |
| UC06 / C12 | Nút **"Rút đơn ứng tuyển"** → hộp thoại xác nhận nút đỏ (B5) | như trên |
| C13, C24, C25 | Chọn 1 khung giờ theo ngày; thành công kèm "Thêm vào lịch (.ics)"; hết hạn chọn giờ | `CandidateInterviewsPage.tsx` |
| C14, C26 | Lịch phỏng vấn dạng danh sách và dạng tháng | `CandidateInterviewsPage.tsx` |
| C15, C16, C21, C22, C23 | Thư mời: danh sách, chi tiết (dải màu xanh đậm), chấp nhận kèm ô "Tôi đã đọc và đồng ý", từ chối kèm lý do, trang chào mừng | `CandidateOffersPage.tsx`, `OfferCandidateViewPage.tsx` |
| C17 | Hồ sơ của tôi: **1 CV** (G7), nút "Tải CV mới" thay CV cũ | `CandidateProfilePage.tsx` |
| C18 | Quyền riêng tư: đổi mật khẩu, đồng ý xử lý dữ liệu, xoá dữ liệu (nhập `XOA DU LIEU`) | mới, gọi `POST /candidate/me/request-deletion` |
| C19, C27 | Trang thông báo (Tất cả · Chưa đọc) và popover chuông | `NotificationsPage.tsx` |

**Backend B5 — rút đơn (application-service)**
- `PATCH /api/application/applications/my/{id}/withdraw`, chỉ ứng viên sở hữu đơn; không cho rút khi đơn đang ở `HIRED`.
- Chuyển sang stage `REJECTED` kèm lý do "Ứng viên rút lui" (lấy ID từ danh mục lý do từ chối); phát event để `interview-service` huỷ các buổi phỏng vấn chưa diễn ra.
- Test: chủ đơn rút được; người khác bị 403; đơn `HIRED` bị 409.

**Backend B4 — thư mời hết hạn (offer-service)**
- Thêm `EXPIRED` vào `OfferStatus.java` kèm migration.
- Job `@Scheduled` (theo mẫu `application-service/.../StaleApplicationReminderJob.java`): chuyển `APPROVED` quá `responseDeadline` sang `EXPIRED`; dùng múi giờ `Asia/Ho_Chi_Minh`.
- `accept` và `decline` (`OfferService.java:319,353`) báo lỗi rõ ràng nếu đã hết hạn.
- Đơn ứng tuyển **giữ nguyên** ở Thư mời (G8).
- Thêm event và thông báo "Thư mời sắp hết hạn" (UR13).

**D3 — đổi CV:** trước khi làm, kiểm tra `Application.resumeUrl` (`application-service/.../Application.java:42-43`) có được chép lúc nộp không. Nếu có thì đổi CV ở hồ sơ không ảnh hưởng các đơn cũ (G8).

---

### T2.2 Chuyên viên tuyển dụng web — Việc của tôi, Yêu cầu, Việc làm · B7, B8, B2

| Màn | Việc | Ghi chú |
|---|---|---|
| R01, R33 | "Việc của tôi": lời chào, 7 loại việc cần làm sắp theo ưu tiên, tab "Của tôi / Cả nhóm", "Việc làm đang tuyển · Ứng viên theo giai đoạn", "Lịch hôm nay"; trạng thái lỗi tải | B7 phương án 1: frontend gọi interview (đánh giá chưa nộp, đề xuất đổi giờ), application (hồ sơ mới quá 2 ngày, đã qua sàng lọc chưa lên lịch), offer (bản nháp), recruitment (yêu cầu chờ duyệt) |
| R30 | Menu "Tạo mới": Việc làm · Ứng viên · Lịch phỏng vấn · Thư mời | |
| R02 | Danh sách yêu cầu: tab Chờ duyệt · Yêu cầu sửa · Đã duyệt · Từ chối · Đã đóng · Tất cả | Dùng `ListPage` |
| R03, R04, R05 | Chi tiết yêu cầu (**trang**, không phải modal); hộp thoại Duyệt có "Lương duyệt từ / đến" và cảnh báo "Mức tối đa thấp hơn đề xuất"; hộp thoại Yêu cầu sửa / Từ chối | B8: dùng `approvedSalaryMin/Max` đã có. Chuyển `RequisitionDetailModal.tsx` sang trang |
| R06 | Danh sách việc làm: tab Đang tuyển · Chờ duyệt · Bản nháp · Tạm dừng · Đã đóng · Tất cả; cột "Ứng viên theo giai đoạn" (6 ô) | Ánh xạ `PostingStatus` sang nhãn (xem Q2) |
| R07, R08 | Tạo việc làm từ yêu cầu (**trang**): cột phải "Từ yêu cầu tuyển dụng", lương duyệt, công tắc "Hiện mức lương" và "Gắn nhãn Tuyển gấp"; xem trước máy tính / điện thoại | Chuyển `PostingFormModal.tsx` sang trang |
| R09, R10, R15, R34, R35, R42 | Trang việc làm: kanban theo 6 nhóm, chọn nhiều (So sánh · Chuyển giai đoạn · Giao người phụ trách · Từ chối), kéo vào vùng từ chối, toast "Hoàn tác", trạng thái chưa có ứng viên | Dùng lại `ApplicationKanbanBoard.tsx`, cột theo T1.4 |
| R17 | Thêm ứng viên (**trang**), CV bên phải đã đọc tự động | Chuyển `CandidateFormModal.tsx` + `ApplicationCreateModal.tsx` sang trang |
| R23, R28 | So sánh ứng viên: điểm theo tiêu chí, kết luận, lương đề xuất TB; "Còn 2/2 suất"; đã đủ suất thì khoá | `CandidateComparisonPage.tsx` |

---

### T2.3 Chuyên viên tuyển dụng web — Ứng viên, Phỏng vấn · A8, B6

| Màn | Việc |
|---|---|
| R16 | Danh sách ứng viên toàn công ty: tab Đang trong quy trình · Đã tuyển · Từ chối · Tất cả; lọc Việc làm, Giai đoạn, Điểm AI; phân trang "Hiển thị 1–12 trong 74" |
| R14, R11, R12, R13 | Trang hồ sơ ứng viên: đầu trang (tên, điểm AI, liên hệ, ngày ứng tuyển, người phụ trách, việc làm + giai đoạn, 3/5); **CV bên trái**; bên phải các tab **Điểm AI · Đánh giá (2/3) · Phỏng vấn (1) · Thư mời · Hoạt động**. **Không có nút Trước/Sau** (A8). Tab Hoạt động có ô ghi chú hỗ trợ `@`. |
| H09 / R14 tab Điểm AI | Theo B6: "Đáp ứng 4/4 yêu cầu bắt buộc", các tiêu chí mức x/4, câu "Điểm AI chỉ để tham khảo, không thay đánh giá phỏng vấn." — dùng lại `AiScoreCard.tsx` |
| R18 | Lên lịch phỏng vấn (**trang**): "Tôi chọn giờ / Để ứng viên chọn", thời lượng, hình thức, link họp, người phỏng vấn, lưới giờ tuần (ô xám = đã có lịch), hạn ứng viên chọn, ghi chú |
| R40, R20 | Lịch phỏng vấn: tab Cần xử lý · Sắp tới · Chờ đánh giá · Đã xong · Đã huỷ; nút phân đoạn Danh sách / Lịch tuần |
| R21 | Chi tiết buổi phỏng vấn (**trang**): khối đề xuất đổi giờ (Từ chối đề xuất / Duyệt & báo ứng viên), danh sách người phỏng vấn, "Tải tệp lịch (.ics)" — chuyển `InterviewDetailModal.tsx` sang trang |
| R46, R47 | Viết đánh giá (**trang**, CV bên cạnh): 5 tiêu chí 1–5 kèm nhận xét, kết luận 4 mức, đề xuất lương + ghi chú, "Lưu nháp", hộp thoại xác nhận nộp — `EvaluationFormPage.tsx` |
| R19 | Theo dõi đợt gửi khung giờ |

---

### T2.4 Chuyên viên tuyển dụng web — Thư mời · B2, B4

| Màn | Việc |
|---|---|
| R25, R45 | Danh sách thư mời: tab Bản nháp · Đã gửi · Ứng viên nhận · Ứng viên từ chối · Hết hạn / thu hồi · Tất cả; lọc theo việc làm kèm cột trái "Tìm việc làm" và thẻ "0/2 suất · Mở so sánh ứng viên". **B3 hoãn → tab "Hết hạn / thu hồi" tạm thời chỉ có Hết hạn.** |
| R24 | Soạn thư mời (**trang**): Điều khoản, Phúc lợi, Lời nhắn, Ghi chú nội bộ; cột "Tham chiếu" (khung lương duyệt, đề xuất của đại diện phòng ban, còn suất, vị trí trong khung lương); xem trước thư — `OfferCreatePage.tsx` |
| R26, R27 | Chi tiết bản nháp với "Kiểm tra trước khi gửi" (trong khung lương, còn suất, đã có đánh giá); nút **Gửi thư mời** → hộp thoại "Sau khi gửi không sửa được điều khoản…" |
| R43 | Chi tiết đã gửi: "Ứng viên chưa phản hồi · đã xem 1 lần lúc …". **Không có nút "Thu hồi thư mời" (B3 hoãn).** |
| R44 | **Hoãn** (B3) |

**Backend B2 — `PATCH /api/offer/offers/{id}/send` (offer-service)**
- Chỉ HR; chỉ khi `DRAFT`; trong một transaction: kiểm tra lương nằm trong khung duyệt và còn suất, chuyển thẳng sang `APPROVED`, phát event `OFFER_READY_FOR_CANDIDATE` và audit như `approve` (`OfferService.java:278-291`).
- Giữ `submit` và `approve` cho thư mời cũ đang ở `PENDING_APPROVAL` (G8).
- **"Đã xem 1 lần lúc …" (R43, UR17):** cần trường lưu lần ứng viên mở thư. **Chưa chắc** đã có, xem Q3.

---

### T2.5 Danh mục, Cài đặt · R32, R36–R38, R41

| Màn | Việc |
|---|---|
| R41 | Tổng quan danh mục chia nhóm: Tổ chức · Điều kiện làm việc · Hồ sơ ứng viên · Đánh giá & từ chối. **Không có mục pipeline** (T1.4). |
| R36 | Lý do từ chối: cột Đã dùng; "Mục đã được dùng không xoá được, chỉ tắt để ẩn" |
| R37 | Tiêu chí phỏng vấn kèm mô tả, công tắc Đang dùng |
| R38 | Phòng ban: Trưởng phòng, Nhân sự, Đang dùng; hộp thoại Thêm phòng ban |
| R32, M10 | Cài đặt tài khoản: thông tin, đổi mật khẩu, đăng xuất |

Dùng lại `features/masterdata/components/CatalogPanel.tsx`.

---

### T2.6 Đại diện phòng ban web · H01–H17

| Màn | Việc |
|---|---|
| H01 | Việc của tôi: 4 loại việc (nộp đánh giá, xác nhận phỏng vấn, sửa yêu cầu, hoàn thiện nháp), "Vị trí đang tuyển của phòng", "Lịch hôm nay" |
| H04 | Yêu cầu tuyển dụng: tab Cần sửa · Bản nháp · Chờ duyệt · Đã duyệt · Từ chối · Đã đóng · Tất cả |
| H05 | Tạo yêu cầu (**trang**, 4 phần: Vị trí · Số lượng & lý do · Ngân sách · Nội dung công việc) — chuyển `RequisitionFormModal.tsx` sang trang |
| H06, H07 | Chi tiết: cần sửa (trích lời góp ý, "Sửa và gửi lại"); đã duyệt (tiến độ, lương duyệt so với đề xuất) |
| H08 | Ứng viên phòng ban: tab Đang trong quy trình · Đã tuyển · Từ chối · Tất cả; cột "Phỏng vấn của bạn" |
| H09, H10 | Hồ sơ chỉ xem: tab Điểm AI; tab Đánh giá ẩn tới khi nộp ("2 người phỏng vấn khác đã nộp…") |
| H11, H12, H13 | Lịch phỏng vấn: tab Cần xử lý · Sắp tới · Đã xong · Tất cả; chi tiết chờ xác nhận; trang Đề xuất giờ khác (gợi ý giờ "Bạn trống" / "Trùng họp đội") |
| H14, H15 | Đánh giá với CV bên cạnh; xác nhận nộp |
| H16, H17 | Kết quả tuyển dụng (thẻ chỉ số, bảng vị trí, phễu, ứng viên đã đến vòng phỏng vấn). **Không có lương** (T1.5). Không dùng route `/offers` nữa |

---

### T2.7 Quản trị doanh nghiệp web · C2, C4, C6

| Màn | Việc |
|---|---|
| A01, A02 | Tổng quan: 5 thẻ chỉ số, bảng theo phòng ban, phễu toàn công ty, khối "Cần chú ý"; chi tiết một phòng ban. Dùng `dashboard-service` — **chưa chắc** đã đủ chỉ số (xem Q4) |
| A03 | Người dùng: tab Đang hoạt động · Chờ kích hoạt · Đã khoá · Tất cả; nút "Vai trò & quyền", "Mời người dùng" |
| A04 | Trang mời người dùng kèm xem trước email bên phải |
| A05 | Chi tiết người dùng: vai trò & phòng ban, việc đang phụ trách, lịch sử tài khoản |
| A07 | Bảng vai trò & quyền chỉ đọc (sửa chữ theo mục 0.4) |
| A08 | Thông tin doanh nghiệp: Thông tin pháp lý · Nhận diện · Văn phòng · Bảo vệ dữ liệu ứng viên |
| Nhật ký | Mục menu riêng "Nhật ký hệ thống" (C6 = a), áp style mới cho `AuditLogPage.tsx` |

**Backend C2 — lời mời (auth-service)**
- Bảng `user_invitations` (email, họ tên, vai trò, phòng ban, chức danh, lời nhắn, token đã băm, `expires_at` = +7 ngày, `accepted_at`, người mời) và migration.
- `POST /api/auth/admin/invitations`, `POST /api/auth/admin/invitations/{id}/resend`, `GET /api/auth/invitations/{token}` (xem thông tin), `POST /api/auth/invitations/{token}/accept` (đặt mật khẩu → tạo user `ACTIVE`).
- Email dùng lại cơ chế gửi OTP hiện có. Token chỉ dùng một lần.
- Giữ `POST /admin/users` cho seed/test (G8), giao diện không gọi nữa.
- Trang web `/invite/:token`.

**Backend C4 — thông tin doanh nghiệp (auth-service)**
- Thêm cột vào `Company` (`auth-service/.../entity/Company.java`): `legalName`, `displayName`, `taxCode`, `foundedDate`, `website`, `sizeRange`, `recruitingEmail`, `brandColor`, `dataProtectionOfficerId`, `privacyPolicy`, `privacyPolicyUpdatedAt`; cập nhật `UpdateCompanyRequest`, `CompanyResponse`, `PublicCompanyController`.
- Văn phòng: dùng danh mục "Địa điểm làm việc" của masterdata, thêm số nhân sự nếu cần (xem Q5).

---

### T2.8 Mobile — Ứng viên · D3

| Màn | Việc | Route hiện có |
|---|---|---|
| M01 | Màn chào: "Xem 9 vị trí đang tuyển" (số lấy từ API), "Đăng nhập" | `mobile/app/index.tsx` |
| M02 | Đăng nhập dùng chung; **ẩn** nút Google (D5 hoãn) và dòng sinh trắc học (D6 hoãn) — không vẽ nút chết | `(auth)/login.tsx` |
| M03, M07, M08, M09 | Đăng ký, xác minh email, quên mật khẩu, đặt mật khẩu mới | `(auth)/*` |
| M06 | Banner mất mạng (theo X4) | component dùng chung |
| UC01, UC17 | Việc làm: chip phòng ban kèm số, nhãn "Đã ứng tuyển"; bảng trượt bộ lọc với nút "Xem N việc làm" | `(candidate)/jobs/index.tsx` |
| UC02, UC18, UC03, UC04 | Chi tiết; **ứng tuyển 1 chạm** bằng bảng trượt (CV hiện có, "Đổi", thông tin liên hệ "Sửa", thư giới thiệu không bắt buộc); trang đổi CV với **1 CV** (G7): "Tải CV khác" thay CV hiện tại; gửi thành công 3 bước | `jobs/[id].tsx`, `jobs/apply.tsx` |
| UC05, UC06, UC13 | Đơn ứng tuyển: tab Đang xử lý · Đã kết thúc · Tất cả; chi tiết có tiến trình và **Rút đơn ứng tuyển** (B5); trống | `applications/*` |
| UC07 | Chọn giờ: chọn ngày → khung giờ trống → ghi chú → nút "Xác nhận 14:00 – 15:00, Thứ Năm 29/10" | `interviews/schedule.tsx` |
| UC08, UC16 | Lịch: Sắp tới · Đã qua; "Liên kết phòng họp sẽ hiện ở đây 15 phút trước giờ phỏng vấn"; chi tiết ngày phỏng vấn (đếm ngược, Chuẩn bị, Cần hỗ trợ · Gọi) | `interviews/index.tsx` |
| UC09, UC10, UC14, UC15 | Thư mời, chấp nhận (bảng trượt, "Tôi đã đọc toàn bộ thư mời"), từ chối (lý do + lời nhắn), chào mừng | `offers/*` |
| UC11 | Thông báo: Hôm nay · Trước đó; dòng chưa đọc có nút hành động | `notifications.tsx` |
| UC12 | Tôi: % hoàn thiện hồ sơ, CV, kinh nghiệm, học vấn, cài đặt | `profile.tsx` |

Thanh tab ứng viên theo DS05: **Việc làm · Đơn ứng tuyển · Lịch · Thông báo · Tôi** (đã đúng 5 tab ở `mobile/app/(candidate)/_layout.tsx:28-53`, chỉ đổi nhãn).

---

### T2.9 Mobile — Chuyên viên tuyển dụng · D1

Đổi `mobile/app/(hr)/_layout.tsx` sang 4 tab **Việc của tôi · Ứng viên · Lịch · Thêm**; chuông ở góc phải.

| Màn | Việc | Route đề xuất |
|---|---|---|
| UR01 | Việc của tôi: 3 chỉ số, việc cần làm (Của tôi · Cả nhóm), lịch hôm nay | `(hr)/index.tsx` |
| UR02, UR19, UR18 | Ứng viên: chip giai đoạn kèm số, "Việc làm: Tất cả · Sắp xếp: Điểm AI", bảng trượt lọc, tìm kiếm (Tìm gần đây, nhóm Ứng viên / Việc làm) | `(hr)/applications/index.tsx`, `(hr)/search.tsx` |
| UR03, UR04 | Hồ sơ: tab Điểm AI (theo B6, **không** dùng mẫu 0–100 và mục lương của UR03) · Đánh giá · Phỏng vấn · Thư mời · Hoạt động; thanh hành động "Từ chối / Chuyển giai đoạn" | `(hr)/applications/[id].tsx` |
| UR05, UR06 | Bảng trượt chuyển giai đoạn (Sàng lọc / Thư mời "Soạn thư mời trên máy tính sau khi chuyển" / Đã tuyển "Chỉ khi ứng viên đã nhận thư mời"); từ chối kèm lý do bắt buộc, ghi chú nội bộ, gửi email sau 24 giờ | sheet |
| UR15 | Chi tiết việc làm: phễu, danh sách ứng viên phỏng vấn, "So sánh trên máy tính" | `(hr)/jobs/[id].tsx` |
| UR07, UR08 | Lịch tuần ngang + danh sách buổi; duyệt đề xuất đổi giờ (Huỷ buổi · Giữ giờ cũ · Đồng ý 14:00) | `(hr)/interviews/*` |
| UR09 | Viết đánh giá, **tự lưu nháp** ("Đã tự lưu nháp lúc 10:32"), một nút chính ở đáy | `(hr)/evaluations/[id].tsx` |
| UR10 | Thêm: Yêu cầu tuyển dụng · Thư mời · Tài khoản & cài đặt · Mở bản web · Đăng xuất | `(hr)/more.tsx` |
| UR11 | Yêu cầu tuyển dụng (chỉ xem và lọc) | `(hr)/requisitions/index.tsx` |
| UR16, UR17 | Thư mời (danh sách + bảng trượt chi tiết: "Sửa hoặc thu hồi thư mời trên máy tính.", Gọi ứng viên, Nhắc phản hồi) | `(hr)/offers/index.tsx` |
| UR13 | Thông báo mở từ chuông | dùng chung `notifications-screen.tsx` |
| M10 | Tài khoản & cài đặt (công tắc thông báo đẩy **ẩn** vì D4 hoãn — xem Q6) | `(hr)/settings.tsx` |

---

### T2.10 Mobile — Đại diện phòng ban · D2

Đổi `mobile/app/(hm)/_layout.tsx` sang 4 tab **Việc của tôi · Ứng viên · Lịch · Thêm**.

| Màn | Việc |
|---|---|
| UH01 | Việc của tôi (4 việc), lịch hôm nay, vị trí đang tuyển |
| UH02 | Ứng viên phòng: tab Phỏng vấn của tôi · Tất cả · Đã tuyển · Từ chối |
| UH03 | Hồ sơ: đánh giá bị ẩn tới khi nộp ("để nhận xét của bạn độc lập") |
| UH04, UH05, UH06 | Lịch; xác nhận tham gia; bảng trượt đề xuất giờ khác (chọn giờ bắt đầu + lý do) |
| UH14 | Xem CV ("Chạm 2 lần để phóng to"), nút Điểm AI / Viết đánh giá |
| UH07, UH08 | Viết đánh giá, xác nhận nộp ("Xem lại / Nộp") |
| UH09 | Thêm |
| UH10 | Kết quả tuyển dụng (chip theo vị trí, phễu, ứng viên đã phỏng vấn) — **không có lương** |
| UH12, UH13 | Yêu cầu tuyển dụng; sửa yêu cầu đang ở "Cần sửa" (trích lời góp ý, "Đã sửa theo góp ý", Lưu nháp / Gửi lại để duyệt) |
| UH11 | Thông báo |

---

## 4. Đợt 3 — Bổ sung

### T3.1 Khoá tài khoản bản rút gọn · C3 — màn A06
- Trang "Khoá tài khoản · <tên>": liệt kê **chỉ đọc** yêu cầu tuyển dụng do người đó tạo, buổi phỏng vấn sắp tới, đánh giá chưa nộp (gọi API từng service).
- Mỗi mục có liên kết tới màn liên quan để Admin hoặc HR tự chuyển giao. Nút "Khoá tài khoản" (đỏ) chỉ bật khi danh sách trống, hoặc khi đã tích ô "Tôi đã chuyển giao xong".
- **Khác HTML:** HTML có ô chọn người nhận và nút "Chuyển giao & khoá tài khoản". Bản rút gọn bỏ phần tự chuyển giao (C3 = phương án 2). Đổi chữ nút thành "Khoá tài khoản".

### T3.2 Trang tuyển dụng cố định · C5 — màn C01
- Dựng C01 với các khối cố định theo thứ tự HTML: Ảnh bìa & khẩu hiệu → Vị trí nổi bật (tự động từ việc làm đang tuyển) → Đời sống → Phúc lợi → Chân trang.
- Nội dung lấy từ `Company` (C4); khẩu hiệu và phúc lợi **chưa có chỗ lưu** (xem Q7).
- A09, A10, A11 (trình chỉnh): **không làm**. Mục menu "Trang tuyển dụng" của Admin mở trang xem trước C01 kèm liên kết "Sửa thông tin doanh nghiệp".

---

## 5. Ma trận phủ màn hình (169 màn)

Ký hiệu: **T** = task thực hiện · **Hoãn** = theo quyết định ở file 02 · **Bỏ** = không làm · **Rút gọn** = làm khác HTML có chủ đích.

### 5.1 Hệ thống thiết kế (6)

| Màn | Xử lý |
|---|---|
| DS01 Màu sắc | T1.1, T1.6 |
| DS02 Chữ · Khoảng cách · Bo góc · Đổ bóng | T1.1, T1.6 (font đổi sang Be Vietnam Pro) |
| DS03 Component web · Cơ bản | T1.2 |
| DS04 Component web · Mẫu ghép | T1.2, T1.3 |
| DS05 Component mobile | T1.6 |
| DS06 Quy tắc dùng | Mục 0.2 — áp dụng mọi task |

### 5.2 Quản trị doanh nghiệp (11)

| Màn | Xử lý |
|---|---|
| A01 Tổng quan | T2.7 |
| A02 Số liệu một phòng ban | T2.7 |
| A03 Người dùng | T2.7 |
| A04 Mời người dùng | T2.7 |
| A05 Chi tiết người dùng | T2.7 |
| A06 Khoá tài khoản — chuyển giao việc | **Rút gọn** — T3.1 |
| A07 Vai trò & quyền | T2.7 |
| A08 Thông tin doanh nghiệp | T2.7 |
| A09 Trang tuyển dụng — khối ảnh bìa | **Bỏ** (C5 = trang cố định) |
| A10 Trang tuyển dụng — khối phúc lợi | **Bỏ** (C5) |
| A11 Xem trước trang tuyển dụng | **Rút gọn** — T3.2 (chỉ xem trước, không có Xuất bản) |

### 5.3 Chuyên viên tuyển dụng web (45)

| Màn | Xử lý | Màn | Xử lý |
|---|---|---|---|
| R01 Việc của tôi | T2.2 | R16 Ứng viên — danh sách | T2.3 |
| R33 Việc của tôi — lỗi tải | T2.2 | R14 Hồ sơ — CV & hoạt động | T2.3 |
| R29 Tìm kiếm nhanh (Ctrl K) | **Bỏ** (A6) | R11 Hồ sơ — tab Đánh giá | T2.3 |
| R30 Danh sách tạo mới | T1.3, T2.2 | R12 Hồ sơ — tab Phỏng vấn | T2.3 |
| R31 Thông báo | T1.3 | R13 Hồ sơ — tab Hoạt động | T2.3 |
| R32 Cài đặt tài khoản | T2.5 | R18 Lên lịch phỏng vấn | T2.3 |
| R02 Yêu cầu — danh sách | T2.2 | R40 Lịch — danh sách theo ngày | T2.3 |
| R03 Chi tiết yêu cầu | T2.2 | R20 Lịch — lịch tuần | T2.3 |
| R04 Duyệt yêu cầu — chốt lương | T2.2 | R21 Chi tiết buổi phỏng vấn | T2.3 |
| R05 Yêu cầu sửa / từ chối | T2.2 | R46 Viết đánh giá (HR) | T2.3 |
| R06 Việc làm — danh sách | T2.2 | R47 Xác nhận nộp đánh giá | T2.3 |
| R09 Trang việc làm — theo giai đoạn | T2.2 | R19 Theo dõi đợt gửi khung giờ | T2.3 |
| R42 Chọn nhiều → So sánh | T2.2 | R25 Thư mời — danh sách | T2.4 (không có thu hồi) |
| R23 So sánh ứng viên | T2.2 | R45 Thư mời — lọc theo việc làm | T2.4 |
| R28 So sánh — đã đủ suất | T2.2 | R24 Soạn thư mời | T2.4 |
| R10 Quy trình — chọn nhiều | T2.2 | R26 Chi tiết thư mời — bản nháp | T2.4 |
| R15 Từ chối hàng loạt | T2.2 | R27 Xác nhận gửi thư mời | T2.4 |
| R34 Chuyển giai đoạn | T1.4, T2.2 | R43 Chi tiết thư mời — đã gửi | T2.4 (không có nút thu hồi) |
| R35 Việc làm chưa có ứng viên | T2.2 | R44 Thu hồi thư mời | **Hoãn** (B3) |
| R17 Thêm ứng viên | T2.2 | R41 Danh mục — tổng quan | T2.5 |
| R07 Tạo việc làm từ yêu cầu | T2.2 | R36 Danh mục — lý do từ chối | T2.5 |
| R08 Xem trước tin | T2.2 | R37 Danh mục — tiêu chí phỏng vấn | T2.5 |
| | | R38 Danh mục — thêm phòng ban | T2.5 |

### 5.4 Đại diện phòng ban web (15)

| Màn | Xử lý |
|---|---|
| H01, H04, H05, H06, H07, H08, H09, H10, H11, H12, H13, H14, H15, H16, H17 | T2.6 (H16, H17 phụ thuộc T1.5) |

### 5.5 Ứng viên web (34)

| Màn | Xử lý |
|---|---|
| C01 | T3.2 (trang cố định) |
| C02, C03, C29, C30, C31, C04, C05, C06, C07, C08, C09, C10, C34, C20, C27, C28, C11, C12, C32, C33, C13, C24, C25, C14, C26, C15, C16, C21, C22, C23, C17, C18, C19 | T2.1 |

### 5.6 Mobile (58)

| Màn | Xử lý |
|---|---|
| M01, M02 (ẩn Google, sinh trắc học), M03, M07, M08, M09 | T2.8 |
| M04 Thông báo đẩy — ứng viên | **Hoãn** (D4) |
| M06 Mất kết nối mạng | T2.8 (theo X4) |
| M10 Tài khoản & cài đặt (nhân viên) | T2.9 (ẩn phần sinh trắc học và thông báo đẩy) |
| UC01, UC17, UC02, UC18, UC03, UC04, UC05, UC06, UC07, UC09, UC10, UC14, UC15, UC13, UC08, UC16, UC11, UC12 | T2.8 |
| UR01, UR02, UR19, UR18, UR03 (theo B6), UR04, UR05, UR06, UR15, UR07, UR08, UR09, UR10, UR11, UR16, UR17, UR13 | T2.9 |
| UH01, UH02, UH03, UH04, UH05, UH06, UH14, UH07, UH08, UH09, UH10, UH12, UH13, UH11 | T2.10 |

**Tổng:** 169 màn — làm đầy đủ 160 · rút gọn 4 (A06, A11, C01 dạng cố định, UR03 theo B6) · hoãn 2 (R44, M04; ngoài ra ẩn phần Google / sinh trắc học / thông báo đẩy trong M02, M10) · bỏ 3 (R29, A09, A10).

---

## 6. Định nghĩa "xong" cho một màn

Một màn chỉ được tính là xong khi đạt **tất cả**:

1. Đặt cạnh khung HTML tương ứng: cùng khối, cùng thứ tự, cùng chữ (trừ dữ liệu mẫu và các chỗ ở mục 0.4).
2. Đạt các quy tắc ở mục 0.2 (loại vùng chứa, tab có đếm, nút đỏ, định dạng tiền và ngày).
3. Có đủ trạng thái: đang tải · trống (dùng câu chữ HTML nếu có, ví dụ C32, UC13) · lỗi (C33, R33: "không hiện số 0 / trống") · không có quyền.
4. Màu, chữ, khoảng cách chỉ lấy từ token (web: `theme.ts`; mobile: `src/theme/` — quy tắc 11 của `mobile/CLAUDE.md`).
5. Đúng phân quyền: thử bằng tài khoản vai trò không được phép, và gọi thẳng API (với các chỗ đã sửa backend).
6. Web: `npm run build` + `npm run lint` không lỗi. Mobile: `npx tsc --noEmit`, lint, và 7 điều kiện ở mục 11 của `docs/mobile/MOBILE_V1_PLAN.md`, **gồm chạy trên máy thật**.
7. Backend (nếu có sửa): test của service đó qua; migration Flyway chạy được trên DB trống và DB có dữ liệu.

---

## 7. Rủi ro và cách giảm

| Rủi ro | Ảnh hưởng | Cách giảm |
|---|---|---|
| Đổi modal sang trang (R03, R07, R17, R18, R21, R24, H05) làm vỡ luồng đang chạy | Người dùng mất thao tác quen thuộc | Làm từng màn; giữ modal cũ tới khi trang mới qua kiểm tra |
| Gộp 6 giai đoạn làm sai logic lên lịch (`scheduleEligibility.ts`) | Không lên lịch được hoặc lên lịch sai giai đoạn | Chỉ đổi phần hiển thị; viết test cho `toFixedStage`, gồm cả `CUSTOM` |
| Thêm `EXPIRED`, `send` vào offer làm lệch event và notification | Ứng viên không nhận thông báo | Test tích hợp event; kiểm tra `notification-service/.../NotificationType.java` |
| C1 chỉ ẩn trên UI | Admin vẫn đọc được hồ sơ qua API | Ghi nợ kỹ thuật tại `AppRoutes.tsx` và file 02 mục F |
| Đếm tab bằng nhiều request (`size=1`) | Màn chậm | Cache; nếu chậm thì thêm endpoint đếm gộp |
| Khối lượng mobile lớn (khoảng 31 màn nội bộ mới) | Trễ tiến độ | Làm UR01, UR02, UR03/04, UH01, UH05, UH07 trước (luồng cốt lõi), phần còn lại sau |
| Lỗi chữ trong HTML (mục 0.4) bị chép vào app | Chữ sai trên giao diện | Review chữ theo mục 0.4 trong mỗi PR |

---

## 8. Câu hỏi còn mở (không chặn Đợt 1)

| # | Câu hỏi | Đề xuất của Claude | Quyết định của bạn |
|---|---|---|---|
| Q1 | A6 bỏ Ctrl K: thanh trên có giữ **ô tìm kiếm** (tìm ứng viên, việc làm) không, hay bỏ hẳn? | Bỏ hẳn ô tìm kiếm ở thanh trên; mỗi màn danh sách đã có ô tìm riêng | Đồng ý đề xuất |
| Q2 | R06 có trạng thái việc làm "Chờ duyệt"; code có `DRAFT, EDITING, APPROVED, OPEN, PAUSED, CLOSED` (`recruitment-service/.../posting/PostingStatus.java:4-9`). Ánh xạ thế nào? | `DRAFT, EDITING → Bản nháp`; `APPROVED → Chờ duyệt` (chờ đăng); `OPEN → Đang tuyển`; `PAUSED → Tạm dừng`; `CLOSED → Đã đóng` | Đồng ý đề xuất |
| Q3 | R43, UR17 hiện "đã xem 1 lần lúc 11:02". Có làm không? (cần lưu lượt xem ở offer-service) | Làm: thêm `viewedCount`, `lastViewedAt`, cập nhật khi ứng viên gọi `GET /my/{id}` | Đồng ý đề xuất |
| Q4 | A01, A02 cần tỉ lệ nhận thư mời, thời gian tuyển TB theo quý, phễu theo phòng ban. `dashboard-service` có đủ không? | Kiểm tra khi bắt đầu T2.7; thiếu chỉ số nào thì ghi lại và hỏi tiếp | Đồng ý đề xuất |
| Q5 | A08 "Văn phòng" có số nhân sự ("112 nhân sự") — masterdata địa điểm chưa có số này | Bỏ số nhân sự, chỉ hiện tên và địa chỉ | Đồng ý đề xuất |
| Q6 | M10 có nhóm "Nhận thông báo đẩy khi…" nhưng D4 hoãn. Ẩn cả nhóm hay chỉ để thông báo trong app? | Ẩn cả nhóm cho tới khi làm D4 | Đồng ý đề xuất |
| Q7 | C01 cần khẩu hiệu, trích dẫn nhân viên, ảnh đời sống, danh sách phúc lợi — `Company` chưa có chỗ lưu | Thêm vào C4 2 trường `tagline`, `benefits` (JSON danh sách); bỏ khối ảnh đời sống và trích dẫn ở bản cố định | Đồng ý đề xuất |

---

## 9. Tiến độ

### Đợt 1 — đã làm (03/11/2026, nhánh `mobile`, chưa commit)

| Task | Kết quả | File chính |
|---|---|---|
| T1.1 Theme web | Token DS01–DS02 (màu, chữ, bo góc, bóng phẳng); màu preset antd theo DS01; thay 231 mã màu Tailwind cũ ở 48 file sang bảng DS01; `index.css` bỏ gradient xanh lá, thẻ phẳng | `frontend/src/app/theme.ts`, `frontend/src/index.css` |
| T1.2 Component chung | `StatusTag` (chấm + chữ, DS06), `LabelTag`, `AiScorePill` (dải màu AI), `Avatar`/`AvatarGroup` (màu theo người), `IconTile`, `StageBar`, `MetricCard`, `InlineNotice`, `Panel`, `SmallDialog`, `ScreenTitle`, `ListPage`, `StatusTabs`, `useStatusCounts`; `StatCard` và 2 huy hiệu AI cũ đổi sang kiểu mới | `frontend/src/components/ui/designKit.tsx`, `listKit.tsx`, `listHelpers.tsx`, `StatusTag.tsx`, `StageTag.tsx` |
| T1.3 Khung + menu | Thanh bên 232 / thanh trên 60 cùng nền trang; menu đúng thứ tự R01/H01/A01/C20; badge đỏ/xám; "Việc làm ghim"; nút "Tạo mới" (R30); không có ô tìm kiếm (Q1); Admin: Tổng quan · Người dùng · Thông tin doanh nghiệp · Trang tuyển dụng · Nhật ký hệ thống (C6); thanh trên trang công khai theo C02; tên vai trò "Đại diện phòng ban" | `frontend/src/layouts/AppLayout.tsx`, `PublicLayout.tsx`, `app/roles.ts`, `app/navigation.ts` |
| C1 (ẩn UI) | Bỏ `COMPANY_ADMIN` khỏi route vận hành tuyển dụng và Danh mục; ghi chú nợ kỹ thuật tại route | `frontend/src/routes/AppRoutes.tsx` |
| T1.4 6 giai đoạn | `toFixedStage`, `StageTag`; nhãn/màu giai đoạn ở web + mobile; bộ lọc theo nhóm; ẩn mục "Quy trình tuyển dụng" ở Danh mục; tin mới tự dùng quy trình mặc định ("Giai đoạn tuyển dụng · Cố định cho mọi vị trí"); backend `stageType` nhận danh sách phân tách dấu phẩy (+3 test) | `frontend/src/app/stages.ts`, `mobile/src/lib/status.ts`, `application-service/.../ApplicationSpecifications.java` |
| T1.5 Chặn lương | Đại diện phòng ban nhận `salaryOffered`, `allowance`, `performanceBonus`, `note` = null; không tải được PDF thư mời (+3 test) | `offer-service/.../OfferService.java` |
| T1.6 Theme mobile | Màu DS01 (`#0A59F7`, tím `#7C4DFF`, xanh lá `#00A06B`), sắc độ chip DS06, `AiScoreBadge` gradient bằng `react-native-svg`, nút chính cao 48; cập nhật `mobile/CLAUDE.md` theo X1–X6 | `mobile/src/theme/*`, `mobile/src/components/ui/status-chip.tsx`, `mobile/CLAUDE.md` |
| T1.7 Tab có số đếm | Component + hook sẵn sàng; **gắn vào từng màn danh sách ở Đợt 2** khi dựng lại màn | `listKit.tsx`, `listHelpers.tsx` |

**Kiểm tra đã chạy:** `frontend`: `npm run build` qua, `eslint` các file đã sửa không lỗi (chỉ còn cảnh báo có sẵn). `mobile`: `npx tsc --noEmit` qua. `offer-service`: 15/15 test qua. `application-service`: 34/34 test qua.
**Chưa kiểm tra:** chạy app thật và so trực quan từng màn với HTML; chạy mobile trên máy thật.

### Câu hỏi mới phát sinh trong Đợt 1

| # | Câu hỏi | Đề xuất của Claude | Quyết định của bạn |
|---|---|---|---|
| Q8 | API chỉ cho chuyển hồ sơ sang **giai đoạn kế tiếp** của pipeline (`application-service/.../ApplicationService.java:400-410`), mà pipeline mặc định có 9 bước, 2 bước Sàng lọc và 3 bước Phỏng vấn (`masterdata-service/.../DefaultDataSeeder.java:327-335`). Giao diện 6 nhóm thì kéo hồ sơ từ "Sàng lọc" sang "Phỏng vấn" có thể phải qua 2 bước. Xử lý thế nào? (a) Frontend gọi "chuyển tiếp" nhiều lần đến khi sang nhóm mới — mỗi lần sinh 1 dòng lịch sử và có thể 1 thông báo. (b) Thêm migration tạo **quy trình mặc định 6 bước** (1 bước/nhóm) cho tin mới; tin cũ giữ 9 bước. (c) Thêm `targetStageId` vào API chuyển giai đoạn để nhảy thẳng tới bước đầu của nhóm đích, ghi 1 dòng lịch sử. | **(b)**: quy trình 6 bước khớp thiết kế, không đổi luật "chỉ chuyển kế tiếp"; tin cũ vẫn chạy được. Kanban của tin cũ dùng (a) làm dự phòng. | **(b)** — đã làm |

### Q8 = (b) — đã làm (03/11/2026)

| Phần | Kết quả | File |
|---|---|---|
| Quy trình 6 bước | `DefaultDataSeeder` tạo "Quy trình 6 giai đoạn" (Ứng tuyển `APPLIED` · Sàng lọc `CV_SCREENING` · Phỏng vấn `TECHNICAL_INTERVIEW` · Thư mời `OFFER` · Đã tuyển `HIRED` · Từ chối `REJECTED`) và đặt làm mặc định DUY NHẤT; quy trình cũ vẫn hoạt động cho tin cũ. Chạy lại nhiều lần không tạo trùng. Làm trong seeder (không dùng Flyway) vì bảng do Hibernate tạo sau Flyway. (+3 test) | `masterdata-service/.../seeder/DefaultDataSeeder.java`, `PipelineRepository.java` |
| Vì sao Sàng lọc = `CV_SCREENING` | `interview-service` chỉ cho lên lịch khi hồ sơ đã VƯỢT QUA bước `CV_SCREENING` (`InterviewService.java:152-160`) → sang "Phỏng vấn" là lên lịch được ngay (khớp R34). | — |
| Tin mới | Form tạo tin tự lấy quy trình `isDefault` (đã làm ở T1.4) → nhận quy trình 6 bước. | `PostingFormModal.tsx` |
| Kanban | Cột = 6 giai đoạn cố định; kéo sang giai đoạn kế: quy trình 6 bước gọi "chuyển tiếp" 1 lần, quy trình cũ gọi nhiều lần tới bước đầu của giai đoạn kế (dự phòng (a)). | `features/candidate/components/ApplicationKanbanBoard.tsx`, `features/candidate/stageAdvance.ts` |
| Nút "Chuyển" ở hồ sơ | Dùng cùng logic, báo "Đã chuyển sang <giai đoạn>". | `CandidateApplicationDetailPage.tsx` |
| Còn lại | "Chuyển vòng hàng loạt" (`ApplicationsPage.tsx`) vẫn gọi API bulk 1 bước/hồ sơ — đúng với quy trình 6 bước; với tin cũ 9 bước có thể cần bấm nhiều lần. Sẽ xử lý khi dựng lại R10/R34 ở Đợt 2. | — |

**Kiểm tra:** `masterdata-service` 6/6 test qua; `frontend` `tsc -b` qua, lint không lỗi.
**Lưu ý khi chạy:** cần khởi động lại `masterdata-service` để seeder tạo quy trình 6 bước.


### Đợt 2 — phần đã làm (03/11/2026, chưa commit)

**Backend (có test):**

| Mục | Kết quả | File chính |
|---|---|---|
| B2 gửi thư mời | `PATCH /offer/offers/{id}/send`: Bản nháp → Đã gửi, niêm phong điều khoản; thư cũ `PENDING_APPROVAL` vẫn duyệt bằng `approve` | `offer-service/.../OfferService.java`, `OfferController.java` |
| B4 hết hạn | Trạng thái `EXPIRED`; job quét 5 phút/lần theo giờ Asia/Ho_Chi_Minh; chặn chấp nhận/từ chối khi quá hạn; trả suất tuyển | `OfferExpiryJob.java`, `OfferStatus.java` |
| Q3 đã xem | `candidate_view_count`, `candidate_last_viewed_at` (migration V8), đếm khi ứng viên mở thư đang chờ | `OfferService.recordCandidateView` |
| Khớp DB V5–V7 | Gán `issued_at`, `sealed_at` khi gửi; `candidate_responded_at/by` khi trả lời; `expired_at` khi hết hạn — trước đây code không gán nên chấp nhận/từ chối có thể vi phạm `ck_offer_sealed_matches_issued` | `Offer.java` |
| B5 rút đơn | `PATCH /application/applications/my/{id}/withdraw` → Từ chối với lý do "Ứng viên tự rút hồ sơ"; không rút được khi Đã tuyển | `application-service/.../ApplicationService.java` |
| Huỷ lịch khi đơn kết thúc | `interview-service` nghe `application.status_changed`, đơn sang Từ chối thì huỷ buổi phỏng vấn chưa diễn ra và khung giờ đang chờ (áp dụng cả khi HR từ chối) | `interview-service/.../event/ApplicationClosedListener.java` |
| C2 mời người dùng | Bảng `user_invitation` (V6), token SHA-256, 7 ngày; `POST /auth/admin/invitations`, `.../{userId}/resend`, công khai `GET /auth/invitations/{token}`, `POST .../accept`; mở đường dẫn ở `SecurityConfig` và gateway | `auth-service/.../InvitationService.java`, `api-gateway/.../JwtAuthGlobalFilter.java` |
| C4 thông tin doanh nghiệp | 12 trường mới + địa chỉ, điện thoại (V5), mốc cập nhật chính sách | `auth-service/.../Company.java`, `CompanyService.java` |
| A03 đăng nhập gần nhất | `last_login_at` (V7), ghi khi đăng nhập mật khẩu/Google | `LoginService.java` |

**Frontend web:** thư mời (nhãn R25, nút "Gửi thư mời" + hộp thoại R27, "đã xem N lần" R43, "Lưu & xem lại" R24, nhãn Hết hạn phía ứng viên); rút đơn ở trang đơn của ứng viên; Admin: A03 Người dùng, A04 Mời người dùng (có xem trước email), A05 Chi tiết người dùng (bản cơ bản), A07 Vai trò & quyền, A08 Thông tin doanh nghiệp (+ khẩu hiệu, phúc lợi cho C01); trang nhận lời mời `/invite/:token`.

**Mobile:** nút "Rút đơn ứng tuyển" + bảng trượt xác nhận ở chi tiết đơn; nhãn "Hết hạn" cho thư mời (type sinh tự động chưa có `EXPIRED` — cần chạy `npm run gen:types` khi backend chạy).

**Test:** offer 23/23 · application 37/37 · interview 7/7 · auth 52/52 · masterdata 6/6 · gateway 18/20 (2 lỗi **có từ trước**: `GatewayRouteConfigurationTest` chờ 9 service nhưng đã có thêm route `ai-service`) · frontend build qua · mobile `tsc` qua.

**Còn lại của Đợt 2:** dựng lại màn theo HTML cho T2.1 (cổng ứng viên), T2.2–T2.3 (Chuyên viên tuyển dụng), T2.4 danh sách thư mời R25/R45, T2.5 Danh mục, T2.6 Đại diện phòng ban, T2.8–T2.10 mobile (khu UR, UH); gắn `StatusTabs` vào các màn danh sách.
