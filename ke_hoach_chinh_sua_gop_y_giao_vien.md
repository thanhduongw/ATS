# Kế Hoạch Chỉnh Sửa ATS Theo Góp Ý Giáo Viên (3–4 ngày, đã review lần 2)

> **Phạm vi:** Chỉ code phần **chưa có AI**. Mọi chỗ liên quan tới AI (chấm điểm CV, phân loại mức độ phù hợp) chỉ **chừa placeholder** (field nullable, badge "Sắp có", tab rỗng) theo đúng pattern đã có sẵn trong repo (`AiScoreBadge.tsx`, `ScoreChecklistPanel.tsx`) — không viết logic AI thật, để khi làm AI sau này chỉ cần cắm giá trị vào, không phải sửa schema/UI.
> **Kiến trúc nền:** Spring Boot microservices, `ddl-auto: update` → sửa entity xong chỉ cần restart service, không cần viết migration script tay.
> **Quyết định đã chốt cùng bạn:**
> 1. **Duyệt tin đăng:** HR tự duyệt (Draft → Editing → Approved → Published đều trong tay HR), không thêm role duyệt thứ 2 — nhất quán với việc HR đã là người duyệt Requisition.
> 2. **Company onboarding:** giảm scope — hệ thống đang chạy demo với **1 doanh nghiệp**, nên **không xây** luồng Platform Admin Approve/Reject nhiều tenant. Thay vào đó chỉ làm rõ flow hiện tại bằng tài liệu + dọn lại RBAC cho gọn trong phạm vi 1 công ty. *(Đã cân nhắc lại ở lần review này — xem cảnh báo rủi ro ở mục 3.2: đây là yêu cầu tường minh của giáo viên, quyết định giữ nguyên nghĩa là mục này sẽ không được đáp ứng khi chấm.)*
> 3. **AI chấm điểm/phân loại CV:** vẫn giữ placeholder thuần, không gọi AI thật. *(Cũng là yêu cầu tường minh của giáo viên — xem cảnh báo rủi ro ở mục 3.4. Hạ tầng đã dựng đúng chuẩn để cắm AI thật sau này nếu đổi quyết định.)*
> 4. **Thứ tự ưu tiên:** Ngày 1 = Job Posting; Ngày 2 = Interview Scheduling; Ngày 3 = RBAC + UI polish + AI scaffolding; **Ngày 4 (mới) = nâng cao trải nghiệm theo ATS thực tế + đệm rủi ro/hồi quy** (thêm sau lần review này vì mục 2 sinh ra thêm việc dù không code AI thật — xem mục "Ngày 4").

---

## 0. Đối chiếu nhanh với góp ý giáo viên (kết quả review)

| # | Góp ý giáo viên | Mức đáp ứng | Ở đâu trong kế hoạch |
|---|---|---|---|
| 1 | Job Posting: vòng đời trạng thái, truy xuất nguồn gốc, thống kê ứng viên, trang Hub tổng hợp | ✅ Đáp ứng đầy đủ, có nâng cấp thêm (audit trail + Kanban pipeline) | Ngày 1 (1.1–1.7) |
| 2 | AI lọc CV: tự động quét, phân loại 3 mức, xem nhận xét chi tiết, gán nhãn, hàng chờ duyệt tay | ❌ **Không đáp ứng** (giữ quyết định placeholder) | Ngày 3.4 — xem cảnh báo rủi ro |
| 3 | Interview Scheduling: địa điểm theo Master Data, xếp lịch tự động chống trùng, Calendar+List, bộ lọc, email 1-chạm, xem tài liệu trong app | ✅ Đáp ứng đầy đủ, mở rộng thêm "không mở tab mới" sang cả CV/resume | Ngày 2, mở rộng ở Ngày 4.2 |
| 4a | Company: làm rõ luồng onboarding | ✅ Đáp ứng (tài liệu hoá + bằng chứng kỹ thuật cụ thể) | Ngày 3.2 |
| 4b | Company: xây luồng Approve/Reject + set quyền hạn | ❌ **Không đáp ứng** (giữ quyết định tài liệu hoá) | Ngày 3.2 — xem cảnh báo rủi ro |
| 4c | RBAC: rà soát, thiết kế lại cho rõ ràng | ✅ Đáp ứng (rà soát 3 lớp, sửa chỗ lệch, không viết lại kiến trúc) | Ngày 3.1 |
| 5 | UI/UX: cuộn mượt, mọi thứ trong 1 màn hình, sticky header giữ context | ✅ Đáp ứng đầy đủ, bổ sung `scroll-behavior: smooth` | Ngày 3.3 |

**2 mục đánh dấu ❌ là quyết định có chủ đích của bạn** (đã hỏi lại trong lần review này và giữ nguyên hướng ban đầu), không phải thiếu sót do bỏ sót — kế hoạch dưới đây có cảnh báo rõ ràng ở đúng chỗ và chuẩn bị sẵn tài liệu bảo vệ ở Ngày 4.4 thay vì im lặng bỏ qua.

## 0.1. Tham khảo hệ thống ATS thực tế & artifact thiết kế "HR Workspace"

Đối chiếu với các ATS phổ biến (Greenhouse, Lever, Manatal, hireEZ, Breezy HR) và artifact "HR Workspace" bạn đã dựng trước đó, các pattern sau được vay mượn/áp dụng vào kế hoạch:

- **Kanban pipeline theo stage cho từng job** (Greenhouse/Lever) — thay vì chỉ xem ứng viên dạng bảng phẳng trên `PostingHubPage`, thêm chế độ xem Kanban tái dùng `ApplicationKanbanBoard.tsx` đã có sẵn trong repo (mục 1.7).
- **Calendar + khối "cần chú ý" bên cạnh** (`cal-nav`/`cal-grid`/`attn-card` trong artifact tham khảo) — đã được trích dẫn đúng ở mục 2.2, giữ nguyên.
- **Hệ màu badge nhất quán theo trạng thái** (xanh lá=thành công, đỏ=từ chối/đóng, vàng=cảnh báo/tạm dừng, xanh dương=đang xử lý, xám=nháp) — áp dụng thống nhất cho mọi `STATUS_COLOR` mới (mục 3.3).
- **Modal xem file/tài liệu ngay trong app thay vì mở tab mới** (artifact dùng `doc-grid` cho file đính kèm) — nguyên tắc này giáo viên chỉ nêu cho lịch phỏng vấn, nhưng repo đang phạm lỗi tương tự với CV/resume ở 3 nơi khác — mở rộng phạm vi sửa (mục 2.5, hoàn thiện ở Ngày 4.2).
- **Vòng đời trạng thái có audit trail (ai làm gì, lúc nào)**, không chỉ 1 badge trạng thái tĩnh — thực tế ATS thật luôn có timeline/lịch sử thay đổi trạng thái cho một tin đăng hay một ứng viên — bổ sung mục 1.6.
- **AI CV screening với 3 mức phân loại + giải thích + hàng chờ thủ công** đúng như giáo viên mô tả là pattern **có thật** trong các ATS thương mại (Manatal, hireEZ) — không phải yêu cầu viển vông. Ghi nhận điều này ở mục 3.4 để việc "chưa làm" là một quyết định phạm vi có ý thức, không phải vì tính năng không khả thi.

---

## Ngày 1 — Tin Tuyển Dụng (Job Posting): trạng thái, truy vết, hub, địa điểm PV theo danh mục

### 1.1. Mở rộng vòng đời trạng thái Job Posting (Backend)

**File:** `recruitment-service/src/main/java/iuh/fit/se/recruitment/posting/PostingStatus.java`

Hiện tại chỉ có `OPEN, PAUSED, CLOSED` (đây là các trạng thái *sau khi đăng*). Thêm 3 trạng thái *trước khi đăng* để khớp yêu cầu Draft → Editing → Approved → Published:

```java
public enum PostingStatus {
    DRAFT,          // Mới tạo, đang soạn
    EDITING,        // HR đang chỉnh sửa lại sau khi tạo/bị yêu cầu sửa
    APPROVED,       // HR xác nhận nội dung đã sẵn sàng, chờ bấm đăng
    OPEN,           // = "Published" — đã đăng công khai
    PAUSED,
    CLOSED
}
```

- `JobPosting.java`: tạo mới mặc định `status = DRAFT` thay vì `OPEN` như hiện tại (kiểm tra lại `PostingService.createPosting(...)`).
- Thêm action/endpoint chuyển trạng thái tường minh thay vì cho đổi tự do:
  - `PATCH /api/recruitment/postings/{id}/submit-review` : DRAFT/EDITING → APPROVED (validate đủ field bắt buộc)
  - `PATCH /api/recruitment/postings/{id}/request-edit` : APPROVED → EDITING (HR tự thu hồi để sửa tiếp)
  - `PATCH /api/recruitment/postings/{id}/publish` : APPROVED → OPEN, set `publishedAt`
  - Giữ nguyên endpoint `PATCH /postings/{id}/status` cho các chuyển đổi hậu-publish (OPEN ↔ PAUSED ↔ CLOSED), nhưng chặn không cho set thẳng về DRAFT/EDITING/APPROVED qua endpoint này.
- Validate transition hợp lệ ở service layer (map `Map<PostingStatus, Set<PostingStatus>>` các bước được phép) để tránh nhảy cóc trạng thái.

### 1.2. Frontend — hiển thị vòng đời + nút "Xem yêu cầu đăng tin"

**File:** `frontend/src/features/recruitment/types.ts`
- Cập nhật `PostingStatus` union: `"DRAFT" | "EDITING" | "APPROVED" | "OPEN" | "PAUSED" | "CLOSED"`.

**File:** `frontend/src/features/recruitment/components/PostingListPanel.tsx`
- Cập nhật `STATUS_COLOR` / `STATUS_LABEL` cho 3 trạng thái mới (vd: DRAFT=default "Bản nháp", EDITING=blue "Đang chỉnh sửa", APPROVED=cyan "Đã duyệt", OPEN=green "Đã đăng").
- Thay `Segmented` đổi trạng thái tự do hiện tại (dòng 170-179) bằng nút hành động theo đúng bước hợp lệ (Gửi duyệt / Sửa lại / Đăng tin / Tạm dừng / Đóng) — tránh cho phép click nhảy trạng thái sai luồng.
- Thêm cột **"Số ứng viên"** lấy từ `application-service` (xem mục 1.4) hiển thị ngay trên bảng, không cần click vào mới thấy.
- Thêm nút icon 🔗 **"Xem yêu cầu đăng tin"** mở `RequisitionDetailDrawer` (component đã có sẵn ở `frontend/src/features/recruitment/components/RequisitionDetailDrawer.tsx`) truyền `requisitionId` từ `record.requisitionId` — đây chính là phần **truy xuất nguồn gốc** giáo viên yêu cầu. Dữ liệu quan hệ này *đã tồn tại* ở backend (`JobPosting.requisition` là `@ManyToOne`), chỉ cần lộ ra UI.

> Ghi chú: `PostingFormModal.tsx` (dòng 350-429) đã hiển thị rất tốt thông tin nguồn gốc requisition khi *tạo/sửa* tin — mục 1.2 chỉ là đưa thêm 1 lối tắt xem nhanh ngay từ danh sách, không cần mở form sửa mới thấy được nguồn gốc.

### 1.3. Trang "Hub" chi tiết 1 tin tuyển dụng

Giáo viên yêu cầu: click vào 1 tin tuyển dụng → thấy **toàn bộ** danh sách ứng viên, trạng thái phỏng vấn từng người, kết quả cuối cùng — trong 1 màn hình.

**File mới:** `frontend/src/features/recruitment/pages/PostingHubPage.tsx`
- Route mới: `/recruitment/postings/:id` (đăng ký trong `frontend/src/routes/AppRoutes.tsx`, cùng nhóm quyền với `/recruitment`).
- Bố cục 1 trang, không dùng tab ẩn nội dung (đúng tinh thần "toàn bộ thông tin trong 1 màn hình" ở mục UI/UX):
  - **Header sticky** (xem mục 3.3): tiêu đề tin + trạng thái + nút Đăng/Tạm dừng/Đóng + nút "Xem yêu cầu gốc".
  - **Stat row**: tổng ứng viên, đang phỏng vấn, đã offer, đã tuyển — tái dùng `StatCard` (`frontend/src/components/ui/StatCard.tsx`).
  - **Bảng ứng viên**: tái sử dụng logic của `ApplicationsPage.tsx` nhưng lọc cứng theo `jobPostingId` (component này đã hỗ trợ filter theo `jobPostingId`, xem `frontend/src/features/candidate/pages/ApplicationsPage.tsx:109,141`) — mỗi dòng hiện: tên ứng viên, stage hiện tại (`currentStageName`), trạng thái phỏng vấn gần nhất (join nhanh qua `interview-service` — xem mục 1.4), kết quả cuối (`overallRecommendation` nếu đã có evaluation).
  - Click 1 dòng ứng viên → mở `ApplicationDetailDrawer` có sẵn (không điều hướng sang trang khác, giữ đúng yêu cầu "không mất context" ở mục UI/UX).
- Từ `PostingListPanel.tsx`, click vào tên tin tuyển dụng (cột "Tiêu đề") → `navigate('/recruitment/postings/' + record.id)` thay vì mở form sửa như hiện tại.

### 1.4. API tổng hợp thống kê ứng viên theo posting

Cần 1 API trả về nhanh: `{ jobPostingId, totalApplications, byStage: {...}, latestInterviewStatus, finalResult }` để không phải gọi rời rạc nhiều service từ frontend.

**Lựa chọn kỹ thuật (khuyến nghị):** thêm endpoint mới trong `dashboard-service` (service này đã có sẵn OpenFeign client gọi sang `recruitment-service`, `candidate-service`, `application-service` — xem `project_analysis.md` mục 2.10) thay vì tạo cross-service call mới từ `recruitment-service`, để giữ đúng trách nhiệm hiện có của từng service.

- **File mới:** `dashboard-service/src/main/java/.../controller/PostingStatsController.java`
  - `GET /api/dashboard/postings/{id}/stats` → gọi `ApplicationServiceClient` (đếm theo `jobPostingId`, group theo `currentStageName`) + `InterviewServiceClient` (mới, Feign — lấy status buổi PV gần nhất theo `applicationId`).
- **Frontend:** thêm hàm `getPostingStats(id)` trong `frontend/src/features/dashboard/dashboardApi.ts` (hoặc tạo `recruitmentApi.ts` nếu muốn giữ trong module recruitment), dùng cho cả cột "Số ứng viên" ở `PostingListPanel` lẫn stat row ở `PostingHubPage`.

### 1.5. Địa điểm phỏng vấn — bắt buộc chọn từ Master Data

Hiện tại `location` trong `InterviewCreateModal.tsx:171-177` và `InterviewSchedulingPage.tsx:334-336` là `<Input>` text tự do — đúng vấn đề giáo viên nêu.

**Quyết định kỹ thuật:** tái dùng catalog `WorkLocation` đã có sẵn (`masterdata-service`, endpoint `/masterdata/work-locations`, entity `name + address`) thay vì tạo catalog mới — vì bản chất "địa điểm phỏng vấn offline" và "địa điểm làm việc" trong công ty thường trùng nhau (văn phòng/chi nhánh), tránh phình thêm 1 danh mục không cần thiết trong thời gian ngắn.

- `InterviewCreateModal.tsx`: đổi field `location` (dòng 171-177) từ `<Input>` sang `<Select>` load `getCatalogItems("/masterdata/work-locations")`, value lưu `workLocationId` (đổi kiểu dữ liệu `location: string` → `workLocationId: number | null` trong `interviewCreateSchema.ts` và type `InterviewResponse`).
- `InterviewSchedulingPage.tsx` (dòng 328-337, phần tạo slot hàng loạt): tương tự, đổi `location` input thành `Select` cùng catalog.
- **Backend `interview-service`:** đổi cột `location` (String) trong entity `Interview` → `work_location_id` (Long, FK logic tới masterdata). Chỗ hiển thị (`InterviewDetailDrawer.tsx`, `SlotConfirmationPanel.tsx`, `.ics` export, Google Calendar link) thì resolve tên địa điểm qua map `workLocationId → name` (tương tự cách `PostingListPanel.tsx` đang làm với `workLocationMap`).

### 1.6. Lịch sử trạng thái (Audit Trail) — tăng tính truy vết trọn vòng đời

Giáo viên yêu cầu "theo dõi được vòng đời trạng thái", không chỉ trạng thái hiện tại tại 1 thời điểm. Bổ sung để đúng tinh thần đó, không chỉ dừng ở việc có đủ 6 trạng thái:

- `JobPosting.java`: thêm cột nullable `submittedAt`, `approvedAt`, `approvedBy` (lưu userId/tên người duyệt từ `X-User-*` header) — `publishedAt` đã có sẵn trong kế hoạch ở mục 1.1. Set giá trị tương ứng ngay trong từng endpoint chuyển trạng thái (`submit-review`, `publish`, v.v.).
- **Frontend:** thêm 1 timeline nhỏ (AntD `Steps` hoặc `Timeline`, chỉ vài dòng) trên `PostingHubPage` hiển thị Draft → Editing → Approved → Published kèm mốc thời gian + người thực hiện ở mỗi bước — trực quan hoá đúng "vòng đời", không chỉ 1 badge trạng thái tĩnh như hiện tại.

### 1.7. Kanban Pipeline trên Hub — tham khảo ATS thực tế

Các ATS phổ biến (Greenhouse, Lever) mặc định trình bày ứng viên của 1 job theo dạng bảng Kanban chia cột theo stage thay vì chỉ 1 bảng phẳng — dễ nhìn tiến trình tổng thể hơn nhiều. Repo đã có sẵn `ApplicationKanbanBoard.tsx` (đang dùng ở nơi khác, xem mục 3.4) nên chi phí thêm ở đây rất thấp — không phải viết Kanban từ đầu.

- `PostingHubPage.tsx`: thêm `Segmented` toggle "Danh sách / Kanban" cạnh Stat row (mục 1.3) — chế độ Kanban tái dùng `ApplicationKanbanBoard.tsx` lọc theo `jobPostingId`, chế độ Danh sách dùng bảng đã tả ở mục 1.3.
- Cả 2 chế độ xem dùng chung 1 `ApplicationDetailDrawer` khi click vào ứng viên — tránh tạo 2 luồng UI khác nhau cho cùng 1 hành động.

---

## Ngày 2 — Xếp Lịch Phỏng Vấn: thuật toán tự động, Calendar/List view, bộ lọc, email 1-chạm, xem tài liệu trong app

### 2.1. Thuật toán xếp lịch tuần tự tự động

Yêu cầu cụ thể: mặc định 15 phút/người, N người đăng ký → tự chia slot nối tiếp (VD: 15:00, 15:15, 15:30...). Hiện tại `InterviewSchedulingPage.tsx` (dòng 340-363) chỉ cho HR tự tay thêm từng `RangePicker` một — chưa có tính năng này.

**Backend — `interview-service`:**
- Thêm entity field cấu hình: `slotDurationMinutes` (default 15) — có thể để ở request, không cần bảng cấu hình riêng để giữ đơn giản.
- **Endpoint mới:** `POST /api/interview/slots/auto-generate`
  ```
  { applicationIds: number[], startTime: ISO, slotDurationMinutes: number,
    format, workLocationId?, meetingLink? }
  ```
  → Service tự tính: `slot[i].start = startTime + i*slotDurationMinutes`, `slot[i].end = slot[i].start + slotDurationMinutes`, tạo N bản ghi `InterviewSlot` liên tiếp, mỗi slot gắn 1 `applicationId`.
  - Validate trùng lịch: kiểm tra interviewer đã có slot khác đè lên khung giờ mới sinh ra chưa (query theo `interviewerIds` + khoảng `[start,end)`), nếu trùng → trả lỗi rõ ràng liệt kê slot bị đụng, không tạo lịch (đây là phần "xử lý triệt để trùng lịch" giáo viên yêu cầu — vốn hiện tại `createSlots` không có bước check này).

**Frontend — `InterviewSchedulingPage.tsx`:**
- Thêm chế độ "Xếp lịch hàng loạt" cạnh nút "Tạo khung giờ" hiện có: form nhập danh sách ứng viên (multi-select `applicationId` cùng posting), giờ bắt đầu, số phút/người (default 15) → preview danh sách slot sinh ra trước khi submit (giống ví dụ 15:00 → 15:15 → 15:30 giáo viên đưa ra) → gọi `auto-generate`.

### 2.2. Calendar View + List View

- **List view:** đã có sẵn ở `InterviewsPage.tsx` dạng bảng/card — giữ nguyên, chỉ cần thêm bộ lọc (mục 2.3).
- **Calendar view:** đã có component `InterviewCalendar.tsx` — kiểm tra lại đã được route/nhúng vào đâu chưa; nếu chưa có nơi hiển thị, thêm `Segmented` toggle "Danh sách / Lịch" ở đầu trang `InterviewsPage.tsx` (tham khảo đúng pattern `cal-nav` + `cal-grid` prev/next tháng, khối "Lịch cần chú ý" liệt kê lịch trùng/hôm nay trong artifact tham khảo — có thể tái hiện bằng `attn-card` tương đương ở React: danh sách các buổi PV trong ngày/tuần tới, đánh dấu buổi bị cảnh báo trùng).

### 2.3. Bộ lọc lịch phỏng vấn

**File:** `InterviewsPage.tsx` (hoặc component list nếu tách riêng)
- Thêm thanh filter: tìm theo tên ứng viên (search input, debounce như `PostingListPanel.tsx:58-64` đã làm), lọc theo khoảng thời gian (`RangePicker`), theo `status` (SCHEDULED/CONFIRMED/COMPLETED/CANCELLED), theo interviewer.
- Backend `GET /api/interview/interviews`: bổ sung query param `candidateName`, `from`, `to`, `status`, `interviewerId` nếu controller hiện tại chưa hỗ trợ đủ (kiểm tra `InterviewController` — bổ sung phần thiếu).

### 2.4. Email actionable link — xác nhận lịch 1 chạm

Hiện tại candidate xác nhận lịch bằng cách đăng nhập vào `/scheduling` rồi bấm nút (`SlotConfirmationPanel.tsx`). Giáo viên muốn: **click thẳng từ email, không cần thao tác thêm**.

- **Backend `notification-service`:** khi bắn `InterviewScheduledEvent`, sinh kèm 1 **signed token** ngắn hạn (JWT nhỏ hoặc UUID lưu bảng `interview_confirmation_token` với `interviewId + expiresAt`) và nhúng vào email: link dạng `https://<frontend>/confirm-interview?token=xxx`.
- **Backend `interview-service`:** endpoint public `GET /api/interview/public/confirm?token=xxx` — validate token, set `candidateConfirmedAt`, trả về HTML/JSON kết quả. Không yêu cầu JWT đăng nhập (đây là public endpoint như `PublicCandidateController` đã có tiền lệ ở `candidate-service`).
- **Frontend:** trang mới `frontend/src/features/public/pages/ConfirmInterviewPage.tsx`, route public `/confirm-interview` (không qua `ProtectedRoute`) — gọi API, hiện trạng thái "Đã xác nhận thành công" hoặc lỗi token hết hạn.

### 2.5. Xem tài liệu/link phỏng vấn trong app — không mở tab mới

Hiện tại mọi nơi (`InterviewDetailDrawer.tsx:140-146`, `SlotConfirmationPanel.tsx:61`, `InterviewSchedulingPage.tsx:91`) đều dùng `target="_blank"` mở link họp ở tab mới — đúng điểm giáo viên phê bình.

- Tạo component dùng chung mới: `frontend/src/components/ui/MeetingLinkModal.tsx` — nhận `url`, render `<Modal width="90%" styles={{body:{height:'80vh',padding:0}}}><iframe src={url} style={{width:'100%',height:'100%',border:0}} /></Modal>`.
- Thay toàn bộ `<a href=... target="_blank">` liên quan đến "Link họp"/xem tài liệu bằng `<Button onClick={() => setModalOpen(true)}>` mở `MeetingLinkModal`.
- Lưu ý: nhiều nền tảng meeting (Google Meet, Zoom) chặn nhúng iframe bằng `X-Frame-Options`. Ghi rõ trong code 1 fallback: nếu iframe load lỗi (bắt bằng timeout không có `onload` sau X giây, vì lỗi CSP không bắn JS error), hiện nút "Mở trong tab mới" như phương án dự phòng — không hứa suông là mọi link đều nhúng được.
- **Mở rộng phạm vi (phát hiện thêm khi review):** cùng 1 lỗi UX này — mở `target="_blank"` — cũng đang xảy ra ở 4 nơi xem **CV/resume ứng viên**, không chỉ link họp: `CandidateFormModal.tsx:168` (`cvFileUrl`), `CandidateApplicationDetailPage.tsx:477,480` (`resumeUrl`), `ApplicationsPage.tsx:339`. Giáo viên chỉ nêu ví dụ với lịch phỏng vấn, nhưng nguyên tắc "không mở tab mới" nên áp dụng nhất quán. Vì đối tượng khác nhau (PDF/doc thay vì trang web họp), đổi tên component dùng chung thành `InAppFileViewerModal.tsx` (nhận `url` + `mimeType` tuỳ chọn để chọn `<iframe>` hay `<embed type="application/pdf">`), `MeetingLinkModal` có thể là 1 preset mỏng gọi lại component này. Việc đổi 4 vị trí CV/resume này dời sang **Ngày 4.2** để không đội thời gian Ngày 2.

---

## Ngày 3 — RBAC, UI Polish, Chừa Chỗ AI

### 3.1. Rà soát & dọn lại RBAC (trong phạm vi 1 công ty)

Đã giảm scope, không xây multi-tenant approval — tập trung dọn cho đúng 4 role hiện có: `COMPANY_ADMIN, RECRUITER, HIRING_MANAGER, CANDIDATE` (+ `PLATFORM_ADMIN` giữ nguyên, không mở rộng).

- Đối chiếu 3 lớp phân quyền đang tồn tại song song, hiện dễ lệch nhau:
  1. **Frontend menu** — `MENU_BY_ROLE` trong `frontend/src/layouts/AppLayout.tsx:57-65`
  2. **Frontend route guard** — `RoleRoute` (`allow` prop) khai báo ở `frontend/src/routes/AppRoutes.tsx`
  3. **Backend** — kiểm tra role thực tế ở từng Controller (`X-User-Role` header từ gateway)
- Lập 1 bảng đối chiếu (route × role) — kiểm từng dòng 3 lớp trên có khớp nhau không. Vài điểm nghi vấn cần soi kỹ theo code đã đọc:
  - `RECRUITER` trong `AppLayout.tsx:60-62` đang **comment out** `all.applications` — cần xác nhận đây là chủ đích hay bug (HR không thấy menu Applications thì sao duyệt hồ sơ?).
  - `HIRING_MANAGER` có menu `masterdata`? Hiện đang **không có** (dòng 63) — xác nhận đúng ý đồ (đúng vì Master Data nên là quyền HR/Admin).
  - Đảm bảo mọi Controller PATCH nhạy cảm (`/postings/{id}/publish`, `/requisitions/{id}/approve`, các endpoint mới ở Ngày 1–2) đều có check role phía backend, không chỉ ẩn nút phía UI (ẩn nút không phải bảo mật).
- Kết quả: sửa trực tiếp các chỗ lệch tìm thấy (không phải viết lại kiến trúc RBAC từ đầu — không cần thiết với 1 công ty).

### 3.2. Company onboarding — làm rõ bằng tài liệu (giữ quyết định không code luồng approve)

> ⚠️ **Cảnh báo rủi ro (từ review lần này):** góp ý giáo viên mục 4 viết tường minh: *"Xây dựng luồng phê duyệt (Approve/Reject) doanh nghiệp sau khi họ đăng ký và thiết lập mức độ quyền hạn cho họ"* — đây là yêu cầu chức năng, không phải gợi ý mở rộng. Sau khi đọc code thật (`RegisterService`, `LoginService`), việc xây luồng thật **nhỏ hơn nhiều** so với lo ngại ban đầu vì hạ tầng cần thiết đã có sẵn phần lớn (xem bằng chứng bên dưới). Nếu giữ nguyên "chỉ tài liệu hoá", mục này của giáo viên sẽ **không được đáp ứng khi chấm** — cân nhắc bật lại nếu còn dư thời gian ở Ngày 4.

- Thêm 1 đoạn/state diagram vào `README.md` hoặc `project_analysis.md` mô tả đúng flow hiện có: `Đăng ký → Tạo Tenant(PENDING ngầm)+Company+AdminUser(UNVERIFIED) → Gửi OTP → Verify OTP → Tenant.ACTIVE + User.ACTIVE`.
- Note rõ trong tài liệu: `TenantStatus.SUSPENDED` đã tồn tại trong enum (`auth-service/.../enums/TenantStatus.java`) nhưng **chưa có UI/API nào set giá trị này** — nếu sau này mở rộng multi-tenant thật, đây là chỗ cắm luồng Suspend mà không cần đổi schema.
- **Bằng chứng kỹ thuật đã xác minh trực tiếp trong code** (để tài liệu chính xác, không phỏng đoán):
  - `RegisterService.verifyOtp(...)` hiện **tự động** gọi `tenant.setStatus(TenantStatus.ACTIVE)` ngay sau khi OTP đúng — không có bước chờ duyệt nào chen giữa.
  - `LoginService` đã chặn login nếu `tenant.getStatus() != TenantStatus.ACTIVE` ở 2 chỗ — nghĩa là cơ chế "gate" đăng nhập theo tenant status **đã tồn tại sẵn**, chỉ thiếu bước đưa tenant về đúng trạng thái chờ duyệt trước khi kích hoạt.
  - Nếu sau này quyết định bật luồng thật: chỉ cần (a) sửa `verifyOtp` để dừng ở `PENDING` thay vì tự set `ACTIVE`, (b) thêm giá trị `TenantStatus.REJECTED` vào enum, (c) 1 trang Platform Admin liệt kê tenant `PENDING` kèm nút Approve/Reject (có lý do từ chối), (d) email thông báo kết quả (tái dùng đúng pattern token/email của mục 2.4) — ước lượng thực tế **~0.5–1 ngày**, không phải nhiều ngày như nhận định ban đầu khi "chốt quyết định" giảm scope.

### 3.3. UI/UX — Sticky header, không mất context khi cuộn

- `frontend/src/layouts/AppLayout.tsx` **đã** đúng pattern chuẩn (root `100vh overflow:hidden`, `Sider` + `Header` cố định, chỉ `Content` cuộn — dòng 92, 160-163, 235-243) → **không cần sửa layout tổng**.
- Vấn đề còn lại nằm ở *bên trong* từng trang: nhiều page tự render `page-header` (tiêu đề + nút hành động) như 1 phần tử thường trong luồng cuộn (VD `InterviewSchedulingPage.tsx:213`, `PostingListPanel.tsx` không có header riêng, các Card `title=` của AntD). Khi nội dung dài, header/toolbar hành động bị cuộn mất khỏi màn hình.
- **Chuẩn hoá:** tạo/dùng lại `frontend/src/components/ui/PageHeader.tsx` (đã tồn tại — kiểm tra props hiện có) với style `position: sticky; top: 0; z-index: 5; background: var(--bg)` để tiêu đề trang + nút hành động chính luôn dính khi cuộn nội dung bên trong `Content`. Áp dụng cho `PostingHubPage.tsx` (mới), `InterviewSchedulingPage.tsx`, `PostingListPanel.tsx`/`RecruitmentPage.tsx`, `ApplicationsPage.tsx`.
- Với bảng dài (`PostingListPanel`, `ApplicationsPage`), bật `Table` prop `sticky` của AntD (`sticky={{ offsetHeader: <chiều cao PageHeader> }}`) để header cột bảng cũng dính khi cuộn — AntD hỗ trợ sẵn, không cần tự viết CSS.
- **Cuộn mượt (bổ sung sau review):** thêm `scroll-behavior: smooth` cho vùng `Content` cuộn chính trong `AppLayout.tsx` và cho `table-scroll`/`overflow-y:auto` bên trong Modal — mục trên mới xử lý phần "không mất context" (sticky), còn chữ "cuộn mượt mà" giáo viên nêu riêng cần dòng CSS này để hiệu ứng cuộn không bị giật.
- **Hệ màu badge nhất quán (tham khảo artifact "HR Workspace"):** áp dụng cùng 1 quy ước màu cho mọi `STATUS_COLOR` mới thêm ở Ngày 1–2 (xanh lá=thành công/đã duyệt/đã đăng, đỏ=từ chối/đóng, vàng=cảnh báo/tạm dừng, xanh dương=đang xử lý/thông tin, xám=nháp/vô hiệu) thay vì mỗi trang tự chọn màu riêng — dễ đọc hơn khi có nhiều loại trạng thái cùng hiển thị trên 1 màn hình (Posting, Interview, sau này cả AI label).

### 3.4. Chừa chỗ cho AI (giữ quyết định không code AI thật)

> ⚠️ **Cảnh báo rủi ro (từ review lần này):** góp ý giáo viên mục 2 mô tả **toàn bộ** cụm tính năng AI (tự động quét CV khi nộp, phân loại 3 mức, xem chi tiết nhận xét, gán nhãn, hàng chờ duyệt tay cho ca AI không đánh giá được) như một yêu cầu chức năng cụ thể, không phải "tính năng để sau". Giữ nguyên placeholder nghĩa là **mục 2 của giáo viên sẽ không được đáp ứng khi chấm**. Điểm thuận lợi nếu sau này đổi quyết định: 3 field `aiScore/aiLabel/aiComment` + tab lọc theo null bên dưới **chính là đúng kiến trúc fallback queue** mà giáo viên yêu cầu — chỉ cần thêm 1 lần gọi AI thật (ví dụ gửi file CV qua `cvUrl` cùng mô tả JD sang Claude API, parse kết quả set vào 3 field này khi tạo `Application`, giữ nguyên `null` nếu gọi lỗi/timeout) là toàn bộ chuỗi hiển thị (badge, tab lọc, xem nhận xét chi tiết) chạy đúng ngay, không phải sửa lại UI/schema.

Repo đã có sẵn 2 placeholder đúng chuẩn — chỉ cần **nhân rộng đúng pattern**, không tạo cách làm mới:
- `frontend/src/components/AiScoreBadge.tsx` — badge "AI · Sắp có" khi `score == null`, hiện % + màu khi có điểm.
- `frontend/src/components/ui/ScoreChecklistPanel.tsx` — checklist hoàn thiện hồ sơ.

Việc cần làm trong 2-3 ngày này (thuần scaffolding, không logic AI):
- **Backend `application-service`:** thêm 3 cột nullable vào entity `Application`: `aiScore` (Integer, null), `aiLabel` (Enum: `VERY_RELEVANT, PARTIALLY_RELEVANT, NOT_RELEVANT` — nullable, null = "chưa đánh giá"), `aiComment` (TEXT, nullable). Không có service nào set giá trị này (để trống cho AI sau); nhờ `ddl-auto: update` nên chỉ cần thêm field + restart, không cần migration tay.
- **Frontend:** nhúng `AiScoreBadge` (hiện đang chỉ dùng ở `CandidatesPage.tsx`) thêm vào `ApplicationKanbanBoard.tsx` (mỗi thẻ ứng viên) và `ApplicationDetailDrawer` — dùng field `aiScore` mới từ API. Vì AI chưa chạy, mọi thẻ sẽ hiện "AI · Sắp có" — đúng ý "chừa chỗ, đỡ sửa nhiều" khi cắm AI thật vào sau chỉ cần BE set `aiScore`/`aiLabel`, FE không cần đổi gì thêm.
- **Fallback queue (dự phòng, không code logic thật):** thêm 1 tab lọc sẵn "Chưa đánh giá AI" trong `ApplicationsPage.tsx` bằng filter `aiLabel == null` — hiện tại filter này sẽ trả về *toàn bộ* đơn (vì chưa ai set aiLabel), đúng như kỳ vọng "mọi thứ rơi vào hàng chờ duyệt tay" cho tới khi AI được cắm vào.

---

## Ngày 4 — Nâng Cao Trải Nghiệm, Kanban Pipeline & Đệm Rủi Ro

> Bổ sung sau lần review này: mục 2 (AI) và phần Approve/Reject công ty ở mục 4 vẫn **giữ nguyên quyết định phạm vi ban đầu** (xem cảnh báo rủi ro ở 3.2 và 3.4) — Ngày 4 không dùng để code 2 phần đó. Ngày 4 dùng để (a) hoàn thiện các nâng cấp UX tham khảo từ ATS thực tế/artifact chưa kịp làm ở Ngày 1–2, (b) hồi quy/kiểm thử toàn bộ Ngày 1–3, (c) chuẩn bị tài liệu bảo vệ rõ ràng cho 2 khoảng trống đã biết thay vì im lặng bỏ qua khi bảo vệ với giáo viên.

### 4.1. Hoàn thiện Kanban Pipeline + Audit Trail (nếu Ngày 1 chưa kịp)

- Chốt nốt mục 1.6 (timeline vòng đời trạng thái trên `PostingHubPage`) và 1.7 (toggle Danh sách/Kanban) nếu chưa xong trong Ngày 1.

### 4.2. Mở rộng "không mở tab mới" sang xem CV/hồ sơ ứng viên

- Hoàn thiện phần mở rộng đã nêu ở mục 2.5: đổi 4 vị trí `target="_blank"` liên quan `cvFileUrl`/`resumeUrl` (`CandidateFormModal.tsx:168`, `CandidateApplicationDetailPage.tsx:477,480`, `ApplicationsPage.tsx:339`) sang dùng chung `InAppFileViewerModal.tsx` với `MeetingLinkModal`.

### 4.3. Hồi quy & sửa lỗi (buffer)

- Test lại toàn bộ luồng Ngày 1–3 trên trình duyệt thật theo đúng từng role (`RECRUITER`, `HIRING_MANAGER`, `COMPANY_ADMIN`, `CANDIDATE`) — đặc biệt các luồng chuyển trạng thái mới (Posting, Interview) và mọi endpoint mới thêm phải đúng theo bảng đối chiếu RBAC ở mục 3.1.
- Kiểm tra responsive tối thiểu cho `PostingHubPage` (Kanban + timeline) và `InterviewsPage` (Calendar view) trên màn hình nhỏ hơn.

### 4.4. Chuẩn bị tài liệu bảo vệ 2 khoảng trống đã biết

Thêm 1 mục ngắn vào `README.md`/`project_analysis.md` — chủ động trình bày, không né tránh:
- **AI CV Screening:** nêu rõ đã dựng đúng kiến trúc dữ liệu + fallback queue (mục 3.4), lý do chưa gọi AI thật trong phạm vi lần này, và bước cụ thể nếu được giao thêm thời gian (gọi Claude API với CV + JD, parse response vào `aiScore/aiLabel/aiComment`).
- **Company Approve/Reject:** nêu rõ bằng chứng kỹ thuật đã xác minh (mục 3.2: `TenantStatus.PENDING` + gate sẵn có ở `LoginService`) và ước lượng effort thật (~0.5–1 ngày) nếu muốn bật lên sau này.

---

## Checklist tổng hợp — Definition of Done

- [ ] `PostingStatus` có đủ 6 trạng thái, transition được validate ở service layer, không cho nhảy cóc.
- [ ] Danh sách tin tuyển dụng hiện: trạng thái, số ứng viên, nút xem yêu cầu gốc.
- [ ] Click 1 tin tuyển dụng → `PostingHubPage` hiện toàn bộ ứng viên + trạng thái PV + kết quả, không cần chuyển trang khác để xem chi tiết ứng viên (dùng Drawer).
- [ ] `location` phỏng vấn ở mọi nơi (create modal, scheduling page) là `Select` từ `work-locations`, không còn free-text.
- [ ] Có endpoint xếp lịch tự động tuần tự N người/15 phút, có check & chặn trùng lịch.
- [ ] `InterviewsPage` có toggle List/Calendar + bộ lọc theo tên, thời gian, trạng thái.
- [ ] Email lịch phỏng vấn có link xác nhận 1 chạm, không cần đăng nhập.
- [ ] Mọi chỗ "Link họp"/tài liệu mở bằng Modal/iframe trong app, có fallback mở tab mới khi iframe bị chặn.
- [ ] Bảng đối chiếu RBAC 3 lớp (menu / route guard / backend) không còn lệch, mọi endpoint nhạy cảm có check role ở backend.
- [ ] Flow onboarding công ty được ghi rõ trong tài liệu (README/project_analysis.md), không cần code thêm luồng approve đa tenant.
- [ ] `PageHeader` sticky áp dụng cho các trang chính, `Table sticky` bật ở các bảng dài, vùng cuộn chính có `scroll-behavior: smooth`.
- [ ] 3 field `aiScore/aiLabel/aiComment` đã có trong `Application`, `AiScoreBadge` đã nhúng vào Kanban + Detail Drawer, tab "Chưa đánh giá AI" hoạt động đúng (rỗng logic AI, chỉ là filter theo null).
- [ ] `PostingHubPage` có timeline vòng đời trạng thái (submittedAt/approvedAt/publishedAt + người thực hiện) và toggle Danh sách/Kanban tái dùng `ApplicationKanbanBoard.tsx`.
- [ ] Toàn bộ link CV/resume (`CandidateFormModal`, `CandidateApplicationDetailPage`, `ApplicationsPage`) không còn mở tab mới, dùng chung `InAppFileViewerModal` với Ngày 2.
- [ ] Đã hồi quy Ngày 1–3 theo từng role thật trên trình duyệt, không lỗi luồng chuyển trạng thái.
- [ ] Tài liệu bảo vệ 2 khoảng trống đã biết (AI thật, Company Approve/Reject) có trong README/project_analysis.md.

### Ngoài phạm vi lần này (quyết định có chủ đích — xem cảnh báo rủi ro)

- ❌ Gọi AI thật để tự động chấm điểm/phân loại CV khi ứng viên nộp hồ sơ (góp ý giáo viên mục 2) — vẫn placeholder theo mục 3.4.
- ❌ Luồng Approve/Reject cho công ty mới đăng ký + set quyền hạn (góp ý giáo viên mục 4) — vẫn tài liệu hoá theo mục 3.2.
