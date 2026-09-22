# ATS Mobile — Kế hoạch triển khai phiên bản v1

> **Trạng thái:** BẢN NHÁP CHỜ DUYỆT — chưa viết dòng code nào.
> **Ngày lập:** 2026-09-22 · **Nhân sự:** 1 người · **Thời lượng:** 4 tuần
> **Nền tảng:** Expo (React Native), sản phẩm giao là **APK Android**
> **Vai trò trong phạm vi:** HR (`RECRUITER`), HM (`HIRING_MANAGER`), Candidate (`CANDIDATE`)

---

## 0. Tóm tắt một trang

App mobile **không phải bản thu nhỏ của web**. Nó chỉ nhận những việc mà điện thoại làm
tốt hơn máy tính: việc ngắn, cần làm ngay, kích hoạt bởi thông báo, xảy ra khi người dùng
đã rời bàn làm việc. Việc nặng (masterdata, kanban, so sánh ứng viên, quản lý tin tuyển
dụng) ở lại trên web.

- **20 màn hình**, chia: 4 hạ tầng/dùng chung · 8 Candidate · 5 HM · 3 HR.
- **4 thay đổi backend**, tất cả nằm ở notification-service, phục vụ push notification.
- Toàn bộ phần còn lại chạy trên **API đã có sẵn** — đã đối chiếu từng endpoint.
- Mốc an toàn: **cuối tuần 2 demo được trọn vòng Candidate kèm push.**

Luận điểm bảo vệ: tài liệu `ATS_UX_REVIEW_BY_ROLE.md` (mục 5.1) đã kết luận web khóa cứng
desktop và *"Manager là người thiệt nhất — vừa phỏng vấn xong, ngồi chờ thang máy, mở máy
chấm điểm. Hiện tại không làm được."* Backend cũng đã có sẵn hai hàng đợi nhắc việc
(`INTERVIEW_REMINDER`, `EVALUATION_INCOMPLETE_REMINDER`) nhưng chúng đang bắn vào một cái
chuông trên web mà không ai mở. App này đóng đúng khoảng trống đó.

---

## 1. Nguyên tắc chọn màn hình

Mỗi màn được chấm theo 4 câu hỏi. Đạt từ 3/4 thì vào v1.

| # | Tiêu chí | Ý nghĩa |
|---|---|---|
| 1 | **Kích hoạt bởi thông báo?** | Có noti → mở app → làm xong trong 30 giây |
| 2 | **Làm khi rời bàn làm việc?** | Trên xe, trong thang máy, giữa hai cuộc họp |
| 3 | **Ít nhập liệu?** | Đọc nhiều, bấm ít. Không có form dài, không bảng nhiều cột |
| 4 | **Một quyết định dứt khoát?** | Duyệt/từ chối, nhận/không nhận, xác nhận/đổi giờ |

Màn trượt tiêu chí không phải là màn "kém quan trọng" — nó là màn **thuộc về web**. Việc
phân định này là một kết quả thiết kế, không phải một sự cắt xén vì thiếu thời gian.

---

## 2. Phạm vi v1 — 20 màn hình

### Nhóm A — Hạ tầng & dùng chung (6 màn)

| Mã | Màn hình | Vì sao hợp mobile |
|---|---|---|
| A1 | Đăng nhập | Bắt buộc |
| A2 | Đăng ký (ứng viên) | Ứng viên tìm việc trên điện thoại là hành vi phổ biến nhất |
| A3 | Xác minh email (OTP) | OTP ở app mail ngay trên máy — trên mobile còn tiện hơn web |
| A4 | Thông báo (cả 3 role) | Trái tim của app. Mọi deep link từ push đổ về đây |
| A5 | Quên mật khẩu | Bổ sung sau khi kiểm chứng backend: luồng chỉ cần OTP 6 số, KHÔNG có link email nên không cần deep link |
| A6 | Đặt lại mật khẩu (OTP + mật khẩu mới) | Đi liền với A5. Cùng khuôn với A3 nên gần như không tốn thêm thời gian |

### Nhóm B — Candidate (8 màn)

| Mã | Màn hình | Vì sao hợp mobile |
|---|---|---|
| B1 | Việc làm — danh sách + tìm kiếm | Lướt tin tuyển dụng là hành vi mobile điển hình |
| B2 | Chi tiết job + **nộp đơn** (bottom sheet) | Thấy job ưng → nộp ngay, không đợi về nhà mở máy |
| B3 | Đơn của tôi | Tra cứu nhanh "đơn tới đâu rồi" |
| B4 | Chi tiết đơn + dòng thời gian | Đọc nhiều, bấm ít — đúng chất mobile |
| B5 | Lịch phỏng vấn + xác nhận / chọn slot | ⭐ Nhận noti → bấm xác nhận. Ví dụ mẫu mực |
| B6 | Thư mời của tôi | Nhận noti "bạn có thư mời" |
| B7 | Chi tiết offer + PDF + đồng ý/từ chối | ⭐ Khoảnh khắc quan trọng nhất với ứng viên, và nó luôn xảy ra trên điện thoại |
| B8 | Hồ sơ & CV | Cần cho luồng nộp đơn; upload CV từ Google Drive/Files trên máy |

### Nhóm C — Hiring Manager (5 màn)

| Mã | Màn hình | Vì sao hợp mobile |
|---|---|---|
| C1 | **Việc cần tôi làm** (màn chính) | Gom 3 việc đang chờ HM. Mở app là thấy ngay phải làm gì |
| C2 | Lịch phỏng vấn + xác nhận / đề xuất đổi giờ | Nhận lịch từ HR → xác nhận ngay trên đường |
| C3 | Chi tiết ứng viên + xem CV *(dùng chung với HR)* | Đọc CV trên đường tới phòng phỏng vấn |
| C4 | **Form chấm đánh giá** ⭐⭐ | Lý do tồn tại của cả app. Phỏng vấn xong chấm luôn, không để quên |
| C5 | Nhu cầu tuyển — xem & sửa khi bị yêu cầu chỉnh sửa | Đọc lý do bị trả về, sửa vài trường, gửi lại |

### Nhóm D — HR / Recruiter (3 màn)

| Mã | Màn hình | Vì sao hợp mobile |
|---|---|---|
| D1 | **Hàng chờ duyệt** (màn chính) | Inbox của HR: requisition + offer đang chờ chữ ký |
| D2 | Chi tiết requisition + duyệt/từ chối/yêu cầu sửa | Quyết định một chạm |
| D3 | Chi tiết offer + duyệt *(duyệt = gửi luôn)* | ⭐ Một chạm của HR mở khóa cả bước tiếp theo cho ứng viên |

**HR chỉ có 3 màn là cố ý.** Công việc chính của HR — sàng lọc hàng loạt, kéo thả kanban,
so sánh ứng viên nhiều tiêu chí — đòi hỏi màn rộng. Đưa lên điện thoại là làm hỏng cả hai.
Mobile chỉ giữ phần HR bị kẹt: những chữ ký đang chặn người khác làm việc.

---

## 3. Những gì KHÔNG làm ở v1 — và vì sao

| Chức năng | Lý do loại | Thuộc về |
|---|---|---|
| Đăng nhập Google (OAuth2) | Cần `expo-auth-session` + redirect URI + cấu hình backend | v2 |
| **Tạo requisition mới** | Form dài nhất hệ thống: vị trí, số lượng, kỹ năng, lý do, ưu tiên, lương. Nhập trên điện thoại là cực hình | Web |
| Danh sách ứng viên của HR + đổi stage | Danh sách dài, nhiều bộ lọc, thao tác hàng loạt | Web |
| Quản lý tin tuyển dụng (posting) | CRUD nặng, nhiều trường | Web |
| So sánh ứng viên | Bảng nhiều cột, cần màn rộng để so sánh song song | Web |
| Dashboard biểu đồ | Đọc biểu đồ trên màn 6 inch dễ dẫn tới quyết định sai | Web |
| Masterdata, audit log, quản lý người dùng | Không bao giờ nên lên mobile | Web |
| Realtime WebSocket (STOMP/SockJS) | `sockjs-client` chạy kém trên RN. Thay bằng push + refetch khi app vào foreground | Thay thế bằng push |
| Chế độ offline | Không nằm trong yêu cầu. Bản nháp đánh giá đã được lưu trên server sẵn | Không làm |

> **Đã đưa TRỞ LẠI phạm vi:** *Quên / đặt lại mật khẩu* từng bị loại ở bảng trên với lý do
> "luồng đi từ link email → cần deep link". Lý do đó **sai**: đối chiếu
> `auth-service/.../dto/request/ResetPasswordRequest.java` thì backend chỉ nhận
> `{ email, otpCode (đúng 6 chữ số), newPassword }` — không hề có link, không cần deep link.
> Làm trọn trong app, dùng lại đúng khuôn của A3. Đã làm thành A5 + A6.

**Để dành cho v2 nếu còn thời gian:** thêm lịch phỏng vấn vào lịch điện thoại
(`expo-calendar`) — backend đã có `GET /interviews/{id}/ics` nên việc này rẻ bất ngờ.

---

## 4. Stack công nghệ

### Lõi

| Thành phần | Lựa chọn | Lý do |
|---|---|---|
| Framework | **Expo SDK** (bản ổn định mới nhất) | Yêu cầu của đề bài; EAS Build ra APK không cần Android Studio |
| Điều hướng | **Expo Router** | File-based; deep link có sẵn — bắt buộc để push mở đúng màn |
| Ngôn ngữ | **TypeScript** (strict) | Type sinh từ OpenAPI chỉ có giá trị khi bật strict |
| Giao diện | **React Native Paper** (Material 3) | Có sẵn TextInput/Dialog/Snackbar/Chip/SegmentedButtons. Tiết kiệm thời gian nhất trong 4 tuần |
| Server state | **TanStack Query** | Cache, pull-to-refresh, retry khi mạng yếu, refetch khi app vào foreground |
| Client state | **Zustand** | Chỉ giữ auth state. Nhẹ hơn Redux nhiều |
| HTTP | **axios** | Port thẳng interceptor refresh token từ `frontend/src/services/axiosClient.ts` |
| Form | **react-hook-form + zod** | Giống hệt web — tư duy chuyển sang không mất thời gian học lại |
| Icon | **@expo/vector-icons** | Bổ sung ngày 2. SDK 57 không còn kèm gói này, mà React Native Paper cần nó cho `TextInput.Icon` và icon tab — thiếu thì icon không hiện. Thuần JS, không có native code nên **không phải build lại dev build** |
| Font | **@expo-google-fonts/be-vietnam-pro** + **expo-font** | Bổ sung khi đồng bộ giao diện với web. Web nạp Be Vietnam Pro từ Google Fonts; mobile phải dùng đúng bộ chữ đó nếu không nhìn ra hai sản phẩm khác nhau. Nạp lúc chạy, thuần asset → **không phải build lại dev build** |

### Native module — cài một lượt ở ngày 1

```
expo-secure-store      → lưu access/refresh token trong Keystore
expo-notifications     → push
expo-device            → thông tin thiết bị cho push token
expo-constants         → lấy EAS projectId
expo-document-picker   → chọn file CV
expo-file-system       → tải PDF/CV kèm header Authorization
expo-sharing           → mở PDF bằng app hệ thống
```

> **Quan trọng:** cài hết một lần rồi build dev build ngay. Mỗi lần thêm native module là
> một lần build lại, mỗi build xếp hàng 10–30 phút trên free tier.

### Công cụ

- `openapi-typescript` — sinh type từ springdoc của gateway
- EAS Build — dev build (tuần 1) và preview APK (tuần 4)
- ESLint + Prettier — lấy gần giống cấu hình của `frontend/`

### Cố ý KHÔNG dùng

| Không dùng | Vì sao |
|---|---|
| Redux Toolkit | Web đang dùng, nhưng TanStack Query + Zustand gọn hơn hẳn cho mobile |
| SockJS / STOMP | Chạy kém trên RN. Thay bằng push |
| NativeWind / Tamagui | Phải tự dựng component. Paper có sẵn, 4 tuần không đủ để tự dựng |
| Ant Design | Không có bản React Native |
| Thư viện bottom-sheet riêng | `Portal` + `Modal` của Paper đủ dùng |

---

## 5. Cấu trúc thư mục

```
mobile/
├── app/                          # Routes (Expo Router)
│   ├── _layout.tsx               # Nạp token → decode role → điều hướng
│   ├── (auth)/
│   │   ├── login.tsx             # A1
│   │   ├── register.tsx          # A2
│   │   ├── verify-email.tsx      # A3
│   │   ├── forgot-password.tsx   # A5
│   │   └── reset-password.tsx    # A6
│   ├── (candidate)/
│   │   ├── _layout.tsx           # Tabs: Việc làm · Đơn · Lịch PV · Hồ sơ
│   │   ├── jobs/index.tsx              # B1
│   │   ├── jobs/[id].tsx               # B2
│   │   ├── applications/index.tsx      # B3
│   │   ├── applications/[id].tsx       # B4
│   │   ├── interviews/index.tsx        # B5
│   │   ├── offers/index.tsx            # B6
│   │   ├── offers/[id].tsx             # B7
│   │   └── profile.tsx                 # B8
│   ├── (hm)/
│   │   ├── _layout.tsx           # Tabs: Việc cần làm · Lịch PV · Nhu cầu tuyển · Thông báo
│   │   ├── index.tsx                   # C1
│   │   ├── interviews/index.tsx        # C2
│   │   ├── evaluations/[interviewId].tsx   # C4 ⭐
│   │   └── requisitions/index.tsx, [id].tsx  # C5
│   ├── (hr)/
│   │   ├── _layout.tsx           # Tabs: Chờ duyệt · Thông báo
│   │   ├── index.tsx                   # D1
│   │   ├── requisitions/[id].tsx       # D2
│   │   └── offers/[id].tsx             # D3
│   ├── applications/[id].tsx     # C3 — dùng chung HM + HR
│   └── notifications.tsx         # A4 — dùng chung 3 role
│
├── src/
│   ├── api/
│   │   ├── client.ts             # axios + interceptor refresh token
│   │   ├── auth.ts  candidate.ts  recruitment.ts
│   │   └── application.ts  interview.ts  offer.ts  notification.ts
│   ├── types/generated/          # ⭐ sinh từ OpenAPI — KHÔNG sửa tay
│   ├── features/<domain>/        # hooks (useQuery/useMutation) + component nghiệp vụ
│   ├── components/ui/            # 3 màn mẫu + EmptyState/ErrorState/Skeleton/StatusChip
│   ├── store/authStore.ts
│   └── lib/                      # push.ts · storage.ts · download.ts · format.ts
│
├── CLAUDE.md                     # ⭐ viết TRƯỚC khi code màn đầu tiên
├── app.json  eas.json  .env.example
└── package.json
```

---

## 6. Quy ước code — nguồn để viết `mobile/CLAUDE.md`

Đây là phần quyết định chất lượng khi dùng AI. Không có nó, 20 màn sẽ ra 20 phong cách.

1. **Type chỉ lấy từ `src/types/generated/`.** Cấm khai báo tay interface của response
   backend. Nếu thiếu type → sinh lại từ OpenAPI, không tự viết.
2. **Mọi lần gọi API đi qua hook trong `src/features/<domain>/`.** Component không gọi
   axios trực tiếp.
3. **Mỗi màn danh sách phải có đủ 4 trạng thái:** loading (skeleton) · empty · error (kèm
   nút thử lại) · có dữ liệu. Không màn nào được để trắng.
4. **Mọi màn danh sách có pull-to-refresh.**
5. **Form dùng react-hook-form + zod.** Không dùng `useState` cho form.
6. **Không tự thêm thư viện mới** mà chưa ghi vào mục 4 của file này.
7. **Tiếng Việt cho toàn bộ chuỗi hiển thị.** Đặt tập trung, không rải rác trong component.
8. **Enum trạng thái luôn render qua `<StatusChip>`** — một chỗ duy nhất quyết định màu và
   nhãn tiếng Việt cho `InterviewStatus`, `OfferStatus`, `RequisitionStatus`.
9. **Lỗi API hiển thị bằng Snackbar**, không dùng `Alert.alert` (chặn luồng).
10. **Không bao giờ gọi `alert()` / `confirm()`.**

---

## 7. Hợp đồng API theo từng màn

Base URL: `http://<host>:8080` (API Gateway). Mọi request kèm `Authorization: Bearer <accessToken>`.

Ký hiệu: ✅ = đã đối chiếu trong source · ⚠️ = cần xác minh ở Phase 0.

### Nhóm A

| Màn | Endpoint | Ghi chú |
|---|---|---|
| A1 | `POST /api/auth/login` ✅ | Trả `{ accessToken, refreshToken }`. Role nằm trong JWT payload (`role`, `sub`, `email`, `departmentId`) |
| A1 | `POST /api/auth/refresh-token` ✅ | Port nguyên logic từ `axiosClient.ts:41` |
| A1 | `POST /api/auth/logout` ✅ | Gọi kèm xóa device token |
| A2 | `POST /api/auth/register` ✅ | `{ fullName, email, password, confirmPassword, phone? }` |
| A3 | `POST /api/auth/verify-email` ✅ | `{ email, otpCode }` · `POST /api/auth/resend-otp` |
| A5 | `POST /api/auth/forgot-password` ✅ | `{ email }`. CỐ Ý trả cùng một câu dù email có tồn tại hay không — giao diện không được khẳng định "đã gửi tới email của bạn" |
| A6 | `POST /api/auth/reset-password` ✅ | `{ email, otpCode, newPassword }`. `otpCode` phải khớp `\d{6}`; OTP lưu dạng băm bcrypt nên không tra được từ DB |
| — | `GET /api/auth/me` ✅ | Lấy `fullName`, `status`, `emailVerified` sau login |
| A4 | `GET /api/notification/notifications` ✅ | + `/unread-count`, `PATCH /{id}/read`, `PATCH /read-all` |
| A4 | Trường deep link trong notification ⚠️ | Web đã có deep link — cần xác minh tên trường để định tuyến |

### Nhóm B — Candidate

| Màn | Endpoint | Ghi chú |
|---|---|---|
| B1 | `GET /api/recruitment/public/jobs` ✅ | Công khai — xem được khi chưa đăng nhập |
| B2 | `GET /api/recruitment/public/jobs/{jobId}` ✅ | |
| B2 | `POST /api/application/applications` ⚠️ | Xác minh ứng viên tự nộp được qua endpoint này, hay có đường riêng |
| B3 | `GET /api/application/applications/my` ✅ | |
| B4 | `GET /api/application/applications/my/{id}` ✅ | |
| B5 | `GET /api/interview/interviews/my` ✅ | **Chỉ dành cho CANDIDATE** (`requireCandidate`) |
| B5 | `GET /api/interview/slots/my-pending` ✅ | Slot chờ ứng viên chọn |
| B5 | `PATCH /api/interview/interviews/{id}/confirm` ✅ · `POST /api/interview/slots/{id}/select` ✅ | |
| B6 | `GET /api/offer/offers/my` ✅ | |
| B7 | `GET /api/offer/offers/my/{id}` ✅ · `GET /api/offer/offers/{id}/pdf` ✅ | PDF trả `byte[]` — **phải tải bằng `expo-file-system` kèm header**, không mở bằng `Linking` |
| B7 | `PATCH /api/offer/offers/{id}/accept` · `/decline` ✅ | |
| B8 | `GET /api/candidate/me` ✅ · `PATCH /api/candidate/me` ✅ | |
| B8 | `POST /api/candidate/me/resume` ✅ | multipart. RN gửi `FormData` dạng `{ uri, name, type }` |

**Ứng viên chỉ nhìn thấy buổi phỏng vấn từ `HM_CONFIRMED` trở đi** (`InterviewStatus.visibleToCandidate()`).
Backend đã lọc sẵn, app không cần xử lý thêm — nhưng cần dịch `EVALUATION_PENDING` thành
**"Đã diễn ra"** để không lộ chuyện nội bộ đang chờ ai chấm điểm.

### Nhóm C — Hiring Manager

| Màn | Endpoint | Ghi chú |
|---|---|---|
| C1 | 3 query song song, **không cần endpoint mới**: | |
| | `GET /api/interview/interviews?interviewerId={me}&status=EVALUATION_PENDING` ✅ | Buổi đã diễn ra mà tôi chưa chấm |
| | `GET /api/interview/interviews?interviewerId={me}&fromDate=now` ✅ | Phỏng vấn sắp tới |
| | `GET /api/recruitment/requisitions?status=CHANGES_REQUESTED&assignedToMe=true` ✅ | Nhu cầu tuyển bị trả về |
| C2 | `GET /api/interview/interviews?interviewerId={me}&fromDate=&toDate=` ✅ | **KHÔNG dùng `/my`** — endpoint đó chỉ cho candidate |
| C2 | `PATCH /api/interview/interviews/{id}/hm-confirm` · `/hm-reject` · `/no-show` ✅ | `hm-reject` kèm giờ đề xuất → `HM_RESCHEDULE_PROPOSED` |
| C3 | `GET /api/application/applications/{id}` · `/{id}/summary` · `/{id}/history` ✅ | |
| C3 | `GET /api/candidate/candidates/cv-file/{fileName}` ✅ | Tải kèm header rồi mở bằng `expo-sharing` |
| C4 | `GET /api/masterdata/interview-criteria` ✅ | Danh sách tiêu chí chấm |
| C4 | `PUT /api/interview/interviews/{id}/evaluations/me` ✅ | **Lưu nháp — mọi trường đều tùy chọn.** Server đã hỗ trợ sẵn, không cần lưu local |
| C4 | `POST /api/interview/interviews/{id}/evaluations` ✅ | Nộp chính thức. Bắt buộc `overallRecommendation` + ít nhất 1 tiêu chí |
| C4 | `GET /api/interview/interviews/{id}/evaluations` ✅ | Đọc lại; `contentVisible=false` khi bài bị che |
| C5 | `GET /api/recruitment/requisitions?assignedToMe=true` ✅ | Trả `PageResponse` → cuộn vô hạn |
| C5 | `PUT /api/recruitment/requisitions/{id}` · `POST /{id}/submit` ✅ | Chỉ sửa & gửi lại, **không tạo mới** |

**Hợp đồng dữ liệu của form chấm đánh giá (C4)** — đã đối chiếu source:

```ts
// PUT .../evaluations/me  — nháp, mọi trường optional
// POST .../evaluations    — nộp, overallRecommendation + scores bắt buộc
{
  overallRecommendation: "STRONG_YES" | "YES" | "NO" | "STRONG_NO",
  generalComment?: string,
  salaryProposed?: number,   // đề xuất lương nằm NGAY TRONG form này
  salaryNote?: string,
  scores: [{ criteriaId: number, score: 1|2|3|4|5, comment?: string }]
}
```

> Vì `salaryProposed` đã nằm trong chính form đánh giá, **không cần màn "Đề xuất lương"
> riêng** — đây là một trong những lý do v1 giảm từ 26 xuống 20 màn mà không mất chức năng.

### Nhóm D — HR

| Màn | Endpoint | Ghi chú |
|---|---|---|
| D1 | `GET /api/recruitment/requisitions?status=PENDING_APPROVAL` ✅ | |
| D1 | `GET /api/offer/offers?status=PENDING_APPROVAL` ⚠️ | Xác minh tham số lọc của `GET /offers` |
| D2 | `GET /api/recruitment/requisitions/{id}` ✅ | |
| D2 | `POST /{id}/approve` · `/reject` · `/request-changes` ✅ | |
| D3 | `GET /api/offer/offers/{id}` ✅ · `GET /{id}/pdf` ✅ | |
| D3 | `PATCH /api/offer/offers/{id}/approve` · `/reject` ✅ | **Duyệt = gửi luôn cho ứng viên.** Giao diện phải nói rõ điều này trước khi bấm |

---

## 8. Thay đổi backend — đúng 4 việc

Tất cả nằm trong `notification-service`. Không đụng service nào khác.

`NotificationService.createAndPush()` đang inject sẵn `RealtimePushService` (WebSocket) và
`EmailNotificationService` (email). Push mobile là **kênh thứ ba, cắm vào đúng một chỗ đó**.

| # | Việc | Tệp |
|---|---|---|
| 1 | Migration bảng `device_token(id, user_id, expo_token UNIQUE, platform, created_at, last_seen_at)` | migration của notification-service |
| 2 | `POST /api/notification/device-tokens` (đăng ký sau login)<br>`DELETE /api/notification/device-tokens/{token}` (khi logout) | `NotificationController.java` |
| 3 | `MobilePushService` — gọi `POST https://exp.host/--/api/v2/push/send`, gửi kèm `data.deepLink`; xóa token khi Expo trả `DeviceNotRegistered` | tệp mới cạnh `RealtimePushService.java` |
| 4 | Gọi `mobilePushService.send(...)` trong `createAndPush()` | `NotificationService.java:64` |

Sau 4 thay đổi này, **cả 14 `NotificationType` hiện có tự động có push**. Ba loại đáng demo
nhất — và cả ba đã chạy sẵn qua RabbitMQ delay queue:

- `INTERVIEW_REMINDER` — nhắc trước giờ phỏng vấn
- `EVALUATION_INCOMPLETE_REMINDER` — nhắc HM chưa nộp đánh giá
- `OFFER_READY_FOR_CANDIDATE` — ứng viên có thư mời

> ⚠️ **Đây là phần AI dễ làm sai nhất trong cả dự án.** Code Java có convention riêng
> (cấu hình RabbitMQ, security, cách lấy actor). Đọc kỹ `RealtimePushService.java` và bắt
> chước đúng cấu trúc của nó, đừng tả một câu rồi để AI tự viết.
>
> Push phải được bọc try/catch: **lỗi push không bao giờ được làm hỏng luồng notification
> cũ của web.**

---

## 9. Lộ trình 4 tuần

### Tuần 1 — Nền móng + khởi động Candidate

| Ngày | Việc |
|---|---|
| 1 | Khởi tạo `mobile/`, Expo Router, cài **toàn bộ** native module một lượt, đẩy **EAS dev build** ngay (để nó xếp hàng). Viết `CLAUDE.md` |
| 1–2 | Sinh type từ OpenAPI cho 9 service. Kiểm tra spec sinh ra có sạch không |
| 2 | Auth: A1/A2/A3 · `expo-secure-store` · port interceptor · điều hướng theo role |
| 3–4 | **Ba màn mẫu**: list (B1) · detail (B4) · form (A2). Kèm EmptyState/ErrorState/Skeleton/StatusChip |
| 5–7 | B1 · B2 · B3 · B4 |

### Tuần 2 — Candidate hoàn chỉnh + Push

| Ngày | Việc |
|---|---|
| 8–9 | B5 (lịch PV, xác nhận, chọn slot) |
| 10–11 | B6 · B7 — **làm sớm phần tải PDF kèm header**, đây là chỗ kỹ thuật dễ vướng nhất |
| 12 | B8 (hồ sơ + upload CV từ `expo-document-picker`) |
| 13–14 | **Backend push** (4 việc ở mục 8) + đăng ký token phía client + A4 + deep link |

> 🎯 **Mốc an toàn — cuối tuần 2 đã demo được một vòng hoàn chỉnh kèm push.**
> Nếu hai tuần sau có đổ vỡ gì thì vẫn còn bài để nộp.

### Tuần 3 — HM + HR

| Ngày | Việc |
|---|---|
| 15–16 | C1 (việc cần tôi làm) · C2 (lịch PV + xác nhận) |
| 17 | C3 (chi tiết ứng viên + xem CV) |
| 18–19 | **C4 — form chấm đánh giá.** Đầu tư nhiều nhất vào màn này |
| 20 | C5 (requisition: xem + sửa + gửi lại) |
| 21 | D1 · D2 · D3 |

### Tuần 4 — Đóng gói

| Ngày | Việc |
|---|---|
| 22–23 | Rà lại loading/empty/error toàn bộ 20 màn · pull-to-refresh · xử lý mất mạng |
| 24 | Build **preview APK**, cài lên máy thật, test toàn bộ luồng |
| 25 | Kịch bản demo + phương án mạng dự phòng + dữ liệu mẫu |
| 26–28 | **Buffer + viết báo cáo.** Đừng lấp kín — buffer này sẽ được dùng |

---

## 10. Checklist Phase 0 (ngày 1)

- [ ] `npx create-expo-app mobile` + bật TypeScript strict
- [ ] Cài **một lượt** 7 native module ở mục 4
- [ ] `eas build --profile development --platform android` → chạy nền
- [ ] Bật toàn bộ backend, xác minh `http://<IP-LAN>:8080/api/auth/v3/api-docs` mở được **từ điện thoại**
- [ ] `openapi-typescript` cho 9 service → `src/types/generated/`
- [ ] Viết `mobile/CLAUDE.md` từ mục 6
- [ ] Tạo tài khoản mẫu đủ 3 role, chạy trước một vòng nghiệp vụ trên web để có dữ liệu thật
- [ ] Xác minh 4 mục ⚠️ ở mục 14

---

## 11. Định nghĩa "một màn đã xong"

Màn chỉ được tính là xong khi đủ cả 7:

1. Hiển thị đúng dữ liệu thật từ backend (không phải dữ liệu giả)
2. Có skeleton khi đang tải
3. Có trạng thái rỗng kèm câu dẫn việc, không để màn trắng
4. Có trạng thái lỗi kèm nút thử lại
5. Danh sách có pull-to-refresh
6. Đã chạy thử **trên máy thật**, không phải chỉ trên máy ảo
7. Chuỗi hiển thị đều bằng tiếng Việt

---

## 12. Rủi ro & phương án dự phòng

| Rủi ro | Mức | Xử lý |
|---|---|---|
| **Hôm bảo vệ mạng trường chặn, app trắng màn hình** | Cao | Chuẩn bị sẵn 3 lớp: bộ phát Wi-Fi riêng · tunnel (`cloudflared`/`ngrok`) · `API_BASE_URL` đọc từ `.env` để đổi trong 10 giây |
| Android chặn HTTP thường ở bản release | Cao | Bật `usesCleartextTraffic` trong `app.json` cho bản demo, hoặc dùng tunnel có HTTPS |
| Push không chạy trong Expo Go | Chắc chắn | Đã tính: dùng **development build** ngay từ ngày 1, không dùng Expo Go |
| EAS build xếp hàng lâu | Trung bình | Cài hết native module một lượt; build vào cuối ngày để nó chạy qua đêm |
| AI bịa tên trường của response | Cao | Sinh type từ OpenAPI ngay ngày 1 — đây là biện pháp phòng ngừa quan trọng nhất |
| Sửa `NotificationService` làm hỏng web | Trung bình | Push là kênh cộng thêm, bọc try/catch, lỗi push không được làm hỏng luồng cũ |
| Refresh token đá nhau giữa web và mobile | Trung bình | Xác minh ở Phase 0 xem token có bị xoay vòng / dùng một lần không |
| Làm không kịp 20 màn | Trung bình | Thứ tự cắt: C5 → D3 → B8 → gộp B6 vào B7 |

---

## 13. Kịch bản demo (5 phút)

1. **Ứng viên** mở app, lướt tin tuyển dụng, mở một job, nộp đơn kèm CV chọn từ điện thoại.
2. **HR** (máy khác) tạo lịch phỏng vấn trên web → **điện thoại HM kêu push**.
3. **HM** mở từ push → xác nhận tham gia → **điện thoại ứng viên kêu push**.
4. **Ứng viên** xác nhận sẽ tham dự.
5. Buổi PV chuyển sang đã diễn ra → **HM nhận push "chưa nộp đánh giá"** → mở app, chấm điểm từng tiêu chí, đề xuất lương, nộp.
6. HR tạo offer trên web → **HR duyệt ngay trên điện thoại** (duyệt = gửi luôn).
7. **Ứng viên nhận push "bạn có thư mời"** → mở xem PDF → bấm đồng ý.
8. Quay lại web: hồ sơ đã tự chuyển sang `HIRED`.

Kịch bản này chạm đủ cả 3 role, cả 3 loại push, và khép trọn vòng nghiệp vụ.

---

## 14. Cần xác minh trước khi code (4 mục ⚠️)

| # | Cần kiểm tra | Ảnh hưởng nếu sai |
|---|---|---|
| 1 | Ứng viên tự nộp đơn qua `POST /api/application/applications` được không, hay có đường riêng | B2 — màn cốt lõi của Candidate |
| 2 | Tên trường deep link trong `NotificationResponse` | A4 + toàn bộ định tuyến từ push |
| 3 | `GET /api/offer/offers` nhận tham số lọc nào | D1 |
| 4 | Refresh token có bị xoay vòng / dùng một lần không | Đăng nhập web + mobile cùng lúc |

---

## 15. Nhật ký quyết định

Ghi lại để trả lời vấn đáp — câu "tại sao" được hỏi nhiều hơn câu "code này làm gì".

| Quyết định | Lý do |
|---|---|
| Một app duy nhất, rẽ nhánh theo role | 3 app = 3 lần cấu hình build, 3 lần ký APK, không thêm giá trị nào cho đồ án |
| Expo Router thay React Navigation thuần | Deep link có sẵn theo cấu trúc tệp — bắt buộc để push mở đúng màn |
| Token trong `expo-secure-store` thay `AsyncStorage` | Vào Android Keystore, không nằm dạng chữ thường trên máy |
| HR chỉ có 3 màn | Việc chính của HR cần màn rộng. Mobile chỉ giữ phần đang chặn người khác |
| Không làm tạo requisition trên mobile | Form dài nhất hệ thống |
| Bỏ WebSocket, dùng push | `sockjs-client` chạy kém trên RN; push mới là cái người dùng thật sự cần |
| Push cắm vào `createAndPush()` | Một điểm chèn duy nhất, 14 loại thông báo tự động có push, không đụng business logic |
| TanStack Query thay Redux Toolkit | Web dùng RTK, nhưng mobile cần cache + retry + refetch — Query làm sẵn |
| Không làm endpoint tổng hợp "my tasks" | Đã kiểm tra: 3 query có sẵn là đủ, tiết kiệm được một thay đổi backend |
| Không có màn "đề xuất lương" riêng | `salaryProposed` đã nằm trong chính `EvaluationSubmitRequest` |

---

## Câu hỏi chờ duyệt

1. 20 màn này đã đúng mức bạn muốn chưa, hay cần cắt/thêm gì?
2. Danh sách "không làm ở v1" (mục 3) có điểm nào giáo viên sẽ hỏi vặn không?
3. Tuần 4 chừa 3 ngày buffer — có đủ cho việc viết báo cáo của bạn không?
