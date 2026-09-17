# ATS — Phân tích kiến trúc độc lập

> **Nguồn gốc tài liệu:** Toàn bộ nội dung dưới đây được suy luận trực tiếp từ mã nguồn, file cấu hình,
> `pom.xml`, `docker-compose.yml`, migration SQL và script khởi động của dự án. Tài liệu này **không** tham
> khảo `README.md`, `frontend/docs/`, hay bất kỳ mô tả có sẵn nào trong repo.
>
> **Thời điểm phân tích:** 2026-09-07 — nhánh `develop`, commit `70a400e`.

---

## Mục lục

1. [Tóm tắt điều hành](#1-tóm-tắt-điều-hành)
2. [Phương pháp nghiên cứu](#2-phương-pháp-nghiên-cứu)
3. [Mục đích hệ thống (suy luận)](#3-mục-đích-hệ-thống-suy-luận)
4. [Kiến trúc tổng thể](#4-kiến-trúc-tổng-thể)
5. [Tech stack](#5-tech-stack)
6. [Bản đồ microservice](#6-bản-đồ-microservice)
7. [Mô hình bảo mật & xác thực](#7-mô-hình-bảo-mật--xác-thực)
8. [Mô hình dữ liệu & luồng nghiệp vụ](#8-mô-hình-dữ-liệu--luồng-nghiệp-vụ)
9. [Kiến trúc bất đồng bộ](#9-kiến-trúc-bất-đồng-bộ)
10. [Kiến trúc Frontend](#10-kiến-trúc-frontend)
11. [Cách chạy hệ thống](#11-cách-chạy-hệ-thống)
12. [Điểm mạnh](#12-điểm-mạnh)
13. [Điểm yếu & rủi ro](#13-điểm-yếu--rủi-ro)
14. [Bộ prompt giao cho Codex (chia nhỏ theo từng việc)](#14-bộ-prompt-giao-cho-codex-chia-nhỏ-theo-từng-việc)
15. [Tiêu chí review kết quả Codex](#15-tiêu-chí-review-kết-quả-codex)

---

## 1. Tóm tắt điều hành

**ATS** là một hệ thống **Applicant Tracking System** (quản lý tuyển dụng) cho **một doanh nghiệp duy nhất**
(single-company, không phải SaaS đa tenant), xây dựng theo kiến trúc **microservices**.

| Chỉ số | Giá trị |
|---|---|
| Số microservice backend | 9 service nghiệp vụ + 1 API Gateway |
| Ngôn ngữ / runtime backend | Java 21, Spring Boot 3.3.4, Spring Cloud 2023.0.3 |
| Frontend | React 19 + TypeScript 6 + Vite 8 + Ant Design 6 |
| Dòng code Java (`src/main`) | ~8.700 dòng / 530 file |
| Dòng code TS/TSX | ~19.950 dòng / 147 file |
| Số endpoint REST | ~227 (`@*Mapping`) |
| File test Java | 39 |
| Database | PostgreSQL 16 — **1 database riêng cho mỗi service** |
| Message broker | RabbitMQ 3 (topic exchange `ats.events`) |
| Cache | Redis 7 (đã khai báo hạ tầng) |
| Object storage | S3 / MinIO (chỉ candidate-service dùng) |

**Kết luận nhanh:** Đây là một dự án có kiến trúc **được thiết kế nghiêm túc và nhất quán** — phân tách
service theo bounded context rõ ràng, database-per-service, event-driven qua RabbitMQ, mô hình bảo mật
gateway-centric có kiểm soát. Điểm yếu tập trung ở **tầng vận hành**: thiếu hoàn toàn cơ chế resilience,
một số truy vấn có vấn đề hiệu năng nghiêm trọng (N+1 + phân trang in-memory), và cấu hình chưa sẵn sàng
cho production (secret hardcode, `ddl-auto: update` chạy song song với Flyway).

---

## 2. Phương pháp nghiên cứu

Tôi tiếp cận dự án như một hệ thống chưa từng có tài liệu:

1. **Đọc cấu trúc thư mục** để nhận diện ranh giới module → phát hiện 10 thư mục Maven độc lập
   (không có parent POM chung) + 1 thư mục frontend.
2. **Đọc `docker-compose.yml`** — đây là nguồn thông tin quan trọng nhất về topology: nó tiết lộ port,
   tên database, biến môi trường liên service, và bảng định tuyến của gateway.
3. **Đọc `pom.xml`** để xác định stack và dependency (phát hiện: có `spring-cloud-starter-gateway`,
   `openfeign`, `amqp`, nhưng **không** có Eureka, Config Server, hay Resilience4j).
4. **Truy vết luồng xác thực** từ `JwtAuthGlobalFilter` (gateway) → `TrustedHeaderAuthenticationFilter`
   (mỗi service) → `AuthorizationPolicy` (tầng nghiệp vụ) → `FeignClientConfig` (lan truyền identity).
5. **Truy vết luồng nghiệp vụ** qua chuỗi entity và enum trạng thái, kết hợp với các `throw new
   BusinessException(...)` — chính các thông báo lỗi tiếng Việt trong code là nguồn mô tả nghiệp vụ
   chính xác nhất.
6. **Truy vết luồng bất đồng bộ** bằng cách đối chiếu toàn bộ `@RabbitListener` với các hằng số
   routing key trong mỗi `RabbitMQConfig`.
7. **Đọc migration Flyway** — tên file (`V*__drop_legacy_tenant_columns.sql`) tiết lộ lịch sử tiến hóa
   kiến trúc mà code hiện tại không còn thể hiện.

---

## 3. Mục đích hệ thống (suy luận)

Hệ thống số hóa **toàn bộ vòng đời tuyển dụng nội bộ của một công ty**, từ lúc phòng ban phát sinh nhu
cầu nhân sự cho tới lúc ứng viên nhận offer và trở thành nhân viên.

Bằng chứng cho tính chất **single-company** (không phải SaaS đa khách hàng):

- 7/9 service có migration `V*__drop_legacy_tenant_columns.sql` → dự án **từng** là multi-tenant và đã
  được refactor để bỏ tenant.
- Auth-service có entity `Company` (số ít) và endpoint `PublicCompanyController` trả về *một* công ty.
- 8/9 service có test tên `SingleCompany*SchemaContractTest` — test hợp đồng schema chốt lại việc không
  còn cột tenant.

### Bốn vai trò người dùng

Danh sách vai trò được kiểm soát cứng ở **ba tầng** (gateway, filter mỗi service, và frontend):

| Vai trò | Ý nghĩa | Phạm vi truy cập |
|---|---|---|
| `COMPANY_ADMIN` | Quản trị doanh nghiệp | Toàn quyền — bỏ qua mọi ràng buộc phòng ban |
| `RECRUITER` | Chuyên viên tuyển dụng (HR) | Giới hạn theo phòng ban **hoặc** hồ sơ được giao cho mình |
| `HIRING_MANAGER` | Quản lý phòng ban | Giới hạn theo phòng ban của mình |
| `CANDIDATE` | Ứng viên | Chỉ dữ liệu của chính mình |

---

## 4. Kiến trúc tổng thể

```
                          ┌──────────────────────────┐
   Trình duyệt  ────────► │  Frontend SPA (React 19) │
                          │  Vite dev :3000          │
                          │  Nginx (docker) :5173→80 │
                          └────────────┬─────────────┘
                                       │ HTTPS/JSON + STOMP-over-SockJS
                                       ▼
                          ┌──────────────────────────────────────┐
                          │  API Gateway :8080 (Spring Cloud     │
                          │  Gateway — WebFlux, reactive)        │
                          │  ┌────────────────────────────────┐  │
                          │  │ JwtAuthGlobalFilter (order -1) │  │
                          │  │ • verify chữ ký JWT (HMAC)     │  │
                          │  │ • XÓA header identity giả mạo  │  │
                          │  │ • BƠM X-User-Id/Email/Role/    │  │
                          │  │   X-Department-Id              │  │
                          │  └────────────────────────────────┘  │
                          └───┬──────────────────────────────────┘
                              │ HTTP + trusted identity headers
        ┌─────────────────────┼──────────────────────┬───────────────────┐
        ▼                     ▼                      ▼                   ▼
  ┌───────────┐        ┌─────────────┐       ┌──────────────┐    ┌──────────────┐
  │   auth    │        │ masterdata  │       │ recruitment  │    │  candidate   │
  │   :8081   │        │   :8082     │       │    :8083     │    │    :8084     │
  └───────────┘        └─────────────┘       └──────────────┘    └──────────────┘
        ▼                     ▼                      ▼                   ▼
  ┌───────────┐        ┌─────────────┐       ┌──────────────┐    ┌──────────────┐
  │ interview │        │notification │       │  dashboard   │    │ application  │
  │   :8085   │        │   :8086     │       │    :8087     │    │    :8089     │
  └───────────┘        └─────────────┘       └──────────────┘    └──────────────┘
        ▼
  ┌───────────┐
  │   offer   │
  │   :8090   │
  └───────────┘
        │
        │  ┌─────────────────────── Giao tiếp giữa các service ────────────────────────┐
        │  │                                                                            │
        └──┤  ĐỒNG BỘ: OpenFeign (URL cố định qua biến môi trường, KHÔNG service        │
           │           discovery). Identity headers được forward tự động.               │
           │  BẤT ĐỒNG BỘ: RabbitMQ — topic exchange `ats.events`                       │
           └────────────────────────────────────────────────────────────────────────────┘

  ┌────────────────── Hạ tầng dùng chung (docker-compose) ──────────────────┐
  │  PostgreSQL 16 :5432   RabbitMQ 3 :5672/:15672   Redis 7 :6379          │
  │  → 9 database tách biệt: ats_auth, ats_masterdata, ats_recruitment,     │
  │    ats_candidate, ats_interview, ats_notification, ats_dashboard,       │
  │    ats_application, ats_offer                                          │
  └─────────────────────────────────────────────────────────────────────────┘
```

### Các quyết định kiến trúc đáng chú ý

| Quyết định | Bằng chứng | Nhận xét của tôi |
|---|---|---|
| **Không có service discovery** | Không có dependency Eureka/Consul ở bất kỳ `pom.xml` nào; Feign client dùng `url = "${services.x.url:http://localhost:800x}"` | Đơn giản hóa cho môi trường docker-compose, nhưng chặn đường scale ngang và rolling deploy |
| **Không có parent POM** | 10 `pom.xml` độc lập, đều `<parent>spring-boot-starter-parent</parent>` | Mỗi service build/deploy độc lập thật sự, nhưng version dependency phải sửa 10 chỗ |
| **Không có shared library** | Các class như `CurrentUser`, `AuthorizationPolicy`, `PageResponse`, `TrustedHeaderAuthenticationFilter`, `AuditEvent` bị **copy** sang từng service | Đúng triết lý microservice (tránh coupling), nhưng gây trùng lặp code đáng kể (~8 bản copy của mỗi class) |
| **Database per service** | `docker/postgres-init/init-databases.sql` tạo 9 DB; mỗi service có `SPRING_DATASOURCE_URL` riêng | Chuẩn mực. Không có join xuyên service — dữ liệu ngoại được lấy qua Feign hoặc snapshot |
| **Snapshot dữ liệu ngoại** | `Application.candidateNameSnapshot`, `Offer.candidateNameSnapshot`, `Interview.candidateNameSnapshot` | Giảm phụ thuộc lúc đọc và giữ tính toàn vẹn lịch sử — quyết định đúng |
| **Gateway là điểm xác thực duy nhất** | Chỉ gateway parse JWT; các service chỉ tin header | Hiệu quả, nhưng service **bắt buộc** phải không được phơi ra ngoài mạng nội bộ |

---

## 5. Tech stack

### Backend

| Thành phần | Công nghệ | Ghi chú |
|---|---|---|
| Runtime | Java 21 | Dùng record, sealed switch expression, pattern matching |
| Framework | Spring Boot 3.3.4 | |
| Gateway | Spring Cloud Gateway (WebFlux, reactive) | Spring Cloud 2023.0.3 |
| Web layer (service) | Spring MVC (servlet, blocking) | Trái ngược với gateway reactive — có chủ đích |
| Persistence | Spring Data JPA + Hibernate | `Specification` cho query động |
| Migration | Flyway | Chạy **song song** với `ddl-auto: update` — xem [mục 13](#13-điểm-yếu--rủi-ro) |
| Bảo mật | Spring Security + JJWT 0.12.6 | HMAC-SHA, không dùng RS256 |
| Inter-service (sync) | OpenFeign | URL tĩnh, không load balancer |
| Inter-service (async) | Spring AMQP / RabbitMQ | `Jackson2JsonMessageConverter` |
| Realtime | Spring WebSocket + STOMP + SockJS | Chỉ ở notification-service |
| Object storage | AWS SDK v2 `S3Client` | Cấu hình `forcePathStyle` → tương thích MinIO |
| API docs | SpringDoc OpenAPI 2.6.0 | Gateway gom 9 spec vào 1 Swagger UI |
| Boilerplate | Lombok | |
| Test | JUnit 5 + Spring Boot Test + Mockito | |

### Frontend

| Thành phần | Công nghệ |
|---|---|
| UI framework | React 19.2 |
| Ngôn ngữ | TypeScript ~6.0 |
| Build | Vite 8 |
| Thư viện UI | Ant Design 6 + `@ant-design/icons` |
| State toàn cục | Redux Toolkit 2 + React Redux 9 (**chỉ dùng cho `auth`**) |
| Routing | React Router DOM 7 |
| Form | React Hook Form 7 + Zod 4 (qua `@hookform/resolvers`) |
| HTTP | Axios 1.18 (có interceptor refresh token) |
| Realtime | `@stomp/stompjs` + `sockjs-client` |
| Biểu đồ | Recharts 3 |
| Kéo thả (Kanban) | `@hello-pangea/dnd` |
| Xuất file | `xlsx` + `file-saver` |
| Ngày giờ | Day.js |
| JWT | `jwt-decode` |

---

## 6. Bản đồ microservice

| Service | Port | Database | Trách nhiệm chính (suy luận từ entity + controller) | Endpoints | LOC |
|---|---|---|---|---|---|
| **api-gateway** | 8080 | — | Định tuyến 9 route theo path prefix, xác thực JWT, CORS, gom Swagger | — | 190 |
| **auth-service** | 8081 | `ats_auth` | `AppUser`, `Company`, `Role`, `Permission`, `RolePermission`, `RefreshToken`, `EmailVerification`, `PasswordResetToken`. Đăng ký + OTP xác thực email, đăng nhập, refresh token, quên/đặt lại mật khẩu, Google OAuth2, quản lý user, cấu hình công ty | 20 | 2.590 |
| **masterdata-service** | 8082 | `ats_masterdata` | 15 danh mục dùng chung: `Department`, `JobTitle`, `JobLevel`, `Skill`, `EmploymentType`, `ContractType`, `WorkLocation`, `EducationLevel`, `ExperienceLevel`, `RecruitmentSource`, `RecruitmentStatus`, `RejectionReason`, `InterviewCriteria`, `EmailTemplate`, và **`RecruitmentPipeline` + `PipelineStage`** | **64** | 2.910 |
| **recruitment-service** | 8083 | `ats_recruitment` | `JobRequisition` (yêu cầu tuyển dụng) và `JobPosting` (tin đăng), gồm cả `PublicJobPostingController` cho trang careers công khai | 26 | 2.153 |
| **candidate-service** | 8084 | `ats_candidate` | `Candidate`, `CandidateSkill`, `CandidateTag`, `CustomFieldDefinition` + `CandidateCustomFieldValue`. Upload CV lên S3, Talent Pool, cổng ứng viên tự phục vụ, job dọn dữ liệu theo chính sách lưu trữ | 26 | 2.248 |
| **application-service** | 8089 | `ats_application` | `Application`, `ApplicationHistory`, `ApplicationComment`. **Trái tim của pipeline** — chuyển giai đoạn, loại hồ sơ, gán recruiter, thao tác hàng loạt, job nhắc hồ sơ tồn đọng | 25 | 2.068 |
| **interview-service** | 8085 | `ats_interview` | `Interview`, `InterviewInterviewer`, `InterviewSlot`, `InterviewEvaluation` + `InterviewEvaluationScore`, `SalaryProposal`. Sinh file `.ics`, đề xuất khung giờ, đánh giá theo tiêu chí | 27 | 2.591 |
| **offer-service** | 8090 | `ats_offer` | `Offer` — vòng đời DRAFT → PENDING_APPROVAL → APPROVED → ACCEPTED/DECLINED, sinh PDF thư mời | 20 | 1.630 |
| **notification-service** | 8086 | `ats_notification` | `Notification`, `AuditLog`. Nghe 11 loại sự kiện, gửi email + push realtime qua WebSocket, hàng đợi nhắc lịch có độ trễ | 10 | 1.859 |
| **dashboard-service** | 8087 | `ats_dashboard` | **Không có entity riêng** — chỉ tổng hợp dữ liệu từ 4 service khác qua Feign để tính funnel, time-to-hire, hiệu quả nguồn, hiệu suất recruiter | 9 | 1.035 |

> **Lưu ý:** Port 8088 bị bỏ trống. `application-service` dùng 8089 và `offer-service` dùng 8090 — hai
> service này được thêm vào sau, thể hiện qua thứ tự trong `start-backend.bat` (10 bước, application và
> offer nằm cuối).

---

## 7. Mô hình bảo mật & xác thực

### 7.1 Luồng đăng nhập và cấp token

```
1. POST /api/auth/login  ──────────────────► auth-service
2. auth-service xác thực mật khẩu (BCrypt), kiểm tra UserStatus
3. Sinh access token (JWT, HMAC-SHA, TTL 15 phút):
      sub          = userId
      email        = email
      role         = COMPANY_ADMIN | RECRUITER | HIRING_MANAGER | CANDIDATE
      departmentId = (tùy chọn, null với CANDIDATE)
4. Sinh refresh token (TTL 7 ngày) — lưu trong bảng `refresh_token`,
   dạng OPAQUE + hash (xem OpaqueTokenUtil, Base64UrlTokenUtil, migration V4__secure_auth_tokens.sql)
5. Frontend lưu vào Redux (authSlice)
```

### 7.2 Luồng của một request đã xác thực — điểm mấu chốt của toàn hệ thống

```
Trình duyệt
   │  Authorization: Bearer <JWT>
   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ JwtAuthGlobalFilter  (api-gateway, @Order(-1))                          │
├─────────────────────────────────────────────────────────────────────────┤
│ ① Bỏ qua nếu là CORS preflight hoặc path công khai:                     │
│    • POST /api/auth/{register,login,refresh-token,logout,verify-email,  │
│           resend-otp,forgot-password,reset-password,oauth2/exchange}    │
│    • GET  /api/recruitment/public/**    (trang tuyển dụng công khai)    │
│    • GET  /api/auth/public/company                                      │
│    • /swagger-ui**, **/v3/api-docs                                      │
│    ⚠ Ngay cả với path công khai, filter VẪN gọi stripIdentityHeaders()  │
│      → client KHÔNG thể tự bơm X-User-Id để giả mạo danh tính           │
│                                                                          │
│ ② Verify chữ ký JWT bằng HMAC key                                       │
│ ③ Validate claim thủ công (KHÔNG tin JWT một cách mù quáng):            │
│    • exp bắt buộc phải tồn tại                                          │
│    • sub phải parse được thành long DƯƠNG                               │
│    • email phải là String non-blank                                     │
│    • role phải nằm trong whitelist 4 giá trị                            │
│    • departmentId (nếu có) phải là long dương                           │
│ ④ Xóa mọi header identity đến từ client, rồi BƠM lại giá trị đã verify: │
│    X-User-Id, X-User-Email, X-User-Role, X-Department-Id                │
│ ⑤ Lỗi bất kỳ → 401, KHÔNG lộ chi tiết ra response                       │
└──────────────────────────────┬──────────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ TrustedHeaderAuthenticationFilter  (mỗi service, OncePerRequestFilter)  │
├─────────────────────────────────────────────────────────────────────────┤
│ • Không có header identity nào → cho qua (để SecurityConfig quyết định) │
│ • Có header → validate lại LẦN NỮA (defense in depth), dựng CurrentUser │
│   và nạp vào SecurityContextHolder với authority "ROLE_" + role         │
│ • finally { SecurityContextHolder.clearContext() } — tránh rò rỉ context│
│   qua thread pool                                                       │
└──────────────────────────────┬──────────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ AuthorizationPolicy  (tầng nghiệp vụ — kiểm soát chi tiết)              │
├─────────────────────────────────────────────────────────────────────────┤
│ requireAdmin / requireInternal / requireHr / requireHiringManager /     │
│ requireCandidate / requireSameDepartment / requireSelf /                │
│ requireOwnerOrAdmin / canManageJob / canViewJob                         │
│                                                                          │
│ canViewJob(actor, departmentId, approverId) — switch trên enum Role:    │
│   COMPANY_ADMIN  → true (luôn)                                          │
│   CANDIDATE      → false                                                │
│   RECRUITER      → cùng phòng ban  HOẶC  chính mình là người duyệt      │
│   HIRING_MANAGER → cùng phòng ban                                       │
└──────────────────────────────┬──────────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ FeignClientConfig  (khi service A gọi service B)                        │
├─────────────────────────────────────────────────────────────────────────┤
│ RequestInterceptor lấy 4 header identity từ request HTTP đang xử lý và  │
│ gắn vào request Feign đi ra → danh tính được lan truyền suốt chuỗi gọi  │
│                                                                          │
│ ⚠ Hệ quả quan trọng: RequestContextHolder trả về null khi KHÔNG có      │
│   request HTTP inbound (ví dụ: trong @RabbitListener hoặc @Scheduled).  │
│   Code đã ý thức được điều này — xem comment tại                        │
│   ApplicationService.applyAdvanceStage():                               │
│   "Callers outside an HTTP request (event listeners) must use this      │
│    method: buildDetailedResponse resolves internal user names through   │
│    Feign, which has no trusted identity to forward"                     │
└─────────────────────────────────────────────────────────────────────────┘
```

**Đánh giá:** Đây là phần được thiết kế tốt nhất của dự án. Mô hình "gateway xác thực — service tin
header" là chuẩn mực, và việc **strip header trước khi inject** đóng đúng lỗ hổng nguy hiểm nhất của mô
hình này (client tự bơm `X-User-Role: COMPANY_ADMIN`). Việc validate claim hai lần (gateway + service) là
defense-in-depth hợp lý. Có 5 file test riêng cho phần này (`JwtAuthGlobalFilterTest`,
`SecurityContextIntegrationTest`, `AuthorizationPolicyTest` ×2, `AuthControllerSecurityTest`).

**Điều kiện tiên quyết bắt buộc:** mô hình này **chỉ an toàn khi 9 service không bao giờ được truy cập
trực tiếp từ bên ngoài**. `docker-compose.yml` làm đúng điều này — dùng `expose` (chỉ nội bộ network)
cho service, và chỉ `ports` (publish ra host) cho gateway và frontend.

### 7.3 Xác thực WebSocket

WebSocket **không** đi qua gateway. `notification-service` tự verify JWT qua
`StompAuthChannelInterceptor` khi nhận lệnh STOMP `CONNECT`, rồi đặt `Principal` với `getName()` =
userId. Message riêng tư được đẩy qua destination `/user/queue/**`.

---

## 8. Mô hình dữ liệu & luồng nghiệp vụ

### 8.1 Luồng nghiệp vụ chính (end-to-end)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 1 — YÊU CẦU TUYỂN DỤNG        (recruitment-service)                │
└──────────────────────────────────────────────────────────────────────────────┘
   HIRING_MANAGER tạo JobRequisition
        │  title, departmentId, jobTitleId, quantity, expectedSalaryMin/Max,
        │  skillIds[], reason (NEW/REPLACEMENT/EXPANSION/NEW_PROJECT/OTHER),
        │  priority (NORMAL/HIGH/URGENT), requesterId, approverId
        ▼
   DRAFT ──submit──► PENDING_APPROVAL ──┬── approve ──► APPROVED
                            │            ├── reject ───► REJECTED
                            │            └── requestChanges ──► CHANGES_REQUESTED
                            │                                        │
                            └────────────────────────────────────────┘
                                        (sửa rồi gửi lại)

   📤 publish `requisition.submitted` → notification-service báo cho người duyệt

   💡 Chi tiết nghiệp vụ tinh tế: HR khi duyệt có thể CHỐT LẠI mức lương khác với
      đề xuất của phòng ban — entity tách riêng expectedSalaryMin/Max (phòng ban đề
      xuất) và approvedSalaryMin/Max (HR chốt), cùng với note (phòng ban) và
      hrNote (HR). Đây là thiết kế phản ánh đúng thực tế đàm phán nội bộ.

┌──────────────────────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 2 — TIN TUYỂN DỤNG            (recruitment-service)                │
└──────────────────────────────────────────────────────────────────────────────┘
   JobPosting được tạo TỪ một JobRequisition đã APPROVED
        │  Ràng buộc: chỉ tạo được từ requisition APPROVED
        │  Ràng buộc: 1 requisition ↔ tối đa 1 posting còn hiệu lực
        │  Prefill thông minh: body FE → approvedSalary* → expectedSalary*
        │  Posting chọn pipelineId (quy trình tuyển dụng từ masterdata)
        ▼
   DRAFT ──submitReview──► APPROVED ──publish──► OPEN ──► PAUSED ──► CLOSED
     ▲                        │                   │
     └── EDITING ◄─requestEdit┘                   └─► trang careers công khai
                                                       GET /api/recruitment/public/**

   Ràng buộc xóa: không xóa được posting đã có ứng viên nộp hồ sơ
   (recruitment-service lắng nghe `application.created` để biết điều này)

┌──────────────────────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 3 — HỒ SƠ ỨNG TUYỂN           (application-service)                │
└──────────────────────────────────────────────────────────────────────────────┘
   Hai đường vào:
     (a) CANDIDATE tự ứng tuyển     → dùng CV có sẵn trong hồ sơ ứng viên
     (b) HR tạo hộ (RECRUITER/ADMIN) → có thể chỉ định resumeUrl và recruiter phụ trách

   Các ràng buộc khi tạo (đọc từ ApplicationService.create):
     • Posting phải ở trạng thái OPEN
     • Không cho nộp trùng (candidateId + jobPostingId)
     • recruitmentSourceId phải hợp lệ (masterdata)
     • Bắt buộc phải có CV
     • Pipeline của posting phải có ít nhất 1 stage

   ⭐ PIPELINE ĐỘNG — điểm thiết kế hay nhất về mặt dữ liệu:
     Application KHÔNG có enum trạng thái cứng. Thay vào đó nó SNAPSHOT stage
     hiện tại từ masterdata:
         currentStageId, currentStageName, currentStageOrder, currentStageType
     StageType (masterdata) = APPLIED | CV_SCREENING | HR_SCREENING |
         TECHNICAL_INTERVIEW | HR_INTERVIEW | FINAL_INTERVIEW | OFFER |
         HIRED | REJECTED | CUSTOM
     → Admin có thể tự định nghĩa quy trình tuyển dụng riêng cho từng vị trí
       mà KHÔNG cần sửa code hay deploy lại.

   Chuyển giai đoạn (advanceStage): tìm stage có stageOrder = current + 1
     • Chạm stage type HIRED → set hiredAt (mốc tính Time-to-Hire)
     • Mọi lần chuyển đều ghi ApplicationHistory (from, to, note, actor, thời điểm)

   Loại hồ sơ (reject): nhảy thẳng tới stage có type = REJECTED
     • Bắt buộc có rejectionReasonId
     • Sau đó gọi candidate-service để đưa ứng viên vào Talent Pool kèm tag lý do
       — bọc try/catch, cố tình KHÔNG để lỗi phụ làm hỏng thao tác chính

   📤 publish `application.created`, `application.status_changed`

┌──────────────────────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 4 — PHỎNG VẤN                 (interview-service)                  │
└──────────────────────────────────────────────────────────────────────────────┘
   Điều kiện: hồ sơ phải đã VƯỢT QUA giai đoạn Sàng lọc CV, và chưa kết thúc

   Hai cách xếp lịch:
     (a) Trực tiếp — HR chọn giờ, tạo Interview luôn
     (b) Qua InterviewSlot — HR đề xuất nhiều khung giờ (PROPOSED),
         ứng viên/người phỏng vấn chọn một (SELECTED) → sinh Interview

   Interview: SCHEDULED ──confirmByCandidate──► CONFIRMED ──► COMPLETED
                    └──────── cancel ──────────► CANCELLED

   Validate: ONLINE bắt buộc có meetingLink; OFFLINE bắt buộc có workLocationId
   Validate: người phỏng vấn phải là tài khoản HIRING_MANAGER
   Bổ trợ: IcsService sinh file .ics để thêm vào lịch cá nhân
   Bổ trợ: InterviewEvaluation + InterviewEvaluationScore chấm theo InterviewCriteria
           (masterdata), kèm RecommendationType = STRONG_YES|YES|NO|STRONG_NO
   Bổ trợ: SalaryProposal (PENDING → APPROVED/REJECTED) — đề xuất lương sau PV

   📤 publish `interview.scheduled`, `interview.confirmed`

┌──────────────────────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 5 — THƯ MỜI NHẬN VIỆC         (offer-service)                     │
└──────────────────────────────────────────────────────────────────────────────┘
   DRAFT ──submit──► PENDING_APPROVAL ──approve──► APPROVED ──┬─accept──► ACCEPTED
                              │                                └─decline─► DECLINED
                              └── reject ──► REJECTED

   Ràng buộc: 1 hồ sơ chỉ có 1 offer đang xử lý hoặc đã được chấp nhận
   Ràng buộc: chỉ sửa được offer ở DRAFT
   Ràng buộc: không xóa được offer đã ACCEPTED
   Ràng buộc: người duyệt phải là HIRING_MANAGER hoặc COMPANY_ADMIN
   Ràng buộc: quá responseDeadline → không nhận phản hồi nữa
   Bổ trợ: OfferPdfService sinh PDF thư mời

   📤 publish `offer.approved`, `offer.accepted`, `offer.declined`

┌──────────────────────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 6 — ĐÓNG VÒNG LẶP             (application-service)                │
└──────────────────────────────────────────────────────────────────────────────┘
   OfferOutcomeListener nghe `offer.accepted` / `offer.declined`:
       accepted  → applyAdvanceStage()  → hồ sơ tiến tới stage HIRED
       declined  → applyReject()        → hồ sơ chuyển sang stage REJECTED

   ⭐ Đây là điểm khép kín vòng đời: quyết định của ứng viên ở offer-service
      tự động cập nhật ngược lại pipeline ở application-service qua message queue,
      KHÔNG cần con người thao tác thủ công.
```

### 8.2 Ma trận phụ thuộc giữa các service (đọc từ Feign client + `docker-compose.yml`)

| Service gọi ↓ / Bị gọi → | auth | masterdata | recruitment | candidate | application | interview |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| auth-service | — | ✔ | | | | |
| recruitment-service | ✔ | ✔ | — | | | |
| candidate-service | ✔ | ✔ | ✔ | — | ✔ | |
| application-service | ✔ | ✔ | ✔ | ✔ | — | |
| interview-service | ✔ | ✔ | ✔ | ✔ | ✔ | — |
| offer-service | ✔ | ✔ | | ✔ | ✔ | |
| notification-service | ✔ | ✔ | | ✔ | ✔ | ✔ |
| dashboard-service | | | ✔ | ✔ | ✔ | ✔ |

**Nhận xét:** `auth-service` và `masterdata-service` là hai service nền tảng — hầu như mọi service khác
đều phụ thuộc. `masterdata-service` không gọi ai (đúng vai trò lá). `dashboard-service` là service thuần
đọc, không có DB nghiệp vụ riêng. **Không có phụ thuộc vòng** ở tầng đồng bộ — vòng lặp
`offer → application` được xử lý bằng message queue thay vì Feign, đây là lựa chọn đúng.

---

## 9. Kiến trúc bất đồng bộ

### 9.1 Topology RabbitMQ

Toàn hệ thống dùng **một topic exchange duy nhất**: `ats.events`.

```
                          ┌──────────────────────────┐
   PUBLISHERS             │   TopicExchange          │        CONSUMERS
                          │      ats.events          │
                          └──────────────────────────┘
 recruitment ──"requisition.submitted"──►├──► notification.requisition-submitted.queue     → notification
 application ──"application.created"─────►├──► notification.application-created.queue        → notification
                                          └──► recruitment.application-created.queue         → recruitment
                                               (để biết posting đã có người ứng tuyển)
 application ──"application.status_changed"►├─► notification.application-status-changed.queue → notification
 application ──"application.comment_mention"►├► notification.application-comment-mention.queue→ notification
 application ──"application.stale"───────►├──► notification.application-stale.queue           → notification
 interview   ──"interview.scheduled"─────►├──► notification.interview-scheduled.queue         → notification
 interview   ──"interview.confirmed"─────►├──► notification.interview-confirmed.queue         → notification
 offer       ──"offer.approved"──────────►├──► notification.offer-approved.queue              → notification
 offer       ──"offer.accepted"──────────►├──► notification.offer-accepted.queue              → notification
                                          └──► application.offer-accepted.queue               → application ⭐
 offer       ──"offer.declined"──────────►├──► notification.offer-declined.queue              → notification
                                          └──► application.offer-declined.queue               → application ⭐
 auth        ──"candidate.registered"────►└──► candidate.registered.queue                     → candidate
 (tất cả 6 service) ──"audit.log"────────►└──► notification.audit-log.queue                   → notification

 ⭐ = luồng khép kín vòng đời hồ sơ
```

**Tổng cộng: 14 binding, 11 routing key, 1 exchange.**

### 9.2 Cơ chế nhắc lịch có độ trễ (delayed message) — điểm kỹ thuật đáng chú ý

`notification-service` cần gửi nhắc nhở **tại một thời điểm tương lai cụ thể** (nhắc trước giờ phỏng vấn,
nhắc người phỏng vấn chưa nộp đánh giá). Dự án giải quyết bằng mẫu **TTL + Dead Letter Exchange**, không
cần plugin `rabbitmq_delayed_message_exchange`:

```
                        publish với per-message TTL
                        (mỗi lịch PV một TTL khác nhau)
                                    │
                                    ▼
        ┌────────────────────────────────────────────────┐
        │ notification.interview-reminder.delay.queue    │
        │  x-dead-letter-exchange     = notification.    │
        │                               internal.exchange│
        │  x-dead-letter-routing-key  = interview.       │
        │                               reminder.due     │
        │  ⚠ KHÔNG có consumer nào — message chỉ nằm chờ │
        └───────────────────┬────────────────────────────┘
                            │ TTL hết hạn → message "chết"
                            ▼
        ┌────────────────────────────────────────────────┐
        │ TopicExchange: notification.internal.exchange   │
        └───────────────────┬────────────────────────────┘
                            │ routing key: interview.reminder.due
                            ▼
        ┌────────────────────────────────────────────────┐
        │ notification.interview-reminder.process.queue   │
        │  → @RabbitListener xử lý và gửi nhắc nhở       │
        └────────────────────────────────────────────────┘
```

Comment trong `DelayQueueConfig` giải thích rõ lý do không đặt TTL cố định trên queue: *"KHÔNG đặt TTL cố
định ở đây vì mỗi lịch phỏng vấn có thời gian nhắc khác nhau"*. Cùng cơ chế được dùng cho
`evaluation.check.due`.

> **Cảnh báo kỹ thuật cần biết:** RabbitMQ classic queue xử lý message theo thứ tự FIFO ở đầu queue. Nếu
> một message có TTL dài nằm trước một message có TTL ngắn, message TTL ngắn sẽ **bị kẹt** cho tới khi
> message đứng trước hết hạn (head-of-line blocking). Với dữ liệu lịch phỏng vấn xếp không theo thứ tự
> thời gian, đây là một rủi ro thực tế mà thiết kế hiện tại chưa xử lý.

### 9.3 Các job định kỳ (`@Scheduled`)

| Job | Service | Cron | Chức năng |
|---|---|---|---|
| `StaleApplicationReminderJob` | application | `0 0 8 * * *` (8h sáng) | Tìm hồ sơ kẹt ở một stage > 7 ngày, publish `application.stale` để nhắc recruiter phụ trách |
| `DataRetentionCleanupJob` | candidate | `0 30 2 * * *` (2h30 sáng) | Đọc `dataRetentionMonths` từ cấu hình công ty, soft-delete hồ sơ ứng viên quá hạn lưu trữ + ghi audit log |

`DataRetentionCleanupJob` cho thấy hệ thống có ý thức về **tuân thủ pháp lý bảo vệ dữ liệu cá nhân** —
kết hợp với hai trường `consentGiven` / `consentAt` trên entity `Candidate`.

### 9.4 Kênh realtime

`RealtimePushService` đẩy notification qua STOMP tới destination `/user/queue/**`. Frontend kết nối qua
`websocketClient.ts` bằng SockJS + `@stomp/stompjs`, hiển thị ở `NotificationBell.tsx`.

**14 loại thông báo** (`NotificationType`): `REQUISITION_PENDING_APPROVAL`, `APPLICATION_CREATED`,
`APPLICATION_STAGE_CHANGED`, `APPLICATION_REJECTED`, `INTERVIEW_SCHEDULED`, `INTERVIEW_CONFIRMED`,
`INTERVIEW_REMINDER`, `EVALUATION_INCOMPLETE_REMINDER`, `OFFER_PENDING_CONFIRMATION`,
`OFFER_READY_FOR_CANDIDATE`, `OFFER_ACCEPTED`, `OFFER_DECLINED`, `APPLICATION_COMMENT_MENTION`,
`APPLICATION_STALE_REMINDER`.

---

## 10. Kiến trúc Frontend

### 10.1 Tổ chức thư mục — feature-based

```
frontend/src/
├── app/            # Hạ tầng dùng chung: store, theme, i18n helper, format tiền/ngày,
│                   # exportExcel, roleNavigation, statusLabels, custom hooks
├── components/     # Component điều hướng (ProtectedRoute, RoleRoute, GuestRoute,
│   └── ui/         # RoleHomeRedirect) + design system nội bộ (StatCard, StatTile,
│                   # PageHeader, EmptyState, StatusTag, FormSteps, DetailTabsLayout)
├── features/       # 10 feature module — MỖI module tự chứa đầy đủ:
│   │               #   xxxApi.ts (gọi API) + types.ts + schemas/ (Zod)
│   │               #   + components/ + pages/
│   ├── auth/       # login, register, verify OTP, forgot/reset password, OAuth2 callback
│   ├── recruitment/# requisition + posting (RequisitionDetailModal là file lớn nhất: 1.388 dòng)
│   ├── candidate/  # ứng viên, hồ sơ ứng tuyển, Kanban board
│   ├── interview/  # lịch PV, khung giờ, đánh giá, calendar, time grid
│   ├── offer/      # thư mời — view của HR và view của ứng viên
│   ├── dashboard/  # biểu đồ Recharts (704 dòng)
│   ├── masterdata/ # 15 panel danh mục + pipeline editor
│   ├── notification/# chuông thông báo + WebSocket client
│   ├── auditlog/   # nhật ký hệ thống
│   └── public/     # trang careers công khai (không cần đăng nhập)
├── i18n/           # Song ngữ VI/EN qua Context (dictionaries.ts)
├── layouts/        # AppLayout (có sidebar theo vai trò) + PublicLayout
├── routes/         # AppRoutes.tsx — toàn bộ bảng định tuyến tập trung một chỗ
└── services/       # axiosClient.ts — interceptor xác thực
```

### 10.2 Cơ chế refresh token ở `axiosClient.ts` — đáng phân tích riêng

File này triển khai **hai lớp bảo vệ độc lập**:

**Lớp 1 — Refresh chủ động (request interceptor):**
```
Trước MỖI request → ensureFreshAccessToken()
  → decode JWT, kiểm tra tính hợp lệ của claim (sub dương, email có, role trong whitelist)
  → nếu exp <= now + 30 giây  → refresh TRƯỚC khi gửi request
  → dùng biến refreshPromise chung → nhiều request song song chỉ gây ĐÚNG 1 lần refresh
```

**Lớp 2 — Refresh bị động (response interceptor):**
```
Nhận 401 và request chưa từng retry
  → nếu đang có refresh chạy: xếp vào failedQueue, chờ token mới rồi retry
  → nếu chưa: tự refresh, processQueue(token) đánh thức toàn bộ request đang chờ
  → refresh thất bại → dispatch(logout()) + chuyển hướng /login
```

**Nhận xét:** Xử lý race condition khi refresh token là một trong những chỗ dễ sai nhất ở frontend, và
file này làm đúng cả hai chiều. Tuy nhiên tôi ghi nhận **hai biến trạng thái song song** cùng mục đích:
`refreshPromise` (lớp 1) và `isRefreshing` + `failedQueue` (lớp 2). Chúng không xung đột vì cả hai đều
gọi chung `refreshAccessToken()`, nhưng đây là code trùng chức năng có thể gộp lại.

### 10.3 Phân quyền phía client — ba lớp

| Lớp | File | Cơ chế |
|---|---|---|
| Route | `AppRoutes.tsx` | `<ProtectedRoute>` (đã đăng nhập) → `<RoleRoute allow={[...]}>` (đúng vai trò) |
| Menu | `AppLayout.tsx` | Sinh menu sidebar khác nhau theo `user.role` |
| Trang chủ | `roleNavigation.ts` | `CANDIDATE` → `/jobs`, còn lại → `/dashboard` |

Bảng phân quyền route thực tế:

| Nhóm route | Vai trò được phép |
|---|---|
| `/dashboard`, `/recruitment`, `/candidates`, `/applications`, `/scheduling`, `/interviews`, `/offers` | `COMPANY_ADMIN`, `RECRUITER`, `HIRING_MANAGER` |
| `/masterdata`, `/admin/users`, `/audit-logs` | Chỉ `COMPANY_ADMIN` |
| `/my-profile`, `/jobs`, `/my-applications`, `/my-interviews`, `/my-offers` | Chỉ `CANDIDATE` |
| `/careers`, `/careers/jobs/:id` | Công khai, không cần đăng nhập |

> ⚠ Phân quyền phía client chỉ là **trải nghiệm người dùng**, không phải bảo mật. Điều may mắn là backend
> có `AuthorizationPolicy` kiểm soát độc lập ở mọi endpoint, nên đây không phải lỗ hổng.

### 10.4 Quan sát về quản lý state

Redux store **chỉ chứa duy nhất slice `auth`**. Toàn bộ dữ liệu nghiệp vụ khác được fetch trực tiếp
trong component qua các module `*Api.ts`. Điều này có nghĩa:

- ✅ Store rất gọn, không có boilerplate thừa
- ❌ Không có cache/dedupe/invalidate tự động → cùng một dữ liệu bị fetch lại mỗi lần vào trang
- ❌ Dự án đã cài `@reduxjs/toolkit` (bao gồm RTK Query) nhưng không dùng RTK Query

---

## 11. Cách chạy hệ thống

### Cách A — Docker Compose (khuyến nghị)

```bash
docker compose up -d
```

Compose sẽ dựng theo thứ tự phụ thuộc: `postgres` + `rabbitmq` (chờ healthcheck) → 9 service backend →
`api-gateway` → `frontend`.

| Điểm truy cập | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API Gateway | http://localhost:8080 |
| Swagger UI (gom 9 spec) | http://localhost:8080/swagger-ui.html |
| RabbitMQ Management | http://localhost:15672 (`ats_user` / `ats_password`) |
| PostgreSQL | `localhost:5432` (`ats_user` / `ats_password`) |

### Cách B — Chạy local trên Windows (script có sẵn)

```
start-infrastructure.bat   # chỉ dựng postgres + rabbitmq + redis
start-backend.bat          # mở 10 cửa sổ CMD, mỗi cửa sổ chạy mvnw spring-boot:run
                           # (đặt sẵn JAVA_TOOL_OPTIONS=-Duser.timezone=Asia/Ho_Chi_Minh)
```

Frontend chạy riêng: `cd frontend && npm install && npm run dev` → http://localhost:3000

> Lưu ý: Vite dev server chạy port **3000**, nhưng container docker publish port **5173**. Cả hai đều đã
> được thêm vào `allowedOrigins` của CORS ở gateway.

### Biến môi trường cần cấu hình khi triển khai thật

| Biến | Mặc định trong code | Mức độ bắt buộc |
|---|---|---|
| `JWT_SECRET` | `thay-bang-chuoi-bi-mat-...` (chuỗi tiếng Việt nhắc nhở) | 🔴 **Bắt buộc đổi** — phải khớp giữa gateway, auth-service, notification-service |
| `MAIL_USERNAME` / `MAIL_PASSWORD` | rỗng | Cần cho email OTP và thông báo |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | rỗng | Tùy chọn — để rỗng thì tính năng Google SSO **tự tắt**, không làm service crash |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | `minioadmin` | Cần cho upload CV |
| `FRONTEND_URL` | `http://localhost:5173` | Dùng để sinh link trong email |

> Ghi nhận một chi tiết thiết kế tốt: comment trong `auth-service/application.yml` giải thích lý do
> **cố ý không** khai báo Google OAuth dưới `spring.security.oauth2.client.registration.*` — vì property
> đó bắt buộc `client-id` non-blank, để trống sẽ làm service crash lúc khởi động. Đây là kiểu ghi chú
> "tại sao" rất có giá trị.

---

## 12. Điểm mạnh

### 12.1 Ranh giới service được phân chia đúng theo bounded context

Mỗi service sở hữu đúng một khái niệm nghiệp vụ rõ ràng và một database riêng. Không có bảng nào bị hai
service cùng ghi. Việc tách `application-service` khỏi `candidate-service` (ứng viên là *con người*, hồ sơ
ứng tuyển là *sự kiện ứng viên nộp vào một tin*) là một quyết định mô hình hóa chính xác — một ứng viên
có thể có nhiều hồ sơ ứng tuyển vào nhiều vị trí khác nhau.

### 12.2 Pipeline tuyển dụng động, cấu hình được bởi người dùng

Đây là điểm sáng nhất về mặt thiết kế dữ liệu. Thay vì hardcode enum trạng thái hồ sơ, hệ thống cho phép
`COMPANY_ADMIN` tự định nghĩa `RecruitmentPipeline` với danh sách `PipelineStage` tùy ý (tên, thứ tự,
`StageType`). `Application` snapshot stage hiện tại. Kết quả:

- Mỗi vị trí tuyển dụng có thể có quy trình riêng (ví dụ: vị trí kỹ thuật có 2 vòng phỏng vấn, vị trí
  hành chính chỉ 1 vòng)
- Thêm/bớt/đổi tên giai đoạn không cần sửa code, không cần deploy, không cần migration
- `StageType` đóng vai trò **hợp đồng ngữ nghĩa** giữa pipeline động và logic cứng: code chỉ cần biết
  `HIRED` và `REJECTED` là trạng thái kết thúc, `CV_SCREENING` là mốc cho phép xếp lịch PV

### 12.3 Mô hình bảo mật nhất quán và phòng thủ nhiều lớp

Đã phân tích chi tiết ở [mục 7](#7-mô-hình-bảo-mật--xác-thực). Điểm đáng khen nhất: filter ở gateway
**strip header identity ngay cả trên các path công khai** — đóng đúng lỗ hổng chí mạng của mô hình
trusted-header.

### 12.4 Xử lý lỗi có phân biệt "nghiệp vụ chính" và "tính năng phụ trợ"

Code thể hiện tư duy trưởng thành về việc thao tác nào được phép fail:

```java
// ApplicationService.applyReject() — Talent Pool là phụ trợ, không được làm hỏng reject
try {
    candidateServiceClient.markPool(application.getCandidateId(), Map.of("tag", reasonName));
} catch (Exception e) {
    // bỏ qua — Talent Pool là tính năng phụ trợ, không được làm fail thao tác reject
}
```

```java
// EmailNotificationService.sendSafe() — email lỗi thì chỉ log, không throw
```

```java
// ApplicationService.safeGetPosting() — service ngoài chết thì trả về placeholder
return new JobPostingResponse(jobPostingId, null, null, "Job #" + jobPostingId, null, null);
```

### 12.5 Thao tác hàng loạt fail-soft

`runBulk()` xử lý từng id độc lập và trả về `BulkOperationResponse(succeeded[], failed{id: lý do})`. Một
hồ sơ lỗi không làm hỏng cả lô, và người dùng biết chính xác cái nào lỗi vì sao. Đây là UX đúng cho thao
tác hàng loạt.

### 12.6 Fail-closed khi thiếu thông tin phân quyền

`ApplicationSpecifications` xử lý một tình huống bảo mật tinh tế: nếu một tài khoản nội bộ (không phải
admin) **không có** `departmentId` (ví dụ tài khoản cũ), thay vì trả về toàn bộ dữ liệu công ty, query sẽ
thêm `cb.disjunction()` (điều kiện luôn sai) → trả về rỗng. Comment trong code nói rõ chủ đích:
*"the query fails closed instead of returning the whole company dataset"*.

### 12.7 Comment giải thích "tại sao", không phải "cái gì"

Chất lượng comment trong dự án này cao hơn mức trung bình đáng kể. Ví dụ:

- `JobRequisition`: *"Mức lương do HR chốt duyệt — có thể khác với mức phòng ban đề xuất"*
- `Application.hiredAt`: *"Thời điểm chuyển sang stage type HIRED — dùng tính Time-to-Hire"*
- `StaleApplicationReminderJob`: *"Dùng updatedAt làm mốc... chấp nhận việc gán lại recruiter cũng làm
  mới mốc này, vì đây chỉ là nhắc nhở phụ trợ, không phải số liệu báo cáo chính xác"* — ghi nhận rõ ràng
  một đánh đổi đã cân nhắc
- `ApplicationService.applyAdvanceStage`: giải thích tại sao event listener phải gọi method này thay vì
  method có enrichment

### 12.8 Kiểm thử tập trung vào chỗ rủi ro nhất

39 file test không phân bổ đều mà tập trung vào bảo mật và phân quyền — đúng chỗ cần nhất:
`JwtAuthGlobalFilterTest`, `SecurityContextIntegrationTest`, `AuthorizationPolicyTest` (×2),
`*DepartmentAuthorizationTest` (×5), `AuthControllerSecurityTest`, `OfferCandidateResponseWorkflowTest`,
`OfferOutcomeListenerTest`, và 8 `SingleCompany*SchemaContractTest` chốt lại kết quả refactor bỏ tenant.

---

## 13. Điểm yếu & rủi ro

Sắp xếp theo mức độ nghiêm trọng. Mỗi mục đều kèm bằng chứng cụ thể ở dạng `file:dòng`.

### 🔴 R1 — `ApplicationService.getAll` có ba vấn đề hiệu năng chồng lên nhau

**File:** `application-service/src/main/java/iuh/fit/se/application/application/ApplicationService.java:56-120`

| # | Vấn đề | Dòng | Hệ quả |
|---|---|---|---|
| 1 | **Phân trang trong bộ nhớ** — `findAll(spec, Sort)` nạp **toàn bộ** hồ sơ khớp điều kiện vào RAM, map hết sang DTO, rồi mới `subList()` để cắt trang | 95, 108-112 | Với 50.000 hồ sơ, một request xem trang 1 (10 dòng) vẫn nạp và map đủ 50.000 bản ghi |
| 2 | **N+1 lời gọi Feign khi list** — `buildPostingMap()` gọi `safeGetPosting(id)` cho **từng** jobPostingId riêng biệt | 115-120 | 200 tin đăng khác nhau ⇒ 200 request HTTP tuần tự tới recruitment-service |
| 3 | **Enrichment bị vứt bỏ trong thao tác hàng loạt** — `runBulk` nhận `Consumer<Long>` nên **bỏ đi giá trị trả về**, nhưng `bulkAdvanceStage`/`bulkReject`/`bulkAssignRecruiter` lại gọi `advanceStage`/`reject`/`assignRecruiter` — những method kết thúc bằng `buildDetailedResponse` với **4 lời gọi Feign mỗi hồ sơ** | 417-433 | Xem chi tiết bên dưới |

**Chi tiết vấn đề 3 — đây mới là chỗ tốn kém nhất:**

```java
private BulkOperationResponse runBulk(List<Long> ids, java.util.function.Consumer<Long> action) {
//                                                    ^^^^^^^^^^^^^^^ Consumer → giá trị trả về BỊ VỨT
    for (Long id : ids) { action.accept(id); ... }
}

public BulkOperationResponse bulkAdvanceStage(Long actorUserId, BulkAdvanceStageRequest req) {
    return runBulk(req.ids(), id -> advanceStage(id, actorUserId, ...));
    //                              ^^^^^^^^^^^^ = buildDetailedResponse(true, applyAdvanceStage(...))
}
```

`buildDetailedResponse` thực hiện **4 lời gọi Feign** mỗi lần (`getRecruitmentSources`,
`getRejectionReasons`, `getUsers`, `getPostingById`), cộng thêm `getPipelineById` bên trong
`applyAdvanceStage` ⇒ **5 lời gọi HTTP cho mỗi hồ sơ**. Với một lô 50 hồ sơ: **250 lời gọi HTTP đồng bộ**,
trong đó **200 lời gọi là hoàn toàn vô ích** vì `ApplicationResponse` được dựng ra rồi bị vứt ngay.

**Điều trớ trêu kép:**
- Ngay phía trên đoạn code N+1 ở `buildPostingMap` có comment `/** ... (tránh N+1) */` — ý định của tác
  giả là tránh N+1 *ở tầng database*, nhưng lại tạo ra N+1 *ở tầng lời gọi mạng*, vốn đắt hơn nhiều lần.
- Codebase **đã có sẵn** đúng công cụ để sửa vấn đề 3: cặp method `applyAdvanceStage` / `applyReject`
  (không enrichment), kèm Javadoc giải thích rằng caller ngoài HTTP request phải dùng chúng. Đường bulk
  đơn giản là chưa được chuyển sang dùng.

**Tổng chi phí:** list = `3 + N` lời gọi HTTP + nạp toàn bộ kết quả vào RAM; bulk = `5 × M` lời gọi HTTP
(M = số hồ sơ trong lô). **Đây là lý do tôi chọn vấn đề này làm nhiệm vụ cho Codex.**

### 🔴 R2 — Không có bất kỳ cơ chế resilience nào

**Bằng chứng:** `grep -l "resilience4j\|circuitbreaker" --include=pom.xml` → **không có kết quả nào**.
Cũng không có cấu hình `feign.client.config.*.connectTimeout` / `readTimeout` ở bất kỳ `application.yml`
nào.

**Hệ quả cụ thể:**
- Feign dùng timeout mặc định (connect 10s, read **60s**)
- Nếu `masterdata-service` treo, mọi request list hồ sơ sẽ treo tối đa 60 giây/lời gọi
- Kết hợp với R1 (N+1): một `masterdata-service` chậm sẽ làm cạn kiệt thread pool của
  `application-service` → **sự cố lan truyền (cascading failure)** ra toàn hệ thống
- `dashboard-service` phụ thuộc 4 service — nó là nơi dễ sập nhất

**Giảm nhẹ một phần:** một số chỗ đã bọc `try/catch` (`safeGetPosting`, `safeList`), nhưng bắt exception
**không** giải quyết được vấn đề chờ 60 giây và không có ngắt mạch.

### 🟠 R3 — `ddl-auto: update` chạy song song với Flyway ở cả 8 service

**Bằng chứng:** cả 8 `application.yml` (auth, masterdata, recruitment, candidate, application, interview,
offer, notification) đều có đồng thời:
```yaml
jpa:
  hibernate:
    ddl-auto: update      # Hibernate tự sửa schema
flyway:
  enabled: true           # Flyway cũng quản lý schema
  baseline-on-migrate: true
```

**Vấn đề:** hai công cụ cùng có quyền sửa schema mà không phối hợp. Hibernate `update` chạy **sau**
Flyway và sẽ âm thầm thêm cột/bảng khi entity đổi. Hệ quả:
- Schema production **trôi dạt** khỏi lịch sử migration
- Một thay đổi entity có thể chạy được ở dev (nhờ `ddl-auto`) nhưng thiếu migration → hỏng khi deploy lên
  môi trường có `ddl-auto: validate`
- Hibernate `update` **không bao giờ** xóa cột hay đổi kiểu — schema tích tụ rác theo thời gian

**Khuyến nghị:** chuyển sang `ddl-auto: validate`, để Flyway là nguồn chân lý duy nhất về schema.

### 🟠 R4 — Bí mật hardcode trong file cấu hình đã commit

| Bí mật | Vị trí | Mức độ |
|---|---|---|
| Mật khẩu PostgreSQL `ats_password` | 8 file `application.yml`, dòng 10 | Không có placeholder biến môi trường — **buộc phải sửa code** khi deploy |
| Mật khẩu RabbitMQ `ats_password` | 8 file `application.yml`, dòng 23 | Tương tự |
| JWT secret mặc định | `api-gateway`, `auth-service`, `notification-service` | Có `${JWT_SECRET:...}` nên override được, nhưng giá trị fallback là secret hợp lệ và đã công khai trong repo |
| `minioadmin` / `minioadmin` | `candidate-service/application.yml:45` + `docker-compose.yml` | Credential mặc định |

**Rủi ro cao nhất:** JWT secret. Nếu triển khai mà quên set `JWT_SECRET`, bất kỳ ai đọc được repo đều có
thể **tự ký JWT hợp lệ** với `role: COMPANY_ADMIN` và chiếm toàn quyền hệ thống. Chuỗi mặc định là
`thay-bang-chuoi-bi-mat-it-nhat-256-bit-truoc-khi-deploy-thuc-te` — có nhắc nhở, nhưng không có cơ chế
nào ép buộc.

### 🟠 R5 — Hai cơ chế phân quyền song song cùng tồn tại

`recruitment-service`, `masterdata-service`, `candidate-service`, `interview-service`,
`notification-service` có **cả hai**:

| Cơ chế | Kiểu | Trạng thái |
|---|---|---|
| `AuthorizationPolicy` | Type-safe, dùng `enum Role`, switch expression vét cạn | Mới, đầy đủ, có test |
| `AccessGuard` | Dựa trên `String role`, so sánh chuỗi | Cũ — có hằng số **tự đánh dấu** `@deprecated Dùng requireHr() hoặc requireDepartment() cho rõ nghiệp vụ` |

Việc refactor rõ ràng đã bắt đầu nhưng chưa hoàn tất. Rủi ro: lập trình viên mới không biết dùng cái nào,
và `AccessGuard` dựa trên so sánh chuỗi nên một lỗi chính tả (`"RECRUTER"`) sẽ **không** bị compiler bắt —
nó chỉ âm thầm từ chối quyền, hoặc tệ hơn, cấp quyền sai.

### 🟡 R6 — Trùng lặp code do không có shared library

Mỗi service tự giữ bản sao riêng của: `CurrentUser`, `AuthorizationPolicy`, `TrustedHeaderAuthenticationFilter`,
`FeignClientConfig`, `PageResponse`, `BusinessException`, `GlobalExceptionHandler`, `AuditEvent`,
`AuditEventPublisher`, `OpenApiConfig`, `SecurityConfig`, và toàn bộ DTO liên service
(`UserSummaryResponse`, `CatalogItemResponse`, `PipelineResponse`...).

**Ước tính:** ~8 bản sao × ~11 class ≈ **90 file trùng lặp**.

Đây là đánh đổi có thể chấp nhận trong triết lý microservice (tránh coupling qua shared jar), nhưng ở quy
mô này nó tạo rủi ro thực: **một bản vá bảo mật cho `TrustedHeaderAuthenticationFilter` phải sửa đúng 8
chỗ**, và không có gì đảm bảo cả 8 chỗ đều được sửa.

### 🟡 R7 — Rủi ro head-of-line blocking ở hàng đợi nhắc lịch

Đã phân tích ở [mục 9.2](#92-cơ-chế-nhắc-lịch-có-độ-trễ-delayed-message--điểm-kỹ-thuật-đáng-chú-ý). Một
nhắc nhở cho lịch phỏng vấn **tuần sau** được publish trước một nhắc nhở cho lịch **1 giờ nữa** sẽ khiến
nhắc nhở gấp bị kẹt cả tuần.

**Giải pháp:** cài plugin `rabbitmq_delayed_message_exchange`, hoặc thay bằng bảng lịch trong DB kết hợp
`@Scheduled` quét định kỳ.

### 🟡 R8 — Không có service discovery và không có health/metrics endpoint

- URL service là hằng số cứng qua biến môi trường → không scale ngang được, không rolling deploy được
- **Không service nào có `spring-boot-starter-actuator`** → không có `/health`, `/metrics`, `/info`
- `docker-compose.yml` có `healthcheck` cho postgres và rabbitmq nhưng **không có** cho 9 service Java →
  `depends_on` chỉ đợi container khởi động, không đợi ứng dụng sẵn sàng

### 🟡 R9 — Độ phủ test không đồng đều

| Service | Số file test | Ghi chú |
|---|---|---|
| auth-service | 10 | Tốt |
| application-service | 4 | **Chưa phủ state machine** (`advanceStage`, `reject`, `bulk*`) |
| recruitment-service | 5 | Chưa phủ `JobPostingService` state machine |
| offer-service | 4 | Có test workflow ứng viên |
| interview-service | 3 | Chưa phủ `InterviewSlotService`, `InterviewEvaluationService` |
| candidate-service | 4 | |
| masterdata-service | 3 | 64 endpoint / 3 test |
| notification-service | 2 | **Không có test nào cho `BusinessEventListener`** (11 listener) |
| dashboard-service | **1** | Chỉ có context-load test — toàn bộ logic tính funnel/time-to-hire chưa được kiểm chứng |
| **Frontend** | **0** | Không có test runner nào trong `package.json` |

### 🔵 R10 — Các quan sát nhỏ hơn

| # | Quan sát | Vị trí |
|---|---|---|
| a | `show-sql: true` bật ở cả 8 service → log production sẽ đầy SQL, ảnh hưởng hiệu năng | 8 × `application.yml:14` |
| b | `spring-boot-devtools` là dependency của gateway (scope runtime) | `api-gateway/pom.xml` |
| c | `RequisitionDetailModal.tsx` dài **1.388 dòng** — quá lớn cho một component | frontend |
| d | Redux có RTK Query nhưng không dùng → không có cache, dữ liệu fetch lại mỗi lần vào trang | `store.ts` |
| e | `axiosClient.ts` có 2 cơ chế chống race refresh song song (`refreshPromise` và `isRefreshing`+`failedQueue`) | `axiosClient.ts` |
| f | Thư mục `.idea/` của IntelliJ được commit vào git ở cả 10 service | toàn repo |
| g | Thông báo lỗi trộn lẫn tiếng Việt có dấu và không dấu (`"Vui long chon ung vien"` vs `"Chỉ ứng tuyển được..."`) | `ApplicationService.java:238` |
| h | Không có CI/CD (không có `.github/workflows/`, `Jenkinsfile`, `.gitlab-ci.yml`) | toàn repo |

---

## 14. Bộ prompt giao cho Codex (chia nhỏ theo từng việc)

Toàn bộ công việc sửa R1 được chia thành **5 prompt độc lập**, mỗi prompt là một phiên Codex riêng.
Lý do chia nhỏ: mỗi phiên chạy gọn, dễ review từng bước, và nếu hết quota giữa chừng thì phần đã làm
xong vẫn có giá trị độc lập — không để lại code dở dang.

### 14.0 Thứ tự chạy và quan hệ phụ thuộc

```
   ĐỘC LẬP HOÀN TOÀN — chạy được ngay, theo thứ tự nào cũng được
   ┌──────────────────────────────────────────────────────────────┐
   │  P1  Sửa thao tác hàng loạt        →  250 lời gọi → 50       │  ⭐ lợi ích lớn nhất
   │      (application-service)            (lô 50 hồ sơ)           │     thay đổi nhỏ nhất
   ├──────────────────────────────────────────────────────────────┤
   │  P2  Phân trang ở tầng database    →  hết nạp toàn bộ vào RAM│
   │      (application-service)                                    │
   ├──────────────────────────────────────────────────────────────┤
   │  P3  Batch endpoint                →  mở đường cho P4        │
   │      (recruitment-service)                                    │
   └──────────────────────────────────────────────────────────────┘
                              │ P4 CẦN P3 xong trước
                              ▼
   ┌──────────────────────────────────────────────────────────────┐
   │  P4  Dùng batch endpoint           →  23 lời gọi → 4          │
   │      (application-service)            (list 100 hồ sơ)        │
   └──────────────────────────────────────────────────────────────┘
                              │ P5 CẦN tất cả xong trước
                              ▼
   ┌──────────────────────────────────────────────────────────────┐
   │  P5  Chạy regression + báo cáo tổng                           │
   └──────────────────────────────────────────────────────────────┘
```

**Khuyến nghị thứ tự:** `P1 → P2 → P3 → P4 → P5`.

P1 đứng đầu vì nó có **tỉ lệ lợi ích/công sức cao nhất**: chỉ sửa 3 dòng gọi method, nhưng cắt được 200
lời gọi HTTP vô ích mỗi lô. Nếu bạn chỉ kịp chạy đúng một prompt, hãy chạy P1.

**Sau mỗi prompt:** kiểm tra bằng checklist tương ứng ở [mục 15](#15-tiêu-chí-review-kết-quả-codex) rồi
mới sang prompt kế tiếp. Nếu một prompt fail, **đừng chạy prompt sau** — sửa xong đã.

> **Cách copy:** mỗi prompt nằm trong một khối ```` ``` ```` riêng. Copy trọn khối (đã bao gồm phần ngữ
> cảnh) và dán vào một phiên Codex mới. Mỗi prompt tự đứng độc lập, không cần Codex nhớ phiên trước.

---

### 14.1 — P1: Sửa thao tác hàng loạt (application-service)

**Ước lượng:** nhỏ · **Phụ thuộc:** không · **Lợi ích:** 250 → 50 lời gọi HTTP cho lô 50 hồ sơ

````
# NHIỆM VỤ: Bỏ enrichment thừa trong các thao tác hàng loạt của ApplicationService

## Ngữ cảnh

Dự án ATS microservices, Java 21 + Spring Boot 3.3.4 + Spring Data JPA + OpenFeign.
Service liên quan: `application-service` (package gốc `iuh.fit.se.application`).
File duy nhất cần sửa:
  application-service/src/main/java/iuh/fit/se/application/application/ApplicationService.java

## Vấn đề

`runBulk` nhận `Consumer<Long>` nên VỨT BỎ giá trị trả về:

```java
private BulkOperationResponse runBulk(List<Long> ids, java.util.function.Consumer<Long> action) {
//                                                    ^^^^^^^^^^^^^ giá trị trả về bị vứt
    for (Long id : ids) {
        try { action.accept(id); succeeded.add(id); }
        catch (BusinessException e) { failed.put(id, e.getMessage()); }
    }
}
```

Nhưng cả 3 method bulk lại gọi biến thể CÓ enrichment:

```java
public BulkOperationResponse bulkAdvanceStage(Long actorUserId, BulkAdvanceStageRequest req) {
    return runBulk(req.ids(), id -> advanceStage(id, actorUserId, ...));
    //                              ^^^^^^^^^^^^ = buildDetailedResponse(true, applyAdvanceStage(...))
}
public BulkOperationResponse bulkReject(Long actorUserId, BulkRejectRequest req) {
    return runBulk(req.ids(), id -> reject(id, actorUserId, ...));
}
public BulkOperationResponse bulkAssignRecruiter(Long actorUserId, BulkAssignRecruiterRequest req) {
    return runBulk(req.ids(), id -> assignRecruiter(id, actorUserId, req.assignedRecruiterId()));
}
```

`buildDetailedResponse` thực hiện 4 lời gọi Feign mỗi lần:
```java
private ApplicationResponse buildDetailedResponse(boolean includeInternalUserNames, Application application) {
    masterDataServiceClient.getRecruitmentSources();   // ①
    masterDataServiceClient.getRejectionReasons();     // ②
    authServiceClient.getUsers(null);                  // ③
    safeGetPosting(application.getJobPostingId());     // ④
    ...
}
```

=> Lô 50 hồ sơ = 250 lời gọi HTTP, trong đó 200 hoàn toàn vô ích vì kết quả bị vứt.

## Yêu cầu

1. `bulkAdvanceStage` gọi `applyAdvanceStage(...)` thay cho `advanceStage(...)`.

2. `bulkReject` gọi `applyReject(...)` thay cho `reject(...)`.

   LƯU Ý: `applyAdvanceStage` và `applyReject` ĐÃ TỒN TẠI SẴN trong class, trả về
   `Application`, kèm Javadoc giải thích đúng mục đích này. KHÔNG viết mới, chỉ
   chuyển đường bulk sang dùng chúng.

3. `bulkAssignRecruiter`: hiện `assignRecruiter` vừa thay đổi dữ liệu vừa enrich.
   Hãy tách ra:
   - Tạo method private `applyAssignRecruiter(Long id, Long actorUserId, Long assignedRecruiterId)`
     trả về `Application`, chứa toàn bộ logic hiện có của `assignRecruiter`
     NGOẠI TRỪ dòng `return buildDetailedResponse(true, application);`
   - `assignRecruiter` (public, giữ nguyên chữ ký) trở thành:
     `return buildDetailedResponse(true, applyAssignRecruiter(id, actorUserId, assignedRecruiterId));`
   - `bulkAssignRecruiter` gọi thẳng `applyAssignRecruiter(...)`

4. Nếu `runBulk` cần đổi kiểu tham số để nhận các method trả về `Application`,
   được phép đổi (ví dụ sang `Consumer<Long>` giữ nguyên, hoặc dùng lambda bỏ giá
   trị). Miễn là hành vi fail-soft không đổi.

## Ràng buộc BẮT BUỘC

- KHÔNG đổi chữ ký public của `advanceStage`, `reject`, `assignRecruiter`,
  `bulkAdvanceStage`, `bulkReject`, `bulkAssignRecruiter`
- KHÔNG đổi `BulkOperationResponse` (record với `succeeded` và `failed`)
- GIỮ NGUYÊN hành vi fail-soft của `runBulk`: lỗi 1 id không chặn các id còn lại,
  id lỗi được ghi vào map `failed` kèm message
- GIỮ NGUYÊN việc ghi `ApplicationHistory` và publish event ở mỗi thao tác
- GIỮ NGUYÊN hành vi khi gọi ĐƠN LẺ: `advanceStage`/`reject`/`assignRecruiter` vẫn
  phải trả về `ApplicationResponse` đầy đủ y như cũ
- KHÔNG sửa `ApplicationController`
- KHÔNG sửa file nào khác ngoài `ApplicationService.java` và file test mới
- KHÔNG thêm dependency vào pom.xml

## Test

Tạo file:
  application-service/src/test/java/iuh/fit/se/application/application/ApplicationBulkOperationTest.java

Dùng Mockito mock `MasterDataServiceClient`, `AuthServiceClient`, `RecruitmentServiceClient`,
`ApplicationRepository`, `ApplicationHistoryRepository`, `ApplicationEventPublisher`,
`AuditEventPublisher`, `CandidateServiceClient`, `ApplicationCommentRepository`.

Các test bắt buộc có:
- `bulkAdvanceStage` với 10 id → verify `authServiceClient.getUsers(any())` được gọi
  ĐÚNG 0 lần (trước khi sửa là 10 lần)
- `bulkAdvanceStage` với 10 id → verify `masterDataServiceClient.getRecruitmentSources()`
  được gọi ĐÚNG 0 lần
- `bulkAdvanceStage` với 10 id → `BulkOperationResponse.succeeded()` có đúng 10 id
- Fail-soft: 10 id trong đó id thứ 5 ném `BusinessException` → `succeeded` có 9 id,
  `failed` chứa đúng id thứ 5 kèm message
- `bulkReject` với 5 id → verify `getUsers` gọi 0 lần
- Gọi ĐƠN LẺ `advanceStage(id, ...)` → verify vẫn trả `ApplicationResponse` đầy đủ
  và `getUsers` ĐƯỢC gọi (chứng minh không phá hành vi cũ)

## Chạy và báo cáo

Chạy: `cd application-service && ./mvnw test`

Báo cáo:
1. File đã sửa, file đã tạo
2. Số lời gọi HTTP cho `bulkAdvanceStage` 50 id: TRƯỚC và SAU (kỳ vọng 250 → 50)
3. Output đầy đủ của `./mvnw test`
4. Giả định nào bạn phải tự đưa ra

## KHÔNG LÀM GÌ THÊM

Đây là nhiệm vụ có phạm vi hẹp. KHÔNG sửa `getAll`, KHÔNG sửa `buildPostingMap`,
KHÔNG thêm batch endpoint, KHÔNG refactor gì khác. Các việc đó thuộc nhiệm vụ khác.
````

---

### 14.2 — P2: Phân trang ở tầng database (application-service)

**Ước lượng:** nhỏ · **Phụ thuộc:** không · **Lợi ích:** hết nạp toàn bộ bảng vào RAM

````
# NHIỆM VỤ: Chuyển ApplicationService.getAll từ phân trang in-memory sang phân trang ở database

## Ngữ cảnh

Dự án ATS microservices, Java 21 + Spring Boot 3.3.4 + Spring Data JPA.
Service liên quan: `application-service` (package gốc `iuh.fit.se.application`).
File cần sửa:
  application-service/src/main/java/iuh/fit/se/application/application/ApplicationService.java
Method: `getAll(...)`, khoảng dòng 56-113.

`ApplicationRepository` đã extend `JpaSpecificationExecutor<Application>` nên có sẵn
overload `findAll(Specification, Pageable)`.

`PageResponse` (trong `iuh.fit.se.application.common`) đã có sẵn factory:
```java
public static <T> PageResponse<T> of(Page<T> page)        // dùng cho nhánh có phân trang
public static <T> PageResponse<T> unpaged(List<T> all)    // dùng cho nhánh không phân trang
```

## Vấn đề

```java
List<Application> scopedApplications = applicationRepository
        .findAll(spec, Sort.by(Sort.Direction.DESC, "createdAt"));   // nạp TOÀN BỘ vào RAM
Map<Long, JobPostingResponse> postingMap = buildPostingMap(scopedApplications);
List<ApplicationResponse> responses = scopedApplications.stream()
        .map(application -> toResponse(...))                          // map TOÀN BỘ sang DTO
        .toList();

if (page == null && size == null) {
    return PageResponse.unpaged(responses);
}
int pageNumber = page != null ? page : 0;
int pageSize = size != null ? size : 10;
int fromIndex = Math.min(pageNumber * pageSize, responses.size());
int toIndex = Math.min(fromIndex + pageSize, responses.size());
int totalPages = responses.isEmpty() ? 0 : (int) Math.ceil((double) responses.size() / pageSize);
return new PageResponse<>(responses.subList(fromIndex, toIndex), responses.size(),
        totalPages, pageNumber, pageSize);
```

Xem trang 1 (10 dòng) vẫn nạp và map toàn bộ hồ sơ khớp điều kiện. Với 50.000 hồ sơ
là 50.000 bản ghi được nạp và map để trả về 10 dòng.

## Yêu cầu

1. Tách thành 2 nhánh rõ ràng:

   NHÁNH A — có phân trang (`page != null || size != null`):
   - Dùng `applicationRepository.findAll(spec, PageRequest.of(pageNumber, pageSize,
     Sort.by(Sort.Direction.DESC, "createdAt")))`
   - CHỈ map sang DTO các bản ghi của trang hiện tại
   - `buildPostingMap` chỉ nhận danh sách của trang hiện tại, không phải toàn bộ
   - Trả về qua `PageResponse.of(page.map(...))` hoặc dựng `PageResponse` thủ công
     từ `Page.getTotalElements()` / `getTotalPages()` / `getNumber()` / `getSize()`

   NHÁNH B — không phân trang (`page == null && size == null`):
   - GIỮ NGUYÊN hành vi hiện tại: `findAll(spec, Sort)` + `PageResponse.unpaged(...)`
   - Nhánh này bắt buộc phải giữ vì nhiều màn hình frontend đang dựa vào việc lấy
     hết dữ liệu (ví dụ Kanban board)

2. Giá trị mặc định giữ nguyên: `pageNumber = page != null ? page : 0`,
   `pageSize = size != null ? size : 10`

3. GIỮ NGUYÊN 100% đoạn code xác định phân quyền ở đầu method — toàn bộ phần tính
   `effectiveCandidateId`, `scopeDepartmentId`, `scopeAssignedRecruiterId`,
   `restrictToScope`, và lời gọi `ApplicationSpecifications.build(...)`.
   TUYỆT ĐỐI KHÔNG sửa phần này.

## Ràng buộc BẮT BUỘC

- KHÔNG đổi chữ ký `getAll(...)`
- KHÔNG đổi chữ ký `ApplicationController.getAll(...)`
- KHÔNG đổi hình dạng JSON của `PageResponse` — 5 trường `content`, `totalItems`,
  `totalPages`, `pageNumber`, `pageSize` phải giữ nguyên tên và ý nghĩa
- KHÔNG sửa `ApplicationSpecifications.java` — logic fail-closed ở đó đã đúng
- KHÔNG sửa `PageResponse.java`
- KHÔNG đụng tới `buildPostingMap` (việc đó thuộc nhiệm vụ khác) — chỉ đổi
  danh sách truyền vào nó
- KHÔNG thêm dependency vào pom.xml
- KHÔNG tạo migration Flyway

## Test

Tạo file:
  application-service/src/test/java/iuh/fit/se/application/application/ApplicationListPaginationTest.java

Các test bắt buộc có:
- Khi request có `page=0, size=20` → verify `applicationRepository.findAll(any(Specification.class),
  any(Pageable.class))` ĐƯỢC gọi, và `findAll(any(Specification.class), any(Sort.class))`
  KHÔNG được gọi
- Khi `page = null` và `size = null` → verify `findAll(spec, Sort)` được gọi và kết quả
  là `unpaged` (totalPages = 1, pageSize = tổng số phần tử)
- Khi chỉ truyền `size = 5` (page null) → dùng phân trang với pageNumber = 0
- Kiểm tra `PageResponse` trả về có đủ 5 trường với giá trị đúng: với 47 bản ghi,
  `page=2, size=20` → `totalItems=47`, `totalPages=3`, `pageNumber=2`, `pageSize=20`,
  `content` có 7 phần tử

## Chạy và báo cáo

Chạy: `cd application-service && ./mvnw test`

Các test cũ sau BẮT BUỘC vẫn xanh:
- ApplicationAuthorizationTest
- ApplicationListScopeSpecificationTest
- SingleCompanyApplicationSchemaContractTest
- OfferOutcomeListenerTest

Báo cáo:
1. File đã sửa, file đã tạo
2. Với 50.000 hồ sơ và request `page=0&size=10`: số bản ghi được nạp vào RAM
   TRƯỚC và SAU khi sửa
3. Output đầy đủ của `./mvnw test`
4. Giả định nào bạn phải tự đưa ra

## KHÔNG LÀM GÌ THÊM

KHÔNG sửa các method bulk, KHÔNG sửa `buildPostingMap`, KHÔNG thêm batch endpoint.
Các việc đó thuộc nhiệm vụ khác.
````

---

### 14.3 — P3: Batch endpoint (recruitment-service)

**Ước lượng:** vừa · **Phụ thuộc:** không · **Lợi ích:** mở đường cho P4

> ⚠ **Cảnh báo quan trọng đã được đưa vào prompt:** `JobPostingService` có method
> `toResponse(JobPosting p)` một tham số, và method này **tự gọi 2 lời gọi Feign**
> (`getDepartments()` + `getUsers(null)`). Nếu batch endpoint viết kiểu
> `ids.stream().map(this::toResponse)` thì nó sẽ tạo **2N lời gọi Feign bên trong
> recruitment-service** — tức là chỉ dời N+1 sang chỗ khác chứ không hề giải quyết,
> thậm chí còn tệ hơn. Prompt bên dưới đã chốt cứng việc phải dùng overload 5 tham số.

````
# NHIỆM VỤ: Thêm batch endpoint tra cứu nhiều JobPosting cùng lúc

## Ngữ cảnh

Dự án ATS microservices, Java 21 + Spring Boot 3.3.4 + Spring Data JPA + OpenFeign.
Service cần sửa: `recruitment-service` (package gốc `iuh.fit.se.recruitment`),
thư mục `src/main/java/iuh/fit/se/recruitment/posting/`.

Xác thực: gateway verify JWT rồi bơm header `X-User-Id`, `X-User-Email`,
`X-User-Role`, `X-Department-Id`. `TrustedHeaderAuthenticationFilter` dựng
`CurrentUser`. Trong controller lấy actor bằng `CurrentUser.required()`.

Các thành phần đã có sẵn:
```java
// JobPostingRepository
Optional<JobPosting> findByIdAndDeletedAtIsNull(Long id);
boolean existsByRequisition_IdAndDeletedAtIsNull(Long requisitionId);
List<JobPosting> findByStatusAndDeletedAtIsNullOrderByCreatedAtDesc(PostingStatus status);

// JobPosting entity
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "requisition_id", nullable = false)
private JobRequisition requisition;

// JobPostingService — method getById hiện có, đây là chuẩn phân quyền cần copy
public JobPostingResponse getById(Long id, CurrentUser actor) {
    JobPosting posting = findById(id);
    JobRequisition requisition = posting.getRequisition();
    AuthorizationPolicy.requireCanViewJob(
            actor, requisition.getDepartmentId(), requisition.getApproverId());
    return toResponse(posting);
}

// AuthorizationPolicy — có sẵn cả 2 biến thể
public static boolean canViewJob(CurrentUser actor, Long departmentId, Long approverId)
public static void requireCanViewJob(CurrentUser actor, Long departmentId, Long approverId)
```

## Yêu cầu

### 1. Repository

Thêm vào `JobPostingRepository` một method nạp nhiều posting cùng lúc,
KÈM THEO nạp sẵn quan hệ `requisition` trong CÙNG MỘT query:

```java
@Query("SELECT p FROM JobPosting p JOIN FETCH p.requisition WHERE p.id IN :ids AND p.deletedAt IS NULL")
List<JobPosting> findAllByIdInWithRequisition(@Param("ids") List<Long> ids);
```

(Hoặc dùng `@EntityGraph` — miễn là `requisition` được nạp trong cùng query.)

LÝ DO BẮT BUỘC: `JobPosting.requisition` là `@ManyToOne(fetch = LAZY)`. Nếu không
JOIN FETCH, việc đọc `posting.getRequisition().getDepartmentId()` trong vòng lặp
phân quyền sẽ sinh ra N query phụ — tức là vẫn còn N+1, chỉ là ở tầng JPA.

### 2. Service

Thêm vào `JobPostingService`:

```java
public List<JobPostingResponse> getByIds(List<Long> ids, CurrentUser actor)
```

Hành vi bắt buộc:
- `ids` null hoặc rỗng → trả về `List.of()`, KHÔNG ném exception
- Loại bỏ id trùng lặp và id null trước khi truy vấn
- Nếu số id (sau khi khử trùng) > 200 → ném `BusinessException` với thông báo
  tiếng Việt có dấu, ví dụ: "Chỉ tra cứu tối đa 200 tin tuyển dụng mỗi lần"
- Gọi repository ĐÚNG MỘT LẦN cho toàn bộ danh sách id
- Với mỗi posting lấy được, lọc phân quyền bằng:
  ```java
  AuthorizationPolicy.canViewJob(actor, requisition.getDepartmentId(), requisition.getApproverId())
  ```
  Posting nào actor KHÔNG có quyền xem thì BỎ QUA IM LẶNG — không đưa vào kết quả,
  KHÔNG ném exception. (Dùng biến thể `canViewJob` trả về boolean, KHÔNG dùng
  `requireCanViewJob` vì nó ném exception.)
- Id không tồn tại hoặc đã soft-delete → đơn giản là không có trong kết quả

### 3. ⚠ ĐIỂM QUAN TRỌNG NHẤT — cách dựng response

`JobPostingService` có HAI overload của `toResponse`:

```java
// ❌ TUYỆT ĐỐI KHÔNG DÙNG trong vòng lặp — mỗi lần gọi là 2 lời gọi Feign
private JobPostingResponse toResponse(JobPosting p) {
    Map<Long, String> deptMap = buildCatalogMap(masterDataServiceClient.getDepartments()); // Feign!
    return toResponse(p, Map.of(), Map.of(), deptMap, buildUserNameMap());                 // Feign!
}

// ✅ PHẢI DÙNG CÁI NÀY — nhận sẵn các map, không gọi Feign
private JobPostingResponse toResponse(
        JobPosting p, Map<Long, String> empMap, Map<Long, String> locMap,
        Map<Long, String> deptMap, Map<Long, String> userNameMap)
```

Trong `getByIds`, PHẢI:
- Dựng `deptMap` và `userNameMap` ĐÚNG MỘT LẦN, TRƯỚC vòng lặp
- Rồi gọi overload 5 tham số cho từng posting

Đây chính là mẫu mà method `getOpen(...)` hiện có đã làm đúng — hãy tham khảo nó:
```java
public List<JobPostingResponse> getOpen(Long employmentTypeId, Long workLocationId) {
    Map<Long, String> empMap = buildCatalogMap(masterDataServiceClient.getEmploymentTypes());
    Map<Long, String> locMap = buildCatalogMap(masterDataServiceClient.getWorkLocations());
    Map<Long, String> deptMap = buildCatalogMap(masterDataServiceClient.getDepartments());
    return repository.findByStatus...().stream()
            .map(p -> toResponse(p, empMap, locMap, deptMap, Map.of()))   // maps dựng 1 lần
            .toList();
}
```

Nếu dùng nhầm overload 1 tham số trong vòng lặp, batch endpoint sẽ tạo 2N lời gọi
Feign bên trong recruitment-service — tức là làm TỆ HƠN tình trạng hiện tại. Đây là
lỗi nghiêm trọng nhất có thể mắc ở nhiệm vụ này.

### 4. Controller

Thêm vào `JobPostingController`:

```java
@GetMapping("/batch")
public ResponseEntity<List<JobPostingResponse>> getByIds(@RequestParam(required = false) List<Long> ids) {
    CurrentUser actor = CurrentUser.required();
    return ResponseEntity.ok(service.getByIds(ids, actor));
}
```

Endpoint đầy đủ: `GET /api/recruitment/postings/batch?ids=1,2,3`

KHÔNG cần đăng ký route ở gateway — gateway định tuyến theo prefix
`/api/recruitment/**` nên endpoint mới tự động hoạt động.

⚠ Đặt `@GetMapping("/batch")` TRƯỚC `@GetMapping("/{id}")` trong file để tránh
Spring hiểu nhầm "batch" là một `{id}`.

## Ràng buộc BẮT BUỘC

- KHÔNG sửa `AuthorizationPolicy.java`
- KHÔNG sửa method `getById`, `getAll`, `getOpen`, `getOpenById` hiện có
- KHÔNG đổi record `JobPostingResponse`
- KHÔNG thêm dependency vào pom.xml
- KHÔNG tạo migration Flyway (nhiệm vụ này không đổi schema)
- Giữ phong cách code hiện có: Lombok `@RequiredArgsConstructor`, Java `record` cho
  DTO, thông báo lỗi tiếng Việt có dấu

## Test

Tạo file:
  recruitment-service/src/test/java/iuh/fit/se/recruitment/posting/JobPostingBatchLookupTest.java

Các test bắt buộc có:
- `COMPANY_ADMIN` gọi với 3 id hợp lệ → nhận đủ 3 posting
- `HIRING_MANAGER` thuộc phòng ban A gọi với 3 id (2 posting của phòng A, 1 của
  phòng B) → chỉ nhận 2 posting của phòng A, KHÔNG ném exception
- `RECRUITER` khác phòng ban nhưng là approver của 1 posting → vẫn thấy posting đó
  (khớp đúng logic `canViewJob`)
- `ids` null → trả `List.of()`
- `ids` rỗng → trả `List.of()`
- 201 id → ném `BusinessException`
- Id không tồn tại / đã soft-delete → bị loại khỏi kết quả, không lỗi
- Gọi với 5 id → verify `masterDataServiceClient.getDepartments()` được gọi ĐÚNG 1 lần
  (KHÔNG phải 5 lần) — đây là test chứng minh không dùng nhầm overload toResponse
- Gọi với 5 id → verify `authServiceClient.getUsers(any())` được gọi ĐÚNG 1 lần
- Gọi với 5 id → verify repository được gọi ĐÚNG 1 lần

## Chạy và báo cáo

Chạy: `cd recruitment-service && ./mvnw test`

Các test cũ sau BẮT BUỘC vẫn xanh:
- JobPostingDepartmentAuthorizationTest
- JobRequisitionDepartmentAuthorizationTest
- AuthorizationPolicyTest
- SecurityContextIntegrationTest
- SingleCompanyRecruitmentSchemaContractTest

Báo cáo:
1. File đã sửa, file đã tạo
2. Với 20 id: số query DB và số lời gọi Feign mà `getByIds` thực hiện
   (kỳ vọng: 1 query DB, 2 lời gọi Feign — KHÔNG phụ thuộc số id)
3. Output đầy đủ của `./mvnw test`
4. Giả định nào bạn phải tự đưa ra

## KHÔNG LÀM GÌ THÊM

KHÔNG sửa `application-service` (việc đó thuộc nhiệm vụ khác). Nhiệm vụ này chỉ
tạo endpoint ở phía `recruitment-service`.
````

---

### 14.4 — P4: Dùng batch endpoint (application-service)

**Ước lượng:** vừa · **Phụ thuộc:** ⚠ **P3 phải xong trước** · **Lợi ích:** 23 → 4 lời gọi khi list

````
# NHIỆM VỤ: Thay N+1 lời gọi Feign bằng một lời gọi batch trong ApplicationService

## Điều kiện tiên quyết

Nhiệm vụ này CẦN endpoint `GET /api/recruitment/postings/batch?ids=1,2,3` đã tồn tại
ở `recruitment-service` và trả về `List<JobPostingResponse>`. Nếu endpoint đó chưa
có, hãy DỪNG LẠI và báo cho tôi, đừng tự tạo nó.

## Ngữ cảnh

Dự án ATS microservices, Java 21 + Spring Boot 3.3.4 + OpenFeign.
Service cần sửa: `application-service` (package gốc `iuh.fit.se.application`).

Files liên quan:
- application-service/src/main/java/iuh/fit/se/application/client/RecruitmentServiceClient.java
- application-service/src/main/java/iuh/fit/se/application/application/ApplicationService.java

`FeignClientConfig` đã tự động forward 4 header identity (`X-User-Id`, `X-User-Email`,
`X-User-Role`, `X-Department-Id`) sang service được gọi — không cần làm gì thêm về
phân quyền ở phía client.

## Vấn đề

```java
/** Lấy thông tin (title, department) của tất cả job posting liên quan (tránh N+1). */
private Map<Long, JobPostingResponse> buildPostingMap(List<Application> applications) {
    return applications.stream()
            .map(Application::getJobPostingId)
            .distinct()
            .collect(Collectors.toMap(id -> id, id -> safeGetPosting(id), (a, b) -> a));
            //                                    ^^^^^^^^^^^^^^^^^^^^^ 1 request HTTP MỖI id
}

private JobPostingResponse safeGetPosting(Long jobPostingId) {
    try {
        return recruitmentServiceClient.getPostingById(jobPostingId);
    } catch (Exception e) {
        return new JobPostingResponse(jobPostingId, null, null, "Job #" + jobPostingId, null, null);
    }
}
```

20 tin đăng khác nhau = 20 request HTTP tuần tự tới `recruitment-service`.

## Yêu cầu

### 1. Thêm khai báo Feign

Trong `RecruitmentServiceClient`:

```java
@GetMapping("/api/recruitment/postings/batch")
List<JobPostingResponse> getPostingsByIds(@RequestParam("ids") List<Long> ids);
```

GIỮ NGUYÊN method `getPostingById` hiện có — nó vẫn được dùng ở chỗ khác.

### 2. Sửa `buildPostingMap`

Hành vi mới bắt buộc:
- Gom toàn bộ `jobPostingId` distinct từ danh sách applications
- Danh sách rỗng → trả `Map.of()`, KHÔNG gọi Feign
- Gọi `getPostingsByIds(...)` — với ≤ 200 id thì ĐÚNG 1 lời gọi
- Nếu > 200 id: tự chia thành các lô 200 và gọi nhiều lần (vì endpoint batch giới
  hạn 200 id mỗi lần)
- BỌC try/catch: nếu lời gọi batch thất bại, KHÔNG được ném exception ra ngoài —
  giữ đúng tinh thần fail-soft của `safeGetPosting` hiện tại
- Với id nào KHÔNG có trong kết quả trả về (do bị lọc phân quyền ở phía
  recruitment-service, do đã bị xóa, hoặc do lời gọi thất bại), tạo placeholder
  GIỐNG HỆT `safeGetPosting` đang làm:
  ```java
  new JobPostingResponse(jobPostingId, null, null, "Job #" + jobPostingId, null, null)
  ```
  Nghĩa là map trả về PHẢI có đủ key cho MỌI jobPostingId được truyền vào.

### 3. GIỮ NGUYÊN `safeGetPosting`

KHÔNG xóa method `safeGetPosting(Long)`. Nó vẫn còn được gọi ở:
- `buildDetailedResponse(...)` (khoảng dòng 159)
- `getSummaryById(...)` (khoảng dòng 584)

Hai chỗ đó chỉ xử lý MỘT application nên gọi đơn lẻ là đúng, không cần đổi.

## Ràng buộc BẮT BUỘC

- KHÔNG đổi hình dạng JSON của bất kỳ response API nào
- KHÔNG đổi chữ ký `getAll(...)` hay `ApplicationController.getAll(...)`
- KHÔNG sửa `ApplicationSpecifications.java`
- KHÔNG sửa `recruitment-service` (endpoint batch đã có sẵn từ nhiệm vụ trước)
- KHÔNG nới lỏng bất kỳ kiểm tra phân quyền nào
- KHÔNG thêm cache tầng ứng dụng (Redis, Caffeine, `@Cacheable`) — nhiệm vụ này chỉ
  gom lời gọi, không thêm tầng cache
- KHÔNG thêm dependency vào pom.xml
- KHÔNG tạo migration Flyway

## Test

Tạo file:
  application-service/src/test/java/iuh/fit/se/application/application/ApplicationPostingBatchLookupTest.java

Các test bắt buộc có:
- List 25 hồ sơ thuộc 5 job posting khác nhau → verify `getPostingsByIds` được gọi
  ĐÚNG 1 lần, và `getPostingById` được gọi ĐÚNG 0 lần
  (đây là test chứng minh N+1 đã hết — không thể thiếu)
- Danh sách applications rỗng → verify KHÔNG có lời gọi Feign nào
- 250 id distinct → verify `getPostingsByIds` được gọi ĐÚNG 2 lần (lô 200 + lô 50)
- `getPostingsByIds` ném exception → method KHÔNG ném ra ngoài, và map trả về có đủ
  key với placeholder title `"Job #<id>"`
- recruitment-service trả về thiếu 2 posting (bị lọc quyền) → 2 id đó vẫn có trong
  map với placeholder `"Job #<id>"`

## Chạy và báo cáo

Chạy: `cd application-service && ./mvnw test`

Các test cũ sau BẮT BUỘC vẫn xanh:
- ApplicationAuthorizationTest
- ApplicationListScopeSpecificationTest
- SingleCompanyApplicationSchemaContractTest
- OfferOutcomeListenerTest

Báo cáo:
1. File đã sửa, file đã tạo
2. Với kịch bản `GET /api/application/applications?page=0&size=20` trả về 100 hồ sơ
   thuộc 20 tin đăng khác nhau: TỔNG số lời gọi HTTP liên service TRƯỚC và SAU
   (kỳ vọng 23 → 4)
3. Output đầy đủ của `./mvnw test`
4. Giả định nào bạn phải tự đưa ra

## KHÔNG LÀM GÌ THÊM

KHÔNG sửa các method bulk, KHÔNG đụng tới logic phân trang. Các việc đó thuộc
nhiệm vụ khác.
````

---

### 14.5 — P5: Regression toàn bộ và báo cáo tổng

**Ước lượng:** nhỏ · **Phụ thuộc:** ⚠ **P1–P4 phải xong** · **Lợi ích:** xác nhận không có hồi quy

````
# NHIỆM VỤ: Chạy regression toàn bộ và tổng hợp báo cáo hiệu năng

## Ngữ cảnh

Dự án ATS microservices. Bốn nhiệm vụ tối ưu hiệu năng vừa được thực hiện:
- P1: các method bulk trong `ApplicationService` chuyển sang gọi
      `applyAdvanceStage`/`applyReject`/`applyAssignRecruiter` (bỏ enrichment thừa)
- P2: `ApplicationService.getAll` phân trang ở tầng database thay vì in-memory
- P3: `recruitment-service` có endpoint `GET /api/recruitment/postings/batch`
- P4: `ApplicationService.buildPostingMap` dùng batch endpoint thay cho N+1

## Yêu cầu

### 1. Chạy toàn bộ test

```
cd application-service && ./mvnw test
cd recruitment-service && ./mvnw test
```

Dán output ĐẦY ĐỦ của cả hai, bao gồm dòng tổng kết
`Tests run: X, Failures: Y, Errors: Z, Skipped: W`.

Nếu có test nào đỏ: nêu rõ tên test, thông báo lỗi, và nguyên nhân. KHÔNG được sửa
test cũ để nó xanh — nếu một test cũ đỏ thì đó là dấu hiệu code mới phá hành vi cũ,
phải sửa code chứ không sửa test.

### 2. Kiểm tra không có thay đổi ngoài phạm vi

Chạy và dán output:
```
git diff --stat
git diff -- "*/pom.xml"
git status --short "*/src/main/resources/db/migration"
```

- `git diff -- "*/pom.xml"` PHẢI rỗng (không thêm dependency)
- Không có file migration Flyway mới

### 3. Rà soát lại phân quyền

Đọc lại và xác nhận bằng cách trích dẫn code:
- Trong `ApplicationService.getAll`, đoạn xác định `effectiveCandidateId`,
  `scopeDepartmentId`, `scopeAssignedRecruiterId`, `restrictToScope` có bị sửa không?
  (Đáp án đúng: KHÔNG)
- `ApplicationSpecifications.java` có bị sửa không? (Đáp án đúng: KHÔNG)
- Endpoint `/api/recruitment/postings/batch` có gọi `AuthorizationPolicy.canViewJob`
  cho từng posting không? (Đáp án đúng: CÓ) — trích dẫn đoạn code đó
- Endpoint batch có giữ điều kiện `deletedAt IS NULL` không? (Đáp án đúng: CÓ)

### 4. Bảng tổng hợp hiệu năng

Lập bảng với 3 kịch bản, mỗi kịch bản nêu số lời gọi HTTP liên service TRƯỚC và SAU:

| Kịch bản | Trước | Sau |
|---|---|---|
| `GET /applications?page=0&size=20` → 100 hồ sơ / 20 tin đăng | ? | ? |
| `PATCH /applications/bulk-advance-stage` với 50 id | ? | ? |
| `GET /applications` (không phân trang) → 5.000 hồ sơ / 30 tin đăng | ? | ? |

Kèm theo: với kịch bản 1, số bản ghi Application được nạp vào RAM trước và sau.

### 5. Danh sách đầy đủ file thay đổi

Liệt kê mọi file đã tạo mới và đã sửa, kèm một dòng mô tả thay đổi ở mỗi file.

## KHÔNG LÀM GÌ THÊM

Nhiệm vụ này CHỈ chạy test và báo cáo. KHÔNG refactor thêm, KHÔNG "tiện tay" tối ưu
chỗ khác, KHÔNG sửa test cũ. Nếu phát hiện vấn đề, hãy BÁO CÁO chứ đừng tự sửa.
````

## 15. Tiêu chí review kết quả Codex

Checklist này được viết **trước** khi Codex chạy, để việc đánh giá là khách quan.

**Cách dùng:** sau mỗi prompt, chỉ chấm checklist của prompt đó. Nếu prompt fail, **sửa xong rồi mới chạy
prompt kế tiếp** — đừng chồng lỗi lên nhau.

### 15.0 Ba luật chung áp dụng cho mọi prompt

Ba luật này **quan trọng hơn** mọi tiêu chí riêng bên dưới. Vi phạm bất kỳ luật nào ⇒ **từ chối toàn bộ
kết quả của prompt đó**, bất kể các tiêu chí khác đạt hay không.

| # | Luật | Vì sao |
|---|---|---|
| **G1** | **Không được sửa test cũ để nó xanh.** Nếu một test cũ đỏ, đó là bằng chứng code mới phá hành vi cũ — phải sửa code, không sửa test. | Sửa test là cách che giấu hồi quy nguy hiểm nhất |
| **G2** | **Không thêm dependency, không tạo migration Flyway.** Kiểm bằng `git diff -- "*/pom.xml"` (phải rỗng) và `git status --short "*/src/main/resources/db/migration"` | Cả 4 nhiệm vụ đều không đổi schema và không cần thư viện mới |
| **G3** | **Không thay đổi ngoài phạm vi.** Đọc `git diff --stat`: file nào không nằm trong danh sách cho phép của prompt đó là dấu hiệu Codex "tiện tay" làm thêm | Thay đổi ngoài phạm vi là nơi lỗi hồi quy hay lẻn vào nhất |

**File được phép thay đổi ở mỗi prompt:**

| Prompt | File được sửa | File được tạo mới |
|---|---|---|
| P1 | `ApplicationService.java` | `ApplicationBulkOperationTest.java` |
| P2 | `ApplicationService.java` | `ApplicationListPaginationTest.java` |
| P3 | `JobPostingRepository.java`, `JobPostingService.java`, `JobPostingController.java` | `JobPostingBatchLookupTest.java` |
| P4 | `RecruitmentServiceClient.java`, `ApplicationService.java` | `ApplicationPostingBatchLookupTest.java` |
| P5 | *(không sửa file nào — chỉ chạy test và báo cáo)* | — |

---

### 15.1 Checklist cho P1 — Sửa thao tác hàng loạt

| # | Tiêu chí | Cách kiểm chứng | Mức |
|---|---|---|---|
| P1.1 | `bulkAdvanceStage` gọi `applyAdvanceStage`, **không** gọi `advanceStage` | Đọc code | 🔴 Chặn |
| P1.2 | `bulkReject` gọi `applyReject`, **không** gọi `reject` | Đọc code | 🔴 Chặn |
| P1.3 | `bulkAssignRecruiter` **không** còn đi qua `buildDetailedResponse` mỗi id | Đọc code | 🔴 Chặn |
| P1.4 | Codex **không viết mới** `applyAdvanceStage`/`applyReject` (chúng đã có sẵn) | `git diff` — nếu thấy tạo mới là hiểu sai đề | 🟠 |
| P1.5 | `advanceStage`/`reject`/`assignRecruiter` gọi **đơn lẻ** vẫn trả `ApplicationResponse` đầy đủ | Đọc code + test | 🔴 Chặn |
| P1.6 | `runBulk` giữ nguyên fail-soft: 1 id lỗi không chặn các id còn lại | Đọc code + test | 🔴 Chặn |
| P1.7 | `BulkOperationResponse` không đổi (2 trường `succeeded`, `failed`) | So với bản gốc | 🔴 Chặn |
| P1.8 | Vẫn ghi `ApplicationHistory` và publish event ở mỗi thao tác | Đọc code | 🔴 Chặn |
| P1.9 | Có test verify `getUsers` gọi **0 lần** khi `bulkAdvanceStage` 10 id | Đọc test | 🔴 Chặn |
| P1.10 | Có test fail-soft: id thứ 5 lỗi → `succeeded` 9 id, `failed` chứa id 5 | Đọc test | 🟠 |
| P1.11 | Có test chứng minh gọi đơn lẻ vẫn gọi `getUsers` (không phá hành vi cũ) | Đọc test | 🟠 |
| P1.12 | `ApplicationController` **không** bị sửa | `git diff` | 🔴 Chặn |
| P1.13 | Báo cáo nêu con số **250 → 50** cho lô 50 hồ sơ | Đọc báo cáo | 🔵 |

**Đạt khi:** mọi mục 🔴 đạt + ít nhất 2/3 mục 🟠 đạt.

---

### 15.2 Checklist cho P2 — Phân trang ở database

| # | Tiêu chí | Cách kiểm chứng | Mức |
|---|---|---|---|
| P2.1 | Nhánh có phân trang dùng `findAll(spec, Pageable)` | Đọc code | 🔴 Chặn |
| P2.2 | **Không còn** `subList()` để cắt trang | `grep subList` trong `getAll` | 🔴 Chặn |
| P2.3 | Chỉ map sang DTO các bản ghi của **trang hiện tại** | Đọc code | 🔴 Chặn |
| P2.4 | Nhánh `page == null && size == null` giữ nguyên `unpaged` | Đọc code + test | 🔴 Chặn |
| P2.5 | Mặc định vẫn là `page = 0`, `size = 10` | Đọc code | 🟠 |
| P2.6 | `PageResponse` giữ nguyên 5 trường, đúng tên, đúng ý nghĩa | So với bản gốc | 🔴 Chặn |
| P2.7 | **Đoạn xác định phân quyền đầu `getAll` không bị sửa** — `effectiveCandidateId`, `scopeDepartmentId`, `scopeAssignedRecruiterId`, `restrictToScope` | `git diff` — đây là logic bảo mật cốt lõi | 🔴 **Bảo mật** |
| P2.8 | `ApplicationSpecifications.java` **không** bị sửa | `git status` | 🔴 **Bảo mật** |
| P2.9 | `PageResponse.java` không bị sửa | `git status` | 🟠 |
| P2.10 | Có test verify `findAll(spec, Pageable)` được gọi và `findAll(spec, Sort)` **không** được gọi khi có phân trang | Đọc test | 🔴 Chặn |
| P2.11 | Có test kiểm giá trị `PageResponse` với 47 bản ghi, `page=2, size=20` | Đọc test | 🟠 |
| P2.12 | 4 test cũ (`ApplicationAuthorizationTest`, `ApplicationListScopeSpecificationTest`, `SingleCompanyApplicationSchemaContractTest`, `OfferOutcomeListenerTest`) vẫn xanh | Output `mvnw test` | 🔴 Chặn |

**Đạt khi:** mọi mục 🔴 đạt + ít nhất 2/4 mục 🟠 đạt.

> ⚠ P2.7 và P2.8 là mục **bảo mật**. `ApplicationSpecifications` chứa logic fail-closed
> (`cb.disjunction()` khi actor nội bộ không có `departmentId`). Nếu bị sửa, một tài khoản thiếu phòng ban
> sẽ thấy **toàn bộ dữ liệu công ty** thay vì rỗng.

---

### 15.3 Checklist cho P3 — Batch endpoint

| # | Tiêu chí | Cách kiểm chứng | Mức |
|---|---|---|---|
| P3.1 | Endpoint `GET /api/recruitment/postings/batch?ids=1,2,3` tồn tại | Đọc `JobPostingController` | 🔴 Chặn |
| P3.2 | `@GetMapping("/batch")` đặt **trước** `@GetMapping("/{id}")` trong file | Đọc controller — nếu sau, Spring có thể hiểu "batch" là một `{id}` | 🟠 |
| P3.3 | Repository truy vấn **1 lần** với `WHERE id IN`, không lặp `findById` | Đọc repository | 🔴 Chặn |
| P3.4 | Query có `JOIN FETCH p.requisition` hoặc `@EntityGraph` | Đọc repository — thiếu thì vẫn N+1 ở tầng JPA | 🔴 Chặn |
| P3.5 | ⭐ **`getByIds` dựng `deptMap` + `userNameMap` MỘT LẦN trước vòng lặp, rồi gọi overload `toResponse` 5 tham số** | Đọc code — **đây là cái bẫy chính của nhiệm vụ này** | 🔴 Chặn |
| P3.6 | **Không** gọi `toResponse(JobPosting)` (overload 1 tham số) trong vòng lặp | `grep` trong `getByIds` — mỗi lần gọi là 2 Feign | 🔴 Chặn |
| P3.7 | `getByIds` gọi `AuthorizationPolicy.canViewJob` cho **từng** posting | Đọc code | 🔴 **Bảo mật** |
| P3.8 | Dùng `canViewJob` (trả boolean) chứ **không** dùng `requireCanViewJob` (ném exception) | Đọc code | 🔴 **Bảo mật** |
| P3.9 | Posting không có quyền bị **loại im lặng**, không ném 403 | Đọc code + test | 🔴 **Bảo mật** |
| P3.10 | Giữ điều kiện `deletedAt IS NULL` | Đọc query | 🔴 **Bảo mật** |
| P3.11 | `ids` null/rỗng → trả `List.of()`, không lỗi | Đọc code + test | 🟠 |
| P3.12 | > 200 id → ném `BusinessException` với tiếng Việt có dấu | Đọc code + test | 🟠 |
| P3.13 | Khử id trùng lặp và id null trước khi query | Đọc code | 🔵 |
| P3.14 | Có test `HIRING_MANAGER` phòng A với 3 id (2 của A, 1 của B) → nhận 2, không exception | Đọc test | 🔴 Chặn |
| P3.15 | Có test verify `getDepartments()` gọi **đúng 1 lần** với 5 id — test chứng minh P3.5/P3.6 | Đọc test | 🔴 Chặn |
| P3.16 | Có test verify `getUsers()` gọi **đúng 1 lần** với 5 id | Đọc test | 🟠 |
| P3.17 | `getById`, `getAll`, `getOpen`, `getOpenById` **không** bị sửa | `git diff` | 🔴 Chặn |
| P3.18 | 5 test cũ của recruitment-service vẫn xanh | Output `mvnw test` | 🔴 Chặn |
| P3.19 | Báo cáo nêu: 20 id ⇒ **1 query DB + 2 lời gọi Feign** (không phụ thuộc số id) | Đọc báo cáo | 🔵 |

**Đạt khi:** mọi mục 🔴 đạt + ít nhất 3/4 mục 🟠 đạt.

> ⚠ **P3.5 và P3.6 là chỗ dễ sai nhất trong toàn bộ 5 prompt.** `JobPostingService.toResponse(JobPosting)`
> bản 1 tham số tự gọi `masterDataServiceClient.getDepartments()` và `authServiceClient.getUsers(null)`.
> Nếu Codex viết `ids.stream().map(this::toResponse).toList()` thì batch endpoint sẽ tạo **2N lời gọi Feign
> bên trong recruitment-service** — kết quả là dời N+1 sang chỗ khác và làm **tệ hơn** hiện trạng. Test
> P3.15 tồn tại chính để bắt lỗi này. Nếu Codex mắc lỗi này, phải sửa trước khi chạy P4.

---

### 15.4 Checklist cho P4 — Dùng batch endpoint

| # | Tiêu chí | Cách kiểm chứng | Mức |
|---|---|---|---|
| P4.1 | `RecruitmentServiceClient` có `getPostingsByIds(List<Long> ids)` | Đọc code | 🔴 Chặn |
| P4.2 | `getPostingById` cũ **vẫn được giữ** (còn caller khác) | `grep getPostingById` | 🔴 Chặn |
| P4.3 | `buildPostingMap` gọi Feign **1 lần** cho ≤ 200 id | Đọc code + test | 🔴 Chặn |
| P4.4 | Danh sách rỗng → trả `Map.of()`, **không** gọi Feign | Đọc code + test | 🟠 |
| P4.5 | > 200 id → tự chia lô 200 | Đọc code + test | 🟠 |
| P4.6 | Bọc `try/catch`, lời gọi batch lỗi **không** ném ra ngoài | Đọc code | 🔴 Chặn |
| P4.7 | Id thiếu trong kết quả → placeholder **đúng định dạng cũ** `"Job #" + id` | Đọc code — phải giống hệt `safeGetPosting` | 🔴 Chặn |
| P4.8 | Map trả về có **đủ key** cho mọi id được truyền vào | Đọc code + test | 🔴 Chặn |
| P4.9 | `safeGetPosting(Long)` **vẫn tồn tại** | `grep safeGetPosting` — còn 2 caller | 🔴 Chặn |
| P4.10 | **Không** thêm cache (`@Cacheable`, Redis, Caffeine) | `git diff` | 🟠 |
| P4.11 | Có test: 25 hồ sơ / 5 posting → `getPostingsByIds` **1 lần**, `getPostingById` **0 lần** | Đọc test — test quan trọng nhất của P4 | 🔴 Chặn |
| P4.12 | Có test: 250 id → gọi **2 lần** (200 + 50) | Đọc test | 🟠 |
| P4.13 | Có test: Feign ném exception → vẫn trả map đủ key với placeholder | Đọc test | 🔴 Chặn |
| P4.14 | `recruitment-service` **không** bị sửa ở prompt này | `git diff --stat` | 🔴 Chặn |
| P4.15 | 4 test cũ của application-service vẫn xanh | Output `mvnw test` | 🔴 Chặn |
| P4.16 | Báo cáo nêu con số **23 → 4** cho kịch bản 100 hồ sơ / 20 tin đăng | Đọc báo cáo | 🔵 |

**Đạt khi:** mọi mục 🔴 đạt + ít nhất 3/4 mục 🟠 đạt.

---

### 15.5 Checklist cho P5 — Regression và báo cáo tổng

| # | Tiêu chí | Mức |
|---|---|---|
| P5.1 | Có dán output **thật** của `./mvnw test` ở cả 2 service, kèm dòng `Tests run: X, Failures: Y, Errors: Z` | 🔴 Chặn |
| P5.2 | **Toàn bộ** test xanh — 0 failure, 0 error | 🔴 Chặn |
| P5.3 | `git diff -- "*/pom.xml"` rỗng | 🔴 Chặn |
| P5.4 | Không có file migration Flyway mới | 🔴 Chặn |
| P5.5 | Có **trích dẫn code** chứng minh đoạn phân quyền đầu `getAll` không bị sửa | 🔴 **Bảo mật** |
| P5.6 | Có **trích dẫn code** chứng minh batch endpoint gọi `canViewJob` | 🔴 **Bảo mật** |
| P5.7 | Có xác nhận `ApplicationSpecifications.java` không bị sửa | 🔴 **Bảo mật** |
| P5.8 | Bảng 3 kịch bản có số liệu trước/sau đầy đủ | 🟠 |
| P5.9 | Danh sách file thay đổi khớp với bảng "file được phép" ở [mục 15.0](#150-ba-luật-chung-áp-dụng-cho-mọi-prompt) | 🔴 Chặn |
| P5.10 | Nếu có vấn đề, Codex **báo cáo** chứ không tự sửa | 🟠 |

---

### 15.6 Thang đánh giá tổng

| Kết luận | Điều kiện |
|---|---|
| ✅ **Đạt** | Không vi phạm G1/G2/G3; mọi mục 🔴 của prompt đó đạt; mục 🟠 đạt phần lớn |
| ⚠️ **Đạt có điều kiện** | Mọi mục 🔴 **bảo mật** đạt, nhưng thiếu vài mục 🔴 chức năng hoặc test — cần bổ sung, **không** cần làm lại từ đầu |
| ❌ **Không đạt** | Vi phạm G1/G2/G3, **hoặc** bất kỳ mục 🔴 **bảo mật** nào fail, **hoặc** test cũ bị vỡ, **hoặc** N+1 vẫn còn (P3.5/P3.6/P4.11 fail) |

### 15.7 Ba lỗi tôi dự đoán Codex dễ mắc nhất

Liệt kê ở đây để bạn biết chỗ cần soi kỹ khi đọc kết quả:

| # | Lỗi dự đoán | Prompt | Bắt bằng |
|---|---|---|---|
| 1 | Dùng `toResponse(JobPosting)` 1 tham số trong vòng lặp ⇒ tạo 2N lời gọi Feign, **tệ hơn hiện trạng** | P3 | Test P3.15 |
| 2 | Quên `JOIN FETCH` ⇒ lazy loading `requisition` sinh N query phụ khi lọc quyền | P3 | Đọc repository (P3.4) |
| 3 | Dùng `requireCanViewJob` (ném exception) thay vì `canViewJob` (trả boolean) ⇒ một posting không có quyền làm hỏng cả trang list | P3 | Test P3.14 |

Cả ba đều nằm ở P3 — đây là prompt tôi sẽ review kỹ nhất.

## Phụ lục — Bảng tra cứu nhanh

### Port

| Service | Port | | Service | Port |
|---|---|---|---|---|
| Frontend (vite dev) | 3000 | | interview-service | 8085 |
| Frontend (docker) | 5173 | | notification-service | 8086 |
| api-gateway | 8080 | | dashboard-service | 8087 |
| auth-service | 8081 | | *(8088 — không dùng)* | — |
| masterdata-service | 8082 | | application-service | 8089 |
| recruitment-service | 8083 | | offer-service | 8090 |
| candidate-service | 8084 | | PostgreSQL / RabbitMQ / Redis | 5432 / 5672+15672 / 6379 |

### Bảng định tuyến gateway

| Path prefix | Đích |
|---|---|
| `/api/auth/**` | auth-service:8081 |
| `/api/masterdata/**` | masterdata-service:8082 |
| `/api/recruitment/**` | recruitment-service:8083 |
| `/api/candidate/**` | candidate-service:8084 |
| `/api/interview/**` | interview-service:8085 |
| `/api/notification/**` | notification-service:8086 |
| `/api/dashboard/**` | dashboard-service:8087 |
| `/api/application/**` | application-service:8089 |
| `/api/offer/**` | offer-service:8090 |

### Toàn bộ enum trạng thái

| Enum | Service | Giá trị |
|---|---|---|
| `RequisitionStatus` | recruitment | DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, CHANGES_REQUESTED |
| `RequisitionPriority` | recruitment | NORMAL, HIGH, URGENT |
| `RequisitionReason` | recruitment | NEW, REPLACEMENT, EXPANSION, NEW_PROJECT, OTHER |
| `WorkArrangement` | recruitment | ONSITE, HYBRID, REMOTE |
| `PostingStatus` | recruitment | DRAFT, EDITING, APPROVED, OPEN, PAUSED, CLOSED |
| `StageType` | masterdata | APPLIED, CV_SCREENING, HR_SCREENING, TECHNICAL_INTERVIEW, HR_INTERVIEW, FINAL_INTERVIEW, OFFER, HIRED, REJECTED, CUSTOM |
| `InterviewStatus` | interview | SCHEDULED, CONFIRMED, COMPLETED, CANCELLED |
| `InterviewFormat` | interview | ONLINE, OFFLINE |
| `InterviewSlotStatus` | interview | PROPOSED, SELECTED, CANCELLED |
| `RecommendationType` | interview | STRONG_YES, YES, NO, STRONG_NO |
| `SalaryProposalStatus` | interview | PENDING, APPROVED, REJECTED |
| `OfferStatus` | offer | DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, ACCEPTED, DECLINED |
| `PoolStatus` | candidate | ACTIVE, IN_POOL |
| `CustomFieldType` | candidate | TEXT, NUMBER, DATE |
| `NotificationType` | notification | 14 giá trị — xem [mục 9.4](#94-kênh-realtime) |
| `RoleName` | auth | COMPANY_ADMIN, RECRUITER, HIRING_MANAGER, CANDIDATE |
