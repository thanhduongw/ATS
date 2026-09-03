# ATS Phase 12 - Cleanup & Documentation

## 1. Phase Status

Status: **COMPLETED (2026-09-03)**

Phase 12 làm rõ source of truth của hệ thống sau refactor: ATS chỉ phục vụ một doanh
nghiệp, không có tenant/platform admin, hỗ trợ department authorization và candidate
self-service. Runtime UI, seed data, OpenAPI access và tài liệu demo đã được đồng bộ.

Implementation Status: **IMPLEMENTED FOR CLEANUP AND DOCUMENTATION**

## 2. Cleanup Summary

| Hạng mục | Kết quả |
| --- | --- |
| README | Viết lại theo kiến trúc single-company hiện tại |
| Test accounts | Chỉ còn 3 internal seed accounts; candidate phải self-register |
| API docs | Ghi rõ public/protected API, Swagger aggregator và OpenAPI paths |
| UI/menu/route tenant | Không còn tenant route/menu; nhãn audit đã đổi sang doanh nghiệp |
| Tài liệu cũ | Gắn cảnh báo lịch sử/outdated và trỏ tới current architecture |
| Architecture diagram | Tạo component, authentication, security-context và authorization diagram |
| Scope limits | Ghi rõ single-company, no platform admin, department và candidate self-service |

Evidence:

- `README.md`
- `TEST_ACCOUNTS.md`
- `ATS_API_REFERENCE.md`
- `ATS_CURRENT_ARCHITECTURE.md`
- `frontend/src/features/auditlog/pages/AuditLogPage.tsx`

## 3. README And Demo Baseline

README cũ mô tả sai hệ thống là multi-tenant, đăng ký công ty và dùng
`X-Tenant-Id`. README mới mô tả:

- bốn role runtime;
- login/JWT/refresh lifecycle;
- department, assignment và candidate ownership;
- 9 domain services + gateway + frontend;
- hai cách khởi chạy;
- luồng demo từ requisition đến candidate offer;
- giới hạn bảo mật và migration còn lại.

`TEST_ACCOUNTS.md` không còn ghi năm role hoặc `PLATFORM_ADMIN`. Candidate seed bị
gỡ khỏi database init vì account tạo trực tiếp bằng SQL không phát
`CandidateRegisteredEvent` để provision candidate profile. Demo candidate giờ luôn đi
qua `/register -> /verify-email -> /login` đúng nghiệp vụ.

Implementation Status: **IMPLEMENTED FOR FRESH DATABASE INITIALIZATION**

Evidence:

- `README.md`
- `TEST_ACCOUNTS.md`
- `docker/postgres-init/init-databases.sql`
- `auth-service/src/main/java/iuh/fit/se/auth/service/RegisterService.java`
- `candidate-service/src/main/java/iuh/fit/se/candidate/event/CandidateRegistrationListener.java`

Lưu ý: thay đổi seed không tự xóa account candidate khỏi PostgreSQL volume đã tồn
tại. Đây là hành vi mong muốn để cleanup không phá dữ liệu local hiện hữu.

## 4. API Documentation

Springdoc/OpenAPI đã tồn tại ở toàn bộ service. Phase 12:

- tạo `ATS_API_REFERENCE.md` mô tả conventions, public endpoints, domain surface,
  candidate self paths và security notes;
- giữ Swagger aggregator tại `/swagger-ui/index.html`;
- sửa SecurityConfig để permit đúng custom OpenAPI path
  `/api/<service>/v3/api-docs/**`, thay vì chỉ permit `/v3/api-docs/**`;
- xác nhận repo không có Postman/Insomnia collection nên không tạo thêm nguồn mô tả
  API song song dễ lệch code.

Implementation Status: **IMPLEMENTED**

Evidence:

- `ATS_API_REFERENCE.md`
- `api-gateway/src/main/resources/application.yml`
- `*/src/main/resources/application.yml`, property `springdoc.api-docs.path`
- `*/src/main/java/**/config/SecurityConfig.java`

## 5. Frontend Tenant Cleanup

Scan route/menu/auth frontend xác nhận không có tenant selector, tenant onboarding,
platform admin route hoặc `X-Tenant-Id`. Dấu vết UI cuối cùng là mô tả audit “toàn
tenant” đã được đổi thành “trong toàn doanh nghiệp”. Các tên như `CompanyJobsPage`
và company profile là hợp lệ vì hệ thống vẫn có một hồ sơ doanh nghiệp duy nhất.

Implementation Status: **IMPLEMENTED**

Evidence:

- `frontend/src/routes/AppRoutes.tsx`
- `frontend/src/layouts/AppLayout.tsx`
- `frontend/src/app/roles.ts`
- `frontend/src/features/auditlog/pages/AuditLogPage.tsx`

## 6. Historical Documentation

Không xóa tài liệu cũ vì chúng là audit trail của refactor. Thay vào đó, các tài liệu
phân tích/kế hoạch trước refactor được gắn cảnh báo rõ ràng:

- `ATS_AUTHORIZATION_CURRENT_STATE.md`: snapshot security trước Phase 0.
- `project_analysis.md`: phân tích tổng thể trước refactor.
- `ke_hoach_chinh_sua_gop_y_giao_vien.md`: kế hoạch cũ đã được thay thế.

Các báo cáo Phase 0-11 được giữ nguyên vì việc nhắc tenant trong đó giải thích thay
đổi/migration lịch sử, không tuyên bố runtime hiện tại là multi-tenant.

Implementation Status: **IMPLEMENTED**

## 7. Current Architecture

Tài liệu `ATS_CURRENT_ARCHITECTURE.md` là baseline mới, gồm:

- component architecture;
- login/token flow;
- gateway-to-service security-context flow;
- RBAC + department + assignment + ownership model;
- registration boundary;
- frontend route boundary;
- deliberate limitations và source-of-truth order.

Implementation Status: **IMPLEMENTED**

## 8. Intentional Legacy References

Các chuỗi `tenant` còn lại không tự động là lỗi cleanup. Chúng được phép trong:

- Flyway migration `drop_legacy_tenant_columns` và guard kiểm tra dữ liệu nhiều
  tenant trước thao tác destructive;
- schema contract test ngăn tenant field/method quay lại runtime;
- báo cáo Phase 0-11 và tài liệu historical có nhãn outdated;
- mô tả “không còn tenant” trong tài liệu hiện hành.

Không được xóa migration cũ sau khi đã phát hành vì sẽ làm hỏng Flyway history và
upgrade path.

Implementation Status: **INTENTIONALLY RETAINED**

## 9. Documented System Limits

| Giới hạn | Trạng thái |
| --- | --- |
| Multi-company/tenant switching | **NOT IMPLEMENTED BY DESIGN** |
| Platform admin | **NOT IMPLEMENTED BY DESIGN** |
| Department authorization | **IMPLEMENTED** |
| Candidate self-service | **IMPLEMENTED** |
| Dynamic permission engine | **NOT IMPLEMENTED** |
| Cryptographic service identity | **NOT IMPLEMENTED** |
| Browser/Docker/Testcontainers E2E | **NOT IMPLEMENTED** |
| Production token storage hardening | **PARTIALLY IMPLEMENTED** |
| Legacy database reconciliation | **OPERATIONAL STEP REQUIRED** |

## 10. Verification

| Kiểm tra | Kết quả |
| --- | --- |
| 10 backend modules: `mvn -q clean test` | **PASS - 101 tests, 0 failure, 0 error, 0 skipped** |
| Frontend: `npm run build` | **PASS - 3,970 modules transformed** |
| Frontend: `npm run lint` | **PASS - 0 error, 39 warning hiện hữu** |
| `docker compose config --quiet` | **PASS** |
| Runtime scan ngoài migration cho tenant/platform strings | **PASS - 0 match** |
| `git diff --check` | **PASS - chỉ có cảnh báo LF/CRLF của Git** |

Các warning ESLint chủ yếu là `react-hooks/set-state-in-effect` trong component có
sẵn và một số dependency warning; Phase 12 không mở rộng scope sang refactor 39
warning này. Vite vẫn cảnh báo bundle lớn hơn 500 kB; build không thất bại.

Implementation Status: **VERIFIED**

## 11. Known Runtime Gaps Outside Phase 12

Code review và đối chiếu source xác nhận các gap không được che giấu bởi kết quả unit
test xanh:

- Fresh database của application/interview/offer có thể fail tại Flyway V2 trước
  khi Hibernate tạo bảng.
- Candidate accept/decline offer gọi application-service với role `SYSTEM` không
  được downstream filter hỗ trợ nên có thể rollback.
- Internal account legacy có department null chưa được backfill; một số list scope
  hiện fail open khi department null.
- Google OAuth2 chưa route đầy đủ qua gateway/Docker.
- Admin status API chưa enforce candidate email verification khi chuyển sang ACTIVE.

Các gap này được đưa vào README/current architecture thay vì bị mô tả nhầm là đã
pass. Việc sửa chúng thuộc hardening/runtime integration tiếp theo, không phải thao
tác cleanup tài liệu của Phase 12.

Implementation Status: **DOCUMENTED, NOT FIXED IN PHASE 12**

## 12. Acceptance Criteria

- Người đọc mới không còn hiểu hệ thống là SaaS multi-tenant: **PASS**.
- README, architecture, API docs và test accounts dùng cùng scope/role: **PASS**.
- Candidate demo specification đi qua self-registration thay vì SQL seed:
  **PASS for seed/design; deployed E2E NOT VERIFIED**.
- Frontend không còn tenant menu/route/copy: **PASS**.
- Current architecture diagram phản ánh code hiện tại: **PASS**.
- Giới hạn single-company/no-platform-admin/department/candidate được ghi rõ: **PASS**.

Final Implementation Status: **COMPLETED FOR PHASE 12 SCOPE WITH DOCUMENTED RUNTIME GAPS**
