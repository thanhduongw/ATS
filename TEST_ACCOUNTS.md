# 🔐 Danh Sách Tài Khoản Thử Nghiệm Hệ Thống ATS

Tất cả các tài khoản thử nghiệm dưới đây đã được khởi tạo sẵn trong cơ sở dữ liệu hệ thống cùng với dữ liệu mẫu (Tin tuyển dụng, Hồ sơ ứng tuyển, Lịch phỏng vấn và Offer).

> 🔑 **Mật khẩu chung cho TẤT CẢ tài khoản**: `Password123!`

---

## 👥 Danh Sách Tài Khoản Phân Theo Vai Trò

| STT | Mã Công Ty | Email Đăng Nhập | Mật Khẩu | Vai Trò (Role) | Họ và Tên | Quyền Hạn / Mục Đích Kiểm Thử |
|---|---|---|---|---|---|---|
| 1 | `TECHCORP` | `admin.company@test.net` | `Password123!` | **Company Admin** | Nguyễn Quản Trị | **Quản trị toàn hệ thống**: Cấu hình công ty, quản lý nhân sự, xem báo cáo Dashboard tổng quan. |
| 2 | `TECHCORP` | `hr.recruiter@test.net` | `Password123!` | **Recruiter** | Trần Tuyển Dụng | **Chuyên viên tuyển dụng**: Tạo tin tuyển dụng, quản lý hồ sơ, lên lịch phỏng vấn, tạo Offer và gửi link cho ứng viên. |
| 3 | `TECHCORP` | `dept.manager@test.net` | `Password123!` | **Hiring Manager** | Lê Trưởng Phòng | **Trưởng phòng chuyên môn**: Duyệt yêu cầu tuyển dụng, xem danh sách phỏng vấn, phê duyệt Offer do HR trình lên. |
| 4 | `TECHCORP` | `tech.interviewer@test.net` | `Password123!` | **Interviewer** | Phạm Phỏng Vấn | **Người phỏng vấn**: Xem danh sách phỏng vấn được phân công, thực hiện chấm điểm và đề xuất mức lương sau phỏng vấn. |
| 5 | `TECHCORP` | `candidate.test@test.net` | `Password123!` | **Candidate** | Nguyễn Văn Ứng Viên | **Ứng viên**: Truy cập cổng `/my-applications` theo dõi tiến trình, xác nhận lịch phỏng vấn và xem/chấp nhận Offer. |

---

## 🏢 Dữ Liệu Mẫu Đã Tạo Sẵn (Preset Test Data)

- **Mã Công Ty (Tenant Code)**: `TECHCORP`
- **Công ty (Tenant)**: `TechCorp Vietnam` (Tenant ID: `1`)
- **Tin tuyển dụng (Job Posting)**: `Senior Java Backend Engineer (Microservices)`
  - **Mức lương dự kiến**: `20.000.000 - 35.000.000 VNĐ`
  - **Trạng thái**: `OPEN`
- **Hồ sơ ứng tuyển (Application)**: Ứng viên `Nguyễn Văn Ứng Viên` đang ở giai đoạn `Phỏng vấn Chuyên môn`.
- **Offer mẫu**:
  - **Mức lương đề nghị**: `25.000.000 VNĐ` + Phụ cấp `1.500.000 VNĐ`
  - **Thời hạn phản hồi (Deadline)**: `25/08/2026 18:00:00`
  - **Trạng thái**: `APPROVED` (Đã được Trưởng phòng duyệt, sẵn sàng gửi cho Ứng viên).

---

## 🧪 Kịch Bản Kiểm Thử Nhanh (End-to-End Test Workflow)

1. **Đăng nhập vai trò Admin (`admin.company@test.net` / `Password123!`)**:
   - Truy cập `http://localhost:5173/login`.
   - Xem báo cáo tổng quan Dashboard tại `/dashboard`.
   - Quản lý danh sách tài khoản tại `/settings`.

2. **Đăng nhập vai trò HR (`hr.recruiter@test.net` / `Password123!`)**:
   - Mở Kanban Board ứng tuyển tại `/applications`.
   - Mở màn hình danh sách Offer tại `/offers` -> Nhấn **"Chi tiết"** trên Offer của Nguyễn Văn Ứng Viên -> Nhấn nút **"📋 Link gửi ứng viên"** để chép đường dẫn.

3. **Đăng nhập vai trò Ứng viên (`candidate.test@test.net` / `Password123!`)**:
   - Dán đường dẫn vừa sao chép vào trình duyệt (`http://localhost:5173/offers/candidate/1`).
   - Xem bộ đếm ngược thời gian phản hồi và nhấn **"Chấp nhận Offer"**.
   - Kiểm tra cổng thông tin ứng viên tại `/my-applications` để xem trạng thái hồ sơ tự động chuyển sang **"Trúng tuyển" (HIRED)**.
