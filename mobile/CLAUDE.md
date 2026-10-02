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
- `PATCH /candidate/me` tuy là PATCH nhưng **GHI ĐÈ TOÀN BỘ** hồ sơ, kể cả `skillIds` (xóa hết rồi
  gắn lại). Luôn gửi đủ mọi trường đang có — gửi thiếu `skillIds` là mất hết kỹ năng.
- Khung giờ PV: ứng viên chỉ gọi `POST /interview/slots/{id}/confirm {available}` để báo rảnh.
  `/slots/{id}/select` (chốt giờ) CHỈ HR gọi được.
- `CandidateInterviewResponse` KHÔNG có tên vị trí → ghép từ `GET /application/applications/my`
  theo `applicationId`. Đơn cũng không có lịch sử từng vòng, chỉ có vòng hiện tại.
- Từ chối offer bắt buộc `declineReasonId`, lấy từ `GET /masterdata/rejection-reasons` (giống web).
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
- Icon tab dùng `<Icon>` của `src/components/ui/icon.tsx` (react-native-svg), không dùng `Icon`
  của Paper: Paper nhận `color?: string` còn Tabs truyền `ColorValue`.

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

**Xem thử trên trình duyệt** (`npx expo start --web`, không cần build APK) — chỉ để xem
giao diện, không thay được điều kiện 6 (máy thật):
- Cổng 8081 là của **auth-service**, nên Expo web tự nhảy sang cổng khác (8088…). Gateway đã
  cho phép mọi `http://localhost:<cổng>` qua `allowedOriginPatterns` — đổi CORS thì nhớ
  khởi động lại gateway.
- `src/config.ts` lấy hostname của trang làm địa chỉ gateway; `src/lib/storage.ts` dùng
  sessionStorage thay SecureStore (SecureStore không có bản web).

## Bàn phím che ô nhập — đừng lặp lại

`KeyboardAvoidingView` với `behavior={Platform.OS === "ios" ? "padding" : undefined}` là
**sai**: trên Android `behavior` thành `undefined` nên component không làm gì, bàn phím che
mất ô đang nhập. Đặt `behavior="padding"` cho **cả hai** nền tảng.

Không sợ đệm thừa trên Android: RN tính phần **chồng lấn thật**
(`frame.y + frame.height - keyboardY`), nên khi cửa sổ đã tự co theo `adjustResize` thì kết
quả ra 0. Mọi màn có ô nhập phải bọc trong `AuthScaffold` hoặc dùng lại đúng cấu hình đó,
kèm `keyboardShouldPersistTaps="handled"` để bấm nút một lần là ăn.

**Màn có ô nhập KHÔNG căn giữa theo chiều dọc** (`justifyContent: "center"`): bàn phím mở
làm vùng nhìn thấy thấp lại, nội dung bị căn lại → giao diện "dồn". Căn từ trên xuống.
Thanh tab đặt `tabBarHideOnKeyboard: true` (trong `useTabScreenOptions`).

**Cuộn không được đóng bàn phím**: dùng `keyboardDismissMode="none"`, KHÔNG dùng `"on-drag"`
(người dùng đã phản ánh: đang gõ, cuộn xem ô khác thì bàn phím tự mất). Muốn đóng thì chạm
vào chỗ trống — `keyboardShouldPersistTaps="handled"` đã lo việc đó.

## Giao diện — theo canvas thiết kế, KHÔNG theo web

Chốt ngày 29/09/2026: giao diện mobile lấy từ canvas **"ATS TechCorp — HarmonyOS redesign"**
(https://claude.ai/artifact/VRL7ymmJTpk91Huko9VXk1), trang **Mobile, artboard M01–M20**.
Artboard `Main` là bảng màu + mẫu chip/nút/ô nhập. **Web giữ nguyên Ant Design, không đồng
bộ ngược** — mobile và web cố ý trông khác nhau.

**Khu ỨNG VIÊN theo trang "Mobile v2" (N26–N36)** — chốt 02/10/2026. Màn auth, HR, HM vẫn theo
trang "Mobile" (M01–M05, M15–M20). Quy tắc khi làm theo v2:
- Tính năng v2 có mà backend KHÔNG có thì **bỏ hẳn, không vẽ nút chết**: đăng nhập bằng link
  email (N02), tin nhắn (N33), lưu tin ⭐, AI tự điền + các ô họ tên/lương mong muốn (N28),
  chữ ký điện tử (N34), "bước tiếp theo" sau khi nhận việc (N36), gợi ý việc qua email (N35).
- Tab "Tin nhắn" thay bằng tab **Thông báo** → 5 tab: Việc làm · Hồ sơ · Lịch · Thông báo · Tôi.
- Màn đăng nhập GIỮ như M01 (không có tab Nhân viên/Ứng viên của N01).
- "Chọn giờ" (N31) chỉ là **báo rảnh**; nút ghi "Báo rảnh…", không ghi "Xác nhận…".
- "Dữ liệu & quyền riêng tư" (N35) = `POST /candidate/me/request-deletion` — backend xóa mềm
  NGAY, nên phải tích ô xác nhận và đăng xuất sau khi xóa.

**Phạm vi màn vẫn theo `docs/mobile/MOBILE_V1_PLAN.md`**, canvas chỉ quyết định giao diện.
Canvas có M15 (dashboard HR) và M17 (pipeline) — kế hoạch đã loại, đừng làm. Màn canvas
không vẽ (C3, C5, D2, D3) thì dựng bằng component chung bên dưới.

- Chỉ import token qua `@/theme`, đừng import thẳng file con.
- `src/theme/paper.ts` là chỗ DUY NHẤT nối token vào Paper. Màn hình không tự đặt màu.
- Chỉ có giao diện SÁNG (`app.json` đặt `userInterfaceStyle: "light"`). Đừng thêm dark mode.
- Làm một màn: đọc đúng artboard của nó trong canvas trước, rồi ghép từ component chung.

Các con số đã chốt:

| Thứ | Giá trị | Token |
|---|---|---|
| Màu chính / chữ trên nền tonal | `#0E7A5F` / `#0A5C47` | `COLORS.primary` / `primaryDark` |
| Nền trang / thẻ | `#F1F3F5` / `#FFFFFF` | `COLORS.body` / `cardBg` |
| Nền ô nhập, chip / nút phụ | `#182431` 5% / 10% | `COLORS.fill` / `fillStrong` |
| Chữ chính / phụ / mờ | `#182431` · `#6B737B` · `#A3A7AD` | `textPrimary/Secondary/Muted` |
| Đỏ · cam · xanh lá · tím PV | `#FA2A2D` · `#FF7500` · `#00CB87` · `#8A2BE2` | `error/warning/success/interview` |
| Chữ đỏ | `#B91C1C` | `COLORS.errorText` |
| Font | Be Vietnam Pro 400/500/600/700 | `FONT.*` |
| Cỡ chữ | 10 · 12 · 13 · 14 nền · 15 · 16 · 18 · 20 · 24 · 30 | `FONT_SIZE.*` |
| Bo góc | 12 · 14 · 16 · 20 thẻ · 32 sheet · viên nhộng | `RADIUS.*` (`full` cho nút/ô/chip) |
| Nút chính, ô nhập | cao 44 | `SIZES.control` |
| Lề màn | 16 (danh sách) · 24 (auth) | `SPACING.page` / `pageAuth` |

Những chỗ mobile CỐ Ý khác canvas, đừng "sửa lại cho giống":

1. **Font Be Vietnam Pro**, không phải HarmonyOS Sans — chắc chắn đủ dấu tiếng Việt.
2. **Nút và ô nhập cao 44**, canvas vẽ 40 — vùng chạm tối thiểu. Chip/nút nhỏ 32 thì nới
   bằng `hitSlop`.
3. **Chữ phụ `#6B737B`** chứ không phải `#18243199` (60%) của canvas: bản canvas chỉ đạt 4.1:1
   trên nền xám. Tương tự chữ trên nút tonal dùng `primaryDark`/`errorText` thay cho
   `#0E7A5F`/`#FA2A2D` (4.4:1 và 3.2:1 — không đạt 4.5:1).
4. **Không gradient** cho nút AI. `expo-linear-gradient` là native module → build lại dev
   build. Dùng màu đặc.
5. **Font chọn độ đậm bằng TÊN FONT** (`FONT.bold`, `FONT.semibold`…), không dùng
   `fontWeight`. File font đã mang sẵn độ đậm; đặt cả hai khiến Android làm đậm thêm lần
   nữa, chữ bị dày bất thường.

**Icon**: bộ icon chép nguyên từ canvas trong `src/components/ui/icon.tsx`
(`react-native-svg`, nét 1.5). Thêm icon → lấy từ canvas trước. Không dùng
MaterialCommunityIcons cho giao diện mới.

**Tiêu đề màn**: không có thanh tiêu đề của navigator (`headerShown: false`). Mỗi màn tự vẽ
`<ScreenHeader>` — `large` (tiêu đề 30) cho màn tab, `compact` (nút quay lại + tiêu đề 20)
cho màn chi tiết. `ScreenHeader` tự cộng safe-area phía trên.

Component dùng chung (`src/components/ui/`):

| Component | Dùng cho | Canvas |
|---|---|---|
| `Icon` | mọi icon | tất cả |
| `PillButton` (`primary`/`tonal`/`danger`/`text`, `md`/`sm`), `IconButton` | nút | Main, M09, M10, M12 |
| `FormTextField` (ở `src/components/`) | ô nhập trong form, nhãn trên, `password`, `multiline` | M01–M05, M20 |
| `SearchField`, `FilterChips`, `SegmentedControl` | tìm/lọc ở client | M06, M08, M10 |
| `Card`, `CardTitle`, `IconTile`, `KeyValueRow`, `ListRow`, `InfoNote` | nội dung thẻ | M06–M14 |
| `StatusChip`, `Tag` | trạng thái (qua `src/lib/status.ts`), nhãn trung tính | Main, M06–M12 |
| `ScreenHeader`, `BottomActionBar` | đầu màn, thanh nút dính đáy | M06–M14 |
| `BottomSheet` | form trượt lên (nộp đơn, chấm đánh giá) | M20 |
| `AuthScaffold` (`leading`: `brand`/`back`/`{icon}`), `ResendRow`, `PromptLink` (ở `src/components/`) | 5 màn auth | M01–M05 |
| `FormOtpField` (ở `src/components/`) | ô OTP 6 số (một TextInput ẩn phủ 6 ô — dán/tự điền mã chạy sẵn) | M03, M05 |
| `RadioList` | chọn một trong sheet (nguồn tuyển dụng, lý do từ chối, học vấn), có sẵn loading/lỗi | M07, M12, M13 |
| `BrandMark` (`size`) | logo chữ "A" trên nền màu chính | M01, N26, N34 |
| `Checkbox` | ô "Tôi đồng ý…" trước hành động không hoàn tác | N34, N35 |
| `IconButton` `badge` | số chưa đọc trên nút chuông | M06 |
| `SnackbarProvider` / `useSnackbar()` | báo lỗi API, báo thành công (`notify(text, { label, onPress }?)`), sống qua chuyển màn | — |
| `QueryList` | **mọi màn danh sách** — gói sẵn 4 trạng thái + kéo để làm mới | — |
| `SkeletonList`, `EmptyState`, `ErrorState` | trạng thái (đã nằm trong `QueryList`) | — |

Hook dùng chung: `useNow()` (giờ hiện tại trong render — **đừng gọi `Date.now()` lúc render**, lint
`react-hooks/purity` chặn), `useSignOut()` (gọi logout + xóa cache query), `useCountdown()`.
Thông báo: định tuyến theo role ở `src/lib/notification-routes.ts` (mới có nhánh CANDIDATE); màn
dùng chung `NotificationsScreen` trong `src/features/notifications/`.

Màn chi tiết của một tab (`jobs/[id]`, `applications/[id]`…) khai báo `href: null` và ẩn thanh
tab (`tabBarStyle: { display: "none" }`) — canvas dùng thanh hành động dưới đáy thay cho tab.

Trạng thái enum → gọi hàm trong `src/lib/status.ts` (`stageStatus`, `interviewStatus`,
`offerStatus`, `requisitionStatus`, `postingStatus`) rồi trải vào `<StatusChip {...} />`.
Màn hình không tự chọn màu cho trạng thái.

Một view lặp ở **2 màn trở lên** mới tách thành component; chưa tới thì để tại chỗ.

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
