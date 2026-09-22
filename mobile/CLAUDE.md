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
