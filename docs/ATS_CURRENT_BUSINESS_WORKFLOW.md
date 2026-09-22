# ATS — Quy trình nghiệp vụ và màn hình chức năng hiện tại

> Tài liệu này mô tả luồng đang được triển khai trong source của dự án ATS tại thời điểm lập tài liệu.
> Phần quy tắc đã thống nhất trong buổi thảo luận nhưng chưa có trong code được ghi rõ là **Đề xuất đã chốt**.

## 1. Mục tiêu và phạm vi

ATS là hệ thống quản lý tuyển dụng cho một doanh nghiệp duy nhất. Hệ thống quản lý vòng đời tuyển dụng từ lúc phòng ban đề xuất nhu cầu nhân sự đến lúc ứng viên chấp nhận hoặc từ chối thư mời nhận việc.

Các vai trò chính:

| Vai trò | Trách nhiệm nghiệp vụ |
| --- | --- |
| `COMPANY_ADMIN` | Quản trị dữ liệu dùng chung, người dùng nội bộ, cấu hình pipeline, theo dõi audit và có phạm vi toàn công ty. |
| `HIRING_MANAGER` | Tạo nhu cầu tuyển dụng cho phòng ban, phỏng vấn và nộp đánh giá ứng viên; đánh giá này là căn cứ để HR chọn ứng viên offer. Không tham gia tạo/duyệt offer. |
| `RECRUITER` (HR) | Điều phối tuyển dụng: duyệt requisition, quản lý posting, hồ sơ, pipeline, lịch phỏng vấn. So sánh ứng viên theo đánh giá của hiring manager, quyết định ứng viên được offer, tạo offer và duyệt/gửi offer tới ứng viên. |
| `CANDIDATE` | Quản lý hồ sơ/CV, ứng tuyển, theo dõi đơn, lịch phỏng vấn và phản hồi offer của chính mình. |

## 2. Bản đồ quy trình tổng thể

```text
Thiết lập dữ liệu và tài khoản
  → Tạo nhu cầu tuyển dụng (requisition)
  → Duyệt nhu cầu
  → Tạo và mở tin tuyển dụng (job posting)
  → Candidate nộp hồ sơ / HR tạo hộ application
  → Recruiter sàng lọc và điều chuyển pipeline
  → Lên lịch, xác nhận, thực hiện phỏng vấn
  → Hiring manager nộp đánh giá phỏng vấn
  → HR so sánh các ứng viên của cùng vị trí theo kết quả đánh giá
  → HR chọn ứng viên trúng tuyển và tạo offer
  → HR hoặc COMPANY_ADMIN duyệt offer; offer được gửi tới ứng viên ngay khi duyệt
  → Candidate accept hoặc decline offer
  → Application kết thúc ở HIRED hoặc REJECTED
```

## 3. Giai đoạn chuẩn bị hệ thống

`COMPANY_ADMIN` cấu hình dữ liệu dùng chung trước khi vận hành tuyển dụng:

1. Cập nhật thông tin doanh nghiệp.
2. Tạo phòng ban.
3. Tạo tài khoản nội bộ và gán phòng ban cho `RECRUITER`, `HIRING_MANAGER`.
4. Quản lý danh mục: chức danh, cấp bậc, kỹ năng, loại hợp đồng, hình thức làm việc, địa điểm, nguồn tuyển, lý do từ chối, tiêu chí phỏng vấn và email template.
5. Tạo pipeline tuyển dụng.

Pipeline là cấu hình động. Một job posting chọn một pipeline, nên các vị trí khác nhau có thể dùng các vòng tuyển dụng khác nhau.

Các stage type được hỗ trợ:

```text
APPLIED | CV_SCREENING | HR_SCREENING
TECHNICAL_INTERVIEW | HR_INTERVIEW | FINAL_INTERVIEW
OFFER | HIRED | REJECTED | CUSTOM
```

Màn hình liên quan:

| Màn hình | Route | Vai trò chính |
| --- | --- | --- |
| Dashboard | `/dashboard` | Internal roles |
| Master data và pipeline | `/masterdata` | `COMPANY_ADMIN` |
| Quản lý người dùng | `/admin/users` | `COMPANY_ADMIN` |
| Audit log | `/audit-logs` | `COMPANY_ADMIN` |
| Cài đặt/hồ sơ công ty | `/settings` | Người dùng đã đăng nhập |

## 4. Nhu cầu tuyển dụng — Job Requisition

### 4.1 Người khởi tạo và dữ liệu

`HIRING_MANAGER` tạo requisition trong phạm vi phòng ban của mình. Dữ liệu gồm chức danh, phòng ban, số lượng, kỹ năng, lý do tuyển, độ ưu tiên, lương dự kiến, người yêu cầu và người duyệt.

### 4.2 Trạng thái

```text
DRAFT
  → submit → PENDING_APPROVAL
      ├→ approve → APPROVED
      ├→ reject → REJECTED
      └→ request changes → CHANGES_REQUESTED
                              → manager chỉnh sửa và submit lại
```

`RECRUITER` hoặc `COMPANY_ADMIN` là phía xử lý duyệt. Khi approve, HR có thể chốt mức lương duyệt khác với khoảng lương do phòng ban đề xuất.

### 4.3 Màn hình

`/recruitment` hiển thị danh sách requisition, tạo/sửa, chi tiết và các thao tác submit, approve, reject, request changes.

## 5. Tin tuyển dụng — Job Posting

### 5.1 Điều kiện tạo

Chỉ requisition `APPROVED` mới tạo được posting. Mỗi requisition có tối đa một posting còn hiệu lực. Posting đã có application không thể xóa.

### 5.2 Trạng thái

```text
DRAFT → submit review → APPROVED → publish → OPEN
                 │                         ├→ PAUSED
                 └→ request edit → EDITING └→ CLOSED
```

Posting `OPEN` xuất hiện tại trang careers công khai. Khi tạo, recruiter chọn pipeline áp dụng cho vị trí.

### 5.3 Màn hình

| Màn hình | Route | Mục đích |
| --- | --- | --- |
| Posting hub | `/recruitment/postings/:id` | Quản trị một posting, trạng thái, nội dung và application liên quan. |
| Careers | `/careers` | Danh sách job đang mở cho khách chưa đăng nhập. |
| Chi tiết job | `/careers/jobs/:jobId` | Xem chi tiết và bắt đầu ứng tuyển. |

## 6. Hành trình ứng viên

Ứng viên có thể:

1. Xem các job posting đang mở.
2. Đăng ký, xác minh email và đăng nhập.
3. Hoàn thiện hồ sơ, tải CV.
4. Nộp đơn cho các vị trí khác nhau.
5. Theo dõi application, interview và offer của chính mình.

Mỗi application là một thực thể độc lập theo cặp:

```text
Candidate + Job Posting
```

Do đó, một ứng viên được phép nộp vào nhiều vị trí khác nhau; từng đơn có stage, lịch sử, interview, evaluation và offer độc lập.

Màn hình candidate:

| Màn hình | Route |
| --- | --- |
| Hồ sơ/CV | `/my-profile` |
| Việc làm | `/jobs` |
| Đơn ứng tuyển của tôi | `/my-applications` |
| Lịch phỏng vấn của tôi | `/my-interviews` |
| Offer của tôi | `/my-offers` và `/my-offers/:id` |

## 7. Application pipeline

### 7.1 Cách tạo application

Có hai đường vào:

- Candidate tự ứng tuyển bằng CV trong hồ sơ của mình.
- `RECRUITER` hoặc `COMPANY_ADMIN` tạo hộ; có thể chỉ định CV và recruiter phụ trách.

Điều kiện hiện tại khi tạo:

- Posting phải `OPEN`.
- Candidate phải có CV.
- Pipeline gắn với posting phải có tối thiểu một stage.
- Không được tồn tại application trùng `candidate + jobPosting`.

Application nhận stage đầu tiên của pipeline, thường là `APPLIED`.

### 7.2 Chuyển stage

Recruiter điều chuyển application lần lượt qua các stage của pipeline.

```text
APPLIED → CV_SCREENING → HR_SCREENING → ... → OFFER → HIRED
```

Mỗi lần chuyển stage hệ thống ghi lịch sử: stage cũ, stage mới, người thao tác, thời điểm và ghi chú. Khi chạm `HIRED`, hệ thống lưu thời điểm tuyển thành công (`hiredAt`).

Recruiter có thể phân công application cho recruiter cụ thể.

### 7.3 Loại ứng viên

Recruiter có thể loại application tại bất cứ stage chưa kết thúc nào:

```text
Bất kỳ stage đang xử lý → REJECTED
```

Khi reject:

- Bắt buộc chọn lý do từ chối.
- Có thể ghi ghi chú.
- Hệ thống lưu lịch sử và audit log.
- Hệ thống phát notification/event.
- Hệ thống cố gắng đưa candidate vào Talent Pool, kèm tag lý do từ chối.

`REJECTED` và `HIRED` là trạng thái kết thúc.

### 7.4 Màn hình nội bộ

| Màn hình | Route | Mục đích |
| --- | --- | --- |
| Applications | `/applications` | Theo dõi application theo stage, lọc và thao tác pipeline. |
| Chi tiết application | `/candidates/:candidateId/applications/:applicationId` | CV, timeline, ghi chú, pipeline, interview, evaluation và offer. |
| Form evaluation | `/candidates/:candidateId/applications/:applicationId/evaluate` | Người phỏng vấn nhập đánh giá. |

## 8. Phỏng vấn và đánh giá

### 8.1 Điều kiện và cách lên lịch

Application phải vượt qua sàng lọc CV và chưa ở stage kết thúc (`REJECTED`, `HIRED`) thì mới được lên lịch phỏng vấn.

Có hai cách:

```text
Lên lịch trực tiếp:
Recruiter chọn thời gian và interviewer → tạo Interview.

Qua interview slots:
Recruiter đề xuất nhiều khung giờ
→ candidate hoặc interviewer chọn một khung
→ hệ thống sinh Interview.
```

### 8.2 Trạng thái interview

```text
SCHEDULED → CONFIRMED → COMPLETED
     └────→ CANCELLED
```

- Online bắt buộc có meeting link.
- Offline bắt buộc có địa điểm.
- Interviewer là tài khoản `HIRING_MANAGER`.
- Hệ thống hỗ trợ file lịch `.ics`, notification và nhắc lịch.

### 8.3 Đánh giá và đề xuất lương

Interviewer đánh giá theo các tiêu chí được cấu hình. Kết luận có thể là:

```text
STRONG_YES | YES | NO | STRONG_NO
```

Hệ thống cũng có Salary Proposal sau phỏng vấn:

```text
PENDING → APPROVED / REJECTED
```

Đánh giá của hiring manager không trực tiếp sinh ra offer. Đây là **đầu vào quyết định** để HR:

- xác định ứng viên nào đủ điều kiện đưa sang stage `OFFER`;
- so sánh các ứng viên cùng vị trí với nhau;
- chốt mức lương đưa vào offer, tham chiếu Salary Proposal đã được duyệt.

Màn hình: `/interviews` (lịch phỏng vấn), `/evaluations` (hàng đợi đánh giá — người phỏng vấn thấy bài mình còn nợ, HR thấy buổi nào còn thiếu và thiếu của ai), `/interviews/:interviewId/result` và form evaluation trong chi tiết application.

## 9. Offer

### 9.1 Ai tạo và gửi offer

Offer do **HR (`RECRUITER`)** tạo và gửi tới ứng viên, **dựa trên đánh giá phỏng vấn của `HIRING_MANAGER`**.

```text
HIRING_MANAGER phỏng vấn và nộp evaluation
  → HR đọc evaluation của các ứng viên cùng vị trí
  → HR so sánh và chọn ứng viên được offer
  → HR chuyển application của ứng viên đó sang stage OFFER
  → HR tạo offer (DRAFT): mức lương, ngày vào làm, hạn phản hồi
  → HR gửi offer vào luồng duyệt (PENDING_APPROVAL)
  → HR hoặc COMPANY_ADMIN duyệt và tự gửi offer đã duyệt tới candidate
  → Candidate accept hoặc decline
```

Phân vai rõ ràng:

| Việc | Người thực hiện |
| --- | --- |
| Đánh giá chuyên môn ứng viên sau phỏng vấn | `HIRING_MANAGER` |
| So sánh ứng viên và chọn người được offer | `RECRUITER` (HR) |
| Soạn nội dung offer, chốt lương và điều kiện | `RECRUITER` (HR) |
| Duyệt offer | `RECRUITER` (HR) hoặc `COMPANY_ADMIN` |
| Gửi offer tới ứng viên | Tự động khi offer được duyệt (`APPROVED`) |
| Accept / decline offer | `CANDIDATE` |

`HIRING_MANAGER` không tham gia bước offer: không tạo, không duyệt và không gửi offer. Vai trò của manager dừng ở việc cung cấp đánh giá phỏng vấn làm căn cứ cho HR.

Khi offer chuyển sang `APPROVED`, hệ thống công bố offer cho candidate ngay, kèm notification/email; không có bước gửi thủ công tách rời sau khi duyệt.

### 9.2 So sánh ứng viên trước khi offer

Trước khi chốt người được offer, HR so sánh các ứng viên đang ở giai đoạn cuối của **cùng một job posting**.

Dữ liệu dùng để so sánh:

```text
Ứng viên A | Ứng viên B | Ứng viên C
  ├ recommendation của từng interviewer (STRONG_YES / YES / NO / STRONG_NO)
  ├ điểm theo từng tiêu chí phỏng vấn đã cấu hình
  ├ nhận xét của hiring manager
  ├ mức lương đề xuất (Salary Proposal) và trạng thái duyệt
  ├ stage hiện tại và thời gian xử lý trong pipeline
  └ thông tin hồ sơ: kinh nghiệm, kỹ năng, nguồn tuyển
```

Quy tắc so sánh:

- Chỉ so sánh trong phạm vi một job posting; ứng viên của posting khác không nằm cùng bảng so sánh.
- Chỉ tính các application chưa kết thúc (không `REJECTED`, không `HIRED`) và đã có tối thiểu một evaluation đã submit.
- Số offer phát hành cho một posting không vượt quá số lượng tuyển (`quantity`) của requisition tương ứng. `offer-service` chặn cứng ở bước tạo offer; offer `REJECTED` hoặc `DECLINED` trả lại suất tuyển.
- Khi đã chọn được ứng viên, các ứng viên còn lại giữ nguyên stage hiện tại. Hệ thống không tự động loại ai; HR chủ động reject kèm lý do khi đã chắc chắn.
- Nếu ứng viên được chọn decline offer, HR quay lại bảng so sánh và có thể offer cho ứng viên xếp sau mà không cần lặp lại vòng phỏng vấn.

### 9.3 Trạng thái offer

Offer chỉ được tạo khi application đang ở stage `OFFER`.

```text
DRAFT → PENDING_APPROVAL → APPROVED
  │             │              ├→ ACCEPTED
  │             │              └→ DECLINED
  │             └→ REJECTED
```

### 9.4 Quy tắc hiện tại

- Người tạo offer là `RECRUITER` hoặc `COMPANY_ADMIN`.
- Một application chỉ có một offer đang xử lý hoặc đã được chấp nhận.
- Chỉ được sửa offer ở `DRAFT`.
- Không thể xóa offer `ACCEPTED`.
- Người duyệt là `RECRUITER` (HR) hoặc `COMPANY_ADMIN` (`OfferService.validateApprover`). `HIRING_MANAGER`
  không nằm trong danh sách approver và endpoint duyệt/từ chối chỉ nhận HR hoặc admin.
- Người tạo offer được phép tự duyệt offer của chính mình; hệ thống không bắt buộc hai người khác nhau.
- Offer chỉ hiển thị với candidate từ trạng thái `APPROVED` trở đi. Duyệt offer đồng thời là hành động gửi offer
  tới candidate: `OfferApprovedEvent` bắn notification cho candidate ngay khi duyệt, không có bước gửi thủ công riêng.
- Không tạo được offer mới khi posting đã dùng hết số lượng tuyển của requisition.
- Offer có hai trường ghi chú tách biệt: **ghi chú nội bộ** chỉ `RECRUITER` và `COMPANY_ADMIN` đọc được
  (ẩn với `HIRING_MANAGER`, không bao giờ gửi cho candidate), và **ghi chú hiển thị cho ứng viên** là phần
  duy nhất xuất hiện trên thư mời nhận việc.
- Candidate không thể phản hồi sau `responseDeadline`.
- Hệ thống có thể tạo PDF offer.

`HIRING_MANAGER` vẫn mở được `/offers` nhưng chỉ thấy offer thuộc phòng ban mình, ở chế độ theo dõi kết quả:
không có nút tạo, duyệt hay từ chối.

Màn hình: `/offers` (danh sách theo dõi), `/offers/create` và `/offers/:id/edit` (soạn offer), `/offers/:id` (chi tiết, duyệt/từ chối), `/offers/compare` (so sánh ứng viên), `/my-offers`, `/my-offers/:id` (phía candidate).

## 10. Đóng vòng đời application

Kết quả offer được đồng bộ bất đồng bộ về application service:

```text
Candidate ACCEPTED offer → application tự chuyển tới HIRED
Candidate DECLINED offer → application tự chuyển tới REJECTED
```

Như vậy recruiter không cần chuyển thủ công application sau khi candidate phản hồi offer.

## 11. Chức năng xuyên suốt

- Notification realtime/email cho các sự kiện application, interview và offer.
- Audit log cho hành động nghiệp vụ quan trọng.
- Dashboard tổng hợp số liệu tuyển dụng.
- Phân quyền theo role, phòng ban, recruiter được giao và quyền sở hữu dữ liệu của candidate.

## 12. Đề xuất đã chốt trong buổi thảo luận — chưa có trong source

Các quy tắc dưới đây là định hướng nghiệp vụ đã thống nhất, cần triển khai riêng:

| Tình huống | Quy tắc đã chốt |
| --- | --- |
| Ứng viên nộp nhiều vị trí | Được phép; mỗi vị trí là một application độc lập. |
| Nộp trùng cùng posting khi đơn còn hiệu lực | Không cho phép. |
| Candidate rút đơn | Chỉ được rút khi application còn ở `APPLIED`. Khi recruiter đã chuyển stage thì không được rút. |
| Nộp lại sau khi rút | Được phép nộp lại cho cùng posting. |
| Nộp lại sau khi bị loại | Không được nộp lại cho cùng posting. |
| Recruiter loại candidate | Được quyền loại ở bất kỳ stage chưa kết thúc nào. |
| Ai tạo và gửi offer | HR (`RECRUITER`) tạo offer, căn cứ trên đánh giá phỏng vấn của hiring manager. Hiring manager chỉ đánh giá ứng viên, không tham gia bước offer. |
| Ai duyệt offer | HR (`RECRUITER`) hoặc `COMPANY_ADMIN`, kể cả chính người tạo offer. Khi duyệt, hệ thống tự gửi offer tới candidate; không có bước gửi thủ công riêng. Đã triển khai. |
| So sánh ứng viên trước khi offer | HR so sánh nhiều ứng viên của cùng một posting theo điểm tiêu chí, recommendation, nhận xét và mức lương đề xuất để chọn người được offer. Đã triển khai tại `/offers/compare` và tab “So sánh” trong posting hub. |
| Ứng viên được chọn decline offer | HR quay lại bảng so sánh và offer cho ứng viên xếp sau, không cần phỏng vấn lại. |

Để đáp ứng quy tắc rút đơn, hệ thống cần bổ sung tối thiểu stage/action `WITHDRAWN`, quy tắc authorization cho candidate, lịch sử/audit tương ứng và điều chỉnh ràng buộc chống trùng application để cho phép nộp lại sau `WITHDRAWN`.

Màn hình **So sánh ứng viên theo posting** đã có: đặt nhiều ứng viên cạnh nhau, tổng hợp evaluation theo từng
tiêu chí, recommendation, mức lương đề xuất và thời gian trong pipeline, hiển thị số suất tuyển đã dùng, kèm CTA
“Chọn để offer” đưa hồ sơ tới vòng `OFFER` rồi mở thẳng form tạo offer. Vào từ menu `So sánh ứng viên`
(`/offers/compare`, chọn posting) hoặc từ tab “So sánh” trong posting hub.

## 13. Chức năng theo từng role

### 13.1 COMPANY_ADMIN

`COMPANY_ADMIN` có phạm vi toàn công ty và chịu trách nhiệm thiết lập, kiểm soát hệ thống.

| Nhóm chức năng | Chức năng cụ thể | Màn hình |
| --- | --- | --- |
| Công ty và tài khoản | Cập nhật thông tin công ty, tạo/cập nhật/khóa tài khoản nội bộ, gán role và phòng ban. | `/settings`, `/admin/users` |
| Dữ liệu nền | Quản lý phòng ban, chức danh, kỹ năng, địa điểm, loại hợp đồng, nguồn tuyển, lý do từ chối, tiêu chí interview, email template. | `/masterdata` |
| Pipeline | Tạo/sửa/kích hoạt pipeline; cấu hình thứ tự và loại từng stage. | `/masterdata` |
| Tuyển dụng | Xem và tham gia xử lý requisition, posting, application, interview, offer trong toàn công ty theo quyền hệ thống. | Các màn hình internal tương ứng |
| Offer | Duyệt hoặc từ chối offer do HR tạo; offer được gửi tới ứng viên ngay khi duyệt. | `/offers` |
| Theo dõi | Xem dashboard, notification và audit log. | `/dashboard`, `/notifications`, `/audit-logs` |

### 13.2 RECRUITER

`RECRUITER` là người vận hành chính của quy trình tuyển dụng trong phạm vi phòng ban hoặc resource được giao.

| Nhóm chức năng | Chức năng cụ thể | Màn hình |
| --- | --- | --- |
| Requisition | Xem, duyệt, từ chối, yêu cầu chỉnh sửa requisition thuộc phạm vi được phép. | `/recruitment` |
| Posting | Tạo posting từ requisition đã duyệt; chỉnh sửa, gửi duyệt, publish, pause, close posting. | `/recruitment`, `/recruitment/postings/:id` |
| Application | Tạo hộ application, gán recruiter phụ trách, điều chuyển stage, ghi note/comment, reject application. | `/applications`, chi tiết application |
| Interview | Lên lịch trực tiếp cho một hoặc nhiều ứng viên, hủy/điều phối lịch và theo dõi kết quả. | `/interviews` |
| Chọn ứng viên | So sánh các ứng viên của cùng posting theo evaluation của hiring manager, recommendation và mức lương đề xuất; chốt ứng viên được offer và đưa hồ sơ tới vòng `OFFER`. | `/offers/compare`, tab “So sánh” trong posting hub |
| Offer | Tạo offer cho ứng viên được chọn, sửa offer ở DRAFT, gửi vào luồng duyệt, duyệt/từ chối offer khi là approver (offer được gửi tới ứng viên ngay khi duyệt) và theo dõi phản hồi. | `/offers` |
| Theo dõi | Xem dashboard và notification. | `/dashboard`, `/notifications` |

### 13.3 HIRING_MANAGER

`HIRING_MANAGER` đại diện cho phòng ban có nhu cầu tuyển và tham gia đánh giá chuyên môn.

| Nhóm chức năng | Chức năng cụ thể | Màn hình |
| --- | --- | --- |
| Requisition | Tạo, sửa, submit requisition của phòng ban; xử lý requisition bị yêu cầu chỉnh sửa. | `/recruitment` |
| Theo dõi tuyển dụng | Xem requisition, posting và application thuộc phạm vi phòng ban/quyền được giao. | `/recruitment`, `/applications` |
| Interview | Tham gia các interview được phân công; xem lịch, xác nhận theo flow và nộp evaluation. | `/interviews`, trang evaluation |
| Đánh giá | Chấm tiêu chí, nhập nhận xét và recommendation; có thể đề xuất lương sau interview. Đây là căn cứ để HR so sánh và chọn ứng viên được offer. | Chi tiết application, form evaluation |
| Offer | Không tạo, không duyệt và không gửi offer. Chỉ xem kết quả offer của ứng viên thuộc phạm vi phòng ban để theo dõi. | `/offers` |
| Theo dõi | Xem dashboard và notification. | `/dashboard`, `/notifications` |

### 13.4 CANDIDATE

`CANDIDATE` chỉ thao tác trên hồ sơ và dữ liệu tuyển dụng thuộc chính tài khoản của mình.

| Nhóm chức năng | Chức năng cụ thể | Màn hình |
| --- | --- | --- |
| Tài khoản | Đăng ký, xác minh email, đăng nhập, quên/đặt lại mật khẩu. | `/register`, `/verify-email`, `/login`, `/forgot-password`, `/reset-password` |
| Hồ sơ | Cập nhật thông tin cá nhân và tải/cập nhật CV. | `/my-profile` |
| Tìm việc | Xem job posting công khai/đang mở và chi tiết công việc. | `/careers`, `/careers/jobs/:jobId`, `/jobs` |
| Ứng tuyển | Nộp application bằng CV của mình. | Chi tiết job |
| Theo dõi | Xem stage và lịch sử đơn, lịch interview, notification. | `/my-applications`, `/my-interviews`, `/notifications` |
| Interview | Xác nhận interview, chọn slot khi recruiter đề xuất và tải lịch `.ics` khi được hỗ trợ. | `/my-interviews` |
| Offer | Xem PDF/nội dung offer và accept/decline trước hạn phản hồi. | `/my-offers`, `/my-offers/:id` |

## 14. Quy trình thao tác theo từng role

### 14.1 Quy trình COMPANY_ADMIN

```text
Đăng nhập
→ kiểm tra/cập nhật thông tin công ty
→ tạo phòng ban và danh mục tuyển dụng
→ tạo tài khoản RECRUITER, HIRING_MANAGER; gán role và department
→ cấu hình pipeline tuyển dụng
→ giám sát dashboard, notification, audit log
→ xử lý các bước cần quyền toàn công ty, ví dụ duyệt offer
```

Kết quả mong đợi: tổ chức có đủ dữ liệu nền, người dùng nội bộ và pipeline để bắt đầu một đợt tuyển dụng.

### 14.2 Quy trình HIRING_MANAGER — phát sinh nhu cầu tuyển

```text
Đăng nhập
→ vào Recruitment
→ tạo requisition ở DRAFT
→ khai báo vị trí, số lượng, kỹ năng, lý do tuyển, ưu tiên, lương đề xuất
→ submit để gửi duyệt
→ nếu CHANGES_REQUESTED: chỉnh sửa và submit lại
→ nếu APPROVED: theo dõi posting và candidate của vị trí
→ nhận lịch interview được phân công
→ thực hiện interview và nộp evaluation đúng hạn
→ bàn giao kết luận đánh giá để HR so sánh và chọn ứng viên
→ theo dõi kết quả offer của ứng viên thuộc phòng ban
```

Kết quả mong đợi: nhu cầu tuyển được phê duyệt và phòng ban cung cấp đánh giá chuyên môn đủ rõ để HR chọn đúng ứng viên để offer.

### 14.3 Quy trình RECRUITER — vận hành một đợt tuyển dụng

```text
Đăng nhập
→ kiểm tra requisition PENDING_APPROVAL
→ approve / reject / request changes
→ từ requisition APPROVED tạo job posting
→ chọn pipeline, hoàn thiện nội dung và publish posting thành OPEN
→ tiếp nhận application mới hoặc tạo hộ application
→ đọc CV, gán recruiter phụ trách và chuyển application qua pipeline
→ reject khi không phù hợp hoặc lên lịch interview khi đủ điều kiện
→ thu thập evaluation của hiring manager sau mỗi vòng phỏng vấn
→ so sánh các ứng viên cùng posting theo điểm tiêu chí, recommendation và lương đề xuất
→ chọn ứng viên trúng tuyển và chuyển application đó sang OFFER
→ tạo offer DRAFT và gửi vào luồng duyệt
→ HR hoặc COMPANY_ADMIN duyệt; offer tự được gửi tới candidate
→ theo dõi phản hồi của candidate trước responseDeadline
→ nếu candidate decline, quay lại bảng so sánh và offer cho ứng viên xếp sau
→ khi offer có kết quả, kiểm tra application tự đồng bộ HIRED hoặc REJECTED
→ close/pause posting khi đã đủ người hoặc hết nhu cầu
```

Kết quả mong đợi: recruiter là đầu mối điều phối xuyên suốt, không bỏ sót application, interview hay offer.

### 14.4 Quy trình CANDIDATE — từ tìm việc đến kết quả tuyển dụng

```text
Xem Careers
→ mở chi tiết job
→ đăng ký/đăng nhập nếu chưa có tài khoản
→ xác minh email và cập nhật hồ sơ/CV
→ nộp application cho posting OPEN
→ theo dõi stage của đơn tại My Applications
→ nhận/chọn slot hoặc xác nhận lịch interview
→ tham gia phỏng vấn
→ xem offer khi được gửi
→ accept hoặc decline trước responseDeadline
→ nhận kết quả cuối: HIRED hoặc REJECTED
```

Kết quả mong đợi: candidate luôn biết đơn của mình đang ở giai đoạn nào và cần thực hiện hành động gì tiếp theo.

### 14.5 Quy trình phối hợp tại một application

```text
CANDIDATE nộp hồ sơ
  → RECRUITER sàng lọc / điều chuyển stage / có thể reject
  → RECRUITER lên lịch interview
  → CANDIDATE xác nhận hoặc chọn slot
  → HIRING_MANAGER phỏng vấn, nộp evaluation
  → RECRUITER so sánh các ứng viên cùng posting theo evaluation
  → RECRUITER chọn ứng viên được offer và đưa application đó đến OFFER; ứng viên khác chờ hoặc bị reject
  → RECRUITER tạo offer và gửi vào luồng duyệt
  → RECRUITER hoặc COMPANY_ADMIN duyệt offer, offer tự gửi tới candidate
  → CANDIDATE accept/decline
  → hệ thống tự cập nhật application: HIRED/REJECTED
```

## 15. Điểm cần làm rõ tiếp trong nghiệp vụ

Những câu hỏi này sẽ quyết định hành vi màn hình, quyền và validation khi triển khai tiếp:

1. `APPLIED` có phải là bước sàng lọc CV thực tế, hay recruiter bắt buộc chuyển sang `CV_SCREENING` trước khi đánh giá CV?
2. Stage nào cho phép tạo interview; có bắt buộc hoàn tất evaluation trước khi chuyển sang stage tiếp theo không?
3. Một interviewer có thể nộp nhiều bản đánh giá cho cùng một interview không; có cho sửa sau khi submit không?
4. Khi reject, recruiter có thể chọn gửi email từ chối ngay hay lưu trạng thái nội bộ trước?
5. Khi candidate rút đơn ở `APPLIED`, recruiter có cần nhận notification không và có cần lý do bắt buộc không?
6. Khi so sánh ứng viên, hệ thống có tính điểm tổng hợp theo trọng số tiêu chí không, hay chỉ hiển thị dữ liệu thô để HR tự quyết định?
7. Khi nhiều interviewer cùng đánh giá một ứng viên, lấy recommendation nào làm đại diện trong bảng so sánh: vòng cuối, trung bình, hay hiển thị đầy đủ?
8. HR có bắt buộc phải có đánh giá của hiring manager trước khi chuyển application sang `OFFER` không?
9. Khi HR chọn một ứng viên để offer, các ứng viên còn lại có cần một hành động gom chung (“từ chối các ứng viên
   còn lại”) sau khi offer được accept không, hay vẫn để HR reject thủ công từng hồ sơ?

## 16. Đánh giá màn hình và chức năng theo role

> Đánh giá này dựa trên route, menu, chức năng frontend và các quy tắc backend hiện có. Đây là đánh giá nghiệp vụ/UX, không phải kết quả kiểm thử với người dùng thực tế.

### 16.1 Tóm tắt đánh giá

| Role | Mức phù hợp hiện tại | Nhận định |
| --- | --- | --- |
| `COMPANY_ADMIN` | Khá tốt | Đủ các chức năng quản trị cốt lõi, nhưng quyền quá rộng dễ làm giao diện nặng và thiếu trọng tâm vận hành. |
| `RECRUITER` | Khá tốt về năng lực, cần tối ưu luồng | Có gần như đủ công cụ vận hành, nhưng các màn hình Application và Scheduling quan trọng chưa xuất hiện trên menu chính. |
| `HIRING_MANAGER` | Chưa tối ưu | Đang nhận menu gần như giống recruiter trong khi nhu cầu chính chỉ là tạo requisition, phỏng vấn và nộp đánh giá. Điều này tạo nhiều chức năng không cần thiết, nhất là các màn hình offer. |
| `CANDIDATE` | Tốt ở luồng cơ bản | Hành trình dễ hiểu và menu rõ ràng, nhưng thiếu hành động/ràng buộc rõ ràng cho rút đơn, nộp lại và giải thích trạng thái. |

### 16.2 Đánh giá COMPANY_ADMIN

#### Điểm phù hợp

- Có đầy đủ màn hình quản trị người dùng, phòng ban/danh mục/pipeline, audit log và dashboard.
- Quản trị pipeline ngay trong master data phù hợp với mô hình pipeline động của hệ thống.
- Có thể xử lý các nghiệp vụ cần quyền toàn công ty, đặc biệt là offer và giám sát toàn bộ tuyển dụng.
- Sidebar phân nhóm tương đối rõ: tổng quan, người dùng, danh mục, tuyển dụng, ứng viên, phỏng vấn, offer, audit.

#### Điểm chưa tối ưu

- Admin thấy đồng thời toàn bộ menu vận hành hằng ngày của recruiter. Với doanh nghiệp lớn, đây có thể tạo quá tải thông tin và tăng nguy cơ thao tác nhầm.
- `Danh mục và phòng ban` đang gom nhiều loại cấu hình khác nhau; pipeline, email template, tiêu chí interview và dữ liệu tổ chức nên có điều hướng/tab rõ và mô tả ảnh hưởng nghiệp vụ trước khi lưu.
- Dashboard hiện là màn hình chung cho mọi internal role; admin sẽ hữu ích hơn nếu có thêm chỉ số quản trị như tài khoản chưa kích hoạt, pipeline đang dùng, posting quá hạn và lỗi đồng bộ event.
- Audit log mang nhãn “Nhật ký bảo mật”, trong khi dữ liệu có cả audit nghiệp vụ. Tên gọi này có thể làm admin bỏ qua các hành động tuyển dụng cần truy vết.

#### Kết luận và ưu tiên

Chức năng đủ dùng và phù hợp, nhưng nên ưu tiên phân tách **Admin workspace** với **Recruitment workspace**, đồng thời làm rõ cấu hình nào ảnh hưởng tới dữ liệu đang vận hành.

### 16.3 Đánh giá RECRUITER

#### Điểm phù hợp

- Luồng nghiệp vụ chính đã đủ: duyệt requisition, tạo/publish posting, xem candidate, xử lý pipeline, lên lịch interview và tạo offer.
- Màn hình Applications hỗ trợ lọc theo posting, stage, recruiter phụ trách, nguồn tuyển và thời gian; có thao tác hàng loạt như chuyển stage, reject, phân công recruiter. Đây là phù hợp với khối lượng xử lý hồ sơ lớn.
- Trang chi tiết application gom CV, lịch sử, interview, evaluation và offer; đây là điểm tốt vì recruiter không phải mở nhiều màn hình để đánh giá một candidate.
- Notification và dashboard hỗ trợ theo dõi công việc phát sinh.

#### Điểm chưa tối ưu

- Tên menu `Ứng viên` dễ hướng recruiter về hồ sơ candidate, còn trọng tâm vận hành thật sự là **đơn ứng tuyển/Application**. Cần hiển thị rõ “Hồ sơ ứng tuyển” hoặc đặt Applications thành mục cấp một.
- Luồng từ application sang hành động kế tiếp chưa được diễn đạt bằng một hàng đợi công việc: “CV mới cần xem”, “cần xếp lịch”, “đang chờ evaluation”, “offer chờ duyệt”. Recruiter có dữ liệu nhưng phải tự lọc/ghi nhớ để biết việc ưu tiên.
- Bulk actions hiệu quả nhưng có rủi ro khi reject hoặc chuyển stage hàng loạt. Cần modal xác nhận hiển thị số hồ sơ, stage đích, lý do và danh sách lỗi trước/sau thao tác.
- Candidate đã bị reject được đưa vào Talent Pool best-effort, nhưng recruiter cần thấy rõ thao tác này thành công hay thất bại để tránh tưởng dữ liệu đã được lưu.
- Màn hình so sánh ứng viên đã có, nhưng mới dừng ở dữ liệu đánh giá và pipeline. Kinh nghiệm, kỹ năng và thông tin hồ sơ ứng viên vẫn phải mở từng application để đọc, nên HR còn phải chuyển màn hình khi cần xét kỹ.

#### Kết luận và ưu tiên

RECRUITER là role có nền tảng tốt nhất, nhưng nên ưu tiên:

1. Tạo trang/khối “Việc cần xử lý hôm nay” theo queue công việc.
2. Trên chi tiết application, hiển thị một CTA duy nhất theo stage: xem CV, lên lịch, chờ đánh giá, tạo offer hoặc đã kết thúc.
3. Bổ sung màn hình **So sánh ứng viên** theo posting, đặt ngay trong posting hub và chi tiết application, với CTA chọn ứng viên để tạo offer.

### 16.4 Đánh giá HIRING_MANAGER

#### Điểm phù hợp

- Có khả năng tạo và theo dõi requisition, đúng với vai trò phát sinh nhu cầu tuyển người.
- Có lịch interview và form evaluation, phù hợp với vai trò đánh giá chuyên môn.
- Đánh giá của manager là căn cứ để HR chọn ứng viên offer, nên trách nhiệm chuyên môn của phòng ban vẫn được giữ mà không cần trao quyền thao tác offer.

#### Điểm chưa tối ưu

- Sidebar của `HIRING_MANAGER` hiện giống `RECRUITER`: gồm cả Ứng viên và Offer. Điều này không phản ánh luồng làm việc thực tế của manager và khiến họ phải tự tìm nội dung được giao.
- Không có menu/màn hình “Việc của tôi”: requisition đang chờ chỉnh sửa, interview sắp diễn ra, evaluation chưa nộp.
- Manager vẫn thấy màn hình Offer với các action tạo/duyệt, trong khi theo quy tắc đã chốt manager không tham gia bước offer. Cần ẩn action và chỉ để chế độ xem kết quả.
- Manager không cần thao tác pipeline diện rộng như recruiter; nếu màn hình Applications hiển thị quá nhiều action, nguy cơ hiểu nhầm quyền hoặc thao tác sai tăng lên.
- Cần tách rõ hai chế độ xem: candidate “thuộc vị trí/phòng ban của tôi” và candidate “tôi được phân công phỏng vấn”. Đây là hai ngữ cảnh ra quyết định khác nhau.
- Form evaluation cần hiển thị rõ deadline, trạng thái submit/draft, các tiêu chí bắt buộc và kết quả của chính interviewer; nếu không, evaluation rất dễ bị nộp muộn hoặc thiếu thông tin.

#### Đề xuất menu phù hợp hơn

```text
Tổng quan của tôi
Yêu cầu tuyển dụng
Lịch phỏng vấn của tôi
Đánh giá cần hoàn thành
Kết quả tuyển dụng của phòng ban
Thông báo
Cài đặt
```

#### Kết luận và ưu tiên

Đây là role cần tối ưu UX nhiều nhất. Không thiếu chức năng nền, nhưng hiện chưa được tổ chức theo mục tiêu công việc của manager. Ưu tiên đầu tiên là tạo dashboard/hàng đợi riêng cho manager và giảm các action recruiter không cần thiết.

### 16.5 Đánh giá CANDIDATE

#### Điểm phù hợp

- Menu tách đúng theo tâm lý người tìm việc: Hồ sơ của tôi → Việc làm → Đơn của tôi → Lịch phỏng vấn → Offer.
- Có public careers trước đăng nhập, giảm rào cản xem việc làm.
- Candidate chỉ xem dữ liệu của mình, phù hợp yêu cầu bảo mật và riêng tư.
- My Applications, My Interviews, My Offers giúp candidate theo dõi toàn bộ hành trình mà không cần liên hệ recruiter cho các câu hỏi cơ bản.

#### Điểm chưa tối ưu

- Trạng thái pipeline nội bộ như `CV_SCREENING`, `HR_SCREENING`, `TECHNICAL_INTERVIEW` có thể khó hiểu hoặc làm candidate kỳ vọng sai. Candidate nên thấy nhãn thân thiện: “Đã nhận hồ sơ”, “Đang xem xét”, “Mời phỏng vấn”, “Đang chờ kết quả”, “Đã có offer”.
- Màn hình My Applications cần hiển thị rõ hành động tiếp theo, không chỉ stage: ví dụ “Cần xác nhận lịch trước ngày…”, “Bạn có offer cần phản hồi trước…”, hoặc “Không có hành động nào cần thực hiện”.
- Chưa có flow `WITHDRAWN`, quy tắc rút đơn và nộp lại theo quyết định đã chốt; đây là khoảng trống trực tiếp với candidate.
- Khi application bị reject, cần quy định rõ nội dung candidate nhìn thấy: lý do nội bộ có được công khai không, email có gửi ngay không, và candidate có được nộp cho posting mới hay không.
- Khi candidate có nhiều application, cần có bộ lọc theo trạng thái, job và thời gian; đồng thời phân biệt rõ các đơn đã kết thúc với đơn đang cần hành động.

#### Kết luận và ưu tiên

Luồng candidate có cấu trúc tốt nhất về mặt điều hướng. Ưu tiên là chuyển ngôn ngữ stage nội bộ thành ngôn ngữ thân thiện, thêm CTA theo ngữ cảnh và hoàn thiện flow rút đơn/nộp lại.

### 16.6 Đánh giá các màn hình dùng chung và điều hướng

| Hạng mục | Đánh giá | Cải thiện đề xuất |
| --- | --- | --- |
| Sidebar | Dễ nhìn, phân quyền menu cơ bản tốt. | Đã đưa `/applications` vào navigation và tách menu HIRING_MANAGER khỏi RECRUITER. |
| Dashboard | Có số liệu, biểu đồ và quick actions. | Cá nhân hóa KPI, hàng đợi công việc và quick action theo role. |
| Notification | Đã có chuông và trang notification. | Thêm phân loại “cần hành động”, deep-link nhất quán, trạng thái đã xử lý. |
| Trang chi tiết application | Là trung tâm nghiệp vụ, tập hợp nhiều dữ liệu. | Làm nổi bật action tiếp theo và chặn/giải thích các action không hợp lệ theo stage. |
| Màn hình list/table | Có filter, phân trang, export và bulk action ở một số nơi. | Lưu bộ lọc, có empty state theo ngữ cảnh, hỗ trợ link trực tiếp từ dashboard/notification vào đúng filter. |

### 16.7 Thứ tự ưu tiên cải thiện UX/nghiệp vụ

1. **Định hình Application workspace cho recruiter:** menu riêng, work queue, CTA theo stage và deep-link từ notification.
2. **Tạo workspace gọn cho hiring manager:** requisition, interview cần đánh giá, kết quả tuyển dụng của phòng ban; không sao chép menu recruiter và không hiển thị action offer.
3. **Hoàn thiện candidate self-service:** `WITHDRAWN`, nộp lại sau rút đơn, trạng thái dễ hiểu và hành động tiếp theo.
4. **Chuẩn hóa rejection flow:** lý do nội bộ, nội dung gửi candidate, thời điểm gửi, hiển thị Talent Pool result.
5. **Hỗ trợ quyết định offer (đã làm):** màn hình so sánh ứng viên theo posting, approver offer là HR/admin, chặn vượt số lượng tuyển và UI nói rõ duyệt đồng nghĩa với gửi offer. Phần còn lại: đưa kinh nghiệm/kỹ năng ứng viên vào bảng so sánh.
6. **Cá nhân hóa dashboard:** mỗi role nhìn thấy KPI và công việc có thể hành động, thay vì một dashboard chung.
