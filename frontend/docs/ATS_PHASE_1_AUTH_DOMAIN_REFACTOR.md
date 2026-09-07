# ATS Phase 1 - Auth Domain Refactor Report

## 1. Status

Phase: 1 - Auth Domain Refactor
Status: COMPLETED
Scope: auth-service user identity, login, JWT, internal-user model, OAuth2 identity lookup, and compatibility migration.

Phase 1 does not remove the Tenant/Company tables, legacy company registration, public tenant career routes, or downstream X-Tenant-Id handling. Those items remain assigned to Phase 2, 3, 4, 8, and 10.

## 2. Implemented Contract

### Login

POST /api/auth/login now accepts:

    {
      "email": "user@example.com",
      "password": "password"
    }

Login behavior:

- Finds the user by globally unique, case-insensitive email.
- Verifies the password hash.
- Allows only ACTIVE accounts.
- Rejects PENDING_VERIFICATION, LOCKED, and INACTIVE accounts.
- Loads the single role attached to the user.
- Issues an access token and a persisted refresh token.
- Uses the configured refresh-token expiration instead of a hard-coded seven days.

Refresh also rechecks account status. A locked or inactive account cannot use an existing refresh token to obtain a new access token.

### JWT

Access-token claims are:

    sub = userId
    email
    role
    departmentId (only when non-null)
    iat
    exp

tenantId is no longer generated.

### User model

AppUser now contains:

- id
- email, unique globally
- passwordHash
- fullName
- phone
- roleId
- departmentId
- status
- emailVerified
- createdAt
- updatedAt

AppUser no longer maps tenantId.

UserStatus now contains:

- PENDING_VERIFICATION
- ACTIVE
- LOCKED
- INACTIVE

Runtime roles now contain exactly:

- COMPANY_ADMIN
- RECRUITER
- HIRING_MANAGER
- CANDIDATE

PLATFORM_ADMIN was removed from RoleName.

### Internal user management

The auth user-management API no longer consumes X-Tenant-Id.

- GET /api/auth/users lists users globally in the single company.
- POST /api/auth/users creates internal users by global email.
- PATCH /api/auth/users/{id}/status changes status without a tenant comparison.
- RECRUITER and HIRING_MANAGER require departmentId.
- COMPANY_ADMIN may have a null departmentId.
- CANDIDATE is rejected by the internal-user creation flow.
- User profile responses now expose departmentId, phone, and emailVerified instead of tenantId.

The controller's existing COMPANY_ADMIN header check remains. Stronger trusted-header enforcement is Phase 2.

### OAuth2 compatibility

The optional Google OAuth2 flow no longer asks for or stores tenantCode. It looks up only a pre-existing account by global email and does not create accounts.

## 3. Database Compatibility

Flyway was added to auth-service.

Migration:

    auth-service/src/main/resources/db/migration/V1__prepare_single_company_app_user.sql

For an existing database, it:

- Preserves the legacy tenant_id column and its data.
- Drops only the tenant_id NOT NULL constraint so new single-company users can be inserted.
- Adds phone, department_id, email_verified, and updated_at when absent.
- Adds a case-insensitive unique email index.

The physical tenant_id column is intentionally not dropped in Phase 1. Physical tenant cleanup remains Phase 4 after data migration is explicitly approved.

Flyway uses baseline version 0 so the migration can run against the existing non-empty Hibernate-managed auth schema.

## 4. Transitional Compatibility

The auth audit event still has a legacy tenantId field because notification-service has not yet migrated its event/schema contract. New single-company auth events use reserved scope value 0, never a tenant from the request or JWT. The legacy field is removed with the event consumer in Phase 10.

These tenant-dependent areas intentionally remain:

- register-company and its tenant activation flow
- email verification/resend DTOs used by that legacy registration flow
- forgot/reset password tenantCode DTOs, scheduled for the Phase 9 security flow
- Company/Tenant entities and repositories
- company endpoints that still receive X-Tenant-Id
- gateway and downstream-service tenant headers
- frontend tenant login and public career routes

This remaining code is not evidence that Phase 1 login still uses multi-tenancy. It is the migration boundary for later phases.

## 5. Tests

Command:

    mvn -q test

Result:

- AuthServiceApplicationTests: 1 passed
- JwtUtilTest: 2 passed
- LoginServiceTest: 7 passed
- UserServiceTest: 3 passed
- Total: 13 passed, 0 failed, 0 errors, 0 skipped

Covered cases:

- Active account login.
- Unknown email.
- Wrong password.
- Pending, locked, and inactive account rejection.
- Locked account refresh rejection.
- JWT role/email/department claims.
- Absence of tenantId in JWT.
- Candidate JWT without department.
- Department required for recruiter.
- Candidate rejected by internal-user creation.
- Global email normalization.

The Flyway migration was compiled and packaged but was not applied to the user's real PostgreSQL data during this phase.

## 6. Acceptance Criteria

| Criterion | Result |
| --- | --- |
| Login no longer requires tenantCode | PASS |
| JWT no longer contains tenantId | PASS |
| AppUser no longer maps tenantId | PASS |
| Email is globally unique | PASS |
| Internal user has departmentId support | PASS |
| Candidate can have null departmentId | PASS |
| PLATFORM_ADMIN is absent from runtime enum | PASS |
| LOCKED and INACTIVE login is rejected | PASS |
| Refresh rechecks account status | PASS |
| Auth-service compiles and tests pass | PASS |

## 7. Next Step

Proceed with Phase 2 - Gateway and Security Context Refactor.

Phase 2 must update JwtAuthGlobalFilter before protected full-stack workflows are considered operational, because the current gateway still reads the removed tenantId claim and has not yet forwarded X-User-Email or X-Department-Id.

