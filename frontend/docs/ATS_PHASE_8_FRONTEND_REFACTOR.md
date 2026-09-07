# ATS Phase 8 - Frontend Refactor

Date: 2026-08-31

## 1. Status And Scope

Phase 8 is **COMPLETED** for the single-company frontend baseline.

The frontend now recognizes exactly four roles:

```text
COMPANY_ADMIN
RECRUITER
HIRING_MANAGER
CANDIDATE
```

No frontend source reads or sends a tenant ID/company code. Backend authorization
remains the enforcement layer; route guards and hidden menu items only improve UX.

Implementation Status: **IMPLEMENTED**

Evidence:

- `frontend/src/features/auth/types.ts`
- `frontend/src/features/auth/authSlice.ts`
- `frontend/src/services/axiosClient.ts`
- `frontend/src/routes/AppRoutes.tsx`

## 2. Authentication UI And State

The login form accepts only `email` and `password`. Successful password and OAuth2
logins decode the JWT role and redirect through `defaultRouteForRole`.

Stored auth state contains:

```text
accessToken
refreshToken
user.userId
user.email
user.role
user.departmentId
user.fullName (loaded from /auth/me)
```

`/register` is now candidate-only. It collects full name, email, phone, password,
and password confirmation. There is no role, company, or tenant selector. The API
contract calls `POST /api/auth/register`, whose backend forces role `CANDIDATE`.

Implementation Status: **IMPLEMENTED**

Evidence:

- `frontend/src/features/auth/pages/LoginPage.tsx`
- `frontend/src/features/auth/pages/RegisterPage.tsx`
- `frontend/src/features/auth/pages/OAuth2CallbackPage.tsx`
- `frontend/src/app/roleNavigation.ts`
- `frontend/src/features/auth/authApi.ts`

## 3. Route And Menu Authorization

| Role | Default route | Visible work areas |
| --- | --- | --- |
| COMPANY_ADMIN | `/dashboard` | Dashboard, users, departments/catalogs, recruitment, candidates, applications, interviews, offers, audit, settings |
| RECRUITER | `/dashboard` | Dashboard, recruitment, candidates, applications, interviews, offers, settings |
| HIRING_MANAGER | `/dashboard` | Dashboard, department-scoped recruitment data, candidates/applications, interviews, offers, settings |
| CANDIDATE | `/jobs` | Profile, jobs, own applications, own interviews, own offers, settings |

`RoleRoute` redirects an unauthorized user to the default route for their own role,
instead of always sending them to the internal dashboard. Candidate users cannot
route to `/dashboard`, `/admin/users`, internal scheduling, audit, or master data.

Implementation Status: **IMPLEMENTED**

Evidence:

- `frontend/src/components/ProtectedRoute.tsx`
- `frontend/src/components/GuestRoute.tsx`
- `frontend/src/components/RoleRoute.tsx`
- `frontend/src/components/RoleHomeRedirect.tsx`
- `frontend/src/layouts/AppLayout.tsx`
- `frontend/src/routes/AppRoutes.tsx`

## 4. Admin User Management

`/admin/users` is guarded by `COMPANY_ADMIN`. The admin can create an internal
account with full name, email, temporary password, phone, role, department, and
status. The role list excludes `CANDIDATE`; recruiter and hiring manager require a
department. Admin can also change account status.

Candidates and non-admin internal users only receive the personal account settings
tab. The company and user-management tabs are not loaded or rendered for them.

The Department controller dependency was corrected to single-company scope (`0L`)
because the gateway removes `X-Tenant-Id` and the admin form needs active departments.

Implementation Status: **IMPLEMENTED**

Evidence:

- `frontend/src/features/auth/pages/AuthManagementPage.tsx`
- `frontend/src/features/auth/authApi.ts#createInternalUser`
- `masterdata-service/.../DepartmentController.java`
- `auth-service/.../AuthController.java#createInternalUser`

## 5. Candidate Portal

Candidate navigation uses only ownership-aware endpoints:

| Screen | Frontend route | Backend API |
| --- | --- | --- |
| Profile/CV | `/my-profile` | `/api/candidate/me`, `/api/candidate/me/resume` |
| Jobs/apply | `/jobs` | open postings, `POST /api/application/applications` |
| Applications | `/my-applications` | `/api/application/applications/my` |
| Interviews | `/my-interviews` | `/api/interview/interviews/my` |
| Offers | `/my-offers` | `/api/offer/offers/my` |

Candidate interview and offer types match the reduced backend DTOs. The UI does not
depend on internal notes, recruiter IDs, requester IDs, or approver IDs. Candidate
links no longer open the internal interview scheduling page.

Implementation Status: **IMPLEMENTED**

Evidence:

- `frontend/src/features/candidate/pages/CandidateProfilePage.tsx`
- `frontend/src/features/candidate/pages/JobsPage.tsx`
- `frontend/src/features/candidate/pages/MyApplicationsPage.tsx`
- `frontend/src/features/interview/pages/CandidateInterviewsPage.tsx`
- `frontend/src/features/offer/pages/CandidateOffersPage.tsx`
- `frontend/src/features/offer/pages/OfferCandidateViewPage.tsx`

## 6. Public Career Portal

The legacy tenant-coded career URL was replaced by:

```text
/careers
/careers/jobs/:jobId
```

The frontend calls `GET /api/auth/public/company`,
`GET /api/recruitment/public/jobs`, and
`GET /api/recruitment/public/jobs/{jobId}`. Public recruitment endpoints now resolve
the single-company scope directly and no longer call a tenant-code lookup.

Implementation Status: **IMPLEMENTED**

Evidence:

- `frontend/src/layouts/PublicLayout.tsx`
- `frontend/src/features/public/publicApi.ts`
- `frontend/src/features/public/pages/CompanyJobsPage.tsx`
- `frontend/src/features/public/pages/JobDetailApplyPage.tsx`
- `recruitment-service/.../PublicJobPostingController.java`

## 7. Tenant Header Verification

`axiosClient` adds only the bearer token. The standalone public client adds no JWT
or trusted identity header. A source scan returned no match for `tenantId`,
`tenantCode`, `X-Tenant-Id`, or `PLATFORM_ADMIN` under `frontend/src`.

Implementation Status: **IMPLEMENTED**

Evidence:

- `frontend/src/services/axiosClient.ts`
- `frontend/src/features/public/publicApi.ts`
- command: `rg -n "tenantId|tenantCode|X-Tenant-Id|PLATFORM_ADMIN" frontend/src`

## 8. Verification

| Check | Result |
| --- | --- |
| Frontend production build | PASS (`npm run build`) |
| Frontend lint | PASS with 0 errors and 39 project hook/compiler warnings |
| Recruitment service tests | PASS (`mvn -q test`) |
| Masterdata service tests | PASS (`mvn -q test`) |
| Legacy tenant/platform scan | PASS, no frontend matches |
| Frontend tenant header scan | PASS, no matches |

Vite production build generated successfully. The bundle warning about a JavaScript
chunk larger than 500 kB is a performance concern, not a Phase 8 authorization defect.

## 9. Phase Boundary

Refresh-token rotation, server-side revocation, and backend logout integration were
completed by Phase 9. The sidebar now calls `POST /api/auth/logout` before clearing
frontend state/local storage; details are recorded in
`ATS_PHASE_9_AUTH_LIFECYCLE_SECURITY.md`.

Phase 10 subsequently removed the gateway's legacy tenant-header constant together
with all remaining domain tenant contracts.

Implementation Status: **IMPLEMENTED (completed by Phase 9)**

Evidence:

- `frontend/src/layouts/AppLayout.tsx#handleLogout`
- `frontend/src/services/axiosClient.ts`
- `ATS_PHASE_10_REMOVE_MULTI_TENANCY_DOMAIN_SERVICES.md`
