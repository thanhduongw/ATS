# ATS Phase 6 - Department Authorization

## 1. Execution Status

Phase 6 is **COMPLETED** for the backend department-authorization baseline on
2026-08-28.

The implementation keeps the frozen four-role model:

- `COMPANY_ADMIN`
- `RECRUITER`
- `HIRING_MANAGER`
- `CANDIDATE`

No tenant boundary, platform administrator, permission table, or fifth interviewer
role was introduced.

Implementation Status: **IMPLEMENTED**

## 2. Effective Department Policy

| Actor | Effective resource scope |
| --- | --- |
| `COMPANY_ADMIN` | All departments. |
| `RECRUITER` | Own department or an explicitly assigned requisition/application. |
| `HIRING_MANAGER` | Own department; interview and offer access also permits explicit interviewer/approver assignment. |
| `CANDIDATE` | Self scope only. Department is not used. |

Ownership still narrows mutation rights where the workflow requires it. For example,
a hiring manager can view requisitions in the same department but can update/submit
only an owned requisition.

The existing requisition workflow is preserved: `HIRING_MANAGER` creates and submits;
`RECRUITER` or `COMPANY_ADMIN` approves, rejects, or requests changes. A hiring manager
cannot approve a requisition in any department. This is stricter than the isolated
Phase 6 example that mentioned hiring-manager approval and matches the implemented
business workflow in `JobRequisitionController` and `JobRequisitionService`.

Implementation Status: **IMPLEMENTED**

Evidence:

- `recruitment-service/.../security/AuthorizationPolicy.java`
- `recruitment-service/.../requisition/JobRequisitionService.java`
- `recruitment-service/.../posting/JobPostingService.java`
- `application-service/.../security/AuthorizationPolicy.java`
- `candidate-service/.../candidate/CandidateService.java`
- `interview-service/.../interview/InterviewService.java`
- `offer-service/.../offer/OfferService.java`

## 3. Department Source Chain

The implemented authorization chain is:

```text
AppUser.departmentId
        |
        v
JobRequisition.departmentId
        |
        v
JobPosting.requisition.departmentId
        |
        v
Application.departmentId snapshot
        |
        +--> candidate visibility through accessible application IDs
        |
        +--> Interview.departmentId + assignedRecruiterId snapshots
        |
        +--> Evaluation and Salary Proposal through Interview/Application
        |
        +--> Offer.departmentId + assignedRecruiterId snapshots
```

`Application.pipelineId` is also snapshotted. This prevents an assigned recruiter from
having to acquire unrelated job access merely to advance a pipeline or create an
interview for an application that was explicitly assigned to that recruiter.

Implementation Status: **IMPLEMENTED**

Evidence:

- `auth-service/.../entity/AppUser.java`, field `departmentId`
- `recruitment-service/.../requisition/JobRequisition.java`, field `departmentId`
- `recruitment-service/.../posting/JobPosting.java`, relation `requisition`
- `application-service/.../application/Application.java`, fields `departmentId`, `pipelineId`
- `interview-service/.../interview/Interview.java`, fields `departmentId`, `assignedRecruiterId`
- `offer-service/.../offer/Offer.java`, fields `departmentId`, `assignedRecruiterId`

## 4. Recruitment Enforcement

### Requisitions

- List queries apply department/assignment scope in `JobRequisitionSpecifications`.
- Hiring managers list and view requisitions in their department.
- Create validates `request.departmentId` against `CurrentUser.departmentId` in both
  controller and service.
- Update validates both the persisted department and requested replacement department.
- Update/submit additionally require requester ownership, except global admin override.
- Recruiter access permits same department or explicit `approverId` assignment.
- Approval actions require the assigned recruiter or company admin.

### Job postings

- Department is inherited from the related requisition; posting requests cannot select
  a separate department.
- List queries apply department/assignment scope in `JobPostingSpecifications`.
- Detail uses view scope; mutation uses the stricter job-management scope.

Implementation Status: **IMPLEMENTED**

Evidence:

- `JobRequisitionController.create`, `update`
- `JobRequisitionService.getAll`, `getById`, `create`, `update`, `submit`, `approve`
- `JobRequisitionSpecifications.build`
- `JobPostingService.getAll`, `getById`, `create`, `requireCanManage`
- `JobPostingSpecifications.build`

## 5. Application And Candidate Enforcement

### Applications

- New applications copy `departmentId` and `pipelineId` from the validated posting.
- Recruiter list scope is `same department OR assignedRecruiterId = current user`.
- Hiring-manager list scope is the current department.
- Company-admin scope is global.
- Candidate list/detail remains candidate-self scoped.
- Department/assignment predicates now execute in the repository specification before
  pagination; the old fetch-all then in-memory authorization filter was removed.
- Detail, history, comments, stage changes, rejection, assignment, bulk actions, and
  delete continue to call resource authorization.

### Candidate profiles and CVs

Candidate profiles do not receive an artificial department. Internal visibility is
derived from applications:

1. candidate-service forwards the trusted current-user context to application-service;
2. `GET /api/application/applications/access-scope/candidate-ids` returns only IDs from
   applications visible by department/assignment;
3. candidate list, detail, summary, update, CV upload/download, tags, pool changes, and
   delete enforce membership in that set;
4. company admin bypasses the department set; candidate access remains self-only.

An unassociated candidate profile has no defensible department source. It is therefore
visible/manageable only by `COMPANY_ADMIN` until an authorized application association
exists. Manual internal candidate creation is also admin-only for the same reason.

Implementation Status: **IMPLEMENTED**

Evidence:

- `ApplicationSpecifications.build`
- `ApplicationService.getAll`, `getAccessibleCandidateIds`, `authorizeApplication`
- `ApplicationController.getAccessibleCandidateIds`
- `candidate-service/.../client/ApplicationServiceClient.java`
- `CandidateSpecifications.accessibleIds`
- `CandidateService.authorizeCandidateRecord`, `requireCvFileAccess`
- `CandidateController` protected candidate mutation and CV endpoints

## 6. Interview, Evaluation, Slot, And Offer Enforcement

### Interviews and evaluations

- Interview rows inherit `departmentId` and `assignedRecruiterId` from the application.
- Recruiter query scope is own department or assigned application.
- Hiring-manager query scope is own department or explicit interviewer assignment.
- Detail and ICS use the same local resource rule.
- Evaluation submit/read authorizes against the interview resource; an explicitly
  assigned interviewer can work across departments without receiving general access to
  the underlying department.
- Bulk scheduling and three-party slot selection copy the same snapshots.
- Pending slot lists filter non-admin users through application authorization.
- Salary proposals use application scope, or interview scope when an interview ID is
  supplied and validated against the application.

### Offers

- Offer rows inherit `departmentId` and `assignedRecruiterId` from the application.
- Offer list scope executes in `OfferSpecifications` before pagination.
- Recruiter view scope is own department or assigned application.
- Hiring-manager view scope is own department or explicit approver assignment.
- Approve/reject still requires the exact approver, with company-admin override.
- Candidate accept/decline remains self-owned through candidate/application linkage.

Implementation Status: **IMPLEMENTED**

Evidence:

- `InterviewRepository.findForHiringManager`, `findForRecruiter`
- `InterviewService.getAll`, `requireCanView`, `create`, `bulkSchedule`
- `InterviewEvaluationService.submit`, `getByInterview`
- `InterviewSlotService.getMyPendingSlots`, `selectSlot`
- `SalaryProposalService.submit`
- `OfferSpecifications.build`
- `OfferService.getAll`, `create`, `assertCanView`, `approve`, `reject`

## 7. Request Department Validation

The current request DTO scan found only these client-supplied department fields:

| Request | Validation |
| --- | --- |
| `CreateUserRequest.departmentId` | Company-admin only; active department is verified through masterdata-service. Recruiter and hiring-manager require a department. |
| `JobRequisitionCreateRequest.departmentId` | Hiring-manager/admin role plus same-department check in controller and service. |
| `JobRequisitionUpdateRequest.departmentId` | Persisted and requested departments are both checked before mutation. |

Application, interview, evaluation, slot, salary proposal, and offer requests do not
accept a department as authorization evidence.

Implementation Status: **IMPLEMENTED**

## 8. Database Migration

Added migrations:

- `application-service/.../V2__add_application_department_scope.sql`
- `interview-service/.../V2__add_interview_department_scope.sql`
- `offer-service/.../V2__add_offer_department_scope.sql`

The migrations add authorization snapshot columns and active-resource indexes. They do
not fabricate department values for existing rows because the authoritative parent data
lives in separate service databases.

Legacy behavior is fail closed:

- non-admin same-department checks reject a `NULL` snapshot;
- company admin can access legacy rows for reconciliation;
- candidate self scope remains based on candidate/application ownership;
- legacy application `pipelineId = NULL` temporarily falls back to recruitment-service.

No live database migration or destructive data update was executed in this phase.
Production rollout requires a one-time reconciliation job/export-import process before
the columns can safely become `NOT NULL`.

Implementation Status: **PARTIALLY IMPLEMENTED - schema ready, legacy data reconciliation required**

## 9. Tests And Verification

New or expanded tests cover:

- hiring manager cannot create or move requisitions to another department;
- hiring manager can view same-department jobs without owning them;
- candidate directory rejects a hiring manager outside application scope;
- assigned recruiter can access a cross-department application/candidate;
- company admin can access candidates without an application scope;
- interview access permits same department or assignment and rejects unrelated departments;
- offer access permits same department or assignment and rejects unrelated departments;
- candidate A still cannot read candidate/application B.

Full backend verification result:

| Service | Tests | Failures | Errors | Skipped |
| --- | ---: | ---: | ---: | ---: |
| api-gateway | 8 | 0 | 0 | 0 |
| auth-service | 21 | 0 | 0 | 0 |
| masterdata-service | 3 | 0 | 0 | 0 |
| recruitment-service | 13 | 0 | 0 | 0 |
| candidate-service | 9 | 0 | 0 | 0 |
| application-service | 5 | 0 | 0 | 0 |
| interview-service | 4 | 0 | 0 | 0 |
| offer-service | 7 | 0 | 0 | 0 |
| notification-service | 2 | 0 | 0 | 0 |
| dashboard-service | 1 | 0 | 0 | 0 |
| **Total** | **73** | **0** | **0** | **0** |

`git diff --check` also passed; Git only reported existing LF-to-CRLF conversion
warnings.

These are Maven unit, contract, and Spring-context tests. A live multi-service Docker/
PostgreSQL migration test was not executed in this phase.

Implementation Status: **PASS**

## 10. Acceptance Check

| Phase 6 criterion | Result |
| --- | --- |
| Different department cannot view/update unrelated resources | PASS for protected requisition, posting, application, candidate, interview/evaluation/slot, salary proposal, and offer flows. |
| Candidate cannot use another candidate ID | PASS for current protected candidate/application flows; Phase 7 completes candidate portal endpoint redesign. |
| Request `departmentId` is not trusted | PASS. Every current request field is role/scope validated. |
| Company admin can access departments A and B | PASS. |
| Recruiter department A cannot update job department B unless assigned | PASS. |
| Hiring manager department A cannot approve requisition department B | PASS because hiring managers cannot invoke recruiter approval actions at all. |

Implementation Status: **ACCEPTED WITH DOCUMENTED MIGRATION LIMITATION**

## 11. Known Deferred Work

1. Trusted machine-to-machine identity remains **NOT IMPLEMENTED**. The legacy `SYSTEM`
   workflow calls remain fail-closed as documented in Phase 5.
2. Legacy `X-Tenant-Id` compatibility parameters remain until Phase 10; they are not
   used as a department authorization source.
3. Candidate portal endpoint redesign, authenticated self-apply without client-selected
   candidate ID, and final public-apply removal belong to Phase 7.
4. Candidate visibility currently depends on one synchronous application-service scope
   lookup. It is secure and fail-closed, but a future persisted/event-driven projection
   may improve availability and query cost.
5. Pending interview-slot filtering still validates application scope per slot. It is
   secure but should be replaced by a persisted slot department snapshot if volume grows.

## 12. Phase 7 Handoff

Phase 7 should keep this department baseline fixed and focus on candidate self-service:

1. derive the candidate profile exclusively from `CurrentUser.userId`;
2. remove/ignore arbitrary candidate IDs in candidate apply endpoints;
3. expose `/me`, `/my`, CV, interview, and offer routes with ownership checks;
4. remove unauthenticated public candidate creation/apply behavior;
5. add end-to-end candidate A versus candidate B tests.

Implementation Status: **READY FOR PHASE 7**
