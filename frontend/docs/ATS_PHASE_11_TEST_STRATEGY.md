# ATS Phase 11 - Test Strategy

## 1. Phase Status

Status: **COMPLETED (2026-09-01)**

Phase 11 establishes executable regression coverage for the single-company security
model. Authorization is tested at policy/service, controller security, repository
specification, and gateway-filter boundaries. The required authentication, role,
department, candidate self-scope, and token lifecycle cases are covered.

Implementation Status: **IMPLEMENTED**

Evidence:

- `auth-service/src/test/java/iuh/fit/se/auth`
- `api-gateway/src/test/java/iuh/fit/se/gateway/filter/JwtAuthGlobalFilterTest.java`
- domain-service authorization tests listed in Sections 3-6
- Maven Surefire result: 101 tests, 0 failures, 0 errors, 0 skipped

## 2. Test Layers

| Layer | Current implementation | Purpose |
| --- | --- | --- |
| Policy/service unit tests | JUnit 5 + Mockito | Verify role, department, assignment, ownership, and token rules without UI involvement. |
| Controller security tests | Spring `MockMvc` | Verify sensitive admin endpoints return HTTP 403 for unauthorized roles. |
| Gateway API boundary tests | Mock reactive HTTP exchange through `JwtAuthGlobalFilter` | Verify missing, invalid, and expired JWT rejection and trusted context replacement. |
| Query scope tests | JPA `Specification` criteria verification | Verify department/assignment predicates are applied before list results are returned. |
| Schema contract tests | Reflection-based JUnit tests | Prevent tenant fields and legacy storage contracts from returning. |
| Frontend tests | No frontend test framework is configured | The conditional frontend-test item is not applicable in this phase. Production build is verified separately. |

The gateway tests execute the real global filter with HTTP request/response objects,
but do not start every microservice over Docker networking. This distinction is kept
explicit; they are gateway boundary tests, not a deployed-system end-to-end suite.

Implementation Status: **IMPLEMENTED WITH DOCUMENTED TEST-ENVIRONMENT LIMITS**

Evidence:

- `auth-service/src/test/java/iuh/fit/se/auth/controller/AuthControllerSecurityTest.java`
- `recruitment-service/src/test/java/iuh/fit/se/recruitment/security/SecurityContextIntegrationTest.java`
- `application-service/src/test/java/iuh/fit/se/application/application/ApplicationListScopeSpecificationTest.java`
- `frontend/package.json` has no `test` script or Vitest/Jest dependency

## 3. Authentication Test Matrix

| Required case | Result | Test evidence |
| --- | --- | --- |
| Login success | PASS | `LoginServiceTest.loginStoresOnlyRefreshTokenDigest` |
| Login wrong password | PASS | `LoginServiceTest.loginRejectsWrongPassword` |
| Login inactive account | PASS | `LoginServiceTest.loginRejectsUserThatIsNotActive(INACTIVE)` |
| Login locked account | PASS | `LoginServiceTest.loginRejectsUserThatIsNotActive(LOCKED)` |
| Pending candidate cannot login | PASS | `LoginServiceTest.loginRejectsUserThatIsNotActive(PENDING_VERIFICATION)` |
| Expired JWT is rejected | PASS | `JwtAuthGlobalFilterTest.rejectsExpiredToken` |

Additional gateway checks reject missing/invalid tokens, protect candidate resume
upload, limit public paths by HTTP method, and replace spoofed identity headers with
claims from the validated JWT.

Implementation Status: **IMPLEMENTED**

Evidence:

- `auth-service/src/test/java/iuh/fit/se/auth/service/LoginServiceTest.java`
- `auth-service/src/test/java/iuh/fit/se/auth/security/JwtUtilTest.java`
- `api-gateway/src/test/java/iuh/fit/se/gateway/filter/JwtAuthGlobalFilterTest.java`

## 4. Role Authorization Test Matrix

| Required case | Result | Test evidence |
| --- | --- | --- |
| Candidate calls admin API | HTTP 403 | `AuthControllerSecurityTest.candidateCannotCreateInternalUser` |
| Recruiter calls admin user management | HTTP 403 | `AuthControllerSecurityTest.recruiterCannotCreateInternalUser` |
| Hiring manager creates internal user | HTTP 403 | `AuthControllerSecurityTest.hiringManagerCannotCreateInternalUser` |
| Company admin creates internal user | HTTP 201 and service invoked | `AuthControllerSecurityTest.companyAdminCanReachInternalUserCreation` |

`UserServiceTest.rejectsNonAdminEvenWhenServiceIsCalledDirectly` supplies a second
service-layer check so the admin rule is not enforced only by `@PreAuthorize`.

Implementation Status: **IMPLEMENTED**

Evidence:

- `auth-service/src/test/java/iuh/fit/se/auth/controller/AuthControllerSecurityTest.java`
- `auth-service/src/test/java/iuh/fit/se/auth/service/UserServiceTest.java`
- `auth-service/src/main/java/iuh/fit/se/auth/config/SecurityConfig.java`
- `auth-service/src/main/java/iuh/fit/se/auth/service/UserService.java`

## 5. Department Authorization Test Matrix

| Required case | Result | Test evidence |
| --- | --- | --- |
| Recruiter department A cannot edit an unrelated job in department B | PASS | `JobPostingDepartmentAuthorizationTest.recruiterCannotEditUnassignedJobFromAnotherDepartment` |
| Hiring manager cannot approve a requisition | PASS, including a forged assignment | `JobRequisitionDepartmentAuthorizationTest.hiringManagerCannotApproveRequisitionEvenWhenAssignedAsApprover` |
| Hiring manager pipeline is limited to own department | PASS | `ApplicationListScopeSpecificationTest.hiringManagerPipelineIsRestrictedToOwnDepartment` |
| Company admin can see all departments | PASS, no department predicate | `ApplicationListScopeSpecificationTest.companyAdminPipelineHasNoDepartmentOrAssignmentScope` |

The intended assignment exception is tested separately: recruiters can access a
cross-department application/job only when explicitly assigned. Company admin remains
global inside the one company.

Implementation Status: **IMPLEMENTED**

Evidence:

- `recruitment-service/src/test/java/iuh/fit/se/recruitment/posting/JobPostingDepartmentAuthorizationTest.java`
- `recruitment-service/src/test/java/iuh/fit/se/recruitment/requisition/JobRequisitionDepartmentAuthorizationTest.java`
- `recruitment-service/src/test/java/iuh/fit/se/recruitment/security/AuthorizationPolicyTest.java`
- `application-service/src/test/java/iuh/fit/se/application/application/ApplicationListScopeSpecificationTest.java`
- `application-service/src/test/java/iuh/fit/se/application/application/ApplicationAuthorizationTest.java`

## 6. Candidate Self-Scope Test Matrix

| Required case | Result | Test evidence |
| --- | --- | --- |
| Candidate A cannot view candidate B profile | PASS | `CandidateAuthorizationTest.candidateCannotReadAnotherCandidateProfile` |
| Candidate A cannot view candidate B application | PASS | `ApplicationAuthorizationTest.candidateCannotReadAnotherCandidatesApplication` |
| Candidate A cannot view candidate B interview | PASS | `InterviewDepartmentAuthorizationTest.candidateCannotReadAnotherCandidatesInterview` |
| Candidate A cannot view candidate B offer | PASS | `OfferDepartmentAuthorizationTest.candidateCannotViewAnotherCandidatesOffer` |
| Candidate A cannot apply as candidate B | PASS; client candidate ID is ignored and ownership resolves from authenticated user | `ApplicationAuthorizationTest.candidateCannotApplyUsingAnotherCandidatesClientSuppliedId` |

The application test intentionally sends `candidateId = 999` and verifies the saved
application uses candidate 10 resolved from the authenticated user's account. It also
verifies that client-supplied recruiter and resume ownership values are not trusted.

Implementation Status: **IMPLEMENTED**

Evidence:

- `candidate-service/src/test/java/iuh/fit/se/candidate/candidate/CandidateAuthorizationTest.java`
- `application-service/src/test/java/iuh/fit/se/application/application/ApplicationAuthorizationTest.java`
- `interview-service/src/test/java/iuh/fit/se/interview/interview/InterviewDepartmentAuthorizationTest.java`
- `offer-service/src/test/java/iuh/fit/se/offer/offer/OfferDepartmentAuthorizationTest.java`

## 7. Token And Session Test Matrix

| Required case | Result | Test evidence |
| --- | --- | --- |
| Expired refresh token is rejected | PASS | `LoginServiceTest.expiredRefreshTokenIsRejected` |
| Logged-out/revoked refresh token cannot be reused | PASS | `LoginServiceTest.refreshTokenRevokedByLogoutCannotBeReused` |
| Refreshed access token has current claims | PASS | `LoginServiceTest.refreshedAccessTokenUsesCurrentUserClaims` |

Rotation, digest-only refresh-token storage, unknown-token logout idempotency, locked
account refresh rejection, and password-reset revocation are also covered.

Implementation Status: **IMPLEMENTED**

Evidence:

- `auth-service/src/test/java/iuh/fit/se/auth/service/LoginServiceTest.java`
- `auth-service/src/test/java/iuh/fit/se/auth/service/PasswordServiceTest.java`
- `auth-service/src/test/java/iuh/fit/se/auth/entity/Phase9TokenStorageContractTest.java`

## 8. Security Defect Found By Phase 11

Severity: **HIGH defense-in-depth authorization gap**

The requisition controller required `COMPANY_ADMIN` or `RECRUITER` for approve,
reject, and request-changes actions. The service methods previously checked only that
the actor ID matched `approverId` (or was admin). A direct internal service call with a
`HIRING_MANAGER` forged as the approver could therefore bypass the role rule.

The service now calls `AuthorizationPolicy.requireHr(actor)` before assignment checks
in all three approval actions. The regression test uses a hiring manager whose user ID
equals the persisted approver ID and confirms denial.

Implementation Status: **FIXED**

Evidence:

- `recruitment-service/src/main/java/iuh/fit/se/recruitment/requisition/JobRequisitionService.java`
- methods `approve`, `reject`, `requestChanges`
- `JobRequisitionDepartmentAuthorizationTest.hiringManagerCannotApproveRequisitionEvenWhenAssignedAsApprover`

## 9. Verification Results

All modules were rebuilt from clean output using `mvn -q clean test`.

| Module | Tests | Failures | Errors | Skipped |
| --- | ---: | ---: | ---: | ---: |
| api-gateway | 10 | 0 | 0 | 0 |
| auth-service | 37 | 0 | 0 | 0 |
| masterdata-service | 3 | 0 | 0 | 0 |
| recruitment-service | 15 | 0 | 0 | 0 |
| candidate-service | 10 | 0 | 0 | 0 |
| application-service | 9 | 0 | 0 | 0 |
| interview-service | 5 | 0 | 0 | 0 |
| offer-service | 9 | 0 | 0 | 0 |
| notification-service | 2 | 0 | 0 | 0 |
| dashboard-service | 1 | 0 | 0 | 0 |
| **Total** | **101** | **0** | **0** | **0** |

Frontend verification: `npm run build` passed with 3,970 modules transformed. Vite
reported only the existing large-chunk advisory. `git diff --check` passed; Git emitted
line-ending conversion warnings only.

Implementation Status: **PASS**

Evidence:

- each module's `target/surefire-reports/TEST-*.xml`
- `frontend/package.json`, script `build`

## 10. Known Test Gaps

The following are not claimed as implemented:

- **NOT IMPLEMENTED:** browser-level frontend route/menu tests because the frontend
  currently has no test runner or test script.
- **NOT IMPLEMENTED:** a Docker-based end-to-end suite that starts gateway, all domain
  services, PostgreSQL, RabbitMQ, and S3-compatible storage together.
- **NOT IMPLEMENTED:** Testcontainers-backed migration and repository integration tests
  against a real PostgreSQL instance.

These gaps do not remove backend enforcement coverage for the mandatory Phase 11
cases, but they remain useful production-hardening work after the current refactor.

Implementation Status: **DOCUMENTED**

Evidence:

- `frontend/package.json`
- `docker-compose.yml`
- no Testcontainers dependency in current service `pom.xml` files

## 11. Phase Acceptance

- Authorization rules are verified independently from frontend visibility: **PASS**.
- Mandatory authentication cases: **PASS**.
- Mandatory role authorization cases: **PASS**.
- Mandatory department authorization cases: **PASS**.
- Mandatory candidate IDOR/BOLA cases: **PASS**.
- Mandatory refresh/session cases: **PASS**.
- Clean backend suite: **101/101 PASS**.
- Frontend production compilation: **PASS**.

Final Implementation Status: **COMPLETED**
