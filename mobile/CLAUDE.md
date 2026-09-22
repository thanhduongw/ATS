# ATS Mobile — Quy ước cho AI và cho người

> Quy ước chung về Expo/React Native (bản Expo sinh sẵn): xem [`AGENTS.md`](./AGENTS.md).
> Tài liệu này ưu tiên cao hơn AGENTS.md khi hai bên khác nhau.
> Một khác biệt đã biết: AGENTS.md nói route nằm ở `src/app/`; **dự án này để route ở `app/` (gốc), logic ở `src/`** theo mục 5 của `docs/mobile/MOBILE_V1_PLAN.md`.

## Bối cảnh
App Expo (React Native) cho hệ thống ATS. Backend là 9 Spring Boot service sau API Gateway tại
`EXPO_PUBLIC_API_BASE_URL`. App phục vụ 3 role: RECRUITER, HIRING_MANAGER, CANDIDATE.

## Quy tắc tuyệt đối
1. Type chỉ lấy từ `src/types/generated/` (qua `src/types/api.ts`). Cấm khai báo tay interface
   cho response backend. Thiếu type → `npm run gen:types`.
2. Mọi lần gọi API đi qua hook trong `src/features/<domain>/`. Component không import axios.
3. Mỗi màn danh sách có đủ 4 trạng thái: loading (Skeleton) · empty (EmptyState kèm câu dẫn việc)
   · error (ErrorState kèm nút thử lại) · có dữ liệu. Không màn nào để trắng.
4. Mọi màn danh sách có pull-to-refresh.
5. Form dùng react-hook-form + zod. Không dùng `useState` cho giá trị form.
6. Không thêm thư viện mới ngoài mục 4 của `docs/mobile/MOBILE_V1_PLAN.md`.
7. Toàn bộ chuỗi hiển thị bằng tiếng Việt, đặt tập trung ở `src/lib/strings.ts`.
8. Enum trạng thái luôn render qua `<StatusChip>`.
9. Lỗi API hiển thị bằng Snackbar, không dùng `Alert.alert`.
10. Không bao giờ gọi `alert()` / `confirm()`.
11. **Cấm hardcode màu, cỡ chữ, khoảng cách, bo góc, đổ bóng ở ngoài `src/theme/`.**
    Mọi giá trị hiển thị lặp lại lần thứ hai phải thành token. Giá trị một-lần thật sự thì
    để tại chỗ kèm comment nói rõ vì sao.

## Sự thật về backend — đã đối chiếu source, đừng đoán lại
- Refresh token dùng MỘT LẦN. `POST /auth/refresh-token` thu hồi token cũ, trả cặp mới. Phải lưu
  token mới, và phải single-flight để hai request không refresh song song.
- Notification KHÔNG có trường `deepLink`. Định tuyến suy từ `resourceType`
  ("REQUISITION" | "APPLICATION" | "INTERVIEW" | "OFFER") + `resourceId` + role. Bản web tương
  ứng: `frontend/src/features/notification/notificationRoutes.ts`.
- Ứng viên nộp đơn KHÔNG đính kèm file. Backend lấy CV từ hồ sơ. Chưa có CV → 400. Trường
  `recruitmentSourceId` là bắt buộc.
- `GET /recruitment/public/jobs` không có `keyword`, không phân trang. Tìm kiếm ở client.
- `GET /interview/interviews/my` CHỈ dành cho CANDIDATE. HM dùng
  `GET /interview/interviews?interviewerId={me}`.
- `GET /offer/offers` nhận: applicationId, jobPostingId, status, createdFrom, createdTo, page,
  size → trả `PageResponse`.
- Ứng viên chỉ thấy buổi PV từ `HM_CONFIRMED` trở đi (backend lọc sẵn). Hiển thị
  `EVALUATION_PENDING` cho ứng viên là "Đã diễn ra".
- Duyệt offer = gửi luôn cho ứng viên. Giao diện phải nói rõ trước khi bấm.
- `LoginResponse` CHỈ có `accessToken` + `refreshToken`, **KHÔNG có role**. Role nằm trong claim
  `role` của access token → giải mã bằng `jwt-decode` (xem `AccessTokenClaims` trong
  `src/types/api.ts`). Claim có: `sub` (userId, kiểu string), `email`, `role`, `departmentId`
  (chỉ có khi thuộc phòng ban), `iat`, `exp`.
- Role có đúng 4 giá trị: `COMPANY_ADMIN` | `RECRUITER` | `HIRING_MANAGER` | `CANDIDATE`.
  **Là `COMPANY_ADMIN`, không phải `ADMIN`.** Springdoc sinh `role?: string` nên TypeScript
  không tự chặn — dùng type `Role` trong `src/types/api.ts`.
- **Thân lỗi có HAI dạng khác nhau** — đã kiểm chứng trực tiếp trên backend:
  1. Lỗi nghiệp vụ → `{"message": "Email hoac mat khau khong chinh xac"}`
  2. Lỗi validation → khóa là **TÊN TRƯỜNG**, có thể nhiều trường cùng lúc:
     `{"fullName": "Full name is required", "email": "Email is invalid"}`

  `apiErrorMessage()` xử lý cả hai. Đừng viết chỗ khác chỉ đọc `data.message` — dạng 2 sẽ
  rơi vào câu chung chung và người dùng không biết sai ở đâu.
- `POST /auth/forgot-password` CỐ Ý trả cùng một câu dù email có tồn tại hay không, để không
  lộ email nào đã đăng ký. Giao diện **không được** khẳng định "đã gửi tới email của bạn" —
  phải nói "nếu email tồn tại…".
- `POST /auth/reset-password` nhận `{ email, otpCode, newPassword }`, `otpCode` phải khớp
  `\d{6}` (đúng 6 chữ số). Không có link email nên **không cần deep link**. OTP lưu trong
  `password_reset_tokens` dạng **băm bcrypt** — không tra được mã thật từ DB, muốn test đầy
  đủ phải mở hộp thư.

## Tầng auth (ngày 2) — đọc trước khi sửa
- Token nằm trong SecureStore qua `src/lib/storage.ts`. Không đổi sang AsyncStorage.
- `src/api/client.ts` là nơi DUY NHẤT gọi `/auth/refresh-token`, và phải gọi bằng instance
  `bare`. Gọi bằng `apiClient` sẽ để interceptor bắt lại chính nó → đệ quy vô hạn.
- `refreshPromise` là single-flight. **Đã kiểm chứng trên backend thật**: dùng lại refresh
  token cũ trả về 400 "Refresh token da het han hoac bi thu hoi". Bỏ single-flight = đăng
  xuất oan khi hai request cùng hết hạn.
- `LoginResponse.accessToken` là optional trong type sinh ra (record Java không có @NotNull).
  Dùng `requireTokens()` để chặn, đừng dùng `!`.
- Điều hướng theo role chỉ sửa ở `src/lib/routes.ts` (`homeForRole`). AuthGate trong
  `app/_layout.tsx` phải chờ `hydrated` và phải coi `/` (segments rỗng) là nơi cần đẩy đi,
  nếu không người đã đăng nhập mở app lên sẽ kẹt ở màn chờ.
- Icon tab dùng `@expo/vector-icons/MaterialCommunityIcons`, không dùng `Icon` của Paper:
  Paper nhận `color?: string` còn Tabs truyền `ColorValue`.

## Bẫy môi trường chạy — đã mất thời gian một lần, đừng mất lần hai

**Spring Boot KHÔNG tự đọc file `.env`.** Không service nào trong repo có thư viện dotenv.
Chạy bằng `mvnw spring-boot:run` thì `MAIL_USERNAME` / `MAIL_PASSWORD` (auth, notification)
và `AWS_*` (candidate) **không bao giờ đến được ứng dụng** → gửi mail và upload CV hỏng
**âm thầm**, vì `MailService.send()` bắt hết exception và chỉ ghi `log.warn`.

Đã xử lý bằng `run-service.bat` ở thư mục gốc: nạp `.env` của service rồi mới chạy
`mvnw`. `start-backend.bat` gọi qua file này. **Phải dùng `start-backend.bat` để khởi động**,
đừng chạy `mvnw spring-boot:run` tay.

Khi gỡ lỗi mail: đặt `MAIL_LOG_OTP_ON_FAILURE=true` trong `auth-service/.env` thì OTP hiện
ngay ở console lúc gửi mail thất bại. Chỉ dùng ở máy dev.

## Bàn phím che ô nhập — đừng lặp lại

`KeyboardAvoidingView` với `behavior={Platform.OS === "ios" ? "padding" : undefined}` là
**sai**: trên Android `behavior` thành `undefined` nên component không làm gì, bàn phím che
mất ô đang nhập. Đặt `behavior="padding"` cho **cả hai** nền tảng.

Không sợ đệm thừa trên Android: RN tính phần **chồng lấn thật**
(`frame.y + frame.height - keyboardY`), nên khi cửa sổ đã tự co theo `adjustResize` thì kết
quả ra 0. Mọi màn có ô nhập phải bọc trong `AuthScaffold` hoặc dùng lại đúng cấu hình đó,
kèm `keyboardShouldPersistTaps="handled"` để bấm nút một lần là ăn.

## Giao diện — phải đồng bộ với bản web

Mobile và web là **một sản phẩm**, nên dùng chung một bảng màu. Nguồn gốc là
`frontend/src/app/theme.ts` (Ant Design v6); `src/theme/` chỉ là bản port sang React Native
Paper, **giữ nguyên tên biến** (`COLORS`, `SPACING`, `RADIUS`, `SHADOWS`) để đối chiếu hai
codebase không phải dịch trong đầu.

- Chỉ import token qua `@/theme`, đừng import thẳng file con.
- `src/theme/paper.ts` là chỗ DUY NHẤT nối token vào Paper. Màn hình không tự đặt màu.
- Web đổi màu → sửa `src/theme/colors.ts` cho khớp, rồi mới sửa chỗ khác.
- Chỉ có giao diện SÁNG, giống web (web không có dark mode, `app.json` đặt
  `userInterfaceStyle: "light"`). Đừng thêm dark mode nửa vời.

Các con số đã chốt, lấy từ web:

| Thứ | Giá trị | Nguồn bên web |
|---|---|---|
| Màu chính | `#0E7A5F` | `COLORS.primary` |
| Thanh tiêu đề | `#0B3B36` | `Layout.headerBg` |
| Nền trang | `#F0F2F5` | `body` |
| Nền thẻ / nền màn auth | `#FFFFFF` | `cardBg` · `.auth-form-side` |
| Chữ chính / phụ / mờ | `#111827` · `#6B7280` · `#9CA3AF` | `textPrimary/Secondary/Muted` |
| Lỗi / cảnh báo / thành công | `#DC2626` · `#F59E0B` · `#22C55E` | `error/warning/success` |
| Font | Be Vietnam Pro 400/500/600/700 | Google Fonts trong `index.html` |
| Cỡ chữ | 14 nền · 16 · 20 · 24 · 30 | `atsTheme.token.fontSize*` |
| Bo góc | 6 · 8 · 12 · 16 | `RADIUS` |
| Nút chính | cao 44 | `Button.controlHeightLG` |

Hai chỗ mobile CỐ Ý khác web, đừng "sửa lại cho giống":

1. **Không có gradient.** Web dùng `linear-gradient` ở hero và nút. `expo-linear-gradient`
   là native module → thêm vào là phải build lại dev build 10–30 phút. Dùng màu đặc
   `COLORS.header`. Web cũng ẩn hẳn hero ở màn hẹp nên khác biệt này không nhìn thấy.
2. **Font chọn độ đậm bằng TÊN FONT** (`FONT.bold`, `FONT.semibold`…), không dùng
   `fontWeight`. File font đã mang sẵn độ đậm; đặt cả hai khiến Android làm đậm thêm lần
   nữa, chữ bị dày bất thường.

Component dùng chung đã có: `AuthScaffold` (khung 5 màn auth), `FormTextField`
(react-hook-form + Paper + chỗ hiện lỗi), `PlaceholderScreen`, `sharedTabScreenOptions`
(tab bar và header chung cho cả 3 khu vực role). Một view lặp ở **2 màn trở lên** mới tách
thành component; chưa tới thì để tại chỗ.

## Cấu trúc
Xem mục 5 của `docs/mobile/MOBILE_V1_PLAN.md`. Route ở `app/`, logic ở `src/`.

## Lệnh hay dùng
```powershell
npx expo start --dev-client   # chạy app (KHÔNG dùng Expo Go — push không chạy từ SDK 53)
npm run gen:types             # sinh lại type khi backend đổi DTO
npm run typecheck             # tsc --noEmit
npm run lint
npx expo install <pkg>        # LUÔN dùng cái này thay cho npm install cho package Expo/RN
```

## Định nghĩa "màn đã xong"
7 điều kiện ở mục 11 của `docs/mobile/MOBILE_V1_PLAN.md`. Điều kiện 6 (chạy trên máy thật) không
được bỏ qua.
