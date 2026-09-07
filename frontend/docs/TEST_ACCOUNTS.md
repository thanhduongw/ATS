# Tài Khoản Và Kịch Bản Demo ATS

Tài liệu này áp dụng cho scope **một doanh nghiệp**. Hệ thống chỉ có bốn role:
`COMPANY_ADMIN`, `RECRUITER`, `HIRING_MANAGER`, `CANDIDATE`.

## 1. Tài Khoản Nội Bộ Seed

Các tài khoản dưới đây chỉ được tạo khi PostgreSQL khởi tạo một volume mới từ
`docker/postgres-init/init-databases.sql`.

Mật khẩu demo chung: `Password123!`

| Email | Role | Department | Mục đích demo |
| --- | --- | --- | --- |
| `admin.company@test.net` | `COMPANY_ADMIN` | Không giới hạn | Company profile, user, master data, audit, toàn bộ nghiệp vụ |
| `hr.recruiter@test.net` | `RECRUITER` | Human Resources (`1`) | Duyệt requisition, posting, candidate, application, interview, offer |
| `dept.manager@test.net` | `HIRING_MANAGER` | Human Resources (`1`) | Tạo requisition, phỏng vấn và nghiệp vụ phòng ban |

Không có tài khoản `PLATFORM_ADMIN` hoặc `INTERVIEWER`. Việc phỏng vấn do
`HIRING_MANAGER` đảm nhận.

## 2. Candidate

Candidate phải được tạo qua flow self-service, không chọn role và không do SQL seed
tạo trong kịch bản demo chính thức:

1. Mở `/register`.
2. Nhập họ tên, email, số điện thoại và mật khẩu.
3. Backend tự gán role `CANDIDATE` và status `PENDING_VERIFICATION`.
4. Xác thực OTP tại `/verify-email`; tài khoản chuyển sang `ACTIVE`.
5. Đăng nhập, cập nhật `/my-profile`, upload CV và ứng tuyển tại `/jobs`.

Nếu SMTP demo không gửi được email, chỉ bật
`MAIL_LOG_OTP_ON_FAILURE=true` trong môi trường phát triển để đọc OTP từ log. Không
bật tùy chọn này trong production.

## 3. Kịch Bản Demo End-to-End

1. Admin đăng nhập, kiểm tra `Human Resources` và tạo thêm internal user nếu cần.
2. Hiring manager tạo requisition thuộc department `1`, sau đó submit.
3. Recruiter duyệt requisition, tạo posting và publish.
4. Candidate mới xem job ở `/careers`, tự đăng ký và xác thực email.
5. Candidate upload CV, ứng tuyển và xem `/my-applications`.
6. Recruiter advance pipeline, xếp lịch interview và tạo offer.
7. Candidate xem `/my-interviews`, `/my-offers` và phản hồi offer.

## 4. Case Phân Quyền Nên Demo

- Candidate mở `/admin/users` hoặc gọi admin API: bị từ chối.
- Hiring manager không cùng department mở resource khác phòng ban: bị từ chối.
- Candidate A dùng ID của Candidate B cho profile/application/interview/offer: bị từ chối.
- Request tự gắn `X-User-Role` hoặc `X-Department-Id`: gateway xóa và tạo lại từ JWT.

Các mật khẩu trong file này chỉ dành cho local/demo và phải thay trước khi deploy.
