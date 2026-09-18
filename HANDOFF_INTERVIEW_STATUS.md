# Prompt bàn giao: hoàn tất luồng trạng thái lịch phỏng vấn

> Copy toàn bộ nội dung dưới đây làm prompt cho AI tiếp theo.

---

## Bối cảnh

Tôi đang làm đồ án tốt nghiệp: hệ thống ATS (Applicant Tracking System) cho **một công ty
duy nhất**, kiến trúc microservices Java Spring Boot + frontend React 19 / TypeScript /
Ant Design. Thư mục gốc `E:\ATS`, nhánh `develop`.

**Deadline: demo trực tiếp cho giảng viên thứ Sáu 19/09/2026.** Tiêu chí chấm điểm của
thầy là *"Nghiệp vụ đầy đủ, đúng thực tế"*. Dữ liệu demo tôi tự nhập tay.

### Ràng buộc bắt buộc tuân thủ

1. **Toàn bộ dự án chỉ dùng tiếng Việt** — nhãn giao diện, comment code, thông báo lỗi,
   message commit. Không để sót chuỗi tiếng Anh nào trong phần người dùng nhìn thấy.
2. **KHÔNG được thêm file Flyway migration mới** vào `interview-service` hoặc
   `offer-service`. Lý do: DB `ats_interview` và `ats_offer` đã áp dụng migration V4–V7
   đến từ một nhánh không có trong repo (`flyway_schema_history` có V1→V8 nhưng thư mục
   `db/migration` chỉ có V1, V2, V3, V8). Thêm migration mới sẽ vỡ. Cần cột mới thì khai
   báo field trong entity JPA và để `ddl-auto: update` của Hibernate tự tạo — cấu hình
   này đã bật sẵn.
3. **Bash heredoc làm hỏng tiếng Việt thành mojibake** trong môi trường này. Muốn ghi nội
   dung tiếng Việt vào file thì viết script Python (mở file bằng `io.open(...,
   encoding="utf-8")`, ghi với `newline="\n"`) rồi chạy, hoặc dùng công cụ ghi file trực
   tiếp. Đừng dùng `cat <<EOF`.
4. Trong script sửa file, mỗi phép thay thế phải `assert` đúng **một** lần khớp trước khi
   thay, để không âm thầm sửa nhầm hoặc sửa thiếu.

### Vai trò trong hệ thống

`COMPANY_ADMIN`, `RECRUITER` (gọi là HR), `HIRING_MANAGER` (gọi là HM, thuộc phòng ban),
`CANDIDATE` (ứng viên).

---

## Việc đang làm dở

Tôi đang thay vòng đời trạng thái buổi phỏng vấn từ **4 trạng thái xác nhận một tầng**
sang **8 trạng thái xác nhận hai tầng** (HM chốt giờ trước, ứng viên xác nhận sau).

### Enum mới — đã chốt, đã cài xong ở backend

| Mã | Nhãn nội bộ | Ai đặt | Chuyển vào từ đâu |
|---|---|---|---|
| `SCHEDULED` | Chờ phòng ban xác nhận | HR | Khởi tạo — tạo lẻ hoặc tạo hàng loạt |
| `HM_RESCHEDULE_PROPOSED` | Phòng ban đề xuất đổi giờ | HM | Từ `SCHEDULED` — HM từ chối **kèm** giờ đề xuất |
| `HM_CONFIRMED` | Chờ ứng viên xác nhận | HM, hoặc HR duyệt đề xuất | Từ `SCHEDULED` (HM xác nhận thẳng) hoặc `HM_RESCHEDULE_PROPOSED` (HR duyệt). **Đây là mốc duy nhất ứng viên được thông báo** |
| `CANDIDATE_CONFIRMED` | Ứng viên đã xác nhận | Ứng viên | Chỉ từ `HM_CONFIRMED` |
| `EVALUATION_PENDING` | Chờ đánh giá | Hệ thống (cron) | Từ `CANDIDATE_CONFIRMED` khi quá giờ kết thúc mà chưa đủ phiếu |
| `COMPLETED` | Hoàn thành | Hệ thống | Từ `CANDIDATE_CONFIRMED` hoặc `EVALUATION_PENDING` khi **tất cả** HM được phân công đã nộp đánh giá |
| `NO_SHOW` | Vắng mặt | HM (thủ công) | Từ `CANDIDATE_CONFIRMED` hoặc `EVALUATION_PENDING` |
| `CANCELLED` | Đã hủy | HR / tự động | Từ 4 trạng thái đầu. HM từ chối **không kèm** giờ đề xuất → tự động vào đây |

Trạng thái cũ `CONFIRMED` đã bị xóa hẳn, tách thành `HM_CONFIRMED` + `CANDIDATE_CONFIRMED`.

---

## PHẦN ĐÃ HOÀN THÀNH — đừng làm lại

### Backend interview-service (biên dịch sạch, `mvn -o compile` exit 0)

- **`interview/InterviewStatus.java`** — viết lại với 8 giá trị. Ngoài ra khai báo sẵn 4
  tập `EnumSet` để các nơi khác dùng thay vì so sánh tay:
  - `BLOCKING` = 5 trạng thái còn chiếm chỗ trên lịch HM (dùng khi dò trùng lịch)
  - `CANCELLABLE` = 4 trạng thái HR còn hủy được
  - `RESCHEDULABLE` = `SCHEDULED`, `HM_CONFIRMED`, `CANDIDATE_CONFIRMED`
  - `HELD` = `CANDIDATE_CONFIRMED`, `EVALUATION_PENDING` (buổi đã/đáng lẽ đã diễn ra)
  - method `visibleToCandidate()` — trả `false` cho `SCHEDULED` và
    `HM_RESCHEDULE_PROPOSED`. Lưu ý: `EVALUATION_PENDING` **vẫn hiện** với ứng viên (buổi
    đó đã diễn ra thật, ẩn đi thì lịch sử của họ mất một dòng), nhưng cổng ứng viên dịch
    nhãn thành "Đã diễn ra" để không lộ chuyện nội bộ.

- **`interview/Interview.java`** — thêm 4 field:
  - `hmConfirmedAt` → cột `hm_confirmed_at` **đã có sẵn trong DB**, không cần tạo mới
  - `sessionId` → cột `session_id` (mới, Hibernate tự tạo)
  - `proposedScheduledAt` → cột `proposed_scheduled_at` (mới)
  - `proposalNote` → cột `proposal_note` varchar(500) (mới)

- **`interview/InterviewService.java`** — thêm 5 hành động + 3 helper:
  - `confirmByHm(actor, id)` — `SCHEDULED` → `HM_CONFIRMED`
  - `rejectByHm(actor, id, req)` — có `proposedScheduledAt` → `HM_RESCHEDULE_PROPOSED`;
    không có → `CANCELLED`
  - `approveHmProposal(actor, id)` — HR duyệt: chép `proposedScheduledAt` vào
    `scheduledAt`, xóa đề xuất, sang `HM_CONFIRMED`
  - `markNoShow(actor, id)` — từ tập `HELD` → `NO_SHOW`
  - `update(actor, id, req)` — HR dời lịch tại chỗ. **Nếu đang `CANDIDATE_CONFIRMED` thì
    tự lùi về `HM_CONFIRMED`** và xóa `candidateConfirmedAt`, ứng viên phải xác nhận lại.
    Không lưu lịch sử các lần dời. **Không chặn trùng lịch ở backend** — cảnh báo là việc
    của giao diện.
  - `markHmConfirmed()`, `saveAndNotifyCandidate()` (lưu xong mới bắn event),
    `assertAssignedHmOrHr()` (HM phải được phân công đúng buổi đó; HR/Admin toàn quyền)
  - `cancel()` dùng `CANCELLABLE`; `confirmByCandidate()` giờ đòi `HM_CONFIRMED`
  - `getMyInterviews` / `getMyInterview` / `assertCanView` lọc theo `visibleToCandidate()`
  - `bulkSchedule()` gán **chung một `sessionId`** cho cả lô (lấy id buổi đầu tiên), chỉ
    khi lô có từ 2 buổi. Trạng thái vẫn độc lập từng buổi.
  - Dò trùng lịch đổi sang `List.copyOf(InterviewStatus.BLOCKING)`

- **`evaluation/InterviewEvaluationService.java`** — chặn chấm điểm khi `NO_SHOW`; điều
  kiện tự động `COMPLETED` đổi sang `InterviewStatus.HELD.contains(...)`

- **`interview/InterviewEvaluationPendingJob.java`** (mới) — cron `0 */15 * * * *`, quét
  buổi `CANDIDATE_CONFIRMED` đã qua `scheduledAt + durationMinutes` → `EVALUATION_PENDING`.
  Đã thêm `@EnableScheduling` vào `InterviewServiceApplication`.

- **`interview/InterviewController.java`** — 5 endpoint mới:
  | Method | Đường dẫn | Quyền |
  |---|---|---|
  | `PUT` | `/api/interview/interviews/{id}` | HR |
  | `PATCH` | `/api/interview/interviews/{id}/hm-confirm` | nội bộ |
  | `PATCH` | `/api/interview/interviews/{id}/hm-reject` | nội bộ |
  | `PATCH` | `/api/interview/interviews/{id}/approve-proposal` | HR |
  | `PATCH` | `/api/interview/interviews/{id}/no-show` | nội bộ |

- **DTO**: `InterviewHmRejectRequest(proposedScheduledAt, note)` và
  `InterviewUpdateRequest(scheduledAt, durationMinutes, format, workLocationId,
  meetingLink, note)` là file mới. `InterviewResponse` thêm 4 field, thứ tự tham số là:
  `..., status, candidateConfirmed, hmConfirmed, sessionId, proposedScheduledAt,
  proposalNote, interviewers, createdAt`.
  **Lưu ý**: `scheduling/InterviewSlotService.java` cũng tự dựng `InterviewResponse` bằng
  constructor, đã sửa theo — nếu đổi DTO nữa thì nhớ chỗ này.

- **Event**: `InterviewHmConfirmedEvent` mới, routing key `interview.hm-confirmed`,
  publisher có `publishInterviewHmConfirmed(...)`.

### Backend notification-service (biên dịch sạch)

- `NotificationType` thêm `INTERVIEW_HM_CONFIRMED`
- Queue `notification.interview-hm-confirmed.queue` + binding
- Listener `onInterviewHmConfirmed(...)` mới
- **Đã chuyển thông báo cho ứng viên** ra khỏi `onInterviewScheduled` sang listener mới —
  đúng yêu cầu "chỉ báo cho ứng viên khi HM đã chốt giờ".
- **Đã chuyển luôn cả lịch nhắc (`scheduleInterviewReminder`) và lịch kiểm tra đánh giá
  (`scheduleEvaluationCheck`)** sang mốc `HM_CONFIRMED`. Lý do: trước khi HM chốt thì giờ
  còn thay đổi được, hẹn nhắc theo giờ tạm là hẹn sai. Nếu bạn thấy quyết định này sai thì
  nói cho tôi biết trước khi đổi.
- Thông báo cho HM lúc tạo lịch đổi tiêu đề thành "Lịch phỏng vấn chờ bạn xác nhận".

### Dữ liệu

DB là **PostgreSQL trong Docker**, container `ats-postgres`, user `ats_user`, password
`ats_password`. Truy cập: `docker exec ats-postgres psql -U ats_user -d ats_interview -c "..."`.

Cột `status` là `varchar(255)` + `@Enumerated(EnumType.STRING)` nên thêm giá trị enum là
an toàn. Tôi **đã chạy** lệnh chuyển dữ liệu cũ:
```sql
UPDATE interview SET status='CANDIDATE_CONFIRMED' WHERE status='CONFIRMED';
UPDATE interview SET hm_confirmed_at=candidate_confirmed_at
  WHERE hm_confirmed_at IS NULL AND candidate_confirmed_at IS NOT NULL;
```
Hiện có đúng 2 dòng: id=1 `COMPLETED`, id=2 `CANDIDATE_CONFIRMED`.

### Frontend — mới xong phần gộp nhãn

- **`app/statusLabels.ts`** giờ là **nguồn nhãn duy nhất**. Đã có:
  - type `InterviewStatusMeta = StatusMeta & { accent; bg; border }` (3 màu cuối dành cho
    khối lịch trong lịch phỏng vấn và lưới giờ)
  - `INTERVIEW_STATUS` — 8 trạng thái, nhãn nội bộ
  - `INTERVIEW_STATUS_FOR_CANDIDATE` (private) — nhãn rút gọn cho cổng ứng viên
  - `INTERVIEW_STATUS_ORDER` — thứ tự theo dòng chảy nghiệp vụ, dùng cho chú giải + bộ lọc
  - **`interviewStatusMeta(status, audience)`** với `audience: "internal" | "candidate"`,
    mặc định `"internal"`
- **Đã xóa file `features/interview/interviewStatus.ts`** (bản sao thứ hai) và trỏ lại 3
  nơi import: `InterviewCalendar.tsx`, `InterviewDetailModal.tsx`, `InterviewTimeGrid.tsx`
- **Đã xóa `STATUS_LABEL` nội tuyến** trong `CandidateInterviewsPage.tsx` (bản sao thứ ba)
- Trường màu Tag đổi tên từ `.tag` sang `.color` cho khớp `StatusMeta` chung

---

## PHẦN CÒN LẠI — việc của bạn

### ⚠️ Lệnh kiểm tra type đúng

`npx tsc --noEmit` ở thư mục `frontend` **không kiểm tra gì cả** — dự án dùng project
references nên config gốc rỗng. Phải chạy:

```bash
cd E:/ATS/frontend && npx tsc --noEmit -p tsconfig.app.json
```

Hiện đang có **3 lỗi** (do tôi dừng giữa chừng), đây là điểm bắt đầu của bạn:

```
src/features/interview/components/InterviewDetailModal.tsx(176,32):
    error TS2339: Property 'tag' does not exist on type 'InterviewStatusMeta'.
src/features/interview/pages/CandidateInterviewsPage.tsx(6,63):
    error TS6196: 'InterviewStatus' is declared but never used.
src/features/interview/pages/CandidateInterviewsPage.tsx(58,128):
    error TS2304: Cannot find name 'STATUS_LABEL'.
```

### 1. Cập nhật kiểu và API client

**`features/interview/types.ts`**
- `InterviewStatus` hiện vẫn là `"SCHEDULED" | "CONFIRMED" | "COMPLETED" | "CANCELLED"` →
  đổi thành union 8 giá trị mới
- `InterviewResponse` thêm: `hmConfirmed: boolean`, `sessionId: number | null`,
  `proposedScheduledAt: string | null`, `proposalNote: string | null`
- Thêm `InterviewHmRejectRequest { proposedScheduledAt?: string | null; note?: string | null }`
- Thêm `InterviewUpdateRequest { scheduledAt; durationMinutes; format; workLocationId?;
  meetingLink?; note? }`

**`features/interview/interviewApi.ts`** — thêm 5 hàm gọi đúng 5 endpoint ở bảng trên.
Đặt tên theo kiểu đang có trong file (`confirmInterview`, `cancelInterview`…):
`confirmInterviewByHm`, `rejectInterviewByHm`, `approveHmProposal`, `markInterviewNoShow`,
`updateInterview`.

### 2. Sửa hết chỗ còn so sánh với trạng thái cũ

Danh sách đầy đủ (tôi đã grep sẵn):

| File:dòng | Code hiện tại | Hướng sửa |
|---|---|---|
| `features/interview/conflicts.ts:14` | `new Set(["SCHEDULED", "CONFIRMED"])` | Đổi thành 5 trạng thái của `BLOCKING`: `SCHEDULED`, `HM_RESCHEDULE_PROPOSED`, `HM_CONFIRMED`, `CANDIDATE_CONFIRMED`, `EVALUATION_PENDING` |
| `features/candidate/pages/CandidateApplicationDetailPage.tsx:427` | `cancellable = status === "SCHEDULED" \|\| status === "CONFIRMED"` | Theo tập `CANCELLABLE` (4 trạng thái đầu) |
| `features/interview/components/InterviewCalendar.tsx:163` | `status === "SCHEDULED" && !candidateConfirmed` | Đây là bộ đếm "chờ xác nhận". Giờ phải tách 2 loại: chờ **HM** (`SCHEDULED`) và chờ **ứng viên** (`HM_CONFIRMED`) |
| `features/interview/components/InterviewCalendar.tsx:176` | như trên | như trên |
| `features/interview/components/InterviewDetailModal.tsx:73` | `confirmed = candidateConfirmed \|\| status === "CONFIRMED"` | `status === "CANDIDATE_CONFIRMED"` |
| `features/interview/components/InterviewDetailModal.tsx:142` | điều kiện nút xác nhận của ứng viên | chỉ hiện khi `status === "HM_CONFIRMED"` |
| `features/interview/components/InterviewDetailModal.tsx:143` | `canCancel = isHr && (...)` | theo tập `CANCELLABLE` |
| `features/interview/components/InterviewDetailModal.tsx:176` | `.tag` | đổi thành `.color` |
| `features/interview/pages/CandidateInterviewsPage.tsx:58` | `STATUS_LABEL[item.status]` | `interviewStatusMeta(item.status, "candidate").label`, màu Tag lấy `.color` của chính meta đó thay vì tự tính bằng toán tử ba ngôi |
| `features/interview/pages/CandidateInterviewsPage.tsx:64` | `status === "SCHEDULED" && !candidateConfirmed` | nút xác nhận chỉ hiện khi `status === "HM_CONFIRMED"` |
| `features/interview/pages/CandidateInterviewsPage.tsx:6` | import `InterviewStatus` không dùng nữa | xóa khỏi import |

Gợi ý: khai báo trong `types.ts` hoặc `statusLabels.ts` các hằng tập hợp dùng chung
(`INTERVIEW_BLOCKING`, `INTERVIEW_CANCELLABLE`, `INTERVIEW_RESCHEDULABLE`,
`INTERVIEW_HELD`) song song với backend, để không rải `===` khắp nơi.

### 3. Giao diện cho các hành động mới

**Chỗ đặt**: `features/interview/components/InterviewDetailModal.tsx` là nơi hợp lý nhất
vì nó đã nhận `isHr` / `isCandidate` và hiện chi tiết buổi phỏng vấn.

- **HM** (`status === "SCHEDULED"`, và HM đang đăng nhập có trong `interviewers`):
  - nút **"Xác nhận lịch"** → `confirmInterviewByHm`
  - nút **"Đề xuất đổi giờ"** → mở modal nhỏ có `DatePicker showTime` + ô lý do →
    `rejectInterviewByHm({ proposedScheduledAt, note })`
  - nút **"Từ chối"** (không đề xuất) → `rejectInterviewByHm({ note })`, cảnh báo trước
    rằng buổi sẽ bị hủy
- **HR** (`status === "HM_RESCHEDULE_PROPOSED"`):
  - hiện rõ giờ cũ → giờ HM đề xuất + lý do
  - nút **"Duyệt giờ đề xuất"** → `approveHmProposal`
- **HM** (`status` thuộc `HELD`): nút **"Ghi nhận vắng mặt"** → `markInterviewNoShow`,
  có `Popconfirm`
- **HR** (`status` thuộc `RESCHEDULABLE`): nút **"Dời lịch"** → modal sửa giờ / thời lượng
  / hình thức / địa điểm / link → `updateInterview`.
  - Trước khi lưu phải **cảnh báo trùng lịch** bằng `findInterviewerConflicts` có sẵn
    trong `features/interview/conflicts.ts` (nhớ truyền `excludeInterviewId` là chính
    buổi đang sửa). **Cảnh báo thôi, vẫn cho lưu nếu người dùng bấm xác nhận** — không
    chặn cứng.
  - Nếu buổi đang ở `CANDIDATE_CONFIRMED`, phải báo trước cho HR biết rằng dời lịch sẽ
    làm ứng viên phải xác nhận lại từ đầu.

### 4. Chỉ báo tiến độ đánh giá nhiều HM

Ở màn hình chi tiết buổi phỏng vấn, khi `status` thuộc `HELD` **và** có từ 2 HM trở lên
được phân công, hiện dạng **"1/2 đã đánh giá"**.

Không cần thêm field backend: `InterviewResponse.interviewers[]` mỗi phần tử đã có sẵn
`evaluationSubmitted: boolean`. Chỉ cần đếm.

### 5. Gom nhóm theo `session_id`

Các buổi tạo cùng một lô chia sẻ chung `sessionId`. Ở màn hình danh sách / lịch phỏng vấn,
gom các buổi cùng `sessionId` lại cho dễ nhìn (ví dụ badge "Lô 4 ứng viên", hoặc gạch nối
các khối cùng lô trên lịch).

**Quan trọng — đừng làm sai chỗ này**: `sessionId` chỉ để **gom nhóm hiển thị**. Trạng
thái, đánh giá, no-show vẫn hoàn toàn theo từng ứng viên. Tuyệt đối không gộp trạng thái
theo nhóm, không thêm hành động "xác nhận cả lô".

Ghi chú về cách tạo hàng loạt hiện tại, để bạn khỏi hiểu nhầm: nó **không phải** phỏng vấn
nhóm. Nó xếp các ứng viên **nối tiếp nhau** — cùng một hội đồng HM, ứng viên A 09:00–09:30,
B 09:30–10:00, C 10:00–10:30… (`cursor = slotEnd` sau mỗi người). Mỗi ứng viên là một bản
ghi `Interview` riêng.

---

## Cách kiểm chứng trước khi báo xong

```bash
# Backend
cd E:/ATS/interview-service    && mvn -o compile -DskipTests
cd E:/ATS/notification-service && mvn -o compile -DskipTests

# Frontend — nhớ dùng -p tsconfig.app.json
cd E:/ATS/frontend && npx tsc --noEmit -p tsconfig.app.json
cd E:/ATS/frontend && npx eslint src
cd E:/ATS/frontend && npx vite build
```

Yêu cầu: **0 lỗi** ở cả 3 lệnh frontend. Hiện repo có sẵn khoảng 43 cảnh báo
`react-hooks/set-state-in-effect` không liên quan, cứ để nguyên, đừng sửa lan man.

Nếu chạy được cả hệ thống thì kiểm tra tay chuỗi này:
HR tạo lịch → đăng nhập HM xác nhận → ứng viên **chỉ thấy lịch sau bước này** → ứng viên
xác nhận → HM nộp đánh giá → trạng thái tự về `COMPLETED`.

Đừng báo "đã xong" nếu chưa chạy đủ các lệnh trên. Nếu có phần nào không làm được thì nói
thẳng phần đó, đừng im lặng bỏ qua.

---

## Một cảnh báo tôi muốn bạn nhắc lại

Luồng **offer (đề nghị nhận việc) chưa từng được chạy thử đầu-cuối lần nào**, bảng `offer`
trong DB `ats_offer` vẫn 0 dòng, mà demo là thứ Sáu. Sau khi xong việc trên, hãy nhắc tôi
ưu tiên việc đó thay vì làm thêm giao diện.
