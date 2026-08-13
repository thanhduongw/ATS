# ATS - Applicant Tracking System
> **Hệ thống Quản lý Tuyển dụng & Ứng viên Chuẩn Doanh Nghiệp (Multi-tenancy)**  
> Dự án Khóa Luận Tốt Nghiệp (KLTN) xây dựng trên kiến trúc **Microservices (Spring Boot 3)** & **Frontend (React 19 + TypeScript + Vite + Ant Design)**.

---

## 🔑 Tài Khoản Thử Nghiệm Nhanh (Preset Test Accounts)
> 📄 Danh sách chi tiết và kịch bản test đầy đủ tại: **[TEST_ACCOUNTS.md](file:///d:/KLTN/ATS/TEST_ACCOUNTS.md)**

| Mã Công Ty | Email | Mật khẩu | Vai trò | Quyền |
|---|---|---|---|---|
| TECHCORP | admin.company@test.net | Password123! | Company Admin | Quản trị tenant |
| TECHCORP | hr.recruiter@test.net | Password123! | HR | Duyệt Req, đăng tin, CV, PV, Offer |
| TECHCORP | dept.manager@test.net | Password123! | Phòng ban | Tạo Req, PV, duyệt Offer |
| TECHCORP | candidate.test@test.net | Password123! | Candidate | Việc làm, nộp CV, Offer |

---

## 📖 1. Tổng Quan Dự Án

**ATS (Applicant Tracking System)** là giải pháp phần mềm quản lý toàn bộ quy trình tuyển dụng nhân sự dành cho các doanh nghiệp với mô hình **Multi-tenancy** (nhiều công ty cùng sử dụng trên một hạ tầng với dữ liệu phân tách tuyệt đối).

### Các tính năng cốt lõi:
- **Đăng ký Doanh nghiệp & Xác thực:** Đăng ký tài khoản công ty, gửi/xác thực mã OTP qua Email, Đăng nhập cấp mã JWT Token (Access Token & Refresh Token).
- **Phân tách Đa công ty (Multi-tenancy):** Tự động lọc và quản lý dữ liệu theo `X-Tenant-Id` được inject từ API Gateway.
- **Quản lý Danh mục Dùng chung (Master Data):** Cấu hình linh hoạt các danh mục riêng cho từng công ty: Phòng ban (Department), Vị trí (Job Title), Kỹ năng (Skill), Cấp bậc (Job Level), Quy trình tuyển dụng (Pipeline/Vòng phỏng vấn), Lý do từ chối, Mẫu Email thông báo,...
- **Quản lý Tuyển dụng (Recruitment):** Tạo & duyệt Phiếu yêu cầu tuyển dụng (Job Requisition), Đăng tin tuyển dụng (Job Posting).
- **Quản lý Ứng viên & Phỏng vấn (Candidate & Interview):** Tiếp nhận CV/Hồ sơ ứng viên, đặt lịch phỏng vấn và đánh giá kết quả (Khung microservice mở rộng).

---

## 🏗️ 2. Kiến Trúc Hệ Thống & Công Nghệ

### Sơ đồ Kiến trúc Tổng thể (Architecture Overview)

```mermaid
flowchart TD
    Client["Client Browser (React + Vite)"] -->|Port 5173| Gateway["API Gateway (Port 8080)"]

    subgraph Security & Routing Layer
        Gateway -->|JwtAuthGlobalFilter| AuthSvc["Auth Service (Port 8081)"]
        Gateway --> MasterSvc["MasterData Service (Port 8082)"]
        Gateway --> RecruitSvc["Recruitment Service (Port 8083)"]
        Gateway --> CandSvc["Candidate Service (Port 8084)"]
        Gateway --> IntvSvc["Interview Service (Port 8085)"]
        Gateway --> NotiSvc["Notification Service (Port 8086)"]
    end

    subgraph Middleware & Databases (Docker)
        PG[(PostgreSQL - Port 5432)]
        RMQ[RabbitMQ - Port 5672/15672]
        RDS[Redis - Port 6379]
    end

    AuthSvc --> PG
    MasterSvc --> PG
    RecruitSvc --> PG
    CandSvc --> PG
    IntvSvc --> PG
    NotiSvc --> PG
    AuthSvc --> RMQ
```

### Công Nghệ Sử Dụng (Tech Stack)

| Thành phần | Công nghệ / Thư viện | Ghi chú |
| :--- | :--- | :--- |
| **Backend Core** | Java 21, Spring Boot 3.x, Spring Data JPA | Khung phát triển Microservices |
| **API Gateway** | Spring Cloud Gateway, Spring Security, JJWT | Định tuyến, CORS, kiểm tra JWT |
| **Database** | PostgreSQL 16 | Mỗi service sử dụng 1 Database riêng |
| **Message Broker** | RabbitMQ 3 (Management) | Xử lý sự kiện bất đồng bộ & gửi mail |
| **Caching** | Redis 7 | Caching & quản lý session |
| **Frontend** | React 19, TypeScript, Vite 8, Ant Design 6 | Giao diện SPA linh hoạt, tối ưu |
| **State & Form** | Redux Toolkit (RTK Query), React Hook Form, Zod | Quản lý state & validate form |
| **Containerization** | Docker, Docker Compose | Đóng gói môi trường hạ tầng |

---

## 🗂️ 3. Danh Sách Microservices & Cấu Trúc CSDL

### Chi tiết các Microservices

| Service | Port | Database | Mô tả chức năng |
| :--- | :---: | :--- | :--- |
| **`api-gateway`** | `8080` | N/A | Cổng giao tiếp đơn (Single Entry Point), validate JWT, inject header `X-User-Id`, `X-Tenant-Id`, `X-User-Role`. |
| **`auth-service`** | `8081` | `ats_auth` | Đăng ký công ty, gửi OTP Email, xác thực tài khoản, đăng nhập & quản lý JWT. |
| **`masterdata-service`** | `8082` | `ats_masterdata` | Quản lý Master Data (Department, Skill, Pipeline, JobTitle, EmailTemplate,...). |
| **`recruitment-service`** | `8083` | `ats_recruitment` | Quản lý Phiếu yêu cầu tuyển dụng (Requisition) & Đăng tin tuyển dụng (Job Posting). |
| **`candidate-service`** | `8084` | `ats_candidate` | Quản lý thông tin hồ sơ ứng viên và CV. |
| **`interview-service`** | `8085` | `ats_interview` | Lên lịch phỏng vấn, phân công hội đồng & chấm điểm ứng viên. |
| **`notification-service`**| `8086` | `ats_notification` | Nhận tin nhắn từ RabbitMQ để gửi mail/notification. |
| **`frontend`** | `5173` | N/A | Giao diện React SPA dành cho Doanh nghiệp & Tuyển dụng. |

---

## 📁 4. Cấu Trúc Thư Mục Dự Án (Project Structure)

```text
ATS/
├── docker-compose.yml              # Cấu hình container PostgreSQL, RabbitMQ, Redis
├── docker/
│   └── postgres-init/
│       └── init-databases.sql      # Script khởi tạo 6 databases cho các microservices
├── api-gateway/                    # Spring Cloud Gateway (Port 8080)
├── auth-service/                   # Service Xác thực & Đăng ký (Port 8081)
├── masterdata-service/             # Service Danh mục dữ liệu dùng chung (Port 8082)
├── recruitment-service/            # Service Yêu cầu & Tin tuyển dụng (Port 8083)
├── candidate-service/              # Service Quản lý Ứng viên (Port 8084)
├── interview-service/              # Service Quản lý Phỏng vấn (Port 8085)
├── notification-service/           # Service Gửi Thông báo (Port 8086)
└── frontend/                       # React + TypeScript + Vite + Ant Design Application
    ├── src/
    │   ├── components/            # Reusable UI components (ProtectedRoute, GuestRoute,...)
    │   ├── features/              # Redux Slices, API & Pages chia theo tính năng (auth, masterdata, recruitment)
    │   ├── pages/                 # Layout chính (DashboardPage)
    │   └── routes/                # Cấu hình React Router (AppRoutes.tsx)
    └── package.json
```

---

## ⚡ 5. Luồng Xử Lý Nổi Bật (Core Flows)

### 1. Luồng Xác Thực JWT & Multi-tenancy qua API Gateway
1. Request từ Frontend chứa Header: `Authorization: Bearer <token>`.
2. `JwtAuthGlobalFilter` tại API Gateway kiểm tra tính hợp lệ của Token.
3. Gateway tự động trích xuất các claims: `subject` (userId), `tenantId`, `role` và đính kèm vào Request Header trước khi chuyển tiếp:
   - `X-User-Id`
   - `X-Tenant-Id`
   - `X-User-Role`
4. Các Microservice phía sau lấy `X-Tenant-Id` từ Request Header để truy vấn đúng CSDL của công ty đó.

### 2. Luồng Đăng Ký Công Ty & Xác Thực OTP Email
1. Client gọi API `POST /api/auth/register-company`.
2. `auth-service` khởi tạo công ty & tài khoản admin với trạng thái `UNVERIFIED`.
3. Mã OTP ngẫu nhiên được khởi tạo (có thời hạn 10 phút) và gửi tới Email đăng ký.
4. Client nhập mã OTP qua API `POST /api/auth/verify-email`. Sau khi xác thực thành công, tài khoản chuyển thành `ACTIVE` và có thể đăng nhập.

---

## 🚀 6. Hướng Dẫn Khởi Chạy Dự Án (Getting Started)

### Yêu Cầu Môi Trường (Prerequisites)
- **Java JDK 21** trở lên
- **Node.js** v18+ & **npm**
- **Docker** & **Docker Desktop** (đã cài `docker-compose`)
- **Maven** (hoặc sử dụng sẵn `./mvnw` đính kèm trong từng service)

---

### Bước 1: Khởi động Hạ tầng Middleware (Docker Compose)
Mở Terminal tại thư mục gốc của dự án (`ATS/`) và chạy:

```bash
docker-compose up -d
```

> **Kiểm tra trạng thái container:**
> - **PostgreSQL:** `localhost:5432` (User: `ats_user` | Pass: `ats_password`)
> - **RabbitMQ UI:** `http://localhost:15672` (User: `ats_user` | Pass: `ats_password`)
> - **Redis:** `localhost:6379`

---

### Bước 2: Khởi chạy các Microservices Backend

Mở từng cửa sổ Terminal độc lập cho từng microservice và chạy lệnh:

#### 1. API Gateway (Port 8080)
```bash
cd api-gateway
./mvnw spring-boot:run
# Trên Windows PowerShell: .\mvnw.cmd spring-boot:run
```

#### 2. Auth Service (Port 8081)
```bash
cd auth-service
./mvnw spring-boot:run
```

#### 3. MasterData Service (Port 8082)
```bash
cd masterdata-service
./mvnw spring-boot:run
```

#### 4. Recruitment Service (Port 8083)
```bash
cd recruitment-service
./mvnw spring-boot:run
```

*(Các dịch vụ `candidate-service`, `interview-service`, `notification-service` có thể khởi chạy tương tự khi cần phát triển thêm).*

---

### Bước 3: Khởi chạy Giao diện Frontend

Mở Terminal mới tại thư mục `frontend/`:

```bash
cd frontend
npm install
npm run dev
```

Ứng dụng sẽ được khởi tạo tại địa chỉ: **`http://localhost:5173`**

---

## 📝 7. Đóng Góp & Phát Triển (Development Guidelines)
- Mọi API mới dành cho Frontend phải được khai báo đính tuyến qua `api-gateway/src/main/resources/application.yml`.
- Đảm bảo kiểm tra và truyền đúng `X-Tenant-Id` khi truy vấn database ở các service kinh doanh để đảm bảo an toàn dữ liệu Multi-tenancy.
