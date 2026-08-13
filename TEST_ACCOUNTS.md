# 🔐 Danh Sách Tài Khoản Thử Nghiệm Hệ Thống ATS

Mật khẩu chung: `Password123!`

> **5 role**: PLATFORM_ADMIN, COMPANY_ADMIN, RECRUITER (HR), HIRING_MANAGER (Phòng ban), CANDIDATE.  
> **Không còn** INTERVIEWER — phỏng vấn do Phòng ban đảm nhận.

## Tài khoản

| STT | Email | Role | Label | Việc chính |
|---|---|---|---|---|
| 1 | `admin.company@test.net` | COMPANY_ADMIN | Quản trị công ty | Master data, user, dashboard |
| 2 | `hr.recruiter@test.net` | RECRUITER | HR | Duyệt Req, đăng tin, sàng CV, PV, Offer |
| 3 | `dept.manager@test.net` | HIRING_MANAGER | Phòng ban | Tạo Req, PV/chấm điểm, duyệt Offer |
| 4 | `candidate.test@test.net` | CANDIDATE | Ứng viên | `/jobs` nộp CV, theo dõi đơn, Offer |

## Test Phase 0–3

1. Phòng ban: tạo Requisition → Submit  
2. HR: duyệt + chỉnh lương → tạo Job Posting  
3. Candidate: `/jobs` → Ứng tuyển  
4. HR: `/applications` → Pass / Reject  
5. Candidate: `/my-applications` xem stage  

> `tech.interviewer@test.net` đã gỡ khỏi seed — không dùng.