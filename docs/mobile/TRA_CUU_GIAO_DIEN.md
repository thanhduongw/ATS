# Tra cứu nhanh khi vấn đáp — "đoạn này viết ở đâu, sửa thế nào?"

> Dùng khi giáo viên chỉ vào một chỗ trên app và yêu cầu: mở code ra, đổi màu / chiều cao /
> chữ. Số dòng ghi theo code ngày 01/10/2026 — code đổi thì số dòng xê dịch, nên **luôn tìm bằng
> Ctrl+Shift+F trước**, số dòng chỉ để đối chiếu.

---

## 0. Ba câu trả lời dùng cho hầu hết câu hỏi

1. **Màu, kích thước, bo góc, cỡ chữ KHÔNG viết rải trong màn hình.** Tất cả nằm ở
   `mobile/src/theme/` (gọi là *token*). Sửa một giá trị ở đó → mọi màn dùng nó đổi theo.
2. **Chữ tiếng Việt hiển thị KHÔNG viết trong màn hình.** Tất cả nằm ở
   `mobile/src/lib/strings.ts`, chia nhóm theo màn.
3. **Mỗi màn là một file trong `mobile/app/`**, đường dẫn file = đường dẫn màn
   (Expo Router). Ví dụ màn `/jobs/5` là file `app/(candidate)/jobs/[id].tsx`.

Lưu file là app trên điện thoại/trình duyệt **tự cập nhật sau 1–2 giây** (Fast Refresh), không cần
chạy lại. Nếu không thấy đổi: bấm `r` ở terminal đang chạy `npx expo start`.

---

## 1. Cách tìm một đoạn trên màn hình trong 10 giây

**Thấy một dòng chữ trên app** (ví dụ "Quên mật khẩu?"):

1. `Ctrl+Shift+F` → gõ đúng dòng chữ đó → ra `src/lib/strings.ts`, ví dụ dòng
   `forgot: "Quên mật khẩu?"` nằm trong nhóm `auth.login`.
2. `Ctrl+Shift+F` lần nữa → gõ tên khóa `S.forgot` (hoặc `login.forgot`) → ra màn đang dùng nó:
   `app/(auth)/login.tsx`.

**Biết tên màn** → `Ctrl+P` gõ tên file (bảng ở mục 2).

**Biết tên component** (ví dụ `PillButton`) → bấm vào tên trong code, nhấn `F12` để nhảy tới nơi
định nghĩa.

---

## 2. Bản đồ màn hình → file

Canvas = mã artboard trong bản thiết kế. Đường dẫn tính từ thư mục `mobile/`.

| Canvas | Màn | File màn hình | Đoạn đáng chú ý |
|---|---|---|---|
| M01 | Đăng nhập | `app/(auth)/login.tsx` | schema kiểm tra dòng 20 · gọi API dòng 53 · nút dòng 114 |
| M02 | Đăng ký ứng viên | `app/(auth)/register.tsx` | schema dòng 19 · nút dòng 130 |
| M03 | Xác minh email (OTP) | `app/(auth)/verify-email.tsx` | `RESEND_SECONDS = 60` dòng 16 |
| M04 | Quên mật khẩu | `app/(auth)/forgot-password.tsx` | |
| M05 | Đặt lại mật khẩu | `app/(auth)/reset-password.tsx` | `RESEND_SECONDS = 60` dòng 18 |
| M01–M05 | Khung chung 5 màn trên | `src/components/auth-scaffold.tsx` | logo, tiêu đề, nút quay lại, dòng cuối ghim đáy |
| M06 | Việc làm | `app/(candidate)/jobs/index.tsx` | chip lọc dòng 38 · tìm kiếm dòng 55 · thẻ tin `JobCard` dòng 116 |
| M07 | Chi tiết tin + nộp đơn | `app/(candidate)/jobs/[id].tsx` | thanh nộp đơn `ApplyBar` dòng 155 · xử lý "chưa có CV" dòng 200 |
| M08 | Đơn của tôi | `app/(candidate)/applications/index.tsx` | thẻ đơn `ApplicationCard` · thanh 4 chặng `PhaseStepper` |
| M09 | Chi tiết đơn | `app/(candidate)/applications/[id].tsx` | dòng thời gian `ProgressCard` |
| M10 | Lịch phỏng vấn | `app/(candidate)/interviews/index.tsx` | `InterviewCard`, thẻ chọn giờ `SlotsCard` |
| M11 | Thư mời | `app/(candidate)/offers/index.tsx` | `OfferCard` |
| M12 | Chi tiết thư mời | `app/(candidate)/offers/[id].tsx` | nút Nhận việc/Từ chối `RespondBar` |
| M13 | Hồ sơ + CV | `app/(candidate)/profile.tsx` | % hoàn thiện `completion` · `CvCard` · `InfoCard` |
| M13 | Sheet sửa hồ sơ | `src/features/profile/edit-profile-sheet.tsx` | |
| M14 | Thông báo | `src/features/notifications/notifications-screen.tsx` | dòng thông báo `NotificationRow` |
| — | Thanh tab dưới (ứng viên) | `app/(candidate)/_layout.tsx` | tên tab, icon tab |
| — | Kiểu thanh tab (cả 3 role) | `src/lib/tab-options.ts` | chiều cao dòng 29 |

**Gọi API ở đâu?** Màn hình không gọi API trực tiếp. Luồng luôn là:

```
Màn hình (app/...)  →  hook (src/features/<tên>/hooks.ts)  →  hàm API (src/features/<tên>/api.ts)
                    →  apiClient (src/api/client.ts)  →  API Gateway :8080  →  service Spring Boot
```

Ví dụ nộp đơn: `jobs/[id].tsx` gọi `useApply()` trong `src/features/applications/hooks.ts`, hook đó
gọi `applicationsApi.apply()` trong `src/features/applications/api.ts` → `POST /application/applications`.

---

## 3. Đổi MÀU — `src/theme/colors.ts`

| Muốn đổi | Khóa | Dòng | Giá trị hiện tại |
|---|---|---|---|
| Màu chính (nút, link, tab đang chọn, chip lọc đang chọn) | `primary` | 14 | `#0E7A5F` |
| Chữ xanh đậm trên nút phụ | `primaryDark` | 16 | `#0A5C47` |
| Nền xanh nhạt (ô icon, ô ngày PV) | `primarySoft` | 18 | `#0E7A5F19` |
| Nền trang (xám) | `body` | 22 | `#F1F3F5` |
| Nền thẻ (trắng) | `cardBg` | 24 | `#FFFFFF` |
| Nền ô nhập, chip chưa chọn | `fill` | 26 | `#1824310C` |
| Nền nút phụ | `fillStrong` | 28 | `#18243119` |
| Chữ chính | `textPrimary` | 35 | `#182431` |
| Chữ phụ (xám) | `textSecondary` | 40 | `#6B737B` |
| Đỏ (viền lỗi, chấm "Từ chối") | `error` | 51 | `#FA2A2D` |
| Chữ đỏ (nút Từ chối, câu lỗi dưới ô) | `errorText` | 53 | `#B91C1C` |
| Cam · xanh lá · tím phỏng vấn | `warning` · `success` · `interview` | 55 · 57 · 61 | |

**Màu của chip trạng thái** (chấm + nền nhạt): `STATUS_TONES`, dòng 69–74 cùng file.
**Trạng thái nào dùng màu nào** (ví dụ "Phỏng vấn" màu tím): `src/lib/status.ts` —
vòng tuyển dụng dòng 28 (`STAGE_TONE`), phỏng vấn dòng 54, thư mời dòng 80.

**Màu từng kiểu nút**: `src/components/ui/buttons.tsx` dòng 7–14 (`primary`, `tonal`, `danger`, `text`).

> Hex 8 chữ số như `#0E7A5F19`: 2 số cuối là độ trong suốt (`19` ≈ 10%). Đổi màu chính thì nhớ đổi
> cả `primarySoft` và nền chip `brand` dòng 70 cho cùng tông.

---

## 4. Đổi CHIỀU CAO / KÍCH THƯỚC — `src/theme/sizes.ts`

| Muốn đổi | Khóa | Dòng | Hiện tại | Ảnh hưởng |
|---|---|---|---|---|
| Chiều cao **nút chính** và **ô nhập** | `control` | 7 | 44 | mọi nút `md`, mọi ô nhập, ô tìm kiếm |
| Nút tròn (quay lại, chuông) | `iconButton` | 9 | 40 | |
| Thanh tab dưới | `tabBar` | 11 | 56 | (cộng thêm khoảng an toàn đáy máy) |
| Chip lọc, nút nhỏ | `chip` | 13 | 32 | |
| Chip trạng thái, tag | `tag` | 15 | 24 | |
| Ô icon đầu thẻ | `iconTile` | 17 | 44 | |
| Ô OTP | `otpWidth` / `otpHeight` | 19 / 20 | 48 / 56 | |

Ô nhập lấy chiều cao ở `src/components/form-text-field.tsx` dòng 123 (`height: SIZES.control`).
Nút lấy ở `src/components/ui/buttons.tsx` dòng 43.

**Bo góc** — `src/theme/radius.ts`: thẻ `xl = 20` (dòng 13), sheet `sheet = 32` (dòng 15),
nút/ô nhập `full` (viên nhộng).
**Khoảng cách** — `src/theme/spacing.ts`: lề màn danh sách `page = 16` (dòng 15), lề màn auth
`pageAuth = 24` (dòng 17).
**Cỡ chữ** — `src/theme/typography.ts`: tiêu đề lớn `h1 = 30` (dòng 51), chữ nền `base = 14`
(dòng 39), chữ trong ô nhập/nút `lg = 16` (dòng 43).

---

## 5. Đổi CHỮ / THÔNG TIN — `src/lib/strings.ts`

| Nhóm | Dòng | Dùng cho |
|---|---|---|
| `auth.login` / `register` / `verify` / `forgot` / `reset` | 38 / 51 / 65 / 76 / 83 | 5 màn auth |
| `auth.validation` | 27 | câu lỗi khi nhập sai (email sai, mật khẩu ngắn…) |
| `brand` | 16 | chữ "A", "ATS", "HỆ THỐNG TUYỂN DỤNG" ở màn đăng nhập |
| `jobs` / `jobDetail` | 124 / 136 | M06, M07 |
| `applications` / `applicationDetail` | 162 / 186 | M08, M09 (tên 4 chặng: `phases`) |
| `interviews` | 202 | M10 |
| `offers` / `offerDetail` | 225 / 235 | M11, M12 |
| `profile` | 271 | M13 |
| `notifications` | 306 | M14 |
| `tabs` | 319 | tên các tab dưới |
| `status` | 351 | nhãn trạng thái ("Chờ duyệt", "Đã xác nhận"…) |

---

## 6. Kịch bản hay bị hỏi — làm từng bước

Mỗi kịch bản: sửa → lưu → nhìn app đổi → **sửa xong nhớ trả lại** (Ctrl+Z rồi lưu, hoặc
`git checkout -- <file>`).

### 6.1. "Đổi màu nút Đăng nhập sang xanh dương"
- Cách đúng (đổi cả hệ thống): `src/theme/colors.ts` dòng 14 → `primary: "#2563EB"`.
  Nút, link, tab, chip đều đổi theo — **giải thích**: đây là lý do không hardcode màu.
- Chỉ riêng nút này: `app/(auth)/login.tsx` dòng 114, thêm `style={{ backgroundColor: "#2563EB" }}`
  vào `<PillButton …>`. (Nói rõ: đây là cách sửa tạm để demo; quy ước dự án cấm hardcode màu.)

### 6.2. "Tăng chiều cao ô nhập / nút lên 52"
`src/theme/sizes.ts` dòng 7 → `control: 52`. Mọi ô nhập và nút chính cao lên cùng lúc.

### 6.3. "Đổi chữ nút Đăng nhập thành Vào hệ thống"
`src/lib/strings.ts`, nhóm `auth.login` (dòng 38), dòng `submit: "Đăng nhập"`.
Chú ý: tiêu đề màn là khóa `title` — đổi `submit` thì chỉ nút đổi.

### 6.4. "Đổi màu chip trạng thái Phỏng vấn"
- Đổi màu tím chung: `colors.ts` dòng 61 `interview`.
- Cho vòng phỏng vấn dùng sắc khác (ví dụ cam): `src/lib/status.ts` dòng 28, đổi
  `TECHNICAL_INTERVIEW: "interview"` thành `"warning"`.

### 6.5. "Mật khẩu tối thiểu 10 ký tự thay vì 8"
`app/(auth)/register.tsx` dòng 19 (`schema`): `.min(8, …)` → `.min(10, …)`; sửa câu báo lỗi ở
`strings.ts` → `auth.validation.passwordMin`. **Lưu ý khi giải thích**: backend cũng kiểm
`@Size(min = 8)` — mobile chặn sớm để báo lỗi ngay tại ô, backend vẫn là chốt chặn cuối.

### 6.6. "Đổi thời gian chờ gửi lại OTP từ 60 giây xuống 30"
`app/(auth)/verify-email.tsx` dòng 16 và `app/(auth)/reset-password.tsx` dòng 18:
`RESEND_SECONDS = 30`. Đếm ngược chạy bằng hook `src/lib/use-countdown.ts`.

### 6.7. "Bo góc thẻ vuông hơn"
`src/theme/radius.ts` dòng 13 → `xl: 8`. Thẻ dùng nó ở `src/components/ui/surfaces.tsx` dòng 137.

### 6.8. "Đổi tên / icon tab dưới"
- Tên: `strings.ts` nhóm `tabs.candidate` (dòng 320).
- Icon: `app/(candidate)/_layout.tsx`, ví dụ `<Icon name="briefcase" …>` → `name="home"`. Danh sách
  tên icon có sẵn: `src/components/ui/icon.tsx` (biến `ICONS`).

### 6.9. "Thêm 1 dòng thông tin vào thẻ việc làm"
`app/(candidate)/jobs/index.tsx`, hàm `JobCard` (dòng 116). Dữ liệu có sẵn trong biến `job`
(kiểu `JobPostingResponse` — gõ `job.` để VS Code gợi ý các trường), ví dụ thêm
`<Text style={styles.sub}>{job.employmentTypeName}</Text>`.

### 6.10. "Đăng nhập xong vào màn nào, sửa ở đâu?"
`src/lib/routes.ts` dòng 4 (`homeForRole`). Ứng viên → `/(candidate)/jobs`. Việc tự chuyển màn
nằm ở `AuthGate`, `app/_layout.tsx` dòng 27.

---

## 7. Câu hỏi "tại sao" hay gặp — trả lời ngắn

| Câu hỏi | Trả lời | Xem ở |
|---|---|---|
| Token lưu ở đâu? | SecureStore (Keystore của Android), không phải AsyncStorage | `src/lib/storage.ts` |
| Token hết hạn thì sao? | Interceptor tự gọi refresh, **single-flight** vì refresh token chỉ dùng 1 lần | `src/api/client.ts` dòng 57, 96, 111 |
| Lỗi từ backend hiện thế nào? | `apiErrorMessage()` đọc 2 dạng lỗi của backend, hiện bằng Snackbar | `client.ts` dòng 140 · `src/components/ui/snackbar.tsx` |
| Nộp đơn có đính kèm CV không? | Không. Backend lấy CV trong hồ sơ; chưa có CV → báo lỗi kèm nút "Tải CV" | `jobs/[id].tsx` dòng 200 |
| Màn danh sách lúc tải / rỗng / lỗi? | Component `QueryList` lo đủ 4 trạng thái + kéo để làm mới | `src/components/ui/query-list.tsx` |
| Form kiểm tra dữ liệu bằng gì? | react-hook-form + zod (`schema` đầu mỗi màn) | `login.tsx` dòng 20 |
| Kiểu dữ liệu API lấy đâu ra? | Sinh tự động từ OpenAPI của backend (`npm run gen:types`), không khai tay | `src/types/generated/`, `src/types/api.ts` |
| Vì sao trông khác bản web? | Mobile theo canvas thiết kế HarmonyOS; quyết định ghi trong `mobile/CLAUDE.md` | `CLAUDE.md` mục "Giao diện" |

---

## 8. Tập dượt trước buổi vấn đáp (15 phút)

Làm thử mỗi kịch bản một lần, **có app đang chạy bên cạnh**:

- [ ] 6.1 đổi màu chính → thấy nút, tab đổi màu → trả lại
- [ ] 6.2 đổi chiều cao ô nhập → trả lại
- [ ] 6.3 đổi chữ nút → trả lại
- [ ] 6.6 đổi giây gửi lại OTP → trả lại
- [ ] Từ một dòng chữ bất kỳ trên app, dùng Ctrl+Shift+F tìm ra file màn trong < 10 giây
- [ ] Cuối cùng chạy `git status` trong `mobile/` — không còn file nào bị sửa sót
