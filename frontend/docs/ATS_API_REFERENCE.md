# ATS API Reference

## 1. Conventions

Base URL khi chạy local: `http://localhost:8080/api`.

- Public request không cần token chỉ gồm các endpoint được liệt kê ở Section 2.
- Protected request gửi `Authorization: Bearer <accessToken>`.
- Client không gửi `X-User-Id`, `X-User-Email`, `X-User-Role` hoặc
  `X-Department-Id`; gateway xóa các giá trị client tự khai báo.
- Không có `X-Tenant-Id`, `tenantCode` hoặc tenant selector.
- `401` là thiếu/sai/hết hạn authentication; `403` là đã đăng nhập nhưng không đủ
  role/scope; `404` có thể được dùng khi resource không tồn tại hoặc ngoài scope.

Swagger UI: `http://localhost:8080/swagger-ui/index.html`.

## 2. Public API

| HTTP | Endpoint | Mục đích |
| --- | --- | --- |
| POST | `/api/auth/register` | Candidate self-register; role do backend gán |
| POST | `/api/auth/verify-email` | Xác thực OTP và activate candidate |
| POST | `/api/auth/resend-otp` | Gửi lại OTP xác thực |
| POST | `/api/auth/login` | Đăng nhập email/password |
| POST | `/api/auth/refresh-token` | Rotate refresh token và cấp access token mới |
| POST | `/api/auth/logout` | Revoke refresh token; idempotent với token không còn tồn tại |
| POST | `/api/auth/forgot-password` | Gửi OTP reset với response chống account enumeration |
| POST | `/api/auth/reset-password` | Đặt mật khẩu mới và revoke session cũ |
| POST | `/api/auth/oauth2/exchange` | Đổi one-time OAuth2 code lấy token khi Google SSO được bật |
| GET | `/api/auth/public/company` | Hồ sơ doanh nghiệp công khai |
| GET | `/api/recruitment/public/jobs` | Danh sách job đã publish |
| GET | `/api/recruitment/public/jobs/{jobId}` | Chi tiết job đã publish |

Endpoint legacy `/api/auth/register-company` bị deny. Candidate không nộp hồ sơ
ẩn danh; người dùng phải login và ứng tuyển qua candidate portal.

## 3. Auth And Account API

| Nhóm | Endpoint chính | Access model |
| --- | --- | --- |
| Current profile | `GET /api/auth/me`, `PUT /api/auth/profile` | Authenticated self |
| Password | `POST /api/auth/change-password` | Authenticated self |
| Company profile | `GET /api/auth/company` | Authenticated |
| Company update | `PUT /api/auth/company` | `COMPANY_ADMIN` |
| User directory | `GET /api/auth/users` | `COMPANY_ADMIN` |
| Staff directory | `GET /api/auth/users/directory` | Internal roles; không có candidate, email, status |
| Create staff | `POST /api/auth/admin/users` | `COMPANY_ADMIN` |
| Account status | `PATCH /api/auth/users/{id}/status` | `COMPANY_ADMIN` |

Login request:

```json
{
  "email": "admin.company@test.net",
  "password": "Password123!"
}
```

Login/refresh response:

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<opaque-token>"
}
```

Candidate registration không nhận trường `role`, `departmentId` hoặc `status`.
Internal-user request có role/status/department nhưng backend chỉ chấp nhận actor
`COMPANY_ADMIN` và validate role/department theo nghiệp vụ.

## 4. Domain API Surface

| Service | Base path | Resource/API chính | Scope chính |
| --- | --- | --- | --- |
| Master Data | `/api/masterdata` | departments, skills, job titles, levels, types, locations, pipelines, templates | Admin write; authenticated reads theo endpoint |
| Recruitment | `/api/recruitment/requisitions` | list/detail/create/update/submit/approve/reject/request-changes/delete | Role + department + requester/approver |
| Recruitment | `/api/recruitment/postings` | list/open/detail/create/update/status/review/publish/delete | Role + department/assignment; candidate chỉ dùng public/open flow phù hợp |
| Candidate | `/api/candidate/candidates` | Internal candidate CRUD, tags, pool, CV | HR/manager scope qua accessible application IDs |
| Candidate portal | `/api/candidate/me` | Profile update, resume upload, deletion request | Candidate self |
| Application | `/api/application/applications` | Pipeline, history, comment, assign, bulk actions | Role + department/assignment hoặc candidate self |
| Interview | `/api/interview/interviews` | Schedule/detail/status/ICS | Department/assignment hoặc candidate self |
| Interview | `/api/interview/slots` | Batch slots, pending, confirm/select | Authorized workflow participant |
| Evaluation | `/api/interview/interviews/{id}/evaluations` | Submit/list evaluation | Assigned interviewer/authorized HR scope |
| Offer | `/api/offer/offers` | Create/edit/submit/approve/reject/PDF | HR/department workflow |
| Candidate offer | `/api/offer/offers/my` | List/detail/accept/decline | Candidate self |
| Notification | `/api/notification/notifications` | List, unread count, mark read | Recipient self |
| Audit | `/api/notification/audit-logs` | Audit query | `COMPANY_ADMIN` |
| Dashboard | `/api/dashboard` | Recruitment and posting summaries | Internal role scope |

Operation-level signatures và request/response schema được sinh trực tiếp từ
controller/DTO tại Swagger UI. Bảng này mô tả boundary; source code policy vẫn là
nguồn quyết định cuối cùng.

## 5. Candidate Self-Service Paths

| HTTP | Endpoint | Ý nghĩa |
| --- | --- | --- |
| GET | `/api/candidate/me` | Hồ sơ candidate của user hiện tại |
| PATCH | `/api/candidate/me` | Cập nhật các field self-editable |
| POST | `/api/candidate/me/resume` | Upload/thay CV của chính mình |
| POST | `/api/candidate/me/request-deletion` | Yêu cầu xóa dữ liệu |
| POST | `/api/application/applications` | Ứng tuyển; backend resolve candidate từ authenticated user |
| GET | `/api/application/applications/my` | Danh sách application của chính mình |
| GET | `/api/application/applications/my/{id}` | Chi tiết application thuộc chính mình |
| GET | `/api/interview/interviews/my` | Lịch phỏng vấn của chính mình |
| GET | `/api/interview/interviews/my/{id}` | Chi tiết interview thuộc chính mình |
| GET | `/api/offer/offers/my` | Offer của chính mình |
| GET | `/api/offer/offers/my/{id}` | Chi tiết offer của chính mình |
| PATCH | `/api/offer/offers/{id}/accept` | Chấp nhận offer thuộc chính mình |
| PATCH | `/api/offer/offers/{id}/decline` | Từ chối offer thuộc chính mình |

Client-supplied `candidateId`, recruiter ID hoặc department ID không được dùng để
thay thế identity/scope từ security context.

Hai endpoint accept/decline trả về DTO candidate (`CandidateOfferResponse`), không
phải `OfferResponse` nội bộ. Việc chuyển stage của application được thực hiện bất
đồng bộ: offer-service publish `offer.accepted`/`offer.declined` và application-service
tự áp dụng transition. Không còn call đồng bộ bằng role `SYSTEM`. Nếu RabbitMQ không
khả dụng, offer vẫn được ghi nhận nhưng application chưa chuyển stage.

## 6. OpenAPI Endpoints

| Service | OpenAPI JSON qua gateway |
| --- | --- |
| Auth | `/api/auth/v3/api-docs` |
| Master Data | `/api/masterdata/v3/api-docs` |
| Recruitment | `/api/recruitment/v3/api-docs` |
| Candidate | `/api/candidate/v3/api-docs` |
| Interview | `/api/interview/v3/api-docs` |
| Notification | `/api/notification/v3/api-docs` |
| Dashboard | `/api/dashboard/v3/api-docs` |
| Application | `/api/application/v3/api-docs` |
| Offer | `/api/offer/v3/api-docs` |

Repo không có Postman/Insomnia collection. OpenAPI JSON và controller source là API
documentation được duy trì cùng code.

## 7. Security Notes

- Không gọi trực tiếp port domain service từ browser.
- Không dùng frontend menu/route để suy ra backend permission.
- Refresh token là secret và được rotate; access token cũ không bị server-side
  revoke tức thời khi logout.
- Production phải thay `JWT_SECRET`, demo passwords và credential hạ tầng mặc định.
- Service-to-service cryptographic authentication chưa có; private network là trust
  boundary hiện tại.
- `GET /api/auth/users` chỉ dành cho `COMPANY_ADMIN` vì trả về cả candidate kèm
  email và trạng thái tài khoản. Internal role dùng `GET /api/auth/users/directory`
  cho các picker phân công.
- Candidate activation invariant, OAuth gateway routing và outbox cho đồng bộ
  offer/application là các gap đã ghi rõ tại `README.md`; OpenAPI có endpoint không
  đồng nghĩa workflow đã qua deployed E2E.
