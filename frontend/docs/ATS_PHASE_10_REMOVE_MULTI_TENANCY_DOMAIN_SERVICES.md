# ATS Phase 10 - Remove Multi-Tenancy From Domain Services

Date: 2026-09-01

## 1. Status And Scope

Phase 10 is **COMPLETED** for runtime source, API contracts, inter-service calls,
business events, and guarded domain-schema cleanup.

The ATS runtime now represents one company. Domain requests do not accept a tenant
header, services and repositories do not receive tenant parameters, and public routes
do not use a tenant code. Authorization continues to use role, department,
assignment, and candidate ownership.

Implementation Status: **IMPLEMENTED**

Evidence:

- `api-gateway/src/main/java/iuh/fit/se/gateway/filter/JwtAuthGlobalFilter.java`
- all domain controllers and services listed below
- all Feign clients under the eight domain services
- source scan documented in section 9

## 2. Runtime Contract Removal

The following runtime concepts were removed:

```text
tenantId method parameters
tenantCode path variables
X-Tenant-Id request/Feign headers
PLATFORM_ADMIN
tenant filters/specifications
tenant fields in RabbitMQ payloads
compatibility scope value 0L
```

Trusted request context now contains only:

```text
X-User-Id
X-User-Email
X-User-Role
X-Department-Id (nullable)
```

The gateway no longer declares, strips, generates, or forwards a recognized tenant
identity. JWT claims remain `sub`, `email`, `role`, optional `departmentId`, `iat`,
and `exp`.

Implementation Status: **IMPLEMENTED**

Evidence:

- `api-gateway/.../JwtAuthGlobalFilter.java`
- `auth-service/.../security/JwtUtil.java`
- `auth-service/.../security/TrustedHeaderAuthenticationFilter.java`
- `auth-service/.../security/JwtUtilTest.java`

## 3. Domain Service Results

| Service | Removed tenant contract | Effective data scope after Phase 10 |
| --- | --- | --- |
| masterdata-service | Controller/service tenant arguments and tenant headers | Global single-company catalogs; admin controls mutations |
| recruitment-service | Controller/service/specification/Feign/event tenant values | Role, department, requester, approver, assigned recruiter |
| candidate-service | Controller/service/specification/Feign/audit tenant values | Internal access policy or candidate SELF ownership |
| application-service | Controller/service/specification/Feign/event tenant values | Department, assigned recruiter, candidate SELF ownership |
| interview-service | Controller/service/Feign/event tenant values | Department, recruiter/interviewer assignment, candidate SELF |
| offer-service | Controller/service/specification/Feign/event tenant values | Department, requester/approver, candidate SELF |
| notification-service | Controller/service/Feign/event/audit tenant values | Recipient SELF; audit restricted to company admin |
| dashboard-service | Controller/service/Feign tenant values | Downstream role/department-scoped APIs |

No repository was widened by replacing a tenant predicate alone. Phase 5-7 role,
department, assignment, and ownership checks remain in place and are now the actual
resource-scoping mechanisms.

Implementation Status: **IMPLEMENTED**

Evidence:

- `masterdata-service/src/main/java/iuh/fit/se/masterdata`
- `recruitment-service/src/main/java/iuh/fit/se/recruitment`
- `candidate-service/src/main/java/iuh/fit/se/candidate`
- `application-service/src/main/java/iuh/fit/se/application`
- `interview-service/src/main/java/iuh/fit/se/interview`
- `offer-service/src/main/java/iuh/fit/se/offer`
- `notification-service/src/main/java/iuh/fit/se/notification`
- `dashboard-service/src/main/java/iuh/fit/se/dashboard`

## 4. API And Feign Contracts

All domain controllers now derive identity from `CurrentUser` and business inputs.
No endpoint requires a tenant header. Feign clients call the same resource paths
without tenant parameters while continuing to pass trusted user/role headers where a
downstream authorization decision requires them.

Representative changes:

```text
GET /api/masterdata/departments
GET /api/recruitment/postings
GET /api/candidate/candidates/{id}/summary
GET /api/application/applications/{id}/summary
GET /api/interview/interviews/{id}
GET /api/offer/offers/{id}
GET /api/notification/notifications
GET /api/dashboard/summary
```

The old public company path contracts containing a tenant code were removed from the
auth/candidate/recruitment Feign clients. Public careers use the global routes:

```text
GET /api/auth/public/company
GET /api/recruitment/public/jobs
GET /api/recruitment/public/jobs/{jobId}
```

Implementation Status: **IMPLEMENTED**

Evidence:

- all `*Controller.java` files in the domain services
- all `*Client.java` files in the domain services
- `recruitment-service/.../PublicJobPostingController.java`
- `auth-service/.../PublicCompanyController.java`

## 5. Candidate Workflow

The obsolete tenant-code public-apply implementation and its client DTOs were
removed. It had no active controller after Phase 7/8 and conflicted with the agreed
policy that candidates must register and log in.

The supported workflow remains:

```text
Candidate register
  -> verify email
  -> login
  -> own candidate profile/CV
  -> POST /api/application/applications
  -> backend resolves candidateId from authenticated userId
```

New CV object keys no longer include a tenant segment. They use the candidate ID,
while existing stored resume URLs remain unchanged.

Implementation Status: **IMPLEMENTED**

Evidence:

- `candidate-service/.../CandidateService.java`
- `candidate-service/.../CandidatePortalController.java`
- `application-service/.../ApplicationController.java#create`
- `application-service/.../ApplicationService.java#createForCandidate`
- removed `PublicApplyResponse`, public candidate Feign methods, and tenant-code company lookup

## 6. Department And Ownership Preservation

Phase 10 does not replace tenant filtering with unrestricted `findAll`. Existing
authorization remains authoritative:

- `COMPANY_ADMIN` can work across all departments.
- `RECRUITER` is limited by department and/or assignment according to each resource.
- `HIRING_MANAGER` is limited by department, approver, requester, or interview role.
- `CANDIDATE` uses account-linked candidate ownership for profile, application,
  interview, and offer access.

Specifications continue to apply department and assignee predicates. Resource lookup
helpers now use single-company ID lookup and immediately apply the corresponding
authorization policy.

Implementation Status: **IMPLEMENTED**

Evidence:

- `recruitment-service/.../JobRequisitionSpecifications.java`
- `recruitment-service/.../JobPostingSpecifications.java`
- `application-service/.../ApplicationSpecifications.java`
- `offer-service/.../OfferSpecifications.java`
- Phase 5, 6, and 7 authorization tests

## 7. RabbitMQ And Audit Contracts

Tenant fields were removed from audit and business events in every producer and the
notification consumer. Producer/consumer record components now match for:

```text
AuditEvent
RequisitionSubmittedEvent
ApplicationCreatedEvent
ApplicationStatusChangedEvent
ApplicationStaleEvent
ApplicationCommentMentionEvent
InterviewScheduledEvent
InterviewConfirmedEvent
OfferApprovedEvent
OfferAcceptedEvent
OfferDeclinedEvent
```

Audit timestamp naming was also normalized to `occurredAt` in application and offer
producers so notification-service persists the actual event time.

Implementation Status: **IMPLEMENTED**

Evidence:

- event packages in auth, recruitment, candidate, application, interview, and offer
- `notification-service/.../event/BusinessEventListener.java`
- `notification-service/.../auditlog/AuditLogListener.java`
- `notification-service/.../auditlog/AuditLogService.java`

## 8. Database Cleanup

Versioned migrations now drop deprecated `tenant_id` columns from domain databases:

| Service | Migration |
| --- | --- |
| masterdata | `V2__drop_legacy_tenant_columns.sql` |
| recruitment | `V2__drop_legacy_tenant_columns.sql` |
| candidate | `V3__drop_legacy_tenant_columns.sql` |
| application | `V3__drop_legacy_tenant_columns.sql` |
| interview | `V3__drop_legacy_tenant_columns.sql` |
| offer | `V3__drop_legacy_tenant_columns.sql` |
| notification | `V2__drop_legacy_tenant_columns.sql` |

Each migration is defensive. Before dropping columns, it verifies that a table does
not contain multiple distinct non-null legacy tenant IDs and that tables in the same
database do not disagree on the selected legacy tenant. Any ambiguous database fails
the migration with an explicit backup/reconciliation message. No tenant's rows are
selected, merged, or deleted automatically.

Fresh Docker schema remains tenant-free. The deprecated auth `tenant` table can still
exist in upgraded legacy databases, but it has no entity, repository, API, or runtime
consumer. Physical removal of that auth-only recovery table remains cleanup work after
an operator confirms backup and reconciliation.

Implementation Status: **IMPLEMENTED for guarded domain migrations; live migration NOT EXECUTED**

Evidence:

- migrations listed above
- `docker/postgres-init/init-databases.sql`
- `ATS_PHASE_4_DATABASE_ENTITY_CLEANUP.md`

## 9. Verification

Clean Maven test results:

| Module | Tests | Failures | Errors | Skipped |
| --- | ---: | ---: | ---: | ---: |
| api-gateway | 10 | 0 | 0 | 0 |
| auth-service | 31 | 0 | 0 | 0 |
| masterdata-service | 3 | 0 | 0 | 0 |
| recruitment-service | 13 | 0 | 0 | 0 |
| candidate-service | 10 | 0 | 0 | 0 |
| application-service | 6 | 0 | 0 | 0 |
| interview-service | 5 | 0 | 0 | 0 |
| offer-service | 9 | 0 | 0 | 0 |
| notification-service | 2 | 0 | 0 | 0 |
| dashboard-service | 1 | 0 | 0 | 0 |
| **Total** | **90** | **0** | **0** | **0** |

Additional verification:

| Check | Result |
| --- | --- |
| `mvn -q clean test` for all 10 backend modules | PASS |
| Backend clean compilation | PASS; `clean test` rebuilt all main and test source |
| Frontend production build | PASS |
| Docker Compose config | PASS; local Docker config permission warning only |
| Runtime/source/config tenant scan | PASS, zero matches outside migrations/docs |
| Test-source tenant scan | PASS, zero matches |
| Dangling Java argument scan | PASS, zero matches |
| Producer/consumer event component comparison | PASS |
| `git diff --check` | PASS; line-ending notices only |

The live PostgreSQL migrations were not run because they may intentionally stop on
ambiguous legacy data and require a database backup/reconciliation decision.

## 10. Acceptance Criteria

| Criterion | Result | Evidence |
| --- | --- | --- |
| Backend build passes | PASS | 10 clean Maven test builds, 90 tests |
| Requests/responses do not require tenant | PASS | zero runtime contract matches |
| No tenant header | PASS | gateway/controllers/Feign/frontend scan |
| No tenant code public route | PASS | global public company/jobs routes only |
| Role/department/self CRUD remains operational | PASS | Phase 5-7 tests rerun cleanly |
| Candidate workflow has no regression | PASS | candidate/application/interview/offer tests and frontend build |
| Physical domain columns have a removal path | PASS | seven guarded migrations |

## 11. Deployment Notes And Residual Risk

Before deploying Phase 10 to a legacy environment:

1. Back up every service database.
2. Verify legacy data belongs to one selected company.
3. Drain or version RabbitMQ queues so old and new event contracts are not mixed.
4. Start persistence services and allow Flyway to validate/drop domain tenant columns.
5. Confirm candidate CV object storage and existing stored resume URLs.
6. Run gateway API smoke tests for each role and department.

The migrations deliberately fail instead of guessing when legacy data contains more
than one tenant. That failure is a safe deployment stop, not a runtime fallback to
multi-tenancy.

Implementation Status: **PARTIALLY IMPLEMENTED operationally until migrations run on the target database**
