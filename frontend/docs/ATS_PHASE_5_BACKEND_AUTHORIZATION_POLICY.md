# ATS Phase 5 - Backend Authorization Policy

## 1. Execution Status

**Status: COMPLETED for the Phase 5 backend policy baseline.**

The backend now resolves the authenticated actor from `SecurityContext` and applies
role, self, department, owner, and assignment checks at controller/service boundaries.
The supported user roles are exactly:

```text
COMPANY_ADMIN
RECRUITER
HIRING_MANAGER
CANDIDATE
```

No protected controller accepts `X-User-Id`, `X-User-Role`, or `X-Department-Id` as a
method parameter. Those values are parsed once by `TrustedHeaderAuthenticationFilter`
and exposed as `CurrentUser`.

This phase does not claim that all department work is finished. Candidate profiles do
not carry a department or assignment relationship, and trusted service identity for
background/service-to-service commands is not implemented. Both limits are documented
in Section 10.

Implementation Status: **IMPLEMENTED for the Phase 5 policy baseline; full department coverage remains Phase 6**

Evidence:

- `*/security/CurrentUser.java`
- `*/security/AuthorizationPolicy.java`
- protected REST controllers in all backend domain services
- Phase 5 authorization tests listed in Section 8

## 2. Current User Contract

The security principal has one consistent shape in every downstream service:

```text
CurrentUser
|- userId
|- email
|- role
`- departmentId (nullable for COMPANY_ADMIN and CANDIDATE)
```

`CurrentUser.required()` reads the principal from Spring Security. It rejects missing,
anonymous, or unexpected principals. Controllers no longer build authorization context
from arbitrary request parameters.

Request identity flow:

```text
JWT at API gateway
  -> gateway removes client-supplied identity headers
  -> gateway creates X-User-* headers from validated JWT claims
  -> TrustedHeaderAuthenticationFilter validates the complete header set
  -> SecurityContext contains CurrentUser
  -> controller/service applies AuthorizationPolicy and resource checks
```

`X-Tenant-Id` remains in legacy API contracts but is not part of `CurrentUser` and does
not select persisted data after Phase 4. Its contract removal remains Phase 10.

Implementation Status: **IMPLEMENTED**

Evidence:

- `api-gateway/.../filter/JwtAuthGlobalFilter.java`
- `*/security/TrustedHeaderAuthenticationFilter.java`
- `*/security/CurrentUser.java`
- controller scan: zero `X-User-Id`, `X-User-Role`, and `X-Department-Id` parameters

## 3. Authorization Policy Contract

Each independently built service now has the same typed role parser and common guard
contract in `security.AuthorizationPolicy`:

| Policy | Current behavior |
| --- | --- |
| `roleOf` | Converts the authenticated role to one of the four supported roles |
| `requireRole` / `requireAnyRole` | Rejects actors outside an explicit role set |
| `requireAdmin` | Allows only `COMPANY_ADMIN` |
| `requireInternal` | Allows admin, recruiter, and hiring manager |
| `requireHr` | Allows admin and recruiter |
| `requireHiringManager` | Allows admin and hiring manager |
| `requireCandidate` | Allows only candidate |
| `requireSameDepartment` | Admin bypass; otherwise requires non-null equal departments |
| `requireSelf` | Requires actor user ID equal target user ID |
| `requireOwnerOrAdmin` | Allows resource owner or admin |
| `requireAssignedOrAdmin` | Allows assigned user or admin |

Domain services add policy predicates where the aggregate requires them:

- recruitment-service: `canManageJob` / `requireCanManageJob`
- candidate-service: `canAccessCandidate`
- application-service: `canAccessApplication` / `requireCanAccessApplication`

The source is duplicated per deployable service because the repository currently has
no shared Maven security module. The contract and role set are identical, but a single
compiled shared library is **NOT IMPLEMENTED**.

Implementation Status: **IMPLEMENTED per service; shared policy library NOT IMPLEMENTED**

Evidence:

- `auth-service/.../security/AuthorizationPolicy.java`
- `masterdata-service/.../security/AuthorizationPolicy.java`
- `recruitment-service/.../security/AuthorizationPolicy.java`
- `candidate-service/.../security/AuthorizationPolicy.java`
- `application-service/.../security/AuthorizationPolicy.java`
- `interview-service/.../security/AuthorizationPolicy.java`
- `offer-service/.../security/AuthorizationPolicy.java`
- `notification-service/.../security/AuthorizationPolicy.java`
- `dashboard-service/.../security/AuthorizationPolicy.java`

## 4. Enforced Role Policy

| Role | Enforced backend scope in Phase 5 |
| --- | --- |
| `COMPANY_ADMIN` | Global access to protected single-company data; admin-only user, company, masterdata, and audit operations |
| `RECRUITER` | HR operations; job/application access in own department or when assigned; offer requester operations |
| `HIRING_MANAGER` | Own-department job/application access; assigned requisition approval, offer approval, interview, and evaluation access |
| `CANDIDATE` | Own candidate profile, CV, application, interview, notification, and offer response only |

Role checks are enforced by backend code. Frontend route/menu state is not used as an
authorization decision.

Implementation Status: **IMPLEMENTED**

Evidence:

- `auth.controller.AuthController`
- `auth.service.UserService.createUser`
- recruitment requisition/posting controllers and services
- `candidate.candidate.CandidateController`
- `application.application.ApplicationController`
- interview controllers and services
- `offer.offer.OfferController`

## 5. Resource Enforcement Matrix

| Resource/action | Backend enforcement |
| --- | --- |
| Internal user create/status/company update | `COMPANY_ADMIN` |
| User directory read | authenticated internal role |
| Department/catalog/pipeline mutations | `COMPANY_ADMIN` |
| Job requisition list/read/manage | admin global; recruiter same department or assigned approver; hiring manager same department and requester/approver as required |
| Job posting list/read/manage | scope inherited from linked requisition department/requester/approver; candidate can read only `OPEN` posting |
| Candidate profile read | candidate self by linked `userId`; internal role otherwise |
| Candidate profile create/link and CV upload | candidate self for candidate flow; authenticated internal role for staff create/update flow |
| Candidate delete | recruiter or admin |
| Application list/read | candidate own profile only; recruiter same department or assigned recruiter; hiring manager same department; admin global |
| Application stage/reject/assign/delete | recruiter or admin plus application scope |
| Application history/comments | internal role plus application scope |
| Interview list/read/ICS | underlying application scope plus role-specific candidate/interviewer checks |
| Interview evaluation | assigned interviewer; application scope is verified |
| Interview slots | underlying application scope; candidate/interviewer ownership rules on confirmation |
| Salary proposal | internal role plus application scope; approval restricted to HR policy |
| Offer list/read/PDF | candidate ownership, hiring-manager approver assignment, or HR scope; application scope is also checked |
| Offer create/update/submit/delete | recruiter must own the Offer and pass application scope; admin may override ownership |
| Offer approve/reject | assigned internal approver; admin may override assignment |
| Offer accept/decline | candidate role plus candidate ownership through application |
| Notification read/update | authenticated user's own `userId` only |
| Audit log read | `COMPANY_ADMIN` |
| Dashboard/statistics | authenticated internal role; downstream calls preserve current user context |

Implementation Status: **IMPLEMENTED, subject to the explicit gaps in Section 10**

Evidence:

- `JobRequisitionSpecifications`, `JobPostingSpecifications`
- `JobRequisitionService`, `JobPostingService`
- `CandidateService.getByIdForActor`, `CandidateService.uploadCvOwn`
- `ApplicationService.authorizeApplication`, `ApplicationService.getAll`
- `InterviewService`, `InterviewEvaluationService`, `InterviewSlotService`
- `SalaryProposalService`, `OfferService`
- `NotificationController`, `AuditLogController`, `DashboardController`

## 6. Vertical And Horizontal Escalation Controls

Vertical escalation is blocked before sensitive service operations:

- candidate/recruiter cannot call admin user-management mutations;
- candidate cannot mutate masterdata;
- candidate cannot perform HR application stage actions;
- only a candidate can use candidate offer-response actions;
- only admin can read audit logs.

Horizontal escalation is checked against persisted or downstream resource data:

- candidate A cannot read candidate B's profile;
- candidate A cannot submit/list/read application data for candidate B;
- candidate A cannot read interview or offer data linked to candidate B;
- hiring manager department A cannot access an application/job in department B;
- recruiter access requires same department or explicit assignment where supported;
- offer approval requires the assigned approver ID.

Application list authorization is performed before pagination. The service loads the
matching single-company set, removes inaccessible records, and then paginates the
authorized result so a response cannot leak an inaccessible row.

Implementation Status: **IMPLEMENTED for tested resource paths**

Evidence:

- `auth.controller.AuthControllerSecurityTest`
- `candidate.candidate.CandidateAuthorizationTest`
- `application.application.ApplicationAuthorizationTest`
- `recruitment.security.AuthorizationPolicyTest`
- `offer.security.AuthorizationPolicyTest`

## 7. Controller And Service Changes

Key changes applied in this phase:

1. Protected controllers resolve `CurrentUser.required()` instead of accepting raw
   identity headers.
2. Sensitive mutations perform a role check before calling the domain service.
3. Resource services validate department, owner, candidate self, requester, approver,
   assigned recruiter, or assigned interviewer as applicable.
4. Cross-service resource lookups run with the same authenticated context through the
   existing Feign identity interceptor.
5. The application response mapper no longer fabricates a `COMPANY_ADMIN` principal for
   internal user-name enrichment.
6. Interview lookup no longer recognizes a string role named `SYSTEM` as a bypass.
7. The obsolete application `common.AccessGuard`, including its legacy `SYSTEM` role,
   was removed.

Some domain method signatures still receive trusted `userId`/`role` values extracted
from `CurrentUser` by their controller. Converting every internal signature to accept
the record directly is a maintainability improvement, not a current client-controlled
authorization path.

Implementation Status: **IMPLEMENTED at HTTP boundaries; internal signature consolidation PARTIALLY IMPLEMENTED**

Evidence:

- all modified backend controllers
- `application.application.ApplicationService.buildDetailedResponse`
- `interview.interview.InterviewService.getById`
- deleted `application.common.AccessGuard`

## 8. Verification

The full backend test run completed with these results after Phase 5 policy changes:

| Module | Tests | Failures | Errors | Skipped |
| --- | ---: | ---: | ---: | ---: |
| api-gateway | 8 | 0 | 0 | 0 |
| auth-service | 21 | 0 | 0 | 0 |
| masterdata-service | 3 | 0 | 0 | 0 |
| recruitment-service | 9 | 0 | 0 | 0 |
| candidate-service | 6 | 0 | 0 | 0 |
| application-service | 4 | 0 | 0 | 0 |
| interview-service | 2 | 0 | 0 | 0 |
| offer-service | 11 | 0 | 0 | 0 |
| notification-service | 2 | 0 | 0 | 0 |
| dashboard-service | 1 | 0 | 0 | 0 |
| **Total** | **67** | **0** | **0** | **0** |

The application and interview tests were rerun after removing the fabricated admin
principal and `SYSTEM` interview bypass. Offer-service was rerun after replacing its
legacy access guard and adding owner/approver admin-override tests. All three passed.

Static verification:

- controller `X-User-Id` parameters: 0
- controller `X-User-Role` parameters: 0
- controller `X-Department-Id` parameters: 0
- `git diff --check`: no whitespace errors; line-ending warnings only

Implementation Status: **VERIFIED**

Evidence:

- Maven Surefire reports in each module's `target/surefire-reports`
- Phase 5 unit/controller authorization tests

## 9. Acceptance Criteria

| Criterion | Result |
| --- | --- |
| Protected business controllers use authenticated context | PASS; anonymous public catalog/job routes are explicit exceptions |
| Sensitive actions check role and resource scope | PASS for the Phase 5 resource paths |
| Backend does not rely on frontend guards | PASS |
| Candidate vertical escalation rejected | PASS |
| Candidate A/B horizontal access rejected | PASS |
| Hiring manager cross-department access rejected | PASS |
| Company admin global access allowed | PASS |

Implementation Status: **ACCEPTED for Phase 5 baseline**

## 10. Known Gaps And Deferred Work

### 10.1 Candidate Department Scope

`Candidate` has no department field and no direct recruiter assignment. Internal users
can therefore read the general candidate directory/profile independent of department.
Department enforcement exists once a candidate is accessed through an `Application`,
because the application resolves the posting/requisition department and assignment.

Status: **PARTIALLY IMPLEMENTED; Phase 6 must define candidate visibility through job/application assignment**

### 10.2 Trusted Service Identity

Background listeners and service-to-service workflow commands do not have a dedicated,
cryptographically authenticated service principal. Legacy Feign code still attempts a
few workflow calls with `X-User-Role: SYSTEM`, but `SYSTEM` is not an allowed user role
and is rejected by `TrustedHeaderAuthenticationFilter`.

Affected automation includes offer accept/decline application transitions, positive
interview-evaluation auto-advance, and a notification listener interview lookup. No
authorization bypass was added to make these calls pass. A service credential, signed
internal command, or idempotent domain-event consumer is required before enabling them.

Status: **NOT IMPLEMENTED; workflow integration gap, not an accepted user role**

### 10.3 Legacy Tenant API Contract

Many endpoints still require `X-Tenant-Id`, but Phase 4 repositories no longer use it
for data selection and Phase 2 excludes it from authenticated identity. Removal across
controllers, Feign clients, DTOs, and events remains Phase 10.

Status: **PARTIALLY IMPLEMENTED; removal deferred to Phase 10**

### 10.4 Cross-Service List Performance

Application and offer authorization may call downstream services and filter authorized
records in memory because department metadata lives in another service. Exposure is
restricted correctly, but query efficiency and denormalized authorization attributes
should be addressed together with Phase 6 department design.

Status: **SECURITY ENFORCED; PERFORMANCE OPTIMIZATION DEFERRED**

## 11. Phase 6 Handoff

Phase 6 should build on this policy baseline and complete these specific tasks:

1. Define staff visibility for candidate profiles through application department and
   recruiter assignment instead of allowing every internal role to browse all profiles.
2. Add integration tests for recruiter and hiring-manager access across departments for
   requisitions, postings, applications, interviews, evaluations, and offers.
3. Validate every client-supplied department ID against `CurrentUser.departmentId` or
   an explicit admin override.
4. Replace in-memory cross-service filtering where a persisted department/assignment
   projection can enforce the same rule efficiently.
5. Keep `COMPANY_ADMIN` global, candidate self-only, and the four-role user model fixed.

Implementation Status: **READY FOR PHASE 6**
