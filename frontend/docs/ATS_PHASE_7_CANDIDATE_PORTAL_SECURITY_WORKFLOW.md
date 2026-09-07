# ATS Phase 7 - Candidate Portal Security & Workflow

Date: 2026-08-31

## 1. Status And Scope

Phase 7 is **COMPLETED for the candidate ownership and portal workflow baseline**.

The implemented security model is:

```text
JWT sub
  -> CurrentUser.userId
  -> Candidate.userId (unique account link)
  -> Application.candidateId
  -> Interview.candidateId
  -> Offer.candidateId
```

The browser never selects a candidate profile for a candidate-owned operation.
All new portal endpoints are single-company endpoints and do not require
`X-Tenant-Id`.

Implementation Status: **IMPLEMENTED**

Evidence:

- `candidate-service/.../CandidatePortalController.java`
- `candidate-service/.../CandidateService.java`
- `application-service/.../ApplicationController.java`
- `application-service/.../ApplicationService.java`
- `interview-service/.../InterviewController.java`
- `offer-service/.../OfferController.java`

## 2. Candidate Account And Profile

Candidate registration from Phase 3 remains the account creation source:

1. auth-service creates an `AppUser` with forced role `CANDIDATE`;
2. the user starts as `PENDING_VERIFICATION`;
3. auth-service publishes `CandidateRegisteredEvent(userId, ...)`;
4. candidate-service idempotently links by `userId`/email or creates a
   `Candidate` with the same `userId`;
5. OTP verification activates the account.

Phase 7 adds a candidate-facing profile DTO which does not contain:

- candidate database ID;
- `internalNote`;
- talent-pool status/tags;
- internal custom-field values;
- department, recruiter, or reviewer identifiers.

Implemented endpoints:

| HTTP | Actual endpoint | Authorization | Ownership source |
| --- | --- | --- | --- |
| GET | `/api/candidate/me` | `CANDIDATE` | `CurrentUser.userId` |
| PATCH | `/api/candidate/me` | `CANDIDATE` | `CurrentUser.userId` |
| POST | `/api/candidate/me/resume` | `CANDIDATE` | `CurrentUser.userId` |
| POST | `/api/candidate/me/request-deletion` | `CANDIDATE` | `CurrentUser.userId` |

Email is read-only in the candidate profile contract. The candidate update DTO
cannot change email, role, department, internal note, tags, or candidate ID.

Implementation Status: **IMPLEMENTED**

Evidence:

- `CandidatePortalController`
- `CandidateSelfResponse`
- `CandidateSelfUpdateRequest`
- `CandidateService.getMyProfile`
- `CandidateService.updateMyProfile`
- `CandidateService.provisionRegisteredCandidate`

## 3. Resume Security

`POST /api/candidate/me/resume` resolves the profile from the authenticated user.
It has no path/body candidate ID.

The backend validates:

- file is present and non-empty;
- maximum size is 10 MB;
- extension is `PDF`, `DOC`, or `DOCX`.

The old `POST /api/candidate/candidates/{id}/cv` route is now internal-only.
A candidate cannot use it even with their own ID.

The local fallback file endpoint remains protected by the gateway and resolves the
stored CV URL back to a candidate before allowing access. Anonymous upload is rejected
at the gateway with 401.

Implementation Status: **IMPLEMENTED**

Evidence:

- `CandidateService.uploadMyResume`
- `CandidateService.validateResume`
- `CandidateController.uploadCv`
- `CandidateController.getCvFile`
- `CandidateService.requireCvFileAccess`
- `JwtAuthGlobalFilterTest.rejectsAnonymousCandidateResumeUpload`

## 4. Candidate Self-Apply

The actual service-prefixed endpoint is:

```http
POST /api/application/applications
```

For `CANDIDATE`, `ApplicationService.create` derives:

- `candidateId` from `CurrentUser.userId -> Candidate.userId`;
- resume URL from the owned candidate profile;
- assigned recruiter as `null`.

The backend ignores candidate-controlled values for:

- `candidateId`;
- `assignedRecruiterId`;
- `resumeUrl`.

It still validates that the posting is `OPEN`, the recruitment source exists, a CV is
present, a first pipeline stage exists, and the candidate has not already applied to
the same posting.

HR can still use the same command endpoint to apply on behalf of a selected candidate.
That branch requires an explicit candidate ID and HR authorization.

Implementation Status: **IMPLEMENTED**

Evidence:

- `ApplicationController.create`
- `ApplicationService.create`
- `ApplicationService.createForCandidate`
- `ApplicationAuthorizationTest.candidateSelfApplyIgnoresClientControlledOwnershipFields`

## 5. Applications, Interviews And Offers

Candidate-facing read APIs use dedicated DTOs and local ownership snapshots:

| HTTP | Actual endpoint | Ownership check | Candidate-visible data |
| --- | --- | --- | --- |
| GET | `/api/application/applications/my` | application candidate ID | progress list |
| GET | `/api/application/applications/my/{id}` | application candidate ID | owned application detail |
| GET | `/api/interview/interviews/my` | interview candidate ID | candidate schedule |
| GET | `/api/interview/interviews/my/{id}` | interview candidate ID | owned interview detail |
| GET | `/api/offer/offers/my` | offer candidate ID | published offers |
| GET | `/api/offer/offers/my/{id}` | offer candidate ID | owned published offer |

Internal list/detail routes now require an internal role. Candidate portal DTOs exclude
internal notes and actor IDs that are not needed by the candidate.

Offers have an additional publication boundary. Candidate APIs only expose:

- `APPROVED`;
- `ACCEPTED`;
- `DECLINED`.

`DRAFT`, `PENDING_APPROVAL`, and internally `REJECTED` offers are hidden even when
the candidate owns the related application.

Implementation Status: **IMPLEMENTED**

Evidence:

- `CandidateApplicationResponse`
- `ApplicationService.getMyApplications`
- `ApplicationService.getMyApplication`
- `CandidateInterviewResponse`
- `InterviewService.getMyInterviews`
- `InterviewService.getMyInterview`
- `CandidateOfferResponse`
- `OfferSpecifications.build(..., candidateVisibleOnly)`
- `OfferService.getMyOffers`
- `OfferService.getMyOffer`

## 6. Public Apply Removal

Unauthenticated job browsing remains available. Unauthenticated candidate creation,
CV upload, and application submission are no longer exposed.

Removed API controllers:

- `PublicApplicationController`;
- `PublicCandidateController`.

The public job-detail page now presents login and candidate-registration actions
instead of a public application form. Candidate login redirects to `/jobs`.

Implementation Status: **IMPLEMENTED at API/UI surface**

Evidence:

- deleted `application-service/.../PublicApplicationController.java`
- deleted `candidate-service/.../PublicCandidateController.java`
- `frontend/.../JobDetailApplyPage.tsx`
- `frontend/.../LoginPage.tsx`

## 7. Frontend Candidate Portal

Added or changed:

- `/my-profile`: profile edit and self CV upload;
- `/jobs`: loads the owned profile, requires an uploaded CV, then self-applies
  without candidate ID;
- `/my-applications`: uses the dedicated `/my` application API;
- candidate offer view uses `/offer/offers/my`;
- candidate login redirects to the candidate job list;
- career job detail requires login/registration before application.

Candidate menu now includes `Hồ sơ của tôi`.

The frontend remains UI protection only. All ownership decisions are enforced again
by backend services.

Implementation Status: **IMPLEMENTED for Phase 7 portal workflows**

Evidence:

- `CandidateProfilePage.tsx`
- `candidateApi.ts`
- `applicationApi.ts`
- `MyApplicationsPage.tsx`
- `JobsPage.tsx`
- `offerCandidateApi.ts`
- `AppRoutes.tsx`
- `AppLayout.tsx`

## 8. Tenant-Header Transition

The gateway from Phase 2 deliberately removes `X-Tenant-Id`. Therefore all newly
introduced candidate portal endpoints use the single-company constant only as a
temporary internal method argument and do not require that header from the browser.

The read-only catalogs needed by the candidate profile and job application flow
(education levels, skills, recruitment sources, open postings) were also made
header-free. This does not change authorization scope; these resources are global
single-company catalogs.

Remaining legacy endpoints still carrying tenant parameters are Phase 10 work.

Implementation Status: **IMPLEMENTED for the Phase 7 request path**

## 9. Tests And Verification

Backend result:

| Service | Tests | Failures | Errors | Skipped |
| --- | ---: | ---: | ---: | ---: |
| api-gateway | 9 | 0 | 0 | 0 |
| auth-service | 21 | 0 | 0 | 0 |
| masterdata-service | 3 | 0 | 0 | 0 |
| recruitment-service | 13 | 0 | 0 | 0 |
| candidate-service | 10 | 0 | 0 | 0 |
| application-service | 6 | 0 | 0 | 0 |
| interview-service | 5 | 0 | 0 | 0 |
| offer-service | 9 | 0 | 0 | 0 |
| notification-service | 2 | 0 | 0 | 0 |
| dashboard-service | 1 | 0 | 0 | 0 |
| **Total** | **79** | **0** | **0** | **0** |

Frontend:

- `tsc -b`: passed;
- Vite production bundle: passed using a temporary output directory;
- default `frontend/dist` build was blocked by a Windows lock on the existing
  `dist/favicon.svg`, after TypeScript and module transformation had passed;
- Vite reports the existing large-chunk warning (approximately 2.76 MB), not a build
  failure.

`git diff --check` passed. No live Docker/PostgreSQL/RabbitMQ end-to-end test was run.

Implementation Status: **PASS**

## 10. Acceptance Check

| Criterion | Result |
| --- | --- |
| Candidate A uploads CV successfully | PASS |
| Candidate A applies without knowing candidate ID | PASS |
| Client-supplied candidate/recruiter/resume ownership fields are ineffective | PASS |
| Candidate A cannot read candidate/application/interview/offer B | PASS |
| Anonymous user cannot upload CV | PASS |
| Candidate cannot see an unpublished offer | PASS |
| CV fallback endpoint requires authentication and ownership | PASS |

Implementation Status: **ACCEPTED**

## 11. Known Deferred Work

1. Candidate profile provisioning uses RabbitMQ delivery from Phase 3. There is no
   transactional outbox/replay workflow yet; a temporary registration/profile race is
   still possible if message delivery is delayed.
2. Trusted machine-to-machine identity remains **NOT IMPLEMENTED**. Consequently the
   existing offer accept/decline workflow's synchronous `SYSTEM` call to update the
   application remains fail-closed as documented in Phase 5. Phase 7 secures offer
   ownership/viewing; it does not pretend that cross-service status propagation works.
3. Legacy public-apply helper methods/DTOs have no controller/API exposure, but final
   mechanical removal can be completed with the broader legacy contract cleanup in
   Phase 10.
4. Frontend tenant fields in the general authentication/settings model remain Phase 8
   work. Phase 7 only changed candidate portal behavior.
5. S3/MinIO object privacy still depends on deployment bucket policy. The ATS local
   fallback endpoint is authenticated and ownership-checked; production object access
   should use private buckets and short-lived signed downloads.
6. No live multi-service database/message-broker acceptance test was executed.

## 12. Phase 8 Handoff

Phase 8 can now treat these backend contracts as fixed:

- candidate profile is `/api/candidate/me`;
- candidate applications/interviews/offers use `/my`;
- candidate apply never submits a candidate ID;
- public job browsing is separate from authenticated application submission;
- role-based navigation must not replace backend ownership checks.

Implementation Status: **READY FOR PHASE 8**
