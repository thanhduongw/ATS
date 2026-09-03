# ATS Phase 4 - Database & Entity Cleanup

> Current-state note (2026-09-01): Phase 10 completed the API/event cleanup and added
> guarded migrations that drop deprecated domain `tenant_id` columns. Details below
> describe the compatibility boundary as it existed at the end of Phase 4.

## 1. Execution Status

**Status: COMPLETED for the Phase 4 code and versioned-migration baseline.**

The persistence model is now single-company:

- No JPA `@Entity` maps `tenantId` or `tenant_id`.
- No Spring Data repository declares a tenant-scoped query method or parameter.
- The auth `Tenant` entity, repository, status enum, activation event, and publisher
  were removed.
- Master-data tenant activation seeding/listening was removed.
- Flyway is enabled for every persistence service.
- New migrations preserve resource indexes and same-database foreign keys.
- Fresh Docker auth seed data contains only the four target roles and one company.

No migration was applied to a live PostgreSQL database. Legacy tenant columns and the
legacy auth `tenant` table are intentionally retained by compatibility migrations as
deprecated recovery data. They are not mapped or queried by runtime persistence code.

Implementation Status: **IMPLEMENTED for code/schema baseline; live data migration NOT EXECUTED**

Evidence:

- `auth-service/.../db/migration/V3__single_company_schema_baseline.sql`
- `masterdata-service/.../db/migration/V1__single_company_masterdata.sql`
- versioned migrations in recruitment, candidate, application, interview, offer,
  and notification services
- `docker/postgres-init/init-databases.sql`

## 2. Tenant Domain Removal

Removed runtime types:

- `auth.entity.Tenant`
- `auth.repository.TenantRepository`
- `auth.enums.TenantStatus`
- `auth.event.TenantActivatedEvent`
- `auth.event.TenantEventPublisher`
- `masterdata.event.TenantActivatedEvent`
- `masterdata.event.TenantActivatedListener`
- tenant activation queue and binding in masterdata `RabbitMQConfig`

`Company` is now a global company profile. `CompanyRepository` resolves the first and
only profile, and migration V3 creates a unique constant-expression index. Migration
V3 fails with a clear exception when legacy data contains more than one company row;
it does not choose or delete a company automatically.

The physical `tenant` table is **DEPRECATED**, not dropped. This is deliberate because
the selected company and data reconciliation policy cannot be inferred safely from
source code.

`tenant_settings` was not present in the scanned source/schema: **NOT IMPLEMENTED / no table to migrate**.

Implementation Status: **IMPLEMENTED in runtime; physical legacy table DEPRECATED**

Evidence:

- `auth-service/.../entity/Company.java`
- `auth-service/.../repository/CompanyRepository.java`
- `auth-service/.../service/CompanyService.java`
- `auth-service/.../controller/PublicCompanyController.getCompany`
- `auth-service/.../db/migration/V3__single_company_schema_baseline.sql`

## 3. Entity And Repository Cleanup

Tenant fields were removed from these persistence groups:

| Service | Entities cleaned | Repository behavior |
| --- | --- | --- |
| auth | Company, PasswordResetToken; AppUser/EmailVerification were already tenant-free | global company/email lookup |
| masterdata | Department and all catalog/pipeline entities | global name/code/order queries |
| recruitment | JobRequisition, JobPosting | ID/status/requisition queries only |
| candidate | Candidate, CustomFieldDefinition | user/email/ID/global active queries |
| application | Application, ApplicationComment | candidate/posting/ID queries |
| interview | Interview, InterviewSlot, SalaryProposal | application/candidate/interviewer/ID queries |
| offer | Offer | application/ID queries |
| notification | Notification, AuditLog | recipient/ID queries |

Specifications no longer add `root.get("tenantId")` predicates. Service builders no
longer set tenant on persisted entities. Scheduled cleanup/reminder jobs now scan the
single company dataset once instead of enumerating tenant IDs.

Legacy controller/service method parameters may still be accepted, but repository
selection no longer uses them. Their removal is Phase 10 so that controllers, Feign
clients, DTOs, public routes, and RabbitMQ producers/consumers can change together.

Implementation Status: **IMPLEMENTED for entity/repository persistence scope; API contracts PARTIALLY IMPLEMENTED until Phase 10**

Evidence:

- all `*Repository.java` files in the eight persistence services
- `JobRequisitionSpecifications`, `JobPostingSpecifications`
- `CandidateSpecifications`, `ApplicationSpecifications`, `OfferSpecifications`
- `DataRetentionCleanupJob`, `StaleApplicationReminderJob`

## 4. Required Relationships

| Relationship | Current representation | Database enforcement |
| --- | --- | --- |
| AppUser -> Role | `app_user.role_id` | FK in auth DB migration/clean seed |
| AppUser -> Department | `app_user.department_id` | logical cross-service ID; positive check/index in auth DB |
| Candidate -> AppUser | `candidate.user_id` | logical cross-service ID; active unique index |
| JobRequisition -> Department | `job_requisition.department_id` | logical cross-service ID; index |
| JobPosting -> Requisition | JPA `ManyToOne`, `requisition_id` | FK in recruitment DB |
| Application -> Candidate | `application.candidate_id` | logical cross-service ID; index |
| Application -> JobPosting | `application.job_posting_id` | logical cross-service ID; index |
| Interview -> Application | `interview.application_id` | logical cross-service ID; index |
| Interview -> Interviewer | `interview_interviewer.interviewer_id` | logical cross-service ID; index |
| Offer -> Application | `offer.application_id` | logical cross-service ID; index |

PostgreSQL cannot create foreign keys across the separate service databases. These
logical relationships must be validated through service APIs and authorization policy.
The same-database child relationships for posting/requisition, application
comments/history, and interview children receive versioned FK migrations.

Implementation Status: **IMPLEMENTED at schema level where technically possible; cross-service integrity requires service validation**

Evidence:

- entity fields and `@JoinColumn` mappings listed above
- `DepartmentDirectoryClient.existsActive`
- `CandidateService.provisionRegisteredCandidate`
- Phase 4 migration files

## 5. Department And Candidate Account Contracts

`AppUser.departmentId` remains nullable for `COMPANY_ADMIN` and `CANDIDATE` and is
required by `UserService` for `RECRUITER` and `HIRING_MANAGER`. Supplied department IDs
are validated against the active department endpoint before an internal account is
created.

`Candidate.userId` remains unique for active profiles. Candidate registration emits
`candidate.registered`; candidate-service links the matching email or creates a profile
with that user ID, idempotently.

Department-based resource authorization is not completed by this phase. The schema
now carries the required department relationships; enforcement remains Phase 5/6.

Implementation Status: **IMPLEMENTED for relationships and account provisioning; department resource authorization PARTIALLY IMPLEMENTED**

Evidence:

- `auth.entity.AppUser.departmentId`
- `auth.service.UserService.validateInternalUserRequest`
- `auth.client.DepartmentDirectoryClient.existsActive`
- `candidate.entity.Candidate.userId`
- `candidate.service.CandidateService.provisionRegisteredCandidate`
- `recruitment.requisition.JobRequisition.departmentId`

## 6. Migration Strategy

Flyway now runs in auth, masterdata, recruitment, candidate, application, interview,
offer, and notification services with baseline version 0. Existing databases can be
adopted without pretending they are empty.

Compatibility migrations:

1. Drop `NOT NULL` from a legacy tenant column when it exists.
2. Add a database comment marking the column deprecated.
3. Add relationship indexes and same-database foreign keys.
4. Add single-company uniqueness where safe and required.
5. Fail instead of deleting ambiguous multi-company auth data.

`spring.jpa.hibernate.ddl-auto` remains `update`: **PARTIALLY IMPLEMENTED migration ownership**.
Moving to `validate` requires complete create-schema migrations for clean databases and
is deferred until legacy data has been reconciled and every schema is fully versioned.

Implementation Status: **PARTIALLY IMPLEMENTED**

Evidence:

- persistence-service `pom.xml` Flyway dependencies
- persistence-service `application.yml` Flyway configuration
- all `src/main/resources/db/migration` files

## 7. Fresh Docker Baseline

`docker/postgres-init/init-databases.sql` now:

- does not create a tenant table or tenant columns for a fresh installation;
- creates one company profile;
- seeds only COMPANY_ADMIN, RECRUITER, HIRING_MANAGER, and CANDIDATE;
- does not seed PLATFORM_ADMIN;
- includes `department_id`, account status, verification, timestamps, role FK, and a
  positive department check on `app_user`;
- seeds one active masterdata department matching internal demo users.

This file affects only fresh PostgreSQL volumes. It does not modify an existing volume.

Implementation Status: **IMPLEMENTED for fresh installation**

Evidence:

- `docker/postgres-init/init-databases.sql`

## 8. Verification

Clean Maven test results:

| Module | Tests | Failures | Errors | Skipped |
| --- | ---: | ---: | ---: | ---: |
| api-gateway | 8 | 0 | 0 | 0 |
| auth-service | 21 | 0 | 0 | 0 |
| masterdata-service | 3 | 0 | 0 | 0 |
| recruitment-service | 5 | 0 | 0 | 0 |
| candidate-service | 4 | 0 | 0 | 0 |
| application-service | 1 | 0 | 0 | 0 |
| interview-service | 2 | 0 | 0 | 0 |
| offer-service | 1 | 0 | 0 | 0 |
| notification-service | 2 | 0 | 0 | 0 |
| **Total** | **47** | **0** | **0** | **0** |

Additional checks:

- `docker compose config --quiet`: PASS; local Docker config permission warnings only.
- Scan of all JPA entities for `tenantId/tenant_id`: zero matches.
- Scan of all repositories for tenant names/parameters: zero matches.
- `git diff --check`: no whitespace errors; line-ending warnings only.

Actual PostgreSQL migration/schema boot: **NOT EXECUTED**. Running migrations could
change persistent user data and requires explicit approval plus a backup/reconciliation
decision for legacy multi-company rows.

## 9. Acceptance Matrix

| Acceptance criterion | Result | Evidence |
| --- | --- | --- |
| Entity runtime does not require tenantId | PASS | zero entity matches; contract tests |
| Repository query does not require tenant | PASS | zero repository matches; contract tests |
| Internal user supports validated department | PASS | Phase 3 UserService tests + app_user schema |
| Candidate account creates/links profile | PASS | CandidateRegistrationProvisioningTest |
| Required resource relationship columns exist | PASS | entities + migrations |
| Same-database FK/index baseline exists | PASS | Phase 4 migrations |
| Department relation used in resource authorization | PARTIAL | schema/account validation complete; Phase 5/6 policy pending |
| Schema boots against actual migrated PostgreSQL | NOT EXECUTED | no live migration was run |

## 10. Deferred Work

### Phase 5 and Phase 6

- Centralize role, department, assignment, and self-scope authorization.
- Enforce `AppUser.departmentId` against each resource department.
- Replace compatibility scope value `0L` in legacy event/client paths.

### Phase 9

- Add generic forgot-password responses, OTP attempt limits, and token hardening.
- The password-reset persistence is already tenant-free in Phase 4.

### Phase 10

- Remove remaining tenant parameters from controllers, services, Feign clients, DTOs,
  public routes, audit/business event contracts, dashboard code, and frontend callers.
- Remove physical deprecated tenant columns/table only after backup and reconciliation.
- Replace `ddl-auto:update` with `validate` after complete create-schema migrations exist.

## 11. Phase 4 Conclusion

The database-facing runtime is now **single-company persistence with role, department,
ownership/assignment reference columns**. It is not yet a fully tenant-free API surface:
legacy API and event contracts remain visible until Phase 10, but they can no longer
scope entity storage or repository reads.
