# Tuần 1 — Nền móng + khởi động Candidate (Ngày 1–7)

> **Tài liệu gốc:** [`MOBILE_V1_PLAN.md`](./MOBILE_V1_PLAN.md) · **Phạm vi tuần này:** Phase 0, tầng auth, 3 màn mẫu, B1–B4
> **Đầu ra cuối tuần:** đăng nhập được bằng tài khoản thật · 4 màn Candidate chạy dữ liệu thật trên máy Android thật · dev build APK đã cài sẵn trên máy

---

## 0. Đọc trước khi bắt đầu

### 0.1. Kết quả xác minh 4 mục ⚠️ — ĐÃ XONG, không cần làm lại

Mục 14 của `MOBILE_V1_PLAN.md` liệt kê 4 điều cần xác minh. Cả 4 đã được đối chiếu trực tiếp
trong source của repo này. Kết quả:

| # | Câu hỏi | Kết luận | Bằng chứng trong source |
|---|---|---|---|
| 1 | Ứng viên tự nộp đơn qua `POST /api/application/applications` được không? | **ĐƯỢC.** Controller tự nhận biết role CANDIDATE rồi gọi `service.createForCandidate(actor, req)` | `application-service/.../ApplicationController.java:107-115` |
| 2 | Tên trường deep link trong `NotificationResponse`? | **KHÔNG CÓ trường `deepLink`.** Định tuyến suy ra từ `resourceType` + `resourceId` + role | `notification-service/.../dto/NotificationResponse.java` · `frontend/src/features/notification/notificationRoutes.ts` |
| 3 | `GET /api/offer/offers` nhận tham số lọc nào? | `applicationId`, `jobPostingId`, `status`, `createdFrom`, `createdTo`, `page`, `size` → trả `PageResponse` | `offer-service/.../OfferController.java:26-34` |
| 4 | Refresh token có bị xoay vòng / dùng một lần không? | **CÓ — dùng đúng MỘT LẦN.** `refreshToken()` set `revoked = true` cho token cũ rồi phát cặp mới | `auth-service/.../LoginService.java:68-87` |

**Ba hệ quả kỹ thuật bắt buộc phải tuân theo — đây là nguồn bug khó tìm nhất của cả dự án:**

1. **(Từ #4)** Mỗi lần refresh, mobile **phải ghi đè refresh token mới vào SecureStore ngay**.
   Giữ lại token cũ = lần refresh sau chắc chắn 401.
2. **(Từ #4)** Hai request cùng hết hạn token → hai lời gọi `/refresh-token` với **cùng một** raw
   token → cái thứ hai thấy `revoked = true` và **ném lỗi**, kéo theo đăng xuất oan. Bắt buộc phải
   có **single-flight** (một promise refresh dùng chung). Web đã làm trong
   `frontend/src/services/axiosClient.ts` — port nguyên logic sang.
3. **(Từ #4)** Mỗi lần login sinh **một dòng refresh_token riêng**, nên đăng nhập web và mobile
   cùng lúc **không đá nhau**. Chỉ đá nhau nếu hai client dùng chung một chuỗi token.

### 0.2. Ba phát hiện làm đổi thứ tự công việc trong tuần

Đây là điều tài liệu gốc chưa ghi, và nó ảnh hưởng trực tiếp tới lịch tuần 1–2.

**(a) B2 (nộp đơn) phụ thuộc cứng vào B8 (CV).** Trong `ApplicationService.create()`:

```java
String resumeUrl = candidateSelfApply
        ? candidate.cvFileUrl()          // ứng viên tự nộp → LẤY CV CÓ SẴN trong hồ sơ
        : (req.resumeUrl() != null ? req.resumeUrl() : candidate.cvFileUrl());
if (resumeUrl == null) {
    throw new BusinessException("Ứng viên chưa có CV, vui lòng tải CV lên trước khi ứng tuyển");
}
```

Ứng viên **không** đính kèm CV lúc nộp đơn — backend lấy CV đã có trong hồ sơ. Kế hoạch gốc xếp
B8 vào ngày 12, tức là tới tận tuần 2 mới có đường tải CV lên. Hai cách xử lý, chọn một:

- **Cách khuyến nghị (tài liệu này đi theo):** ngày 1 dùng **web** tải CV lên cho tài khoản ứng
  viên mẫu → B2 test được ngay trong tuần 1, B8 vẫn làm ở ngày 12 như kế hoạch.
- Cách thay thế: kéo B8 lên ngày 7, mất thêm một ngày của tuần 1.

Dù chọn cách nào, **màn B2 vẫn phải xử lý được lỗi "chưa có CV"** — hiện Snackbar kèm nút
"Tải CV lên" dẫn sang B8. Đây là tình huống thật của người dùng mới.

**(b) `POST /applications` bắt buộc `recruitmentSourceId`:**

```java
@NotNull(message = "Vui lòng chọn nguồn tuyển dụng") Long recruitmentSourceId
```

Màn B2 phải nạp `GET /api/masterdata/recruitment-sources` và cho ứng viên chọn ("Bạn biết tin
này từ đâu?"). Không gửi trường này = 400.

**(c) `GET /api/recruitment/public/jobs` KHÔNG có tham số tìm kiếm và KHÔNG phân trang:**

```java
public ResponseEntity<List<JobPostingResponse>> listOpenJobs(
        @RequestParam(required = false) Long employmentTypeId,
        @RequestParam(required = false) Long workLocationId)
```

→ Ô tìm kiếm của B1 là **lọc phía client** trên mảng đã tải về. Đừng phí thời gian đi tìm tham số
`keyword`; nó không tồn tại ở endpoint public.

---

## NGÀY 1 — Phase 0: dựng khung, đẩy build, sinh type

> **Mục tiêu cuối ngày:** `mobile/` chạy trên máy thật bằng dev build · `src/types/generated/` có
> type của 9 service · `mobile/CLAUDE.md` viết xong.
> **Thứ tự quan trọng:** bước 1.3 (đẩy EAS build) làm **sớm nhất có thể** vì nó xếp hàng 10–30 phút.

### Bước 1.1 — Khởi tạo dự án (20 phút)

```powershell
cd E:\ATS
npx create-expo-app@latest mobile --template blank-typescript
cd mobile
```

Bật TypeScript strict — sửa `tsconfig.json`:

```jsonc
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

> `noUncheckedIndexedAccess` khiến `arr[0]` có kiểu `T | undefined`. Hơi phiền lúc viết nhưng nó
> chặn đúng loại crash "undefined is not an object" mà RN hay gặp khi API trả mảng rỗng.

Cài Expo Router:

```powershell
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
```

Sửa `package.json` → `"main": "expo-router/entry"` (thay cho `node_modules/expo/AppEntry.js`).
Xóa `App.tsx`, tạo `app/_layout.tsx` tối thiểu:

```tsx
import { Stack } from "expo-router";

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

Thêm `scheme` vào `app.json` (bắt buộc cho deep link từ push ở tuần 2):

```jsonc
{
  "expo": {
    "name": "ATS Mobile",
    "slug": "ats-mobile",
    "scheme": "atsmobile",
    "version": "1.0.0",
    "orientation": "portrait",
    "android": {
      "package": "com.ats.mobile",
      "usesCleartextTraffic": true
    },
    "plugins": ["expo-router", "expo-secure-store", "expo-notifications"]
  }
}
```

> `usesCleartextTraffic: true` là bắt buộc — backend chạy `http://` trên LAN, Android 9+ chặn HTTP
> thường ở bản release. Đây là rủi ro số 2 trong mục 12 của kế hoạch; xử lý ngay ngày 1 để tuần 4
> không phải build lại.

### Bước 1.2 — Cài TOÀN BỘ native module một lượt (10 phút)

**Chỉ chạy đúng một lệnh này. Mỗi lần thêm native module sau đó là một lần build lại 10–30 phút.**

```powershell
npx expo install expo-secure-store expo-notifications expo-device expo-document-picker expo-file-system expo-sharing
```

Thư viện JS thuần (không cần build lại, nhưng cài luôn cho gọn):

```powershell
npm install axios @tanstack/react-query zustand react-native-paper react-hook-form zod @hookform/resolvers jwt-decode date-fns
npm install -D openapi-typescript eslint prettier
```

Đối chiếu mục 4 của kế hoạch gốc: đủ 7 native module + 7 thư viện lõi. **Nếu định thêm thư viện
nào khác, thêm NGAY BÂY GIỜ** và ghi vào mục 4 của kế hoạch gốc theo quy ước số 6.

### Bước 1.3 — Đẩy EAS dev build NGAY (15 phút thao tác + 10–30 phút chờ nền)

```powershell
npm install -g eas-cli
eas login
eas init                # sinh projectId, ghi vào app.json
eas build:configure
```

Sửa `eas.json`:

```jsonc
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    }
  }
}
```

```powershell
eas build --profile development --platform android
```

**Để nó chạy nền và đi làm bước tiếp theo.** Khi xong, EAS đưa link tải APK — cài lên máy Android
thật.

> **Vì sao dev build chứ không phải Expo Go:** push notification của Expo **không chạy trong Expo
> Go** từ SDK 53. Đây là rủi ro đã ghi ở mục 12. Dùng dev build từ ngày 1 nghĩa là tới tuần 2 làm
> push sẽ không phải làm lại gì.

### Bước 1.4 — Bật backend và mở được từ điện thoại (30 phút)

```powershell
cd E:\ATS
.\start-infrastructure.bat     # postgres + rabbitmq
.\start-backend.bat            # 9 service + gateway
```

Lấy IP LAN của máy dev:

```powershell
ipconfig | Select-String "IPv4"
```

Giả sử `192.168.1.10`. **Kiểm tra từ trình duyệt của ĐIỆN THOẠI** (không phải máy tính):

```
http://192.168.1.10:8080/api/auth/v3/api-docs
```

Phải thấy JSON. Nếu không:

| Triệu chứng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| Timeout | Windows Firewall chặn port 8080 | PowerShell as Admin: `New-NetFirewallRule -DisplayName "ATS Gateway" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow` |
| Connection refused | Gateway chỉ bind `localhost` | Thêm `server.address: 0.0.0.0` vào `api-gateway/src/main/resources/application.yml` |
| Điện thoại không thấy máy tính | Khác mạng / Wi-Fi bật AP isolation | Nối cùng Wi-Fi; nếu mạng trường chặn thì phát hotspot từ điện thoại, cho máy tính nối vào |

Tạo `mobile/.env`:

```
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:8080/api
```

và `mobile/.env.example` (commit file này, **không** commit `.env`):

```
EXPO_PUBLIC_API_BASE_URL=http://<IP-LAN-cua-may-dev>:8080/api
```

Tạo `src/config.ts`:

```ts
const raw = process.env.EXPO_PUBLIC_API_BASE_URL;
if (!raw) {
  throw new Error(
    "Thiếu EXPO_PUBLIC_API_BASE_URL. Tạo file mobile/.env theo mẫu .env.example."
  );
}
/** Base URL của API Gateway, ví dụ http://192.168.1.10:8080/api */
export const API_BASE_URL = raw.replace(/\/+$/, "");
```

> Ném lỗi ngay khi thiếu biến môi trường tốt hơn nhiều so với để app chạy rồi mọi request đều 404
> vào `undefined/auth/login`. Đây cũng là lớp phòng vệ cho rủi ro "đổi URL trong 10 giây" ở mục 12
> — đổi `.env` rồi reload là xong.

Thêm vào `.gitignore`: `.env`

### Bước 1.5 — Sinh type từ OpenAPI cho 9 service (45 phút)

Đường dẫn api-docs đã xác nhận trong `api-gateway/src/main/resources/application.yml`.
Tạo `mobile/scripts/gen-types.ps1`:

```powershell
param([string]$Base = "http://192.168.1.10:8080")

$svcs = @("auth","masterdata","recruitment","candidate","interview",
          "notification","dashboard","application","offer")

New-Item -ItemType Directory -Force "src/types/generated" | Out-Null
foreach ($s in $svcs) {
  Write-Host "Sinh type cho $s-service..."
  npx openapi-typescript "$Base/api/$s/v3/api-docs" -o "src/types/generated/$s.ts"
}
```

```jsonc
// package.json
"scripts": {
  "gen:types": "powershell -ExecutionPolicy Bypass -File ./scripts/gen-types.ps1"
}
```

```powershell
npm run gen:types
```

**Kiểm tra spec sinh ra có sạch không** — mở từng file, soi 3 thứ:

1. `paths` có đủ endpoint không (ví dụ `offer.ts` phải có `/api/offer/offers/my`).
2. Có chỗ nào ra `Record<string, never>` hoặc `unknown` không — dấu hiệu springdoc chưa mô tả được
   kiểu. Nếu rơi vào endpoint mình dùng thì phải vá thủ công ở `src/types/api.ts`.
3. Enum ra đúng union string không. `InterviewStatus` phải ra đủ 8 giá trị:
   `"SCHEDULED" | "HM_RESCHEDULE_PROPOSED" | "HM_CONFIRMED" | "CANDIDATE_CONFIRMED" | "EVALUATION_PENDING" | "COMPLETED" | "NO_SHOW" | "CANCELLED"`

Tạo `src/types/api.ts` làm chỗ rút gọn duy nhất, để component không phải viết
`paths["/api/..."]["get"]["responses"][200]...`:

```ts
import type { components as AuthC } from "./generated/auth";
import type { components as OfferC } from "./generated/offer";
import type { components as InterviewC } from "./generated/interview";
import type { components as ApplicationC } from "./generated/application";
import type { components as RecruitmentC } from "./generated/recruitment";
import type { components as CandidateC } from "./generated/candidate";
import type { components as NotificationC } from "./generated/notification";
import type { components as MasterDataC } from "./generated/masterdata";

export type LoginResponse        = AuthC["schemas"]["LoginResponse"];
export type UserProfileResponse  = AuthC["schemas"]["UserProfileResponse"];
export type JobPostingResponse   = RecruitmentC["schemas"]["JobPostingResponse"];
export type RequisitionResponse  = RecruitmentC["schemas"]["JobRequisitionResponse"];
export type CandidateApplication = ApplicationC["schemas"]["CandidateApplicationResponse"];
export type ApplicationResponse  = ApplicationC["schemas"]["ApplicationResponse"];
export type InterviewResponse    = InterviewC["schemas"]["InterviewResponse"];
export type EvaluationResponse   = InterviewC["schemas"]["EvaluationResponse"];
export type CandidateOffer       = OfferC["schemas"]["CandidateOfferResponse"];
export type OfferResponse        = OfferC["schemas"]["OfferResponse"];
export type CandidateSelf        = CandidateC["schemas"]["CandidateSelfResponse"];
export type NotificationResponse = NotificationC["schemas"]["NotificationResponse"];
export type InterviewCriteria    = MasterDataC["schemas"]["InterviewCriteriaResponse"];
```

> Tên schema có thể khác chút tùy springdoc sinh ra. **Mở file generated lấy đúng tên, đừng đoán.**
> Nếu một tên không tồn tại, TypeScript báo lỗi ngay tại đây — đúng mục đích: sai sót lộ ra ở một
> file, không rải rác khắp 20 màn.

### Bước 1.6 — Viết `mobile/CLAUDE.md` (30 phút)

Đây là bước quyết định chất lượng 20 màn còn lại. Nội dung lấy từ mục 6 của kế hoạch gốc, **cộng
thêm** những sự thật đã xác minh ở phần 0 của tài liệu này. Chép nguyên khối sau vào
`mobile/CLAUDE.md`:

```markdown
# ATS Mobile — Quy ước cho AI và cho người

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

## Cấu trúc
Xem mục 5 của `docs/mobile/MOBILE_V1_PLAN.md`. Route ở `app/`, logic ở `src/`.

## Định nghĩa "màn đã xong"
7 điều kiện ở mục 11 của `docs/mobile/MOBILE_V1_PLAN.md`. Điều kiện 6 (chạy trên máy thật) không
được bỏ qua.
```

### Bước 1.7 — Dữ liệu mẫu (30 phút)

Mở web (`frontend`), chuẩn bị đủ dữ liệu để cả tuần có cái mà test:

- [ ] Tài khoản **RECRUITER** — đăng nhập được
- [ ] Tài khoản **HIRING_MANAGER** — đăng nhập được, thuộc một phòng ban
- [ ] Tài khoản **CANDIDATE** — đã verify email
- [ ] **Tải CV lên cho tài khoản CANDIDATE qua web** ← bắt buộc, xem phần 0.2(a)
- [ ] Ít nhất **3 tin tuyển dụng `OPEN`** (khác phòng ban để test lọc)
- [ ] Masterdata: ít nhất **2 nguồn tuyển dụng** và **4 tiêu chí đánh giá phỏng vấn**
- [ ] Ghi email của 3 tài khoản mẫu vào `.env.example` dưới dạng comment

### ✅ Định nghĩa "ngày 1 đã xong"

- [ ] `npx expo start --dev-client` mở được app trên **máy Android thật**
- [ ] `src/types/generated/` có đủ 9 file, `npx tsc --noEmit` không lỗi
- [ ] Trình duyệt điện thoại mở được `http://<IP>:8080/api/auth/v3/api-docs`
- [ ] `mobile/CLAUDE.md` đã viết xong
- [ ] Dev build APK đã cài trên máy thật
- [ ] 3 tài khoản mẫu + CV + 3 job OPEN + masterdata đã sẵn sàng

### ⚠️ Bẫy ngày 1

| Bẫy | Dấu hiệu | Xử lý |
|---|---|---|
| Quên `scheme` trong `app.json` | Tuần 2 push không mở được app | Thêm ngay hôm nay, nó nằm trong build |
| Dùng Expo Go cho tiện | Tuần 2 push im lặng, không báo lỗi gì | Dev build từ đầu |
| Cài thiếu một native module | Phải build lại, mất 30 phút | Chạy đúng lệnh bước 1.2, không bỏ bớt |
| `.env` bị commit | Lộ IP nội bộ trong git | Thêm `.env` vào `.gitignore` ngay |

---

## NGÀY 2 — Tầng auth: axios, SecureStore, 3 màn A1/A2/A3, điều hướng theo role

> **Mục tiêu cuối ngày:** đăng nhập bằng tài khoản thật trên máy thật, app tự đưa đúng về khu vực
> của role; giết app rồi mở lại vẫn còn đăng nhập.

### Bước 2.1 — Lớp lưu trữ token (20 phút)

`src/lib/storage.ts`:

```ts
import * as SecureStore from "expo-secure-store";

const ACCESS = "ats.accessToken";
const REFRESH = "ats.refreshToken";

export const tokenStorage = {
  async save(accessToken: string, refreshToken: string) {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS, accessToken),
      SecureStore.setItemAsync(REFRESH, refreshToken),
    ]);
  },
  async read() {
    const [accessToken, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(ACCESS),
      SecureStore.getItemAsync(REFRESH),
    ]);
    return { accessToken, refreshToken };
  },
  async clear() {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS),
      SecureStore.deleteItemAsync(REFRESH),
    ]);
  },
};
```

> **Vì sao SecureStore chứ không phải AsyncStorage:** SecureStore đẩy giá trị vào Android Keystore.
> AsyncStorage để token dạng chữ thường trong SQLite của app — trên máy đã root là đọc được. Đây là
> một dòng trong nhật ký quyết định (mục 15), nên nhớ để trả lời vấn đáp.

### Bước 2.2 — Auth store bằng Zustand (25 phút)

`src/store/authStore.ts`:

```ts
import { create } from "zustand";
import { jwtDecode } from "jwt-decode";
import { tokenStorage } from "@/lib/storage";

export type UserRole = "COMPANY_ADMIN" | "RECRUITER" | "HIRING_MANAGER" | "CANDIDATE";

export interface JwtPayload {
  sub: string;          // userId
  email: string;
  role: UserRole;
  departmentId?: number | null;
  exp: number;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: JwtPayload | null;
  hydrated: boolean;                 // đã đọc xong SecureStore chưa
  setCredentials: (a: string, r: string) => Promise<void>;
  hydrate: () => Promise<void>;
  signOut: () => Promise<void>;
}

const decode = (token: string): JwtPayload | null => {
  try {
    return jwtDecode<JwtPayload>(token);
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  hydrated: false,

  async setCredentials(accessToken, refreshToken) {
    await tokenStorage.save(accessToken, refreshToken);
    set({ accessToken, refreshToken, user: decode(accessToken) });
  },

  async hydrate() {
    const { accessToken, refreshToken } = await tokenStorage.read();
    set({
      accessToken,
      refreshToken,
      user: accessToken ? decode(accessToken) : null,
      hydrated: true,
    });
  },

  async signOut() {
    await tokenStorage.clear();
    set({ accessToken: null, refreshToken: null, user: null });
  },
}));

/** Đọc trực tiếp, dùng trong interceptor (ngoài React). */
export const authState = () => useAuthStore.getState();
```

> `hydrated` là cờ quan trọng: trước khi đọc xong SecureStore, app **chưa biết** người dùng đã
> đăng nhập hay chưa. Điều hướng lúc đó sẽ nháy màn login rồi nhảy về — xấu và gây hiểu nhầm. Root
> layout phải chờ `hydrated === true`.

### Bước 2.3 — Axios client + refresh single-flight (60 phút — phần khó nhất của ngày)

`src/api/client.ts` — port từ `frontend/src/services/axiosClient.ts`, sửa 3 chỗ: đọc token từ
SecureStore thay vì Redux, không có `window.location`, **và lưu lại refresh token mới**:

```ts
import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "@/config";
import { authState } from "@/store/authStore";
import type { LoginResponse } from "@/types/api";

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const REFRESH_SKEW_MS = 30_000;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15_000,
});

/** Instance trần — dùng để gọi /refresh-token mà không bị interceptor bắt lại (tránh đệ quy). */
const bare = axios.create({ baseURL: API_BASE_URL, timeout: 15_000 });

let refreshPromise: Promise<string> | null = null;

const isExpiringSoon = (token: string): boolean => {
  const { user } = authState();
  if (!user?.exp) return true;
  return user.exp * 1000 <= Date.now() + REFRESH_SKEW_MS;
};

/**
 * Refresh có single-flight.
 * BẮT BUỘC: backend thu hồi refresh token cũ mỗi lần dùng (LoginService.refreshToken()),
 * nên hai lời gọi song song với cùng một raw token sẽ làm cái thứ hai chết.
 */
const refreshTokens = async (): Promise<string> => {
  if (refreshPromise) return refreshPromise;

  const { refreshToken, setCredentials, signOut } = authState();
  if (!refreshToken) {
    await signOut();
    throw new Error("Phiên đăng nhập đã hết hạn");
  }

  refreshPromise = bare
    .post<LoginResponse>("/auth/refresh-token", { refreshToken })
    .then(async (res) => {
      // Lưu CẢ HAI token mới. Giữ lại refresh token cũ = lần sau chắc chắn 401.
      await setCredentials(res.data.accessToken, res.data.refreshToken);
      return res.data.accessToken;
    })
    .catch(async (err) => {
      await signOut();
      throw err;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

// ===== Request interceptor: gắn token, refresh trước nếu sắp hết hạn =====
apiClient.interceptors.request.use(async (config) => {
  const { accessToken } = authState();
  if (!accessToken) return config;

  const token = isExpiringSoon(accessToken) ? await refreshTokens() : accessToken;
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ===== Response interceptor: 401 → refresh một lần rồi thử lại =====
apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      try {
        const token = await refreshTokens();
        original.headers.Authorization = `Bearer ${token}`;
        return apiClient(original);
      } catch (e) {
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  }
);

/** Rút thông điệp lỗi tiếng Việt mà backend trả về. */
export const apiErrorMessage = (e: unknown, fallback = "Có lỗi xảy ra, vui lòng thử lại"): string => {
  if (axios.isAxiosError(e)) {
    const data = e.response?.data as { message?: string; error?: string } | undefined;
    if (data?.message) return data.message;
    if (data?.error) return data.error;
    if (!e.response) return "Không kết nối được máy chủ. Kiểm tra lại mạng.";
  }
  return fallback;
};
```

> Ba điểm đáng nhớ để trả lời vấn đáp:
> **(1)** `bare` tồn tại để `/refresh-token` không bị chính interceptor bắt → tránh đệ quy vô hạn.
> **(2)** `refreshPromise` là single-flight — bắt buộc vì token dùng một lần.
> **(3)** Refresh chủ động ở request interceptor (trước khi hết hạn 30 giây) giúp tránh phần lớn
> vòng 401-rồi-thử-lại, tiết kiệm một round-trip trên mạng 3G yếu.

### Bước 2.4 — Module API auth (20 phút)

`src/api/auth.ts`:

```ts
import { apiClient } from "./client";
import type { LoginResponse, UserProfileResponse } from "@/types/api";

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<LoginResponse>("/auth/login", { email, password }).then((r) => r.data),

  register: (body: {
    fullName: string; email: string; password: string;
    confirmPassword: string; phone?: string;
  }) => apiClient.post("/auth/register", body).then((r) => r.data),

  verifyEmail: (email: string, otpCode: string) =>
    apiClient.post("/auth/verify-email", { email, otpCode }).then((r) => r.data),

  resendOtp: (email: string) =>
    apiClient.post("/auth/resend-otp", { email }).then((r) => r.data),

  me: () => apiClient.get<UserProfileResponse>("/auth/me").then((r) => r.data),

  logout: (refreshToken: string) =>
    apiClient.post("/auth/logout", { refreshToken }).then((r) => r.data),
};
```

### Bước 2.5 — Root layout: nạp token, chờ hydrate, điều hướng theo role (40 phút)

`app/_layout.tsx`:

```tsx
import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { PaperProvider } from "react-native-paper";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

/** Mỗi role có một khu vực riêng; đây là bản đồ duy nhất quyết định vào đâu. */
const homeForRole = (role?: string) => {
  switch (role) {
    case "CANDIDATE": return "/(candidate)/jobs";
    case "HIRING_MANAGER": return "/(hm)";
    case "RECRUITER":
    case "COMPANY_ADMIN": return "/(hr)";
    default: return "/(auth)/login";
  }
};

function AuthGate() {
  const { hydrated, user, hydrate } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => { void hydrate(); }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    const inAuthArea = segments[0] === "(auth)";

    if (!user && !inAuthArea) {
      router.replace("/(auth)/login");
    } else if (user && inAuthArea) {
      router.replace(homeForRole(user.role));
    }
  }, [hydrated, user, segments, router]);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider>
        <AuthGate />
      </PaperProvider>
    </QueryClientProvider>
  );
}
```

### Bước 2.6 — A1 Đăng nhập (45 phút)

`app/(auth)/login.tsx`:

```tsx
import { useState } from "react";
import { View, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { Button, Text, TextInput, Snackbar, HelperText } from "react-native-paper";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useRouter } from "expo-router";
import { authApi } from "@/api/auth";
import { apiErrorMessage } from "@/api/client";
import { useAuthStore } from "@/store/authStore";

const schema = z.object({
  email: z.string().min(1, "Vui lòng nhập email").email("Email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});
type FormValues = z.infer<typeof schema>;

export default function LoginScreen() {
  const router = useRouter();
  const setCredentials = useAuthStore((s) => s.setCredentials);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const res = await authApi.login(values.email.trim(), values.password);
      await setCredentials(res.accessToken, res.refreshToken);
      // AuthGate ở root layout sẽ tự đẩy sang khu vực đúng role.
    } catch (e) {
      setError(apiErrorMessage(e, "Đăng nhập thất bại"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.form}>
        <Text variant="headlineMedium" style={styles.title}>Đăng nhập</Text>

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <>
              <TextInput
                label="Email"
                mode="outlined"
                autoCapitalize="none"
                keyboardType="email-address"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={!!errors.email}
              />
              <HelperText type="error" visible={!!errors.email}>
                {errors.email?.message}
              </HelperText>
            </>
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <>
              <TextInput
                label="Mật khẩu"
                mode="outlined"
                secureTextEntry={!showPassword}
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={!!errors.password}
                right={
                  <TextInput.Icon
                    icon={showPassword ? "eye-off" : "eye"}
                    onPress={() => setShowPassword((v) => !v)}
                  />
                }
              />
              <HelperText type="error" visible={!!errors.password}>
                {errors.password?.message}
              </HelperText>
            </>
          )}
        />

        <Button
          mode="contained"
          onPress={handleSubmit(onSubmit)}
          loading={submitting}
          disabled={submitting}
          style={styles.submit}
        >
          Đăng nhập
        </Button>

        <Link href="/(auth)/register" asChild>
          <Button mode="text">Chưa có tài khoản? Đăng ký</Button>
        </Link>

        <Text variant="bodySmall" style={styles.hint}>
          Quên mật khẩu? Vui lòng đặt lại trên phiên bản web.
        </Text>
      </View>

      <Snackbar visible={!!error} onDismiss={() => setError("")} duration={4000}>
        {error}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "center" },
  form: { paddingHorizontal: 24 },
  title: { marginBottom: 24, textAlign: "center" },
  submit: { marginTop: 8, paddingVertical: 4 },
  hint: { marginTop: 24, textAlign: "center", opacity: 0.6 },
});
```

> Dòng "Quên mật khẩu? Đặt lại trên web" là **cố ý** — mục 3 của kế hoạch đã loại chức năng này
> khỏi v1. Nói thẳng ra trên giao diện tốt hơn nhiều so với để người dùng tìm mãi không thấy. Khi
> giáo viên hỏi "sao thiếu quên mật khẩu", màn hình đã tự trả lời.

### Bước 2.7 — A2 Đăng ký + A3 Xác minh OTP (50 phút)

`app/(auth)/register.tsx` — cùng khuôn với login, thêm `confirmPassword` và `phone`:

```ts
const schema = z
  .object({
    fullName: z.string().min(2, "Vui lòng nhập họ tên"),
    email: z.string().email("Email không hợp lệ"),
    phone: z.string().optional(),
    password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Mật khẩu nhập lại không khớp",
    path: ["confirmPassword"],
  });
```

Đăng ký thành công → chuyển sang màn OTP kèm email:

```ts
await authApi.register(values);
router.push({ pathname: "/(auth)/verify-email", params: { email: values.email } });
```

`app/(auth)/verify-email.tsx` — ô nhập OTP + nút gửi lại có đếm ngược 60 giây:

```tsx
const { email } = useLocalSearchParams<{ email: string }>();
const [seconds, setSeconds] = useState(60);

useEffect(() => {
  if (seconds <= 0) return;
  const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
  return () => clearTimeout(t);
}, [seconds]);

// Nút gửi lại
<Button disabled={seconds > 0} onPress={onResend}>
  {seconds > 0 ? `Gửi lại mã sau ${seconds}s` : "Gửi lại mã"}
</Button>
```

Verify xong → `router.replace("/(auth)/login")` kèm Snackbar "Xác minh thành công, mời đăng nhập".

> Đếm ngược không phải để làm đẹp: nó chặn người dùng bấm gửi lại liên tục làm backend gửi hàng
> loạt email. Một lần nữa, đây là loại chi tiết đáng nói khi bảo vệ.

### Bước 2.8 — Dựng khung 3 khu vực role (20 phút)

Tạo tạm 3 file layout để AuthGate có chỗ điều hướng đến (nội dung hoàn thiện dần các ngày sau):

`app/(candidate)/_layout.tsx`:

```tsx
import { Tabs } from "expo-router";
import { Icon } from "react-native-paper";

export default function CandidateLayout() {
  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen name="jobs/index" options={{ title: "Việc làm",
        tabBarIcon: ({ color, size }) => <Icon source="briefcase-search" color={color} size={size} /> }} />
      <Tabs.Screen name="applications/index" options={{ title: "Đơn của tôi",
        tabBarIcon: ({ color, size }) => <Icon source="file-document" color={color} size={size} /> }} />
      <Tabs.Screen name="interviews/index" options={{ title: "Lịch PV",
        tabBarIcon: ({ color, size }) => <Icon source="calendar-clock" color={color} size={size} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Hồ sơ",
        tabBarIcon: ({ color, size }) => <Icon source="account" color={color} size={size} /> }} />
      {/* Màn chi tiết không hiện trên tab bar */}
      <Tabs.Screen name="jobs/[id]" options={{ href: null, title: "Chi tiết tin" }} />
      <Tabs.Screen name="applications/[id]" options={{ href: null, title: "Chi tiết đơn" }} />
      <Tabs.Screen name="offers/index" options={{ href: null, title: "Thư mời" }} />
      <Tabs.Screen name="offers/[id]" options={{ href: null, title: "Chi tiết thư mời" }} />
    </Tabs>
  );
}
```

Tương tự `app/(hm)/_layout.tsx` và `app/(hr)/_layout.tsx` với tab tối thiểu, mỗi màn tạm thời chỉ
là một `<Text>` placeholder.

### ✅ Định nghĩa "ngày 2 đã xong"

- [ ] Đăng nhập tài khoản CANDIDATE → vào khu Việc làm
- [ ] Đăng nhập tài khoản HIRING_MANAGER → vào khu HM
- [ ] Đăng nhập tài khoản RECRUITER → vào khu HR
- [ ] Sai mật khẩu → Snackbar hiện đúng câu tiếng Việt của backend, không crash
- [ ] **Giết app hoàn toàn rồi mở lại → vẫn đăng nhập** (test SecureStore + hydrate)
- [ ] Tắt Wi-Fi → bấm đăng nhập → Snackbar "Không kết nối được máy chủ", không treo
- [ ] Đăng ký tài khoản mới → nhận OTP trong mail → verify → đăng nhập được
- [ ] `npx tsc --noEmit` sạch

### ⚠️ Bẫy ngày 2

| Bẫy | Hậu quả | Xử lý |
|---|---|---|
| Gọi `/refresh-token` bằng chính `apiClient` | Đệ quy vô hạn khi token hỏng | Dùng instance `bare` |
| Không lưu refresh token mới sau khi refresh | Lần refresh thứ hai luôn 401 | `setCredentials(accessToken, refreshToken)` — cả hai |
| Điều hướng khi chưa `hydrated` | Nháy màn login mỗi lần mở app | Chờ cờ `hydrated` |
| Dùng `useState` cho form | Vi phạm quy ước 5 trong CLAUDE.md | react-hook-form + zod |

---

## NGÀY 3 — Bộ component dùng chung + màn mẫu DANH SÁCH

> **Mục tiêu:** làm xong bộ 5 component mà **17 màn còn lại sẽ dùng lại**, và một màn danh sách
> mẫu hội đủ 4 trạng thái. Đây là ngày có đòn bẩy cao nhất của cả dự án — đầu tư ở đây đắt gấp bội.

### Bước 3.1 — Chuỗi tiếng Việt tập trung (25 phút)

`src/lib/strings.ts` — quy ước 7 nói "đặt tập trung, không rải rác":

```ts
export const COMMON = {
  retry: "Thử lại",
  loading: "Đang tải...",
  networkError: "Không kết nối được máy chủ. Kiểm tra lại mạng.",
  genericError: "Có lỗi xảy ra, vui lòng thử lại",
  cancel: "Hủy",
  confirm: "Xác nhận",
  save: "Lưu",
  submit: "Gửi",
} as const;

export const INTERVIEW_STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Chờ quản lý xác nhận",
  HM_RESCHEDULE_PROPOSED: "Quản lý đề xuất đổi giờ",
  HM_CONFIRMED: "Đã chốt giờ",
  CANDIDATE_CONFIRMED: "Ứng viên đã xác nhận",
  EVALUATION_PENDING: "Chờ đánh giá",
  COMPLETED: "Hoàn tất",
  NO_SHOW: "Vắng mặt",
  CANCELLED: "Đã hủy",
};

/**
 * Nhãn dành riêng cho ỨNG VIÊN. EVALUATION_PENDING với ứng viên là "Đã diễn ra" —
 * không lộ chuyện nội bộ đang chờ ai chấm điểm (xem InterviewStatus.visibleToCandidate()).
 */
export const INTERVIEW_STATUS_LABEL_CANDIDATE: Record<string, string> = {
  ...INTERVIEW_STATUS_LABEL,
  EVALUATION_PENDING: "Đã diễn ra",
  COMPLETED: "Đã diễn ra",
};

export const OFFER_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Nháp",
  PENDING_APPROVAL: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  SENT_TO_CANDIDATE: "Đã gửi ứng viên",
  ACCEPTED: "Ứng viên đồng ý",
  DECLINED: "Ứng viên từ chối",
  REJECTED: "Bị từ chối",
  EXPIRED: "Hết hạn",
  CANCELLED: "Đã hủy",
};

export const REQUISITION_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Nháp",
  PENDING_APPROVAL: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Bị từ chối",
  CHANGES_REQUESTED: "Yêu cầu chỉnh sửa",
  CLOSED: "Đã đóng",
};

export const RECOMMENDATION_LABEL: Record<string, string> = {
  STRONG_YES: "Rất nên tuyển",
  YES: "Nên tuyển",
  NO: "Không nên tuyển",
  STRONG_NO: "Nhất định không",
};
```

> **Đối chiếu lại tên enum với `src/types/generated/` trước khi chốt bảng này.** Nếu backend có
> giá trị mà bảng thiếu, `StatusChip` phải có nhánh dự phòng — xem bước 3.3.

### Bước 3.2 — Hàm định dạng (20 phút)

`src/lib/format.ts`:

```ts
import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";
import { vi } from "date-fns/locale";

const parse = (value?: string | null): Date | null => {
  if (!value) return null;
  const d = parseISO(value);
  return isValid(d) ? d : null;
};

export const formatDate = (value?: string | null) => {
  const d = parse(value);
  return d ? format(d, "dd/MM/yyyy", { locale: vi }) : "—";
};

export const formatDateTime = (value?: string | null) => {
  const d = parse(value);
  return d ? format(d, "HH:mm 'ngày' dd/MM/yyyy", { locale: vi }) : "—";
};

export const formatRelative = (value?: string | null) => {
  const d = parse(value);
  return d ? formatDistanceToNow(d, { addSuffix: true, locale: vi }) : "—";
};

export const formatMoney = (value?: number | string | null) => {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency", currency: "VND", maximumFractionDigits: 0,
  }).format(n);
};
```

> Trả `"—"` thay vì `"Invalid Date"` hoặc chuỗi rỗng: màn hình không bao giờ có ô trống bí ẩn, và
> không bao giờ crash vì `null`. Backend dùng `LocalDateTime` nên chuỗi không có timezone —
> `parseISO` hiểu được, không cần thư viện timezone.

### Bước 3.3 — 5 component dùng chung (70 phút)

`src/components/ui/StatusChip.tsx` — quy ước 8, một chỗ duy nhất quyết định màu và nhãn:

```tsx
import { Chip } from "react-native-paper";
import {
  INTERVIEW_STATUS_LABEL, INTERVIEW_STATUS_LABEL_CANDIDATE,
  OFFER_STATUS_LABEL, REQUISITION_STATUS_LABEL,
} from "@/lib/strings";

type Domain = "interview" | "interviewCandidate" | "offer" | "requisition";
type Tone = "neutral" | "info" | "warning" | "success" | "danger";

const TONE: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: "#ECEFF1", fg: "#37474F" },
  info:    { bg: "#E3F2FD", fg: "#0D47A1" },
  warning: { bg: "#FFF3E0", fg: "#E65100" },
  success: { bg: "#E8F5E9", fg: "#1B5E20" },
  danger:  { bg: "#FFEBEE", fg: "#B71C1C" },
};

const TONE_OF: Record<string, Tone> = {
  // interview
  SCHEDULED: "warning", HM_RESCHEDULE_PROPOSED: "warning", HM_CONFIRMED: "info",
  CANDIDATE_CONFIRMED: "info", EVALUATION_PENDING: "warning", COMPLETED: "success",
  NO_SHOW: "danger", CANCELLED: "neutral",
  // offer
  DRAFT: "neutral", PENDING_APPROVAL: "warning", APPROVED: "info",
  SENT_TO_CANDIDATE: "info", ACCEPTED: "success", DECLINED: "danger",
  REJECTED: "danger", EXPIRED: "neutral",
  // requisition
  CHANGES_REQUESTED: "warning", CLOSED: "neutral",
};

const LABELS: Record<Domain, Record<string, string>> = {
  interview: INTERVIEW_STATUS_LABEL,
  interviewCandidate: INTERVIEW_STATUS_LABEL_CANDIDATE,
  offer: OFFER_STATUS_LABEL,
  requisition: REQUISITION_STATUS_LABEL,
};

export function StatusChip({
  status, domain, compact = true,
}: { status?: string | null; domain: Domain; compact?: boolean }) {
  if (!status) return null;
  // Nhánh dự phòng: backend thêm enum mới mà app chưa cập nhật → vẫn hiện được, không vỡ layout.
  const label = LABELS[domain][status] ?? status;
  const tone = TONE[TONE_OF[status] ?? "neutral"];

  return (
    <Chip
      compact={compact}
      style={{ backgroundColor: tone.bg }}
      textStyle={{ color: tone.fg, fontSize: 12 }}
    >
      {label}
    </Chip>
  );
}
```

`src/components/ui/EmptyState.tsx` — quy ước 3 yêu cầu "câu dẫn việc", không chỉ "Không có dữ liệu":

```tsx
import { View, StyleSheet } from "react-native";
import { Button, Icon, Text } from "react-native-paper";

export function EmptyState({
  icon = "inbox-outline", title, description, actionLabel, onAction,
}: {
  icon?: string; title: string; description?: string;
  actionLabel?: string; onAction?: () => void;
}) {
  return (
    <View style={styles.root}>
      <Icon source={icon} size={56} color="#B0BEC5" />
      <Text variant="titleMedium" style={styles.title}>{title}</Text>
      {description ? (
        <Text variant="bodyMedium" style={styles.desc}>{description}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button mode="contained-tonal" onPress={onAction} style={styles.action}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: "center", paddingVertical: 56, paddingHorizontal: 32 },
  title: { marginTop: 16, textAlign: "center" },
  desc: { marginTop: 8, textAlign: "center", opacity: 0.7 },
  action: { marginTop: 20 },
});
```

`src/components/ui/ErrorState.tsx`:

```tsx
import { View, StyleSheet } from "react-native";
import { Button, Icon, Text } from "react-native-paper";
import { COMMON } from "@/lib/strings";

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <View style={styles.root}>
      <Icon source="alert-circle-outline" size={56} color="#EF9A9A" />
      <Text variant="titleMedium" style={styles.title}>Không tải được dữ liệu</Text>
      <Text variant="bodyMedium" style={styles.desc}>{message ?? COMMON.genericError}</Text>
      {onRetry ? (
        <Button mode="contained" onPress={onRetry} style={styles.action}>{COMMON.retry}</Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: "center", paddingVertical: 56, paddingHorizontal: 32 },
  title: { marginTop: 16 },
  desc: { marginTop: 8, textAlign: "center", opacity: 0.7 },
  action: { marginTop: 20 },
});
```

`src/components/ui/Skeleton.tsx` — nhấp nháy bằng `Animated`, không thêm thư viện (quy ước 6):

```tsx
import { useEffect, useRef } from "react";
import { Animated, View, StyleSheet } from "react-native";

function Shimmer({ height, width = "100%", radius = 6, style }: {
  height: number; width?: number | string; radius?: number; style?: object;
}) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.8, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[{ height, width, borderRadius: radius, backgroundColor: "#CFD8DC", opacity }, style]}
    />
  );
}

/** Skeleton cho một thẻ trong danh sách. `count` = số thẻ giả. */
export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.card}>
          <Shimmer height={18} width="70%" />
          <Shimmer height={14} width="45%" style={{ marginTop: 10 }} />
          <Shimmer height={14} width="35%" style={{ marginTop: 8 }} />
        </View>
      ))}
    </View>
  );
}

export function DetailSkeleton() {
  return (
    <View style={styles.detail}>
      <Shimmer height={26} width="80%" />
      <Shimmer height={16} width="50%" style={{ marginTop: 14 }} />
      <Shimmer height={120} style={{ marginTop: 24 }} radius={12} />
      <Shimmer height={80} style={{ marginTop: 16 }} radius={12} />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  card: { padding: 16, borderRadius: 12, backgroundColor: "#FFF", elevation: 1 },
  detail: { padding: 16 },
});
```

`src/components/ui/QueryScreen.tsx` — **component quan trọng nhất trong bộ**: gói cả 4 trạng thái
của quy ước 3 vào một chỗ, để 17 màn sau không ai quên trạng thái nào:

```tsx
import { ReactNode } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import type { UseQueryResult } from "@tanstack/react-query";
import { apiErrorMessage } from "@/api/client";
import { ErrorState } from "./ErrorState";
import { EmptyState } from "./EmptyState";
import { ListSkeleton, DetailSkeleton } from "./Skeleton";

interface Props<T> {
  query: UseQueryResult<T>;
  /** Trả true khi dữ liệu tải về là rỗng. Bỏ qua nếu màn không thể rỗng (màn chi tiết). */
  isEmpty?: (data: T) => boolean;
  empty?: { title: string; description?: string; icon?: string;
            actionLabel?: string; onAction?: () => void };
  skeleton?: "list" | "detail";
  /** true = tự bọc ScrollView + pull-to-refresh. Đặt false khi con là FlatList. */
  scrollable?: boolean;
  children: (data: T) => ReactNode;
}

export function QueryScreen<T>({
  query, isEmpty, empty, skeleton = "list", scrollable = true, children,
}: Props<T>) {
  const { data, isPending, isError, error, refetch, isRefetching } = query;

  if (isPending) return skeleton === "detail" ? <DetailSkeleton /> : <ListSkeleton />;

  if (isError) {
    return <ErrorState message={apiErrorMessage(error)} onRetry={() => void refetch()} />;
  }

  if (isEmpty && empty && isEmpty(data)) {
    return (
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
      >
        <EmptyState {...empty} />
      </ScrollView>
    );
  }

  if (!scrollable) return <View style={{ flex: 1 }}>{children(data)}</View>;

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
    >
      {children(data)}
    </ScrollView>
  );
}
```

> **Vì sao gói lại thay vì để mỗi màn tự viết:** quy ước 3 và 4 nói mọi màn phải có đủ 4 trạng thái
> và pull-to-refresh. Nếu để 20 màn tự làm thì chắc chắn có màn quên. Gói vào `QueryScreen` biến
> quy ước thành thứ *khó vi phạm* thay vì thứ *phải nhớ*. Khi bảo vệ, đây là một câu trả lời tốt
> cho "bạn kiểm soát chất lượng thế nào khi làm một mình trong 4 tuần".
>
> Pull-to-refresh vẫn có ở trạng thái rỗng — vì rỗng thường là tạm thời (chưa nộp đơn nào, chưa
> có lịch nào), người dùng kéo xuống để kiểm tra lại là hành vi tự nhiên.

### Bước 3.4 — Màn mẫu DANH SÁCH: B1 phiên bản đầu (60 phút)

`src/features/jobs/api.ts`:

```ts
import { apiClient } from "@/api/client";
import type { JobPostingResponse } from "@/types/api";

export const jobsApi = {
  /** Endpoint công khai: KHÔNG có keyword, KHÔNG phân trang. Lọc tìm kiếm ở client. */
  listOpen: (params?: { employmentTypeId?: number; workLocationId?: number }) =>
    apiClient
      .get<JobPostingResponse[]>("/recruitment/public/jobs", { params })
      .then((r) => r.data),

  getById: (jobId: number | string) =>
    apiClient
      .get<JobPostingResponse>(`/recruitment/public/jobs/${jobId}`)
      .then((r) => r.data),
};
```

`src/features/jobs/hooks.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { jobsApi } from "./api";

export const jobKeys = {
  all: ["jobs"] as const,
  list: (p?: object) => [...jobKeys.all, "list", p ?? {}] as const,
  detail: (id: number | string) => [...jobKeys.all, "detail", String(id)] as const,
};

export const useOpenJobs = (params?: { employmentTypeId?: number; workLocationId?: number }) =>
  useQuery({ queryKey: jobKeys.list(params), queryFn: () => jobsApi.listOpen(params) });

export const useJobDetail = (id: number | string) =>
  useQuery({ queryKey: jobKeys.detail(id), queryFn: () => jobsApi.getById(id), enabled: !!id });
```

`app/(candidate)/jobs/index.tsx`:

```tsx
import { useMemo, useState } from "react";
import { FlatList, RefreshControl, View, StyleSheet } from "react-native";
import { Card, Searchbar, Text } from "react-native-paper";
import { useRouter } from "expo-router";
import { useOpenJobs } from "@/features/jobs/hooks";
import { QueryScreen } from "@/components/ui/QueryScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/format";

export default function JobListScreen() {
  const router = useRouter();
  const query = useOpenJobs();
  const [keyword, setKeyword] = useState("");

  const jobs = query.data ?? [];
  // Tìm kiếm phía client — endpoint public không nhận tham số keyword.
  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return jobs;
    return jobs.filter((j) =>
      [j.title, j.departmentName, j.workLocationName]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(k))
    );
  }, [jobs, keyword]);

  return (
    <View style={styles.root}>
      <Searchbar
        placeholder="Tìm theo vị trí, phòng ban, nơi làm việc"
        value={keyword}
        onChangeText={setKeyword}
        style={styles.search}
      />

      <QueryScreen
        query={query}
        scrollable={false}
        isEmpty={(d) => d.length === 0}
        empty={{
          icon: "briefcase-search-outline",
          title: "Chưa có tin tuyển dụng nào đang mở",
          description: "Kéo xuống để tải lại, hoặc quay lại sau nhé.",
        }}
      >
        {() => (
          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={query.isRefetching}
                onRefresh={() => void query.refetch()}
              />
            }
            ListEmptyComponent={
              <EmptyState
                icon="magnify"
                title={`Không tìm thấy tin nào khớp "${keyword}"`}
                description="Thử từ khóa ngắn hơn."
                actionLabel="Xóa tìm kiếm"
                onAction={() => setKeyword("")}
              />
            }
            renderItem={({ item }) => (
              <Card style={styles.card} onPress={() => router.push(`/(candidate)/jobs/${item.id}`)}>
                <Card.Content>
                  <Text variant="titleMedium">{item.title}</Text>
                  <Text variant="bodySmall" style={styles.meta}>
                    {[item.departmentName, item.workLocationName].filter(Boolean).join(" · ")}
                  </Text>
                  <Text variant="bodySmall" style={styles.meta}>
                    Hạn nộp: {formatDate(item.closingDate)}
                  </Text>
                </Card.Content>
              </Card>
            )}
          />
        )}
      </QueryScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  search: { margin: 12 },
  list: { paddingHorizontal: 12, paddingBottom: 24, gap: 10 },
  card: { borderRadius: 12 },
  meta: { marginTop: 4, opacity: 0.7 },
});
```

> Chú ý **hai trạng thái rỗng khác nhau** trên cùng một màn: "server không có job nào" (qua
> `QueryScreen`) và "tìm kiếm không khớp" (qua `ListEmptyComponent`). Gộp hai cái này thành một
> câu là lỗi UX kinh điển — người dùng không biết nên xóa từ khóa hay nên quay lại sau.
>
> Tên trường (`departmentName`, `workLocationName`, `closingDate`) **phải đối chiếu với
> `src/types/generated/recruitment.ts`**, đừng chép nguyên xi từ đây. TypeScript sẽ báo lỗi nếu
> sai — đó là lý do ngày 1 sinh type.

### ✅ Định nghĩa "ngày 3 đã xong"

- [ ] 5 component trong `src/components/ui/` đã dùng được
- [ ] B1 hiện đúng danh sách job thật từ backend
- [ ] Tắt backend → mở màn → thấy ErrorState + nút "Thử lại"; bật lại → bấm thử lại → có dữ liệu
- [ ] Kéo xuống → thấy vòng xoay refresh
- [ ] Gõ từ khóa vô nghĩa → thấy EmptyState "không tìm thấy" kèm nút xóa tìm kiếm
- [ ] `<StatusChip>` render đúng màu cho ít nhất 3 enum khác nhau (test tạm bằng một màn nháp)

---

## NGÀY 4 — Màn mẫu CHI TIẾT + màn mẫu FORM, chốt bộ khuôn

> **Mục tiêu:** hoàn thiện đủ **ba khuôn mẫu** (list · detail · form) để 16 màn còn lại chỉ còn là
> việc lắp ráp. Sau hôm nay không được phát minh thêm khuôn mới.

### Bước 4.1 — Khuôn CHI TIẾT: B2 chi tiết job (không kèm nộp đơn) (60 phút)

`app/(candidate)/jobs/[id].tsx`:

```tsx
import { useLocalSearchParams } from "expo-router";
import { View, StyleSheet } from "react-native";
import { Button, Card, Divider, Text } from "react-native-paper";
import { useJobDetail } from "@/features/jobs/hooks";
import { QueryScreen } from "@/components/ui/QueryScreen";
import { formatDate, formatMoney } from "@/lib/format";

/** Hàng nhãn–giá trị, dùng lại ở mọi màn chi tiết. */
function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.row}>
      <Text variant="bodySmall" style={styles.label}>{label}</Text>
      <Text variant="bodyMedium" style={styles.value}>{value ?? "—"}</Text>
    </View>
  );
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useJobDetail(id);

  return (
    <QueryScreen query={query} skeleton="detail">
      {(job) => (
        <>
          <Text variant="headlineSmall">{job.title}</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            {[job.departmentName, job.workLocationName].filter(Boolean).join(" · ")}
          </Text>

          <Card style={styles.card}>
            <Card.Content>
              <Row label="Loại hình" value={job.employmentTypeName} />
              <Divider style={styles.divider} />
              <Row label="Mức lương" value={
                job.salaryFrom || job.salaryTo
                  ? `${formatMoney(job.salaryFrom)} – ${formatMoney(job.salaryTo)}`
                  : "Thỏa thuận"
              } />
              <Divider style={styles.divider} />
              <Row label="Số lượng" value={job.headcount ? `${job.headcount} người` : null} />
              <Divider style={styles.divider} />
              <Row label="Hạn nộp" value={formatDate(job.closingDate)} />
            </Card.Content>
          </Card>

          <Text variant="titleMedium" style={styles.section}>Mô tả công việc</Text>
          <Text variant="bodyMedium" style={styles.body}>{job.description ?? "—"}</Text>

          <Text variant="titleMedium" style={styles.section}>Yêu cầu</Text>
          <Text variant="bodyMedium" style={styles.body}>{job.requirements ?? "—"}</Text>

          {/* Nút nộp đơn sẽ nối vào bottom sheet ở ngày 6 */}
          <Button mode="contained" style={styles.cta} onPress={() => {}}>
            Nộp đơn ứng tuyển
          </Button>
        </>
      )}
    </QueryScreen>
  );
}

const styles = StyleSheet.create({
  subtitle: { marginTop: 6, opacity: 0.7 },
  card: { marginTop: 16, borderRadius: 12 },
  row: { flexDirection: "row", paddingVertical: 8 },
  label: { width: 110, opacity: 0.6 },
  value: { flex: 1 },
  divider: { opacity: 0.4 },
  section: { marginTop: 24, marginBottom: 8 },
  body: { lineHeight: 22 },
  cta: { marginTop: 28, paddingVertical: 6 },
});
```

> Ba thứ khuôn chi tiết này chốt cho cả app: tiêu đề + dòng phụ · một `Card` chứa các `Row`
> nhãn–giá trị · các khối nội dung dài bên dưới · CTA ở cuối. Các màn B4, B7, C3, D2, D3 đều theo
> đúng bố cục này. Nhất quán ở đây rẻ hơn nhiều so với đẹp riêng lẻ.

### Bước 4.2 — Bọc form thành khuôn tái dùng (40 phút)

`src/components/ui/FormTextField.tsx` — gói `Controller` + `TextInput` + `HelperText` lại, để 6 form
còn lại không phải chép đi chép lại:

```tsx
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { HelperText, TextInput } from "react-native-paper";
import type { KeyboardTypeOptions } from "react-native";

export function FormTextField<T extends FieldValues>({
  control, name, label, multiline, numberOfLines, keyboardType, secureTextEntry, autoCapitalize,
}: {
  control: Control<T>;
  name: Path<T>;
  label: string;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words";
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <>
          <TextInput
            label={label}
            mode="outlined"
            value={value == null ? "" : String(value)}
            onBlur={onBlur}
            onChangeText={onChange}
            error={!!error}
            multiline={multiline}
            numberOfLines={numberOfLines}
            keyboardType={keyboardType}
            secureTextEntry={secureTextEntry}
            autoCapitalize={autoCapitalize}
          />
          <HelperText type="error" visible={!!error}>{error?.message}</HelperText>
        </>
      )}
    />
  );
}
```

Viết lại A1 và A2 của ngày 2 bằng `FormTextField` — mỗi trường rút từ ~20 dòng xuống 1 dòng:

```tsx
<FormTextField control={control} name="email" label="Email"
  keyboardType="email-address" autoCapitalize="none" />
<FormTextField control={control} name="password" label="Mật khẩu" secureTextEntry />
```

### Bước 4.3 — Snackbar toàn cục (30 phút)

`src/components/ui/SnackbarProvider.tsx` — quy ước 9 nói mọi lỗi API hiện bằng Snackbar. Có một
provider dùng chung thì không màn nào phải tự quản `useState` cho thông báo:

```tsx
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Snackbar } from "react-native-paper";

type Tone = "info" | "error" | "success";
interface Msg { text: string; tone: Tone }

const Ctx = createContext<{
  notify: (text: string, tone?: Tone) => void;
}>({ notify: () => {} });

export const useSnackbar = () => useContext(Ctx);

const BG: Record<Tone, string | undefined> = {
  info: undefined, error: "#B71C1C", success: "#1B5E20",
};

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<Msg | null>(null);

  const notify = useCallback((text: string, tone: Tone = "info") => {
    setMsg({ text, tone });
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <Snackbar
        visible={!!msg}
        onDismiss={() => setMsg(null)}
        duration={msg?.tone === "error" ? 5000 : 3000}
        style={msg ? { backgroundColor: BG[msg.tone] } : undefined}
        action={{ label: "Đóng", onPress: () => setMsg(null) }}
      >
        {msg?.text ?? ""}
      </Snackbar>
    </Ctx.Provider>
  );
}
```

Bọc vào `app/_layout.tsx`, bên trong `PaperProvider`:

```tsx
<PaperProvider>
  <SnackbarProvider>
    <AuthGate />
  </SnackbarProvider>
</PaperProvider>
```

Dùng ở bất kỳ màn nào:

```tsx
const { notify } = useSnackbar();
// ...
onError: (e) => notify(apiErrorMessage(e), "error"),
```

### Bước 4.4 — Chốt khuôn mutation (25 phút)

Mọi hành động ghi (nộp đơn, xác nhận lịch, chấm điểm, duyệt) đều theo đúng khuôn này. Ghi vào
`mobile/CLAUDE.md` luôn để AI không phát minh kiểu khác:

```ts
const { notify } = useSnackbar();
const qc = useQueryClient();

const confirmMutation = useMutation({
  mutationFn: () => interviewApi.confirm(id),
  onSuccess: () => {
    notify("Đã xác nhận tham dự", "success");
    // Làm mới CẢ danh sách lẫn chi tiết, vì trạng thái đổi ở cả hai chỗ.
    void qc.invalidateQueries({ queryKey: interviewKeys.all });
  },
  onError: (e) => notify(apiErrorMessage(e), "error"),
});

// Trong JSX:
<Button
  mode="contained"
  loading={confirmMutation.isPending}
  disabled={confirmMutation.isPending}
  onPress={() => confirmMutation.mutate()}
>
  Xác nhận tham dự
</Button>
```

> `disabled={isPending}` không phải chi tiết nhỏ: trên mạng 3G, người dùng bấm hai lần trong một
> giây là chuyện bình thường, và backend sẽ nhận hai lệnh xác nhận. Đây là loại lỗi chỉ lộ ra khi
> demo thật.

### ✅ Định nghĩa "ngày 4 đã xong"

- [ ] Có đủ **ba khuôn**: `QueryScreen` (list) · bố cục màn chi tiết · `FormTextField` + zod (form)
- [ ] A1, A2 đã viết lại bằng `FormTextField`
- [ ] `SnackbarProvider` gắn ở root, gọi được từ màn bất kỳ
- [ ] Màn chi tiết job hiện đủ thông tin thật, `DetailSkeleton` chạy đúng
- [ ] Khuôn mutation đã ghi vào `mobile/CLAUDE.md`
- [ ] `npx tsc --noEmit` sạch

> **Mốc nửa tuần.** Từ ngày 5 trở đi, mỗi màn mới chỉ còn là: viết `api.ts` → viết `hooks.ts` →
> lắp khuôn. Nếu tới cuối ngày 4 mà chưa đủ ba khuôn, **đừng sang ngày 5** — làm cho xong đã. Nợ
> kỹ thuật ở tầng này nhân lên 16 lần.

---

## NGÀY 5 — B1 hoàn thiện + bộ lọc

### Bước 5.1 — Bộ lọc theo loại hình và nơi làm việc (50 phút)

Hai tham số duy nhất mà endpoint public nhận là `employmentTypeId` và `workLocationId`. Nạp danh
sách từ masterdata:

`src/features/masterdata/api.ts`:

```ts
import { apiClient } from "@/api/client";

export const masterdataApi = {
  employmentTypes: () =>
    apiClient.get<Array<{ id: number; name: string }>>("/masterdata/employment-types")
      .then((r) => r.data),
  workLocations: () =>
    apiClient.get<Array<{ id: number; name: string }>>("/masterdata/work-locations")
      .then((r) => r.data),
  recruitmentSources: () =>
    apiClient.get<Array<{ id: number; name: string }>>("/masterdata/recruitment-sources")
      .then((r) => r.data),
  interviewCriteria: () =>
    apiClient.get("/masterdata/interview-criteria").then((r) => r.data),
};
```

> **Xác minh đường dẫn thật của `employment-types` và `work-locations`** trong
> `src/types/generated/masterdata.ts` trước khi viết. `recruitment-sources` và
> `interview-criteria` đã xác nhận là đúng.

Hàng chip lọc nằm ngay dưới ô tìm kiếm:

```tsx
const [employmentTypeId, setEmploymentTypeId] = useState<number | undefined>();
const query = useOpenJobs({ employmentTypeId, workLocationId });

<ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
  <Chip selected={!employmentTypeId} onPress={() => setEmploymentTypeId(undefined)}>
    Tất cả
  </Chip>
  {types.map((t) => (
    <Chip
      key={t.id}
      selected={employmentTypeId === t.id}
      onPress={() => setEmploymentTypeId(employmentTypeId === t.id ? undefined : t.id)}
    >
      {t.name}
    </Chip>
  ))}
</ScrollView>
```

> Bấm lại chip đang chọn = bỏ chọn. Trên mobile không có nút "xóa bộ lọc" ở góc như web, nên chip
> phải tự làm được cả hai chiều.

### Bước 5.2 — Xem job khi chưa đăng nhập (40 phút)

`GET /recruitment/public/jobs` là endpoint công khai — theo mục 2 của kế hoạch, ứng viên phải lướt
được tin trước khi có tài khoản. Sửa `AuthGate` để B1/B2 nằm ngoài vòng chặn:

```ts
const PUBLIC_ROUTES = ["jobs"];  // segment thứ hai

useEffect(() => {
  if (!hydrated) return;
  const inAuthArea = segments[0] === "(auth)";
  const isPublic = PUBLIC_ROUTES.includes(String(segments[1] ?? ""));

  if (!user && !inAuthArea && !isPublic) {
    router.replace("/(auth)/login");
  } else if (user && inAuthArea) {
    router.replace(homeForRole(user.role));
  }
}, [hydrated, user, segments, router]);
```

Khi chưa đăng nhập, nút nộp đơn ở B2 đổi thành lời mời đăng nhập:

```tsx
{user ? (
  <Button mode="contained" onPress={openApplySheet}>Nộp đơn ứng tuyển</Button>
) : (
  <Button mode="contained" onPress={() => router.push("/(auth)/login")}>
    Đăng nhập để nộp đơn
  </Button>
)}
```

### Bước 5.3 — Đánh bóng và kiểm thử trên máy thật (40 phút)

- [ ] Danh sách 30+ job cuộn mượt (thêm `initialNumToRender={8}` cho `FlatList`)
- [ ] Tiêu đề job dài 2 dòng không vỡ thẻ (`numberOfLines={2}`)
- [ ] Job không có hạn nộp → hiện `"—"`, không hiện "Invalid Date"
- [ ] Kéo refresh khi đang lọc → giữ nguyên bộ lọc

### ✅ Định nghĩa "ngày 5 đã xong"

- [ ] B1 đạt đủ 7 điều kiện ở mục 11 của kế hoạch gốc
- [ ] Lọc theo loại hình và nơi làm việc chạy đúng
- [ ] Chưa đăng nhập vẫn xem được B1 + B2
- [ ] Đã chạy thật trên máy Android

---

## NGÀY 6 — B2 chi tiết job + nộp đơn (bottom sheet)

> **Đây là màn cốt lõi của Candidate.** Đọc lại phần 0.2 trước khi bắt đầu: nộp đơn **không** đính
> kèm file, và `recruitmentSourceId` là bắt buộc.

### Bước 6.1 — API và hook nộp đơn (30 phút)

`src/features/applications/api.ts`:

```ts
import { apiClient } from "@/api/client";
import type { CandidateApplication } from "@/types/api";

export interface ApplyRequest {
  jobPostingId: number;
  recruitmentSourceId: number;   // BẮT BUỘC — @NotNull ở ApplicationCreateRequest
  note?: string;
  // KHÔNG gửi candidateId (backend tự suy từ JWT) và KHÔNG gửi resumeUrl
  // (backend lấy CV từ hồ sơ ứng viên — xem ApplicationService.create()).
}

export const applicationsApi = {
  apply: (body: ApplyRequest) =>
    apiClient.post<CandidateApplication>("/application/applications", body).then((r) => r.data),

  myList: () =>
    apiClient.get<CandidateApplication[]>("/application/applications/my").then((r) => r.data),

  myDetail: (id: number | string) =>
    apiClient.get<CandidateApplication>(`/application/applications/my/${id}`).then((r) => r.data),
};
```

`src/features/applications/hooks.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { applicationsApi, type ApplyRequest } from "./api";

export const applicationKeys = {
  all: ["applications"] as const,
  my: () => [...applicationKeys.all, "my"] as const,
  detail: (id: number | string) => [...applicationKeys.all, "detail", String(id)] as const,
};

export const useMyApplications = () =>
  useQuery({ queryKey: applicationKeys.my(), queryFn: applicationsApi.myList });

export const useMyApplication = (id: number | string) =>
  useQuery({
    queryKey: applicationKeys.detail(id),
    queryFn: () => applicationsApi.myDetail(id),
    enabled: !!id,
  });

export const useApply = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ApplyRequest) => applicationsApi.apply(body),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: applicationKeys.my() }); },
  });
};
```

### Bước 6.2 — Bottom sheet nộp đơn bằng Portal + Modal của Paper (70 phút)

Quy ước 6 và mục 4 nói rõ: **không thêm thư viện bottom-sheet**. `Portal` + `Modal` của Paper đủ.

`src/features/applications/ApplySheet.tsx`:

```tsx
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Divider, Modal, Portal, RadioButton, Text, TextInput } from "react-native-paper";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { masterdataApi } from "@/features/masterdata/api";
import { useApply } from "./hooks";
import { useSnackbar } from "@/components/ui/SnackbarProvider";
import { apiErrorMessage } from "@/api/client";

export function ApplySheet({
  visible, onDismiss, jobPostingId, jobTitle,
}: { visible: boolean; onDismiss: () => void; jobPostingId: number; jobTitle: string }) {
  const router = useRouter();
  const { notify } = useSnackbar();
  const apply = useApply();
  const [sourceId, setSourceId] = useState<number | null>(null);
  const [note, setNote] = useState("");

  const sources = useQuery({
    queryKey: ["masterdata", "recruitment-sources"],
    queryFn: masterdataApi.recruitmentSources,
    staleTime: 10 * 60_000,     // masterdata gần như không đổi trong một phiên
  });

  const onSubmit = () => {
    if (!sourceId) {
      notify("Vui lòng chọn nguồn tuyển dụng", "error");
      return;
    }
    apply.mutate(
      { jobPostingId, recruitmentSourceId: sourceId, note: note.trim() || undefined },
      {
        onSuccess: () => {
          onDismiss();
          notify("Nộp đơn thành công", "success");
          router.push("/(candidate)/applications");
        },
        onError: (e) => {
          const msg = apiErrorMessage(e);
          notify(msg, "error");
          // Backend: "Ứng viên chưa có CV, vui lòng tải CV lên trước khi ứng tuyển"
          if (msg.includes("chưa có CV")) {
            onDismiss();
            router.push("/(candidate)/profile");
          }
        },
      }
    );
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.sheet}
      >
        <View style={styles.handle} />
        <Text variant="titleLarge">Nộp đơn ứng tuyển</Text>
        <Text variant="bodyMedium" style={styles.job}>{jobTitle}</Text>
        <Divider style={styles.divider} />

        <Text variant="bodySmall" style={styles.note}>
          Đơn sẽ dùng CV hiện có trong hồ sơ của bạn.
        </Text>

        <Text variant="titleSmall" style={styles.label}>Bạn biết tin này từ đâu?</Text>
        <ScrollView style={styles.sources}>
          <RadioButton.Group
            value={String(sourceId ?? "")}
            onValueChange={(v) => setSourceId(Number(v))}
          >
            {(sources.data ?? []).map((s) => (
              <RadioButton.Item key={s.id} label={s.name} value={String(s.id)} />
            ))}
          </RadioButton.Group>
        </ScrollView>

        <TextInput
          label="Lời nhắn (không bắt buộc)"
          mode="outlined"
          multiline
          numberOfLines={3}
          value={note}
          onChangeText={setNote}
          style={styles.input}
        />

        <View style={styles.actions}>
          <Button mode="outlined" onPress={onDismiss} disabled={apply.isPending} style={styles.btn}>
            Hủy
          </Button>
          <Button
            mode="contained"
            onPress={onSubmit}
            loading={apply.isPending}
            disabled={apply.isPending}
            style={styles.btn}
          >
            Nộp đơn
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: "#FFF", marginTop: "auto",
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 28, maxHeight: "85%",
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: "#CFD8DC",
    alignSelf: "center", marginBottom: 16,
  },
  job: { marginTop: 4, opacity: 0.7 },
  divider: { marginVertical: 14 },
  note: { opacity: 0.7, marginBottom: 12 },
  label: { marginBottom: 4 },
  sources: { maxHeight: 200 },
  input: { marginTop: 12 },
  actions: { flexDirection: "row", gap: 12, marginTop: 20 },
  btn: { flex: 1 },
});
```

> `marginTop: "auto"` đẩy modal xuống đáy → đúng cảm giác bottom sheet, không cần thư viện. Vuốt
> để đóng thì không có, nhưng chạm ra ngoài đóng được (`onDismiss` mặc định của Paper) — đủ cho v1,
> và là một ví dụ cụ thể của việc "chọn cái rẻ, đúng mức" khi chỉ có 4 tuần.
>
> Nhánh `msg.includes("chưa có CV")` chính là chỗ xử lý phụ thuộc B2→B8 nói ở phần 0.2(a). Người
> dùng không bị bỏ lại với một thông báo lỗi cụt — họ được đưa thẳng tới nơi giải quyết.

### Bước 6.3 — Nối sheet vào màn chi tiết (20 phút)

```tsx
const [applyOpen, setApplyOpen] = useState(false);

<Button mode="contained" style={styles.cta} onPress={() => setApplyOpen(true)}>
  Nộp đơn ứng tuyển
</Button>

<ApplySheet
  visible={applyOpen}
  onDismiss={() => setApplyOpen(false)}
  jobPostingId={Number(id)}
  jobTitle={job.title}
/>
```

### Bước 6.4 — Kiểm thử đủ 4 tình huống (40 phút)

| Tình huống | Cách tạo | Kỳ vọng |
|---|---|---|
| Nộp thành công | Tài khoản đã có CV, job OPEN, chưa nộp | Snackbar xanh + chuyển sang "Đơn của tôi", thấy đơn mới |
| Nộp trùng | Nộp lại chính job vừa nộp | Snackbar đỏ "Ứng viên này đã nộp hồ sơ vào tin tuyển dụng này rồi" |
| Chưa có CV | Đăng ký tài khoản mới, chưa tải CV, nộp đơn | Snackbar đỏ + tự chuyển sang màn hồ sơ |
| Job đã đóng | HR đóng job trên web, ứng viên nộp | Snackbar "Chỉ ứng tuyển được vào tin tuyển dụng đang mở" |

### ✅ Định nghĩa "ngày 6 đã xong"

- [ ] Nộp đơn thành công, đơn hiện ra ở web (kiểm tra chéo)
- [ ] Đủ 4 tình huống trên cho kết quả đúng, không tình huống nào crash
- [ ] Bấm "Nộp đơn" hai lần liên tiếp → chỉ tạo một đơn (nhờ `disabled={isPending}`)
- [ ] Chưa đăng nhập → nút đổi thành "Đăng nhập để nộp đơn"

---

## NGÀY 7 — B3 Đơn của tôi + B4 Chi tiết đơn + dòng thời gian

### Bước 7.1 — B3 Danh sách đơn (50 phút)

`app/(candidate)/applications/index.tsx` — lắp thẳng khuôn của ngày 3:

```tsx
export default function MyApplicationsScreen() {
  const router = useRouter();
  const query = useMyApplications();

  return (
    <QueryScreen
      query={query}
      scrollable={false}
      isEmpty={(d) => d.length === 0}
      empty={{
        icon: "file-document-outline",
        title: "Bạn chưa nộp đơn nào",
        description: "Xem các tin tuyển dụng đang mở và nộp đơn ngay.",
        actionLabel: "Xem việc làm",
        onAction: () => router.push("/(candidate)/jobs"),
      }}
    >
      {(items) => (
        <FlatList
          data={items}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={{ padding: 12, gap: 10 }}
          refreshControl={
            <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
          }
          renderItem={({ item }) => (
            <Card onPress={() => router.push(`/(candidate)/applications/${item.id}`)}>
              <Card.Content>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                  <Text variant="titleMedium" style={{ flex: 1 }} numberOfLines={2}>
                    {item.jobPostingTitle}
                  </Text>
                  <Chip compact>{item.currentStageName}</Chip>
                </View>
                <Text variant="bodySmall" style={{ marginTop: 6, opacity: 0.7 }}>
                  Nộp {formatRelative(item.appliedAt)}
                </Text>
              </Card.Content>
            </Card>
          )}
        />
      )}
    </QueryScreen>
  );
}
```

> Trạng thái rỗng ở đây có **nút dẫn việc** ("Xem việc làm") — đúng yêu cầu "kèm câu dẫn việc,
> không để màn trắng" ở mục 11. Ứng viên mới cài app sẽ thấy màn này đầu tiên; để nó trống là bỏ
> phí đúng khoảnh khắc họ sẵn sàng hành động nhất.
>
> `currentStageName` là tên giai đoạn do HR tự cấu hình trong masterdata, không phải enum cố định
> → dùng `Chip` thường, **không** dùng `StatusChip` (vốn chỉ dành cho enum có bảng màu).

### Bước 7.2 — B4 Chi tiết đơn + dòng thời gian (70 phút)

Dữ liệu lịch sử nằm trong chính `CandidateApplicationResponse` hay phải gọi riêng? **Mở
`src/types/generated/application.ts` kiểm tra trước khi viết.** Nếu có mảng lịch sử thì dùng luôn;
nếu không, `GET /application/applications/{id}/history` chỉ dành cho nội bộ (`requireInternal`) nên
ứng viên không gọi được — lúc đó dòng thời gian dựng từ các mốc có sẵn trong response.

Component dòng thời gian, tự vẽ bằng `View`, không thêm thư viện:

```tsx
function Timeline({ items }: {
  items: Array<{ title: string; time?: string | null; description?: string | null; done?: boolean }>
}) {
  return (
    <View>
      {items.map((it, idx) => {
        const last = idx === items.length - 1;
        return (
          <View key={idx} style={{ flexDirection: "row" }}>
            {/* Cột trục: chấm + đường nối */}
            <View style={{ width: 28, alignItems: "center" }}>
              <View style={{
                width: 12, height: 12, borderRadius: 6,
                backgroundColor: it.done === false ? "#CFD8DC" : "#1976D2",
                marginTop: 4,
              }} />
              {!last && <View style={{ flex: 1, width: 2, backgroundColor: "#E0E0E0" }} />}
            </View>
            {/* Cột nội dung */}
            <View style={{ flex: 1, paddingBottom: last ? 0 : 20 }}>
              <Text variant="titleSmall">{it.title}</Text>
              {it.time ? (
                <Text variant="bodySmall" style={{ opacity: 0.6, marginTop: 2 }}>
                  {formatDateTime(it.time)}
                </Text>
              ) : null}
              {it.description ? (
                <Text variant="bodyMedium" style={{ marginTop: 4 }}>{it.description}</Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
```

B4 hoàn chỉnh dùng khuôn chi tiết của ngày 4: tiêu đề job → `Card` thông tin (giai đoạn hiện tại,
ngày nộp, nguồn) → dòng thời gian → nếu đơn đã bị từ chối thì hiện lý do.

### Bước 7.3 — Tổng duyệt cuối tuần (40 phút)

Chạy lại **toàn bộ** trên máy thật, không dùng máy ảo:

| Việc kiểm tra | Xong |
|---|---|
| Đăng nhập → B1 → chọn job → B2 → nộp đơn → B3 thấy đơn mới → B4 xem chi tiết | ☐ |
| Mỗi màn trong 4 màn: kéo xuống refresh chạy | ☐ |
| Tắt backend: cả 4 màn hiện ErrorState + "Thử lại", không màn nào trắng | ☐ |
| Bật lại backend, bấm "Thử lại": cả 4 màn có dữ liệu | ☐ |
| Bật chế độ máy bay giữa lúc đang tải: Snackbar "Không kết nối được máy chủ" | ☐ |
| Không màn nào còn chữ tiếng Anh lọt ra ngoài | ☐ |
| Xoay ngang máy: không màn nào vỡ layout | ☐ |
| `npx tsc --noEmit` sạch, `npx eslint .` sạch | ☐ |

### Bước 7.4 — Commit và ghi nhật ký (20 phút)

```powershell
cd E:\ATS
git add mobile docs/mobile
git commit -m "feat(mobile): tuan 1 - nen mong, auth, B1-B4 candidate"
```

Ghi vào sổ tay 3 điều để trả lời vấn đáp (mục 15 của kế hoạch là nơi tổng hợp cuối cùng):

1. Vì sao `QueryScreen` gói 4 trạng thái thay vì để mỗi màn tự viết.
2. Vì sao refresh token phải single-flight (dẫn chứng `LoginService.java:84`).
3. Vì sao tìm kiếm job làm ở client (dẫn chứng `PublicJobPostingController.java`).

### ✅ Định nghĩa "TUẦN 1 đã xong"

- [ ] 7 màn chạy dữ liệu thật: A1, A2, A3, B1, B2, B3, B4
- [ ] Cả 7 đạt đủ 7 điều kiện ở mục 11 của kế hoạch gốc
- [ ] Dev build APK đã cài trên máy thật, chạy được không cần máy tính bật Metro
- [ ] `mobile/CLAUDE.md` đã cập nhật đủ 3 khuôn mẫu + khuôn mutation
- [ ] `src/types/generated/` đủ 9 service, không sửa tay dòng nào
- [ ] Đã commit

---

## Phụ lục — Bảng tra nhanh trong tuần

### Lệnh dùng hằng ngày

```powershell
npx expo start --dev-client      # chạy Metro, quét QR bằng dev build
npx expo start --dev-client -c   # xóa cache khi Metro ngủ mơ
npx tsc --noEmit                 # kiểm tra type trước mỗi commit
npm run gen:types                # sinh lại type sau khi backend đổi API
npx expo start --dev-client --tunnel   # khi điện thoại không thấy máy tính qua LAN
```

### Chẩn đoán lỗi thường gặp

| Triệu chứng | Nguyên nhân | Xử lý |
|---|---|---|
| `Network Error` ở mọi request | Sai IP trong `.env`, hoặc firewall | Mở `http://<IP>:8080/api/auth/v3/api-docs` bằng trình duyệt điện thoại |
| 401 ở mọi request sau vài phút | Không lưu refresh token mới | Kiểm tra `setCredentials` có nhận cả hai token không |
| Đăng xuất bất ngờ khi mở nhiều màn cùng lúc | Thiếu single-flight | Kiểm tra `refreshPromise` trong `client.ts` |
| Màn trắng, không lỗi | Quên bọc `QueryScreen` | Mọi màn đọc dữ liệu đều phải bọc |
| `undefined is not an object` | Truy cập trường của `null` | Dùng `?.` và giá trị mặc định `"—"` |
| Metro không nhận thay đổi `.env` | Biến `EXPO_PUBLIC_*` được nhúng lúc bundle | Dừng Metro, chạy lại với `-c` |

### Bản đồ 4 mục ⚠️ → nơi đã giải quyết

| Mục ⚠️ | Đã giải quyết ở | Ghi ở đâu trong code |
|---|---|---|
| #1 Candidate self-apply | Phần 0.1 + ngày 6 | `src/features/applications/api.ts` |
| #2 Deep link notification | Phần 0.1 → tuần 2 ngày 14 | `src/lib/notificationRoutes.ts` (tuần 2) |
| #3 Filter của `GET /offers` | Phần 0.1 → tuần 3 ngày 21 | `src/features/offers/api.ts` (tuần 2/3) |
| #4 Refresh token rotation | Phần 0.1 + ngày 2 | `src/api/client.ts` |

---

**Tiếp theo:** [`MOBILE_WEEK_2.md`](./MOBILE_WEEK_2.md) — B5–B8, backend push, A4 và mốc an toàn cuối tuần 2.
