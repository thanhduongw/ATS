# Báo cáo tiến độ — từ 18/09 đến 23/09

**Đề tài:** Hệ thống quản lý tuyển dụng ATS (kiến trúc microservices) + ứng dụng di động
**Kỳ báo cáo:** 18/09 → 23/09 · nhánh đang làm: `mobile`

---

## 1. Tóm tắt một phút

Trong kỳ này có hai mạch việc:

1. **Hoàn thiện backend + web** cho hai nghiệp vụ khó nhất còn lại: **vòng đời buổi phỏng vấn
   (xác nhận hai tầng)** và **quản lý thư mời nhận việc có phiên bản (offer versioning)**.
   Kèm theo là hợp nhất **ai-service** (bóc tách CV và sinh mô tả công việc bằng LLM) vào nhánh
   `develop`.
2. **Khởi động ứng dụng di động** — từ con số 0 lên: dựng dự án Expo, sinh toàn bộ kiểu dữ liệu
   từ OpenAPI của 9 service, dựng bộ token giao diện khớp 1-1 với web, và hoàn thành **tầng đăng
   nhập đầy đủ 5 màn** (đăng nhập, đăng ký, xác minh OTP, quên mật khẩu, đặt lại mật khẩu) có
   tự động làm mới token và điều hướng theo vai trò.

Điểm có thể demo ngay hôm nay: mở app trên điện thoại → đăng nhập bằng 3 vai trò khác nhau →
mỗi vai trò vào một khu vực riêng với thanh tab riêng → đăng xuất.

---

## 2. Số liệu kỳ này

| Chỉ số | Giá trị |
|---|---|
| Số commit (18/09 → 23/09) | 9 |
| Backend + web (ngày 18/09) | 86 file, +6.191 / −1.380 dòng |
| Mã nguồn mobile tự viết (`app/` + `src/`, không tính file sinh tự động) | 1.958 dòng |
| Kiểu dữ liệu sinh từ OpenAPI của 9 service | 8.248 dòng |
| Tài liệu kế hoạch mobile | 4.937 dòng (3 file) |
| Số màn hình mobile đã có route | 19 route (5 màn xác thực hoàn chỉnh + 13 màn nghiệp vụ dạng màn tạm + 1 màn chờ) trên tổng 20 màn của kế hoạch v1 |

> Lưu ý khi trình bày: con số dòng của mobile lớn một phần vì `package-lock.json` và kiểu dữ
> liệu sinh tự động. Phần **tự viết tay** là 1.958 dòng — đây mới là con số nên nói.

---

## 3. Chi tiết công việc theo ngày

### 18/09 — Hoàn thiện nghiệp vụ phỏng vấn và thư mời

**a) Vòng đời buổi phỏng vấn — xác nhận hai tầng**
`interview-service/.../interview/InterviewStatus.java`

Trước đây trạng thái buổi phỏng vấn quá đơn giản (đặt lịch → xong). Kỳ này mô hình hóa lại
thành máy trạng thái 8 bước, phản ánh đúng thực tế là **quản lý tuyển dụng (HM) phải chốt giờ
trước, ứng viên xác nhận sau**:

```
SCHEDULED ──HM xác nhận──► HM_CONFIRMED ──ứng viên xác nhận──► CANDIDATE_CONFIRMED
    │                          ▲                                      │
    │ HM đề xuất giờ khác      │ HR duyệt đề xuất                     │ quá giờ, thiếu đánh giá
    ▼                          │                                      ▼
HM_RESCHEDULE_PROPOSED ────────┘                              EVALUATION_PENDING
    │ HM từ chối, không đề xuất                    đủ phiếu đánh giá  │
    ▼                                                                 ▼
CANCELLED ◄── HR hủy                                              COMPLETED
                                       HM ghi nhận vắng ──► NO_SHOW
```

Ba quy tắc nghiệp vụ được cài vào enum thay vì rải khắp service:
- `BLOCKING` — trạng thái nào còn chiếm chỗ trên lịch người phỏng vấn (dùng để phát hiện trùng lịch).
- `CANCELLABLE` / `RESCHEDULABLE` — HR còn hủy hoặc dời được ở trạng thái nào.
- `visibleToCandidate()` — ứng viên **chỉ thấy** buổi phỏng vấn từ `HM_CONFIRMED` trở đi; giai
  đoạn thương lượng giờ giấc là việc nội bộ.

Kèm theo: job nền `InterviewEvaluationPendingJob` tự chuyển buổi quá giờ mà thiếu phiếu đánh giá
sang `EVALUATION_PENDING`, và sự kiện `InterviewHmConfirmedEvent` bắn qua RabbitMQ để
notification-service gửi thông báo cho ứng viên.

**b) Quản lý thư mời có phiên bản (offer case management)**
4 migration mới ở `offer-service` (V4 → V7):
- `V4` — schema nền + **outbox** (đảm bảo sự kiện không mất khi gửi qua message queue).
- `V5` — tách **offer case** (hồ sơ thương lượng) khỏi **offer version** (từng bản chào).
- `V6` — điều khoản chi tiết + tệp đính kèm (artifact).
- `V7` — hạn phản hồi và cơ chế thay thế bản chào cũ.

Nguyên tắc quan trọng: **bản đã chốt là bất biến** — muốn sửa thì sinh phiên bản mới, không ghi đè.
Tương ứng bên interview-service có V4–V7 (outbox, miền lịch, phiên + phiếu chấm, vòng tuyển chọn),
notification-service có V3–V4 (inbox + vòng đời thông báo), recruitment-service có V3 (giữ chỗ headcount).

**c) Giao diện web đi kèm**
- `OfferCreatePage` viết lại phần lớn: thêm chu kỳ lương, chọn tất cả (Select All), ô nhập dài hơn.
- `OfferDetailPage`: bổ sung trường và hiển thị chu kỳ lương.
- `InterviewListView` (mới, 282 dòng), `InterviewDetailModal` mở rộng mạnh, `InterviewCalendar`
  viết lại, gom nhãn trạng thái về `statusLabels.ts` dùng chung.

### 21/09 — Hợp nhất ai-service vào `develop`

Đưa service AI (FastAPI, Python) vào nhánh chính: bóc tách CV (PDF/DOCX + OCR), sinh mô tả công
việc bằng LLM, quét chèn lệnh độc hại trong CV (`injection_scanner`), tải tệp trực tiếp từ S3,
kèm giao diện web: `AiCvUploadModal`, `CvParseResultPanel`, `JdGeneratorPanel`, hiển thị độ tin
cậy từng trường (`FieldConfidenceBadge`). Cập nhật `docker-compose.yml` và route của API Gateway.

### 22/09 — Dọn tài liệu + dựng nền ứng dụng di động

- Gom toàn bộ file `.md` rải rác ở gốc vào `docs/`.
- Viết `docs/mobile/MOBILE_V1_PLAN.md`: chốt **phạm vi 20 màn** (4 hạ tầng · 8 ứng viên · 5 HM ·
  3 HR), stack công nghệ, hợp đồng API từng màn, lộ trình 4 tuần, nhật ký quyết định.
- Dựng dự án `mobile/`: Expo SDK 57, React Native 0.86, Expo Router (định tuyến theo thư mục).
- **Sinh kiểu dữ liệu từ OpenAPI của cả 9 service** (`npm run gen:types`) → 8.248 dòng TypeScript.
  Nhờ vậy nếu backend đổi DTO thì mobile **báo lỗi biên dịch ngay**, không phải chờ chạy mới biết.

### 23/09 — Tầng đăng nhập + hệ thống thiết kế cho mobile

- **5 màn xác thực**: đăng nhập · đăng ký ứng viên · xác minh email (OTP) · quên mật khẩu ·
  đặt lại mật khẩu. Form dùng `react-hook-form` + `zod` (kiểm tra dữ liệu ngay tại máy).
- **Lưu token an toàn**: `expo-secure-store` → đẩy token vào Keystore của hệ điều hành, thay vì
  để chữ thường trong bộ nhớ ứng dụng.
- **Tự động làm mới token**: `src/api/client.ts` bắt lỗi 401, gọi `/auth/refresh-token` rồi thử
  lại request. Có cơ chế **single-flight** — vì backend thu hồi refresh token cũ sau mỗi lần dùng,
  hai request gọi refresh song song sẽ làm cái thứ hai chết và đăng xuất oan.
- **Điều hướng theo vai trò**: `AuthGate` trong `app/_layout.tsx` đọc vai trò từ JWT rồi đẩy vào
  đúng khu vực — ứng viên vào `(candidate)`, quản lý tuyển dụng vào `(hm)`, HR vào `(hr)`.
- **Hệ thống thiết kế port 1-1 từ web** (`frontend/src/app/theme.ts` → `mobile/src/theme/`):
  cùng bảng màu, cùng thang khoảng cách, cùng bộ chữ Be Vietnam Pro. Hai bản web/mobile nhìn
  là một sản phẩm.
- Sửa `start-backend.bat` / `run-service.bat`: nạp `.env` của từng service trước khi khởi động.

---

## 4. Kiến trúc hệ thống hiện tại

```
                    ┌──────────────┐     ┌──────────────┐
                    │  Web (React) │     │ Mobile (Expo)│  ← mới, kỳ này
                    └──────┬───────┘     └──────┬───────┘
                           └────────┬───────────┘
                              ┌─────▼───────┐
                              │ API Gateway │ :8080/api
                              └─────┬───────┘
   ┌────────┬────────┬────────┬─────┴────┬─────────┬──────────┬──────────┬────────┐
  auth  candidate application recruitment interview  offer  masterdata notification  ai
 (Spring Boot × 8, PostgreSQL riêng từng service)                              (FastAPI)
                              RabbitMQ nối các service
```

---

## 5. Ứng dụng di động — trạng thái hiện tại

| Hạng mục | Tình trạng |
|---|---|
| Khung dự án, định tuyến, biến môi trường | ✅ xong |
| Kiểu dữ liệu từ OpenAPI 9 service | ✅ xong |
| Hệ thống thiết kế (màu/chữ/khoảng cách/bo góc/bóng đổ) | ✅ xong |
| 5 màn xác thực + làm mới token + điều hướng theo vai trò | ✅ xong |
| 13 màn nghiệp vụ (ứng viên · HM · HR) | 🔶 đã dựng route + thanh tab + màn tạm, chờ nối API |

**Cách chạy để demo:**
```
1. Backend:  start-infrastructure.bat  →  start-backend.bat
2. Mobile:   cd mobile
             copy .env.example .env     (sửa EXPO_PUBLIC_API_BASE_URL thành IP LAN của máy)
             npm start
3. Điện thoại quét mã QR (phải cùng mạng Wi-Fi với máy tính)
```
Tài khoản mẫu (mật khẩu chung `Password123!`): `hr.recruiter@test.net` ·
`dept.manager@test.net` · `nguyenvanan@gmail.com`.

---

## 6. BẢN ĐỒ MÀN HÌNH MOBILE → FILE MÃ NGUỒN

> Quy ước: route nằm ở `mobile/app/`, logic dùng chung ở `mobile/src/`.
> Tên thư mục trong ngoặc đơn — `(auth)`, `(candidate)` — là **nhóm route**, không hiện trên URL.
> Sửa file rồi lưu là app tự cập nhật ngay (Fast Refresh), không cần khởi động lại.

### 6.1 Khu vực chưa đăng nhập — `app/(auth)/`

| Màn hình | Chữ đang hiển thị | File | Dòng chứa tiêu đề |
|---|---|---|---|
| Đăng nhập | "Đăng nhập" / "Sử dụng email và mật khẩu của bạn." | `mobile/app/(auth)/login.tsx` | 65–66 |
| Đăng ký ứng viên | "Đăng ký ứng viên" / "Tạo tài khoản để nộp hồ sơ…" | `mobile/app/(auth)/register.tsx` | 77–78 |
| Xác minh email (OTP) | "Xác minh email" / "Mã xác minh đã được gửi tới…" | `mobile/app/(auth)/verify-email.tsx` | 78–79 |
| Quên mật khẩu | "Quên mật khẩu" / "Nhập email để nhận mã OTP…" | `mobile/app/(auth)/forgot-password.tsx` | 49–50 |
| Đặt lại mật khẩu | "Đặt lại mật khẩu" / "Nhập mã OTP vừa nhận…" | `mobile/app/(auth)/reset-password.tsx` | 100–101 |

**Phần khung chung của cả 5 màn** (chữ "ATS" to màu xanh ở trên cùng, nền trắng, canh giữa,
bề ngang tối đa 420): `mobile/src/components/auth-scaffold.tsx` — chữ "ATS" ở **dòng 45**,
cỡ chữ ở **dòng 74**.

**Ô nhập liệu + dòng báo lỗi đỏ bên dưới**: `mobile/src/components/form-text-field.tsx`.

### 6.2 Khu vực ỨNG VIÊN — `app/(candidate)/` (4 tab dưới màn hình)

| Tab / Màn hình | Nhãn tab | File màn hình | Nhãn tab sửa ở |
|---|---|---|---|
| Việc làm (mặc định sau đăng nhập) | "Việc làm" | `app/(candidate)/jobs/index.tsx` | `app/(candidate)/_layout.tsx:13` |
| Đơn của tôi | "Đơn của tôi" | `app/(candidate)/applications/index.tsx` | `_layout.tsx:22` |
| Lịch phỏng vấn | "Lịch PV" | `app/(candidate)/interviews/index.tsx` | `_layout.tsx:31` |
| Hồ sơ của tôi | "Hồ sơ" | `app/(candidate)/profile.tsx` | `_layout.tsx:40` |
| Chi tiết tin tuyển dụng | (không hiện tab) | `app/(candidate)/jobs/[id].tsx` | `_layout.tsx:46` |
| Chi tiết đơn ứng tuyển | (không hiện tab) | `app/(candidate)/applications/[id].tsx` | `_layout.tsx:47` |
| Danh sách thư mời | (không hiện tab) | `app/(candidate)/offers/index.tsx` | `_layout.tsx:48` |
| Chi tiết thư mời | (không hiện tab) | `app/(candidate)/offers/[id].tsx` | `_layout.tsx:49` |

`[id]` nghĩa là route động — `/jobs/12` sẽ mở `jobs/[id].tsx` với `id = 12`.

### 6.3 Khu vực QUẢN LÝ TUYỂN DỤNG (HM) — `app/(hm)/` (2 tab)

| Tab | Nhãn tab | File màn hình | Nhãn tab sửa ở |
|---|---|---|---|
| Cần duyệt (mặc định) | "Cần duyệt" | `app/(hm)/index.tsx` | `app/(hm)/_layout.tsx:13` |
| Phỏng vấn của tôi | "Phỏng vấn" | `app/(hm)/interviews/index.tsx` | `_layout.tsx:22` |

### 6.4 Khu vực HR / RECRUITER — `app/(hr)/` (3 tab)

| Tab | Nhãn tab | File màn hình | Nhãn tab sửa ở |
|---|---|---|---|
| Tổng quan (mặc định) | "Tổng quan" | `app/(hr)/index.tsx` | `app/(hr)/_layout.tsx:13` |
| Yêu cầu tuyển dụng | "Yêu cầu TD" | `app/(hr)/requisitions/index.tsx` | `_layout.tsx:22` |
| Hồ sơ ứng tuyển | "Hồ sơ" | `app/(hr)/applications/index.tsx` | `_layout.tsx:31` |

### 6.5 File dùng chung — sửa một chỗ, đổi cả app

| Muốn đổi cái gì | File |
|---|---|
| Toàn bộ **màu sắc** | `mobile/src/theme/colors.ts` |
| **Cỡ chữ** và font | `mobile/src/theme/typography.ts` |
| **Khoảng cách** (padding/margin) | `mobile/src/theme/spacing.ts` |
| **Bo góc** | `mobile/src/theme/radius.ts` |
| **Đổ bóng** | `mobile/src/theme/shadows.ts` |
| Màu của nút/ô nhập (thư viện Paper) | `mobile/src/theme/paper.ts` |
| **Thanh tiêu đề trên + thanh tab dưới** | `mobile/src/lib/tab-options.ts` |
| Vai trò nào vào khu vực nào sau khi đăng nhập | `mobile/src/lib/routes.ts` |
| Nội dung **màn tạm** của 13 màn nghiệp vụ chưa nối API | `mobile/src/components/placeholder-screen.tsx` |
| Gọi API xác thực | `mobile/src/api/auth.ts` |
| Gắn token, tự làm mới token, dịch lỗi backend sang tiếng Việt | `mobile/src/api/client.ts` |
| Lưu trữ token an toàn | `mobile/src/lib/storage.ts` |
| Trạng thái đăng nhập toàn app | `mobile/src/store/authStore.ts` |

---

## 7. Sổ tay sửa nhanh tại chỗ (khi giáo viên yêu cầu sửa trực tiếp)

### 7.1 Đổi chữ

| Yêu cầu | Mở file | Sửa ở |
|---|---|---|
| Đổi tiêu đề màn đăng nhập | `app/(auth)/login.tsx` | dòng 65 `title="Đăng nhập"` |
| Đổi câu mô tả dưới tiêu đề | `app/(auth)/login.tsx` | dòng 66 `subtitle="…"` |
| Đổi chữ trên nút đăng nhập | `app/(auth)/login.tsx` | dòng 122 |
| Đổi chữ "Quên mật khẩu?" | `app/(auth)/login.tsx` | dòng 110 |
| Đổi chữ "Bạn là ứng viên?" / "Tạo tài khoản" | `app/(auth)/login.tsx` | dòng 69 / 72 |
| Đổi chữ "ATS" ở đầu màn | `src/components/auth-scaffold.tsx` | dòng 45 |
| Đổi nhãn tab (vd "Việc làm" → "Tìm việc") | `app/(candidate)/_layout.tsx` | dòng 13 |
| Đổi tiêu đề một màn nghiệp vụ | file màn hình đó (vd `app/(candidate)/jobs/index.tsx`) | dòng 4, thuộc tính `title=` |
| Đổi chữ nút "Đăng xuất" | `src/components/placeholder-screen.tsx` | dòng 70 |

> **Thông điệp lỗi** (vd "Vui lòng nhập email", "Email không hợp lệ") nằm ngay trong khai báo
> `zod` ở đầu mỗi màn — ví dụ `app/(auth)/login.tsx` dòng 15–18.

### 7.2 Đổi màu — tất cả nằm ở `mobile/src/theme/colors.ts`

| Đổi chỗ nào trên giao diện | Sửa biến | Dòng | Giá trị hiện tại |
|---|---|---|---|
| Nút chính, tab đang chọn, chữ "ATS", vòng quay chờ | `primary` | 10 | `#0E7A5F` |
| Thanh tiêu đề trên cùng (xanh đậm) | `header` | 17 | `#0B3B36` |
| Nền chung của app (xám nhạt) | `body` | 18 | `#F0F2F5` |
| Nền thẻ, nền màn đăng nhập | `cardBg` | 19 | `#FFFFFF` |
| Chữ chính (đen) / chữ phụ (xám) | `textPrimary` / `textSecondary` | 28 / 29 | `#111827` / `#6B7280` |
| Nút đăng xuất, viền ô nhập bị lỗi | `error` | 24 | `#DC2626` |
| Màu theo giai đoạn tuyển dụng | `stageNew` … `stageRejected` | 39–44 | |

Đổi một dòng ở đây là **đổi toàn app cùng lúc** — vì quy ước dự án cấm viết mã màu trực tiếp
trong màn hình (quy tắc 11 trong `mobile/CLAUDE.md`). Đây là điểm đáng nói khi trình bày.

### 7.3 Đổi cỡ chữ — `mobile/src/theme/typography.ts`

| Dùng cho | Biến | Dòng | Giá trị |
|---|---|---|---|
| Chữ thường | `base` | 32 | 14 |
| Tiêu đề thẻ | `h4` | 34 | 16 |
| Tiêu đề màn nghiệp vụ | `h3` | 35 | 20 |
| Tiêu đề màn đăng nhập | `h2` | 36 | 24 |

### 7.4 Đổi bố cục / điều hướng

| Yêu cầu | Làm gì |
|---|---|
| Đổi **thứ tự** các tab | Đảo thứ tự các khối `<Tabs.Screen>` trong `_layout.tsx` của khu vực đó |
| Đổi **icon** tab | Sửa `name="briefcase-search"` → tên khác trong bộ MaterialCommunityIcons |
| **Ẩn** một tab khỏi thanh dưới | Thêm `href: null` vào `options` của tab đó |
| Đổi màn mặc định sau đăng nhập | `src/lib/routes.ts` — hàm `homeForRole` |
| Đổi màu thanh tab / chữ tab | `src/lib/tab-options.ts` dòng 13 (nền thanh trên), 17–18 (chữ tab) |

### 7.5 Câu trả lời cho hai câu hỏi hay gặp nhất

- *"Màn hình này nằm ở đâu?"* → mục 6 ở trên; nguyên tắc: **tên thư mục trong `app/` chính là
  đường dẫn màn hình**. Tab "Đơn của tôi" → `app/(candidate)/applications/index.tsx`.
- *"Sửa xong có phải build lại không?"* → Không. Lưu file là app cập nhật ngay trên điện thoại.
  Chỉ khi thêm **thư viện native mới** mới phải build lại (10–30 phút) — đây cũng là lý do
  chọn màu đặc thay cho gradient ở bản mobile (ghi chú tại `src/theme/colors.ts` dòng 47–52).

---

## 8. Kế hoạch giai đoạn tiếp theo

| Mốc | Nội dung |
|---|---|
| Ngày 3–7 (tuần 1) | 3 màn mẫu (danh sách / chi tiết / form) + các trạng thái loading–rỗng–lỗi, rồi làm B1→B4: danh sách việc làm, chi tiết + nộp đơn, đơn của tôi, chi tiết đơn |
| Tuần 2 | Lịch phỏng vấn + xác nhận, thư mời + tải PDF + đồng ý/từ chối, hồ sơ & CV, **thông báo đẩy** (4 thay đổi ở notification-service) |
| Tuần 3 | Khu HM: việc cần làm, xác nhận lịch, xem CV, **form chấm đánh giá** (màn quan trọng nhất) · Khu HR: hàng chờ duyệt, duyệt requisition, duyệt offer |
| Tuần 4 | Rà soát toàn bộ, build APK preview, test trên máy thật, viết báo cáo |

**Mốc an toàn đặt ở cuối tuần 2**: demo được trọn một vòng của ứng viên kèm thông báo đẩy.

---

## 9. Chuẩn bị cho phần hỏi đáp

**Vì sao làm app di động, không làm tiếp web?**
Tài liệu `docs/ATS_UX_REVIEW_BY_ROLE.md` đã chỉ ra: bản web khóa cứng theo màn hình máy tính, và
quản lý tuyển dụng là người thiệt nhất — phỏng vấn xong, rời phòng họp là không chấm điểm được.
Backend cũng đã có sẵn hai hàng đợi nhắc việc (`INTERVIEW_REMINDER`, `EVALUATION_INCOMPLETE_REMINDER`)
nhưng chúng chỉ bắn vào cái chuông trên web mà không ai mở. App đóng đúng khoảng trống đó.

**Vì sao mobile chỉ có 20 màn, HR chỉ có 3 màn?**
App không phải bản thu nhỏ của web. Việc cần màn rộng (sàng lọc hàng loạt, kéo thả kanban, so sánh
ứng viên, quản lý dữ liệu nền) để lại trên web. Mobile chỉ nhận việc ngắn, cần làm ngay, kích hoạt
bởi thông báo — đặc biệt là những chữ ký đang chặn người khác làm việc.

**Kiểu dữ liệu ở mobile lấy từ đâu, có gõ tay không?**
Sinh tự động từ OpenAPI của 9 service bằng `npm run gen:types`. Cấm khai báo tay. Backend đổi DTO
là mobile báo lỗi biên dịch ngay tại `src/types/api.ts`.

**Token lưu ở đâu, có an toàn không?**
Trả lời ngắn: access token là JWT sống 15 phút, refresh token là chuỗi ngẫu nhiên 256 bit sống
7 ngày; máy chủ **chỉ lưu bản băm SHA-256** của refresh token, điện thoại lưu cả hai trong
**Keystore/Keychain của hệ điều hành** qua `expo-secure-store`, và mỗi refresh token **chỉ dùng
được đúng một lần**. Giải thích đầy đủ ở **mục 10**.

**Chức năng này em dùng thư viện gì?**
Xem bảng tra nhanh ở **mục 11.1** (chức năng → thư viện), danh sách đầy đủ theo từng tầng ở
mục 11.2–11.6, và lý do chọn từng thư viện ở mục 11.7.

**Sao giao diện mobile giống web vậy?**
Toàn bộ token thiết kế được port 1-1 từ `frontend/src/app/theme.ts`, giữ nguyên cả tên biến để
đối chiếu hai codebase không phải dịch trong đầu.

---

## 10. Phụ lục — Token lưu ở đâu và có an toàn không

> Toàn bộ mục này đối chiếu trực tiếp từ mã nguồn, có ghi rõ file để mở ra chứng minh tại chỗ.

### 10.1 Hệ thống dùng HAI loại token khác nhau

| | Access token | Refresh token |
|---|---|---|
| Bản chất | **JWT** ký bằng HMAC-SHA256 | **Chuỗi ngẫu nhiên 32 byte (256 bit)** sinh bằng `SecureRandom`, mã hóa Base64-URL — không phải JWT, không đọc được nội dung gì bên trong |
| Thời hạn | **15 phút** (`access-token-expiration-ms: 900000`) | **7 ngày** (`refresh-token-expiration-ms: 604800000`) |
| Chứa gì | `sub` (userId) · `email` · `role` · `departmentId` · `iat` · `exp` | Không chứa gì cả — chỉ là một mã tra cứu |
| Máy chủ có lưu không | **Không** (xác thực bằng chữ ký, stateless) | **Có**, nhưng chỉ lưu bản băm — xem 10.2 |
| Dùng để làm gì | Gắn vào header `Authorization` của mọi request | Chỉ dùng cho đúng một endpoint `/auth/refresh-token` |

Nguồn: `auth-service/src/main/java/iuh/fit/se/auth/security/JwtUtil.java` ·
`.../security/OpaqueTokenUtil.java` · `auth-service/src/main/resources/application.yml` dòng 39–42.

Tách hai loại là có chủ đích: access token ngắn hạn để nếu bị lộ thì cửa sổ tấn công chỉ 15 phút;
refresh token dài hạn nhưng bị quản lý chặt trong cơ sở dữ liệu và thu hồi được bất cứ lúc nào.

### 10.2 Phía máy chủ — không lưu token thật

Bảng `refresh_token` (`auth-service/.../entity/RefreshToken.java`) chỉ có 5 cột:
`user_id` · `token` (thực chất là **SHA-256 dạng hex, 64 ký tự**) · `expiry_date` · `revoked`.
Comment ngay trong mã nguồn ghi rõ: *"The legacy column now stores only a SHA-256 digest, never
the bearer token."*

Ý nghĩa: **ngay cả người có toàn quyền đọc cơ sở dữ liệu cũng không mạo danh được người dùng**,
vì từ bản băm không dựng ngược lại được token gốc. Đây là cùng một nguyên tắc với việc không lưu
mật khẩu dạng chữ thường. (Mã OTP đặt lại mật khẩu cũng vậy — lưu băm bcrypt trong
`password_reset_tokens`.)

### 10.3 Refresh token chỉ dùng được MỘT LẦN (token rotation)

`LoginService.refreshToken()` — `auth-service/.../service/LoginService.java:68-87`:

```
1. Băm token nhận được  →  SHA-256
2. Tìm bản ghi bằng findForUpdateByTokenHash()  ← có @Lock(PESSIMISTIC_WRITE), tức SELECT … FOR UPDATE
3. Từ chối nếu: không tồn tại  |  revoked = true  |  đã quá expiry_date
4. Kiểm tra tài khoản còn ACTIVE (không bị LOCKED / INACTIVE)
5. Đánh dấu bản ghi cũ revoked = true
6. Phát ra CẶP MỚI: access token mới + refresh token mới
```

Ba điều rút ra khi trình bày:
- **Xoay vòng token:** mỗi lần làm mới là token cũ chết hẳn. Token bị lộ chỉ dùng được tối đa một
  lần, và lần đó sẽ làm hỏng phiên của người thật → bất thường lộ ra ngay thay vì âm thầm.
- **Khóa bi quan (`PESSIMISTIC_WRITE`)**: hai request đến cùng lúc với cùng một token thì một cái
  phải xếp hàng chờ, không có chuyện cả hai cùng tiêu thụ một token.
- **Đăng xuất là thu hồi thật:** `logout()` (dòng 90–101) đặt `revoked = true` và ghi nhật ký kiểm
  toán sự kiện `LOGOUT`, chứ không chỉ xóa token phía máy khách.

### 10.4 Phía điện thoại — lưu trong Keystore/Keychain của hệ điều hành

`mobile/src/lib/storage.ts` dùng `expo-secure-store` với hai khóa `ats.accessToken` và
`ats.refreshToken`:

- **Android:** giá trị được mã hóa bằng khóa AES do **Android Keystore** giữ. Khóa nằm trong vùng
  bảo mật của hệ điều hành (nhiều máy là vùng phần cứng riêng), ứng dụng **không đọc được khóa ra**
  — chỉ nhờ hệ điều hành mã hóa/giải mã hộ. Bản mã mới nằm trong vùng dữ liệu riêng của app.
- **iOS:** lưu trong **Keychain**.
- Thêm một lớp nữa: hệ điều hành cô lập dữ liệu giữa các app (sandbox), app khác không đọc được
  vùng dữ liệu của app này.

**Vì sao không dùng `AsyncStorage`** (đã ghi vào nhật ký quyết định, mục 15 của kế hoạch):
AsyncStorage để **chữ thường** trong một tệp SQLite trong thư mục ứng dụng — máy đã root, hoặc
bản sao lưu bị lấy ra, là đọc được ngay. SecureStore thì kẻ tấn công phải lấy được cả dữ liệu lẫn
khóa trong Keystore.

### 10.5 So với bản web — mobile an toàn hơn ở điểm này

Bản web lưu token trong `localStorage` (`frontend/src/features/auth/authSlice.ts`). `localStorage`
bị **mọi đoạn JavaScript chạy trong trang đọc được** — chỉ cần một lỗ hổng XSS, hoặc một thư viện
bên thứ ba bị cài mã độc, là token ra ngoài. Ứng dụng di động không có mô hình tấn công đó, và
vùng lưu lại được hệ điều hành mã hóa. Đây là một điểm hơn thật sự của bản mobile, nên nói khi
được hỏi "làm lại trên mobile thì hơn gì web".

### 10.6 Phía ứng dụng còn làm thêm ba việc

`mobile/src/api/client.ts`:
1. **Làm mới sớm 30 giây** (`REFRESH_SKEW_MS`): thấy access token sắp hết hạn thì làm mới trước,
   tránh phần lớn vòng "gửi đi → 401 → làm mới → gửi lại" trên mạng yếu.
2. **Single-flight** (`refreshPromise`): nhiều request cùng lúc phát hiện token hết hạn thì chỉ có
   **đúng một** lời gọi `/auth/refresh-token`, các request còn lại chờ kết quả đó. Không có cơ chế
   này thì — vì token cũ bị thu hồi ngay khi dùng — request thứ hai sẽ nhận lỗi và đá người dùng
   ra màn đăng nhập oan. *(Đã kiểm chứng trên backend thật, không phải suy đoán.)*
3. **Gọi refresh bằng instance riêng (`bare`)**: nếu gọi bằng `apiClient` thì bộ chặn lỗi sẽ bắt
   lại chính nó → đệ quy vô hạn khi token hỏng.

Làm mới thất bại → `signOut()` xóa sạch token trong SecureStore → `AuthGate` đẩy về màn đăng nhập.

### 10.7 Thành thật về giới hạn (nên chủ động nói trước khi bị hỏi)

| Giới hạn | Thực tế và hướng xử lý |
|---|---|
| Máy đã root/jailbreak | Không giải pháp phía máy khách nào an toàn tuyệt đối. SecureStore nâng chi phí tấn công lên rất nhiều, không phải bất khả xâm phạm |
| Chưa bật `requireAuthentication` của SecureStore | Có thể bắt buộc vân tay/PIN mỗi lần đọc token. Chưa bật vì đánh đổi trải nghiệm khi mở app — là lựa chọn có ý thức, thêm được bất cứ lúc nào |
| Access token chưa thu hồi tức thì được | Vì là JWT stateless, khóa tài khoản xong token cũ vẫn sống tối đa 15 phút. Đánh đổi quen thuộc giữa hiệu năng và tính tức thì |
| Chưa có phát hiện dùng lại token (reuse detection) | Hiện thấy token đã thu hồi thì báo lỗi. Bước nâng cấp tiếp theo: thu hồi **cả chuỗi token** của phiên đó và buộc đăng nhập lại — đây là hướng cải tiến nên nêu |
| `JWT_SECRET` trong `application.yml` đang là chuỗi mẫu | Chỉ dùng khi chạy máy cá nhân; khi triển khai thật bắt buộc đặt qua biến môi trường. Bản thân file đã ghi rõ điều này |

## 11. Phụ lục — Thư viện đã dùng và dùng để làm gì

> Danh sách lấy trực tiếp từ `mobile/package.json`, `frontend/package.json`, các file `pom.xml`
> và `ai-service/requirements.txt`. Không liệt kê thư viện không có trong dự án.

### 11.1 Tra nhanh: chức năng → thư viện (phần hay bị hỏi nhất)

| Chức năng | Thư viện |
|---|---|
| Đăng nhập, phát và xác thực JWT | **jjwt** (máy chủ) · **jwt-decode** (đọc vai trò ở máy khách) |
| Lưu token an toàn trên điện thoại | **expo-secure-store** |
| Form + kiểm tra dữ liệu nhập | **react-hook-form** + **zod** (dùng chung cả web và mobile) |
| Gọi API | **axios** (web + mobile) |
| Tải dữ liệu, cache, kéo-để-làm-mới, tự thử lại | **@tanstack/react-query** (mobile) |
| Điều hướng màn hình | **expo-router** (mobile) · **react-router-dom** (web) |
| Bộ giao diện | **react-native-paper** (Material 3, mobile) · **Ant Design v6** (web) |
| Trạng thái toàn ứng dụng | **zustand** (mobile) · **Redux Toolkit** (web) |
| Sinh kiểu dữ liệu từ API backend | **springdoc-openapi** (sinh tài liệu) → **openapi-typescript** (sinh type TS) |
| Tải CV lên và lưu trữ tệp | **AWS SDK v2 (S3)** + **MinIO** · **expo-document-picker** phía điện thoại |
| Đọc CV bằng AI | **PyMuPDF** (PDF) · **python-docx** (Word) · **PaddleOCR** (CV scan) · **OpenAI / Google GenAI** |
| Xuất PDF thư mời, báo cáo | **OpenPDF** |
| Gửi lời mời lịch phỏng vấn (.ics) | **biweekly** |
| Gửi email OTP và thông báo | **spring-boot-starter-mail** |
| Thông báo thời gian thực trên web | **spring-boot-starter-websocket** + **@stomp/stompjs** + **sockjs-client** |
| Thông báo đẩy trên điện thoại | **expo-notifications** (tuần 2) |
| Biểu đồ dashboard | **Recharts** |
| Xuất Excel | **xlsx** + **file-saver** |
| Kéo thả pipeline ứng viên | **@hello-pangea/dnd** |
| Nâng cấp cấu trúc cơ sở dữ liệu | **Flyway** (Java) · **Alembic** (Python) |
| Giao tiếp giữa các service | **Spring Cloud OpenFeign** (gọi đồng bộ) · **RabbitMQ** qua **spring-boot-starter-amqp** (bất đồng bộ) |
| Định dạng ngày giờ | **date-fns** (mobile) · **dayjs** (web) |

### 11.2 Ứng dụng di động — `mobile/package.json`

| Thư viện | Dùng để làm gì | Tình trạng |
|---|---|---|
| `expo` 57 · `react-native` 0.86 · `react` 19 | Nền tảng ứng dụng | Đang dùng |
| `expo-router` | Điều hướng theo cấu trúc thư mục (tên thư mục = đường dẫn màn hình) | Đang dùng |
| `react-native-paper` | Bộ giao diện Material 3: nút, ô nhập, thẻ, thanh thông báo lỗi | Đang dùng |
| `@expo-google-fonts/be-vietnam-pro` + `expo-font` | Nạp chữ Be Vietnam Pro y hệt bản web | Đang dùng |
| `@expo/vector-icons` | Icon cho thanh tab và ô nhập | Đang dùng |
| `axios` | Gọi API, bộ chặn gắn token và tự làm mới token | Đang dùng |
| `@tanstack/react-query` | Tải dữ liệu, bộ nhớ đệm, kéo-để-làm-mới, tự thử lại | Đã dựng sẵn, dùng từ ngày 3 |
| `zustand` | Giữ trạng thái phiên đăng nhập cho toàn ứng dụng | Đang dùng |
| `react-hook-form` + `@hookform/resolvers` + `zod` | Form và kiểm tra dữ liệu ngay tại máy | Đang dùng (5 màn xác thực) |
| `jwt-decode` | Đọc vai trò từ access token để điều hướng | Đang dùng |
| `expo-secure-store` | Lưu token vào Keystore/Keychain (xem mục 10) | Đang dùng |
| `expo-notifications` · `expo-device` · `expo-linking` | Thông báo đẩy và deep link từ thông báo | Cài sẵn — tuần 2 |
| `expo-document-picker` · `expo-file-system` · `expo-sharing` | Chọn CV từ máy, tải và mở PDF thư mời | Cài sẵn — tuần 2 |
| `date-fns` | Định dạng ngày giờ phỏng vấn | Cài sẵn |
| `openapi-typescript` *(dev)* | Sinh 8.248 dòng kiểu dữ liệu từ OpenAPI của 9 service | Đang dùng |
| `typescript` · `eslint` · `prettier` | Kiểm tra kiểu và định dạng mã nguồn | Đang dùng |

> Toàn bộ thư viện native được cài **một lượt ngay ngày đầu** là có chủ đích: mỗi lần thêm thư
> viện native mới là phải build lại 10–30 phút, nên cài trước những gì kế hoạch đã chốt.

### 11.3 Web — `frontend/package.json`

| Thư viện | Dùng để làm gì |
|---|---|
| `react` 19 + `vite` | Nền tảng và công cụ build |
| `antd` v6 + `@ant-design/icons` | Bộ giao diện chính |
| `react-router-dom` | Điều hướng |
| `@reduxjs/toolkit` + `react-redux` | Trạng thái toàn ứng dụng (phiên đăng nhập, dữ liệu dùng chung) |
| `axios` | Gọi API + bộ chặn làm mới token |
| `react-hook-form` + `zod` + `@hookform/resolvers` | Form và kiểm tra dữ liệu |
| `jwt-decode` | Đọc vai trò từ token |
| `@hello-pangea/dnd` | Kéo thả pipeline ứng viên (kanban) |
| `recharts` | Biểu đồ trên dashboard |
| `@stomp/stompjs` + `sockjs-client` | Nhận thông báo thời gian thực qua WebSocket |
| `xlsx` + `file-saver` | Xuất báo cáo Excel |
| `dayjs` | Ngày giờ |

### 11.4 Backend Java — Spring Boot 3, Java 21

**Dùng chung ở hầu hết 8 service:**

| Thư viện | Dùng để làm gì |
|---|---|
| `spring-boot-starter-web` | Viết REST API |
| `spring-boot-starter-data-jpa` (Hibernate) | Ánh xạ đối tượng ↔ bảng, truy vấn |
| `postgresql` driver | Kết nối PostgreSQL |
| `flyway-core` | Nâng cấp cấu trúc cơ sở dữ liệu theo phiên bản (V1 → V7) |
| `spring-boot-starter-validation` | Kiểm tra dữ liệu đầu vào (`@NotNull`, `@Pattern`…) |
| `spring-boot-starter-security` | Phân quyền theo vai trò |
| `spring-boot-starter-amqp` | Gửi/nhận sự kiện qua RabbitMQ |
| `spring-cloud-starter-openfeign` | Gọi sang service khác như gọi hàm |
| `springdoc-openapi` | Sinh tài liệu Swagger — **cũng là nguồn sinh type cho mobile** |
| `lombok` | Giảm mã lặp (getter/setter/builder) |

**Riêng từng service:**

| Service | Thư viện riêng | Dùng để làm gì |
|---|---|---|
| api-gateway | `spring-cloud-starter-gateway` + `jjwt` | Cổng vào duy nhất, xác thực JWT trước khi chuyển tiếp |
| auth-service | `jjwt` · `spring-boot-starter-oauth2-client` · `spring-boot-starter-mail` | Phát/xác thực JWT · đăng nhập Google · gửi email OTP |
| interview-service | `biweekly` | Sinh tệp lịch `.ics` gửi kèm email mời phỏng vấn |
| offer-service · dashboard-service | `openpdf` | Xuất PDF thư mời và báo cáo |
| candidate-service | `AWS SDK v2 — s3` | Lưu CV lên S3/MinIO |
| notification-service | `spring-boot-starter-websocket` · `spring-boot-starter-mail` · `jjwt` | Đẩy thông báo thời gian thực xuống web · gửi email |

### 11.5 ai-service — Python

| Thư viện | Dùng để làm gì |
|---|---|
| `fastapi` + `uvicorn` | Khung web bất đồng bộ |
| `pydantic` + `pydantic-settings` | Kiểm tra dữ liệu và cấu hình |
| `sqlalchemy` + `asyncpg` + `alembic` | ORM, driver PostgreSQL bất đồng bộ, migration |
| `pgvector` | Lưu vector nhúng để so khớp ngữ nghĩa CV ↔ tin tuyển dụng |
| `aio-pika` | RabbitMQ bất đồng bộ |
| `httpx` | Gọi sang các service Java |
| `openai` | Gọi mô hình chính `gpt-4o-mini` |
| `google-genai` | Mô hình dự phòng `gemini-2.0-flash` khi mô hình chính lỗi |
| `PyMuPDF` · `python-docx` | Bóc chữ từ CV dạng PDF và Word |
| `paddleocr` + `paddlepaddle` | OCR PP-OCRv4 cho CV là ảnh scan (có hỗ trợ tiếng Việt có dấu) |
| `Pillow` · `opencv-python-headless` | Xử lý ảnh trước khi OCR |
| `boto3` | Tải CV trực tiếp từ S3/MinIO |

### 11.6 Hạ tầng — `docker-compose.yml`

| Thành phần | Dùng để làm gì |
|---|---|
| `pgvector/pgvector:pg16` | PostgreSQL 16 kèm sẵn pgvector — mỗi service một database riêng |
| `rabbitmq:3-management` | Hàng đợi sự kiện giữa các service (kèm giao diện quản trị) |
| `minio/minio` | Kho lưu tệp tương thích S3, tự vận hành — chứa CV và tệp đính kèm |
| `redis:7-alpine` | **Đã khai báo trong hạ tầng và truyền biến môi trường cho các service, nhưng hiện chưa service nào khai thư viện Redis — tức là chưa dùng thật.** Chuẩn bị sẵn cho bộ nhớ đệm giai đoạn sau |

### 11.7 Nếu bị hỏi "vì sao chọn thư viện này mà không phải cái kia"

| Lựa chọn | Lý do |
|---|---|
| **Expo** thay vì React Native CLI thuần | Quản lý sẵn thư viện native, có EAS build và cập nhật từ xa; không phải cấu hình Gradle/Xcode bằng tay |
| **zustand** ở mobile, **Redux Toolkit** ở web | Mobile hiện chỉ có đúng một mẩu trạng thái toàn cục (phiên đăng nhập) — zustand gọn hơn nhiều. Web có nhiều trạng thái chia sẻ hơn nên giữ Redux |
| **react-query** thay vì tự viết `useEffect` | Có sẵn bộ nhớ đệm, tự thử lại, kéo-để-làm-mới và trạng thái loading/lỗi — đúng yêu cầu "mỗi màn danh sách phải đủ 4 trạng thái" trong quy ước dự án |
| **react-hook-form + zod** | Cùng một bộ luật kiểm tra dữ liệu cho cả web và mobile; zod vừa kiểm tra vừa sinh kiểu TypeScript |
| **openapi-typescript** | Không gõ tay kiểu dữ liệu backend. Backend đổi DTO là mobile báo lỗi biên dịch ngay |
| **react-native-paper** | Material 3 sẵn khả năng truy cập (accessibility); vẫn ép được về đúng bảng màu của web qua `src/theme/paper.ts` |
| **OpenPDF** | Là nhánh giấy phép LGPL/MPL của iText, dùng miễn phí cho sản phẩm thương mại |
| **jjwt** | Thư viện JWT phổ biến nhất cho Java, hỗ trợ sẵn HMAC-SHA256 |
| **MinIO** thay vì S3 thật | Cùng giao thức S3 nên mã nguồn không đổi một dòng khi chuyển sang AWS thật |

---

*Tài liệu tham chiếu: `docs/mobile/MOBILE_V1_PLAN.md` (kế hoạch v1, 20 màn) ·
`docs/mobile/MOBILE_WEEK_1.md`, `MOBILE_WEEK_2.md` (kế hoạch thi công từng ngày) ·
`mobile/CLAUDE.md` (quy ước code + các sự thật về backend đã đối chiếu).*
