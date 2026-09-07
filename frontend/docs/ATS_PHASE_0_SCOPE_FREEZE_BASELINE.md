# ATS Phase 0 - Scope Freeze and Design Baseline

## 1. Status and Purpose

Phase: 0 - Scope Freeze and Design Baseline
Status: COMPLETED (documentation/design only; no runtime source code changed)
Authoritative refactor plan: ATS_SINGLE_COMPANY_REFACTOR_PLAN.md
Current-state evidence: ATS_AUTHORIZATION_CURRENT_STATE.md

This document freezes the agreed target before implementation begins. A later phase must not reintroduce multi-tenancy, PLATFORM_ADMIN, or public registration for internal staff without an explicit scope change.

## 2. Frozen Product Scope

The ATS serves exactly one company.

| Topic | Frozen decision |
| --- | --- |
| Company model | One company only. Company information may remain as a global company profile, but is not a tenant boundary. |
| Multi-tenancy | Removed from runtime design. No tenant lookup, tenant-scoped identity, tenant header, tenant URL, or tenant claim. |
| Roles | Exactly COMPANY_ADMIN, RECRUITER, HIRING_MANAGER, CANDIDATE. |
| Removed role | PLATFORM_ADMIN is not a supported runtime role. |
| Internal accounts | No public self-registration. COMPANY_ADMIN creates internal staff. |
| Candidate accounts | Candidates self-register, authenticate, manage their own CV/profile, apply, and track only their own process. |
| Department | A real backend authorization boundary for internal staff and recruitment resources. |
| Primary enforcement | Backend role, department, assignment, and candidate-self checks. Frontend guards are UX only. |
| Authentication | Email + password. JWT access token and refresh-token lifecycle remain in the target. |

### Explicitly out of scope

- SaaS/company onboarding and registration of a new company.
- Multiple companies, tenant switching, tenant-specific URLs, and tenant-level administration.
- INTERVIEWER as a fifth role. Interview participants must use the four agreed roles or await a later scope change.
- Permission-table enforcement as a separate authorization model. The target is role plus scope; existing permission tables must not be assumed to enforce access.

### OAuth2 boundary

The existing OAuth2 pre-login flow stores tenantCode in the HTTP session. It is incompatible with the frozen email/password baseline. Phase 0 does not delete it. Phase 1 or 2 must remove, disable, or redesign it without tenant data before it can remain exposed.

## 3. Target Authorization Baseline

### 3.1 Identity and token

Target access-token claims:

    sub = userId
    email
    role
    departmentId (null for CANDIDATE; may be null for COMPANY_ADMIN)
    iat
    exp

Forbidden claims and transport values:

    tenantId
    tenantCode
    X-Tenant-Id

The gateway will validate JWTs and forward only trusted current-user context:

    X-User-Id
    X-User-Email
    X-User-Role
    X-Department-Id

### 3.2 Role and scope policy

| Role | Scope frozen for later implementation |
| --- | --- |
| COMPANY_ADMIN | All resources in the single company; manages internal users and departments. |
| RECRUITER | Resources in own department or explicitly assigned resources. |
| HIRING_MANAGER | Resources in own department; approval/evaluation only when department or assignment permits it. |
| CANDIDATE | Only its own account, candidate profile, CV, applications, interviews, offers, and notifications. |

Department is derived from AppUser.departmentId for internal users and from the related job requisition for recruitment resources. A departmentId supplied by a client is input data, never proof of authorization.

### 3.3 Target account rules

| Account type | Role | Registration route | Department rule |
| --- | --- | --- | --- |
| Company administrator | COMPANY_ADMIN | Created/seeded administratively | Can be null for company-wide administration. |
| Recruiter | RECRUITER | Created by COMPANY_ADMIN | Required. |
| Hiring manager | HIRING_MANAGER | Created by COMPANY_ADMIN | Required. |
| Candidate | CANDIDATE | Self-registers | Always null. |

Target account status values are PENDING_VERIFICATION, ACTIVE, LOCKED, and INACTIVE. Candidate registration must not accept role or department from a client.

## 4. Current-State Evidence Driving the Change

| Current implementation | Evidence | Baseline consequence |
| --- | --- | --- |
| Gateway validates JWT then forwards X-User-Id, X-Tenant-Id, and X-User-Role. | api-gateway/src/main/java/iuh/fit/se/gateway/filter/JwtAuthGlobalFilter.java, filter | Phase 2 replaces tenant header with email/department context and requires a protected-service trust boundary. |
| JWT contains tenantId. | auth-service/src/main/java/iuh/fit/se/auth/security/JwtUtil.java, generateAccessToken | Phase 1 changes token contract. |
| Login requires tenantCode, then finds user by tenant and email. | auth-service/src/main/java/iuh/fit/se/auth/dto/request/LoginRequest.java; auth-service/src/main/java/iuh/fit/se/auth/service/LoginService.java, login | Phase 1 changes identity lookup to globally unique email. |
| AppUser has required tenantId, one roleId, and no departmentId. | auth-service/src/main/java/iuh/fit/se/auth/entity/AppUser.java | Phase 1 changes user model; Phase 6 enables department enforcement. |
| Tenant is a first-class entity; Company is linked to it. | auth-service entity/Tenant.java, entity/Company.java, TenantRepository.java, CompanyRepository.java | Tenant lifecycle is removed; Company becomes at most one global profile. |
| Five roles include PLATFORM_ADMIN. | auth-service/src/main/java/iuh/fit/se/auth/enums/RoleName.java | Phase 1 removes unsupported role and audits seed data/validation. |
| Public career portal is addressed by tenant code. | auth-service PublicCompanyController; recruitment PublicJobPostingController; candidate PublicCandidateController; application PublicApplicationController | Phase 10 converts public endpoints to single-company paths. |
| Frontend uses /c/:tenantCode for public career pages. | frontend/src/routes/AppRoutes.tsx; frontend/src/layouts/PublicLayout.tsx; frontend/src/features/public | Phase 8 removes tenant path parameter and API arguments. |
| Docker Compose publishes internal service ports. | docker-compose.yml | Phase 2 must account for direct service calls that can forge forwarded headers. |

The detailed source-based risk assessment remains in ATS_AUTHORIZATION_CURRENT_STATE.md, especially sections 4, 5, 7, and 11.

## 5. Tenant Removal Inventory

This is the Phase 0 change inventory. It identifies source areas that later phases must inspect. It is not authorization to bulk-delete them now.

### 5.1 Gateway and shared request context - Phase 2 first

- api-gateway/src/main/java/iuh/fit/se/gateway/filter/JwtAuthGlobalFilter.java
  - PUBLIC_PATHS, filter, and isPublicPath currently model tenant/company registration and public tenant routes.
  - Replaces X-Tenant-Id forwarding.
- Every SecurityConfig.java and FeignClientConfig.java under all services must be reviewed when current-user headers and protected paths change.
- docker-compose.yml currently publishes ports 8081-8087, 8089, and 8090. This is relevant to forged forwarded-header risk, not a Phase 0 deletion.

### 5.2 Auth service - Phase 1, then Phase 3/4

Tenant domain and company onboarding:

- entity/Tenant.java, repository/TenantRepository.java
- entity/Company.java, repository/CompanyRepository.java, service/CompanyService.java
- service/RegisterService.java, dto/request/RegisterCompanyRequest.java
- controller/PublicCompanyController.java
- event/TenantEventPublisher.java, event/TenantActivatedEvent.java

Tenant-coupled authentication and account lifecycle:

- entity/AppUser.java, repository/AppUserRepository.java, service/UserService.java
- dto/request/LoginRequest.java, service/LoginService.java, security/JwtUtil.java
- dto/request/VerifyEmailRequest.java, ResendOtpRequest.java, ForgotPasswordRequest.java, ResetPasswordRequest.java
- entity/EmailVerification.java, repository/EmailVerificationRepository.java
- entity/PasswordResetToken.java, repository/PasswordResetTokenRepository.java
- controller/AuthController.java, config/SecurityConfig.java
- security/OAuth2PreLoginController.java, security/OAuth2LoginSuccessHandler.java
- dto/response/UserProfileResponse.java, dto/response/CompanyResponse.java
- enums/RoleName.java
- event/AuditEvent.java, event/AuditEventPublisher.java

All auth paths above are relative to auth-service/src/main/java/iuh/fit/se/auth/.

### 5.3 Master data - Phase 4 and Phase 10

Tenant-scoped master-data groups that must change consistently:

- department, worklocation, skill, rejectionreason, recruitmentstatus, recruitmentsource
- employmenttype, pipeline, emailtemplate, educationlevel, contracttype
- jobtitle, joblevel, experiencelevel, interviewcriteria
- seeder/DefaultDataSeeder.java
- event/TenantActivatedEvent.java and event/TenantActivatedListener.java
- config/SecurityConfig.java

All are under masterdata-service/src/main/java/iuh/fit/se/masterdata/.

### 5.4 Recruitment domain - Phase 6, then Phase 10

- requisition/JobRequisition.java, JobRequisitionRepository.java, JobRequisitionSpecifications.java, JobRequisitionService.java, JobRequisitionController.java
- posting/JobPosting.java, JobPostingRepository.java, JobPostingSpecifications.java, JobPostingService.java, JobPostingController.java, PublicJobPostingController.java
- client/AuthServiceClient.java, client/dto/CompanyResponse.java, client/MasterDataServiceClient.java
- event/RequisitionSubmittedEvent.java, RequisitionEventPublisher.java, AuditEvent.java, AuditEventPublisher.java
- config/SecurityConfig.java, config/FeignClientConfig.java

All are under recruitment-service/src/main/java/iuh/fit/se/recruitment/.

### 5.5 Candidate and application domains - Phase 7, then Phase 10

Candidate service:

- candidate/Candidate.java, CandidateRepository.java, CandidateSpecifications.java, CandidateService.java, CandidateController.java, PublicCandidateController.java
- candidate/resume
- client/AuthServiceClient.java, client/dto/CompanyResponse.java
- event/AuditEvent.java, event/AuditEventPublisher.java

All are under candidate-service/src/main/java/iuh/fit/se/candidate/.

Application service:

- application/Application.java, ApplicationRepository.java, ApplicationSpecifications.java, ApplicationService.java, ApplicationController.java, PublicApplicationController.java, ApplicationComment.java, StaleApplicationReminderJob.java
- client/AuthServiceClient.java, client/dto/CompanyResponse.java, client/CandidateServiceClient.java, client/RecruitmentServiceClient.java, client/MasterDataServiceClient.java
- event/ApplicationCreatedEvent.java, ApplicationStatusChangedEvent.java, ApplicationStaleEvent.java, ApplicationCommentMentionEvent.java, ApplicationEventPublisher.java, AuditEvent.java, AuditEventPublisher.java
- config/FeignClientConfig.java

All are under application-service/src/main/java/iuh/fit/se/application/.

### 5.6 Interview, offer, notification, and dashboard - Phase 6/10

- interview-service: interview, evaluation, scheduling, client, event, config/FeignClientConfig.java
- offer-service: offer, client, event, config/FeignClientConfig.java
- notification-service: notification, auditlog, event, client, config/FeignClientConfig.java
- dashboard-service: dashboard, posting, client, config/SecurityConfig.java, config/FeignClientConfig.java

These groups carry tenant identifiers in entities, repository methods, filters/specifications, Feign DTOs, audit payloads, and RabbitMQ event payloads. Each producer and every consumer of an event must be changed in the same implementation change set.

### 5.7 Frontend - Phase 8

- frontend/src/routes/AppRoutes.tsx
- frontend/src/layouts/PublicLayout.tsx
- frontend/src/features/public/publicApi.ts and types.ts
- frontend/src/features/public/pages/CompanyJobsPage.tsx, JobDetailApplyPage.tsx, ApplySuccessPage.tsx
- frontend/src/features/auth/types.ts
- frontend/src/features/auth/schemas/loginSchema.ts, registerSchema.ts, verifySchema.ts
- frontend/src/features/auth/pages/LoginPage.tsx, RegisterPage.tsx, VerifyEmailPage.tsx, ForgotPasswordPage.tsx, ResetPasswordPage.tsx, AuthManagementPage.tsx

### 5.8 Configuration, database, tests, and documentation - final cleanup

- docker/postgres-init/init-databases.sql
- every service application.yml and api-gateway/src/main/resources/application.yml
- README.md, project_analysis.md, TEST_ACCOUNTS.md
- existing tests and test fixtures matched by the repository scan

No migration framework or versioned migration files were found in the repository scan. Current application configuration must be checked before Phase 4 for ddl-auto behavior.

## 6. Migration Order and Compatibility Rules

Tenant removal crosses independently deployed services and RabbitMQ payloads. Do not remove database columns or shared fields first.

| Order | Change set | Compatibility rule | Target phase |
| --- | --- | --- | --- |
| 1 | Freeze contracts and inventory | No runtime behavior changes. | 0 |
| 2 | Auth model and token contract | Introduce target user/role/department contract before callers stop sending tenant data. | 1 |
| 3 | Gateway/current-user contract | Stop producing X-Tenant-Id; only then update protected-service inputs. | 2 |
| 4 | Candidate and staff account flows | Create candidate-to-user link and protected internal provisioning. | 3 |
| 5 | Schema/entity transition | Remove tenant runtime dependencies only after code paths no longer require them. Preserve/reconcile existing data. | 4 |
| 6 | Role/scope policy | Enforce role, department, assignment, and self access before opening revised UI flows. | 5-7 |
| 7 | Domain service cleanup | Change entity, repository, service, controller, client DTO, event producer, and event consumer atomically per domain. | 6, 7, 10 |
| 8 | Frontend route/API change | Remove tenant inputs and /c/:tenantCode only after target public APIs exist. | 8 |
| 9 | Database physical removal | Drop tenant tables/columns only after migration tests and a verified clean scan. | 4, 10, 12 |
| 10 | Documentation and regression tests | Treat behavior as final only after authorization tests pass. | 11-12 |

### Database safety decision

No destructive database command is approved by Phase 0. If existing data must be preserved, Phase 4 must use versioned, reversible migration scripts with a backup/rollback plan. If this is a disposable academic demo database, that decision must be documented before any schema reset. ddl-auto:update is not an adequate replacement for a deliberate tenant-data migration.

## 7. Reserved API and Route Contract Changes

| Current contract | Frozen target contract | Phase |
| --- | --- | --- |
| POST /api/auth/login with tenantCode, email, password | POST /api/auth/login with email, password | 1 |
| POST /api/auth/register-company | Removed; no company onboarding API | 3/10 |
| Tenant-scoped public candidate/apply flow | Authenticated candidate-self flow, with separately public job browsing | 7/10 |
| GET /api/auth/public/companies/{tenantCode} | One public company profile route or embedded global company profile; exact endpoint finalized with public portal work | 10 |
| /api/recruitment/public/companies/{tenantCode}/jobs | Single-company public jobs route without tenant path segment | 10 |
| /c/:tenantCode frontend route | Single public career route without tenant parameter | 8 |
| JWT tenantId and X-Tenant-Id | departmentId and trusted current-user context | 1/2 |

## 8. Phase 0 Acceptance Check

| Acceptance criterion | Result |
| --- | --- |
| Main refactor plan exists | PASS - ATS_SINGLE_COMPANY_REFACTOR_PLAN.md |
| Current state was cross-checked | PASS - ATS_AUTHORIZATION_CURRENT_STATE.md and direct source scan |
| Target has no multi-company requirement | PASS |
| Target roles contain exactly four agreed roles | PASS |
| Files/areas requiring later change are identified | PASS - section 5 |
| Safe migration sequence is defined | PASS - section 6 |
| Runtime code remains unchanged in Phase 0 | PASS |

## 9. Next Authorized Implementation Step

Proceed with Phase 1 - Auth Domain Refactor only.

1. Change AppUser and user repository identity from tenant-scoped email to global email.
2. Remove PLATFORM_ADMIN from the runtime role model.
3. Add target department/status fields and constraints to the auth model.
4. Change login/JWT contract without tenantCode or tenantId.
5. Add focused tests for active/locked/inactive login and JWT claims.

No tenant table, tenant column, or public career route should be physically deleted until the compatibility order in section 6 reaches that item.

