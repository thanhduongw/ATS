# Đánh giá trải nghiệm ATS theo vai trò

**Ngày đánh giá:** 16/09/2026  
**Góc nhìn:** mô phỏng người dùng thực hiện công việc hằng ngày, kết hợp rà soát luồng và giao diện đang có trong mã nguồn.  
**Vai trò:** Quản trị doanh nghiệp (`COMPANY_ADMIN`), Chuyên viên tuyển dụng (`RECRUITER`), Quản lý phòng ban (`HIRING_MANAGER`) và Ứng viên (`CANDIDATE`).

## Phạm vi và cách đọc báo cáo

Đây là đánh giá heuristic (dựa trên nguyên tắc UX) và đối chiếu source hiện tại, chưa phải kết quả usability test với người dùng thật. Các điểm ghi **[Xác nhận]** đã thấy trực tiếp trong luồng/giao diện hiện tại; **[Cần kiểm chứng]** là giả định hợp lý nên được test với người dùng trước khi đầu tư lớn.

Không chấm chất lượng nghiệp vụ hay phân quyền backend: phạm vi là cảm giác sử dụng, khả năng hoàn thành việc và mức độ rõ ràng của giao diện. Hệ thống hiện có nền tảng tốt: quyền theo role rõ, điều hướng riêng theo role, workflow requisition → posting → application → interview → offer đầy đủ, giao diện nhất quán với card, trạng thái, empty state và thông báo thao tác.

## Tóm tắt điều cần làm trước

| Ưu tiên | Vấn đề | Người bị ảnh hưởng | Tác động |
| --- | --- | --- | --- |
| P0 | API dashboard lỗi nhưng màn hình thay bằng số `0`; trang đơn ứng tuyển lỗi thì hiển thị như chưa có đơn | Admin, Recruiter, Manager, Candidate | Dễ đưa ra quyết định sai hoặc làm ứng viên nghĩ dữ liệu đã mất |
| P1 | Ứng viên bấm đăng ký/đăng nhập từ một job không được quay về job đó sau khi xác thực | Candidate | Rơi rụng conversion ở thời điểm muốn nộp đơn nhất |
| P1 | Xếp lịch không có lối vào chính trong menu và yêu cầu `applicationId` trên URL | Recruiter, Manager | Luồng vận hành quan trọng khó tìm, dễ bị đứt |
| P1 | Dashboard nội bộ dùng chung, chưa dẫn người dùng đến việc cần xử lý theo role | Recruiter, Manager, Admin | Tăng thời gian tìm việc, bỏ sót đánh giá/phê duyệt/sự kiện quá hạn |
| P1 | Tiến trình đơn của candidate được vẽ cố định, trong khi pipeline có thể cấu hình động | Candidate | Trạng thái hiển thị có thể không đúng với quy trình thực tế |
| P1 | Candidate chỉ xác nhận lịch đã chốt; chưa có đường rõ để chọn khung giờ/đề nghị đổi lịch | Candidate | Nhiều trao đổi ngoài hệ thống, khó giảm no-show |
| P1 | Giao diện nội bộ chưa thực sự mobile-first; sidebar desktop vẫn là khung chính ở màn nhỏ | Tất cả, đặc biệt candidate dùng điện thoại | Khó thao tác khi cần phản hồi nhanh |

## Bản đồ trải nghiệm mong muốn

```text
Admin: thiết lập → kiểm tra vận hành → xử lý ngoại lệ → audit
Manager: đề xuất nhu cầu → phỏng vấn → đánh giá đúng hạn → theo dõi kết quả
Recruiter: thấy việc tồn → sàng lọc → điều phối lịch → so sánh → offer → chốt
Candidate: tìm việc → hiểu vị trí → tạo tài khoản → hoàn thiện CV → nộp → theo dõi → phản hồi
```

Điểm chung cần thay đổi: menu hiện tổ chức chủ yếu theo **module**; trang đầu nên tổ chức theo **công việc đang chờ người dùng xử lý**. Module vẫn cần cho tra cứu, nhưng không nên là nơi duy nhất để bắt đầu một nhiệm vụ.

---

## 1. COMPANY_ADMIN — người vận hành và kiểm soát hệ thống

### Mục tiêu khi sử dụng

- Cấu hình dữ liệu nền, pipeline, phòng ban và tài khoản nội bộ.
- Theo dõi sức khỏe tuyển dụng toàn công ty, xử lý điểm nghẽn và kiểm tra lịch sử thao tác.
- Chỉ can thiệp vào nghiệp vụ tuyển dụng khi cần, không phải làm việc như một recruiter thường xuyên.

### Điều đang tốt

- Menu đã tách khá đúng giữa **Vận hành tuyển dụng** và **Quản trị hệ thống**; người admin có thể vào người dùng, danh mục và audit mà không cần nhớ URL. **[Xác nhận]** `frontend/src/layouts/AppLayout.tsx`
- Dashboard có thống kê, funnel, hiệu quả nguồn, hiệu suất recruiter và xuất PDF. Đây là nền tốt cho góc nhìn điều hành. **[Xác nhận]** `frontend/src/features/dashboard/pages/DashboardPage.tsx`
- Audit log và quyền toàn công ty giúp admin có thể lần lại trách nhiệm khi có sự cố; đây là điểm tạo niềm tin cho hệ thống nội bộ.

### Vướng mắc trải nghiệm và đề xuất

| Nhận xét | Vì sao người dùng gặp khó | Cải thiện đề xuất | Ưu tiên |
| --- | --- | --- | --- |
| Dashboard lỗi bị thể hiện như dữ liệu bằng 0. **[Xác nhận]** | Khi gọi summary lỗi, code đặt `summary = null`; giao diện tiếp tục dùng giá trị 0. Admin có thể hiểu nhầm không có tuyển dụng hay không có ứng viên. | Hiển thị `Không tải được dữ liệu` + nút `Thử lại`, giữ dữ liệu cũ có timestamp nếu có; tuyệt đối không thay lỗi bằng số 0. | P0 |
| Không có onboarding vận hành cho lần cài đặt đầu tiên. **[Cần kiểm chứng]** | Admin cần biết đã đủ phòng ban, catalog, pipeline, tài khoản và email template trước khi mở tin. Hiện các phần này nằm ở nhiều mục. | Thêm “Thiết lập hệ thống” theo checklist có % hoàn thành, CTA đến từng màn và cảnh báo các điều kiện chặn publish. | P1 |
| Dashboard đang thiên về báo cáo, chưa có “ngoại lệ cần can thiệp”. **[Cần kiểm chứng]** | Admin phải tự đọc nhiều biểu đồ để biết requisition nào chờ lâu, offer nào sắp hết hạn, hay tài khoản nào bị khóa. | Đầu dashboard là hộp `Cần chú ý` gồm số lượng, mức độ, tuổi việc và CTA lọc đúng danh sách. | P1 |
| “Cài đặt tài khoản” dễ bị hiểu là cấu hình công ty. **[Cần kiểm chứng]** | Admin thường tìm logo, thương hiệu Career Portal hoặc profile công ty tại Settings. | Tách nhãn: `Tài khoản cá nhân` và `Thông tin doanh nghiệp` nếu cả hai cùng tồn tại; dùng mô tả ngắn ở lần đầu vào. | P2 |

### Trải nghiệm đề xuất cho trang đầu Admin

1. `3 việc cần xử lý`: tài khoản chờ xử lý, requisition/offer quá SLA, dữ liệu cấu hình thiếu.
2. `Tổng quan tuyển dụng`: chỉ 4–6 KPI có thể hành động; biểu đồ đầy đủ đặt phía dưới.
3. `Sức khỏe hệ thống`: dữ liệu cập nhật lúc nào, lỗi đồng bộ/thông báo nếu có, link audit.
4. `Thiết lập`: checklist chỉ hiện khi chưa hoàn chỉnh.

---

## 2. RECRUITER — người điều phối toàn bộ tuyển dụng

### Mục tiêu khi sử dụng

- Không bỏ sót hồ sơ mới, requisition chờ duyệt, lịch cần chốt, đánh giá chưa nộp và offer sắp quá hạn.
- Chuyển ứng viên qua pipeline nhanh nhưng an toàn, có đủ ngữ cảnh để ra quyết định.
- Đi liên tục từ application → lịch → kết quả → so sánh → offer, không phải tìm lại dữ liệu.

### Điều đang tốt

- Menu hiện đã có `Hồ sơ ứng viên`; posting hub đưa danh sách, Kanban và so sánh ứng viên vào cùng bối cảnh của một tin tuyển dụng. Đây là cải thiện rất đúng với công việc của recruiter. **[Xác nhận]** `AppLayout.tsx`, `PostingHubPage.tsx`
- Kanban trực quan, hiển thị tên ứng viên, nguồn, ngày nộp và người phụ trách; chỉ cho chuyển tuần tự, còn từ chối mở form lý do riêng. **[Xác nhận]** `ApplicationKanbanBoard.tsx`
- Có bulk action, export, lịch dạng list/calendar/day-week, bulk schedule và luồng so sánh trước offer. Năng lực nghiệp vụ đã khá đầy đủ.
- Khi xếp lịch, giao diện 3 bên xác nhận và trạng thái “khớp 3 bên” dễ hiểu hơn mô hình lịch thuần túy. **[Xác nhận]** `InterviewSchedulingPage.tsx`

### Vướng mắc trải nghiệm và đề xuất

| Nhận xét | Vì sao người dùng gặp khó | Cải thiện đề xuất | Ưu tiên |
| --- | --- | --- | --- |
| `Xếp lịch` không có trong menu chính. **[Xác nhận]** | Menu recruiter có `Lịch phỏng vấn`, nhưng không có `Xếp lịch`; chức năng này chỉ dễ thấy sau khi vào application. | Thêm mục `Phỏng vấn` có 3 tab/lối vào: `Lịch`, `Cần chốt lịch`, `Cần đánh giá`; hoặc một CTA `Xếp lịch` luôn thấy ở danh sách ứng viên. | P1 |
| Mở `/scheduling` trực tiếp yêu cầu `applicationId` trong URL. **[Xác nhận]** | Màn hình tự nhắc người dùng mở từ hồ sơ hoặc thêm `?applicationId=…`; đây là chi tiết kỹ thuật không nên lộ ra. | Nếu chưa chọn ứng viên, hiển thị bảng ứng viên đủ điều kiện + tìm kiếm/lọc; chọn một dòng mới mở bước tạo slot. Giữ context khi quay lại. | P1 |
| Thẻ Kanban thiếu tín hiệu ưu tiên. **[Xác nhận]** | Card hiện có ngày nộp dạng `DD/MM`, nguồn và người phụ trách, nhưng chưa cho biết đã chờ bao lâu, có lịch sắp tới, đánh giá thiếu hay SLA sắp vi phạm. | Thêm badge nhỏ: `Mới 2h`, `Chờ 3 ngày`, `Cần xếp lịch`, `Chờ đánh giá`, `Quá SLA`; cho sort theo tuổi hồ sơ. | P1 |
| Kéo thả chuyển stage tạo thay đổi ngay. **[Xác nhận]** | Sai thao tác ở một stage nhạy cảm làm phát sinh thay đổi thật; hiện chỉ có toast thành công và không có “Hoàn tác”. | Với stage thường: toast có `Hoàn tác` trong 8–10 giây. Với offer/hired/rejected: xác nhận tóm tắt tác động trước khi lưu. | P1 |
| Chưa có inbox công việc cho recruiter. **[Cần kiểm chứng]** | Dashboard có phân tích và quick link, nhưng không ưu tiên một hàng đợi theo người phụ trách/tuổi hồ sơ. | `Việc của tôi`: hồ sơ mới, candidate chưa phản hồi slot, interview đã qua giờ chưa có evaluation, offer 48h nữa hết hạn. Mỗi item có một CTA. | P1 |
| Dữ liệu đánh giá, đề xuất lương, so sánh và offer vẫn là các điểm dừng riêng. **[Cần kiểm chứng]** | Đến lúc ra offer, recruiter cần tra lại nhiều màn hình. | Tại trang quyết định offer, hiển thị side panel gồm scorecard, nhận xét, proposal đã duyệt, headcount còn lại và lịch sử stage; nút `Tạo offer` prefill dữ liệu phù hợp. | P2 |

### Luồng lý tưởng cho Recruiter

```text
Việc của tôi
  → mở application có ngữ cảnh đầy đủ
  → chọn “Xếp lịch” hoặc “Yêu cầu đánh giá”
  → nhận kết quả tập trung tại application
  → “So sánh ứng viên” trong cùng posting
  → chọn ứng viên → review offer → gửi
```

Chỉ số nên đo: thời gian từ `APPLIED` đến lần liên hệ đầu, số application quá SLA, tỷ lệ lịch được chốt trong 48 giờ, tỷ lệ đánh giá nộp đúng hạn và số thao tác quay lại giữa các module trước khi tạo offer.

---

## 3. HIRING_MANAGER — người cần ra quyết định nhanh, không phải học ATS

### Mục tiêu khi sử dụng

- Tạo requisition cho đúng phòng ban, theo dõi trạng thái duyệt.
- Xác nhận thời gian phỏng vấn, xem hồ sơ đã được phân công và nộp đánh giá chất lượng.
- Biết rõ phần nào do HR làm và phần nào mình phải hoàn thành.

### Điều đang tốt

- Menu có nhãn `Ứng viên phòng ban` và `Kết quả tuyển dụng`, tránh nói rằng manager được tạo offer. Đây là lựa chọn ngôn ngữ đúng. **[Xác nhận]** `frontend/src/layouts/AppLayout.tsx`
- Form evaluation có ngữ cảnh ứng viên/vị trí/vòng, chấm theo tiêu chí, nhận xét và khuyến nghị; nội dung đánh giá được bảo vệ cho tới khi người phỏng vấn nộp đánh giá của mình. **[Xác nhận]** `EvaluationFormPage.tsx`
- Luồng đề xuất khung giờ cho phép manager báo có/không thể tham gia; card lịch hiển thị rõ trạng thái xác nhận từng bên. **[Xác nhận]** `SlotConfirmationPanel.tsx`

### Vướng mắc trải nghiệm và đề xuất

| Nhận xét | Vì sao người dùng gặp khó | Cải thiện đề xuất | Ưu tiên |
| --- | --- | --- | --- |
| Dashboard của manager hiện dùng cùng một bố cục dashboard nội bộ. **[Xác nhận]** | Thành phần UI không đổi theo role, nên manager có thể thấy funnel/hiệu suất recruiter và quick link thiên về vận hành thay vì việc cần làm của mình. | Dashboard riêng: `Phỏng vấn hôm nay`, `Đánh giá chưa nộp`, `Requisition chờ HR`, `Ứng viên cần xem`; 1 CTA rõ cho từng thẻ. | P1 |
| Không có entry point riêng tên “Đánh giá cần hoàn thành”. **[Xác nhận]** | Form evaluate có route sâu qua application; manager dễ quên sau khi buổi phỏng vấn kết thúc. Calendar có lọc đánh giá, nhưng chưa phải một inbox rõ theo người dùng. | Thêm menu/badge `Cần đánh giá (3)`; list có ứng viên, vị trí, thời gian phỏng vấn, deadline, trạng thái và nút `Đánh giá ngay`. | P1 |
| Đề xuất lương dễ bị lẫn với quyền tạo offer. **[Cần kiểm chứng]** | Manager thấy trường lương trong ngữ cảnh evaluation và biết HR mới là bên quyết định offer. | Đổi nhãn thành `Mức lương tham khảo` và đặt helper text: `HR xem xét trước khi tạo offer`; cho thấy trạng thái `Đã gửi cho HR`/`Đã được dùng`. | P2 |
| Trạng thái requisition chưa được “dịch” thành công việc tiếp theo. **[Cần kiểm chứng]** | `PENDING_APPROVAL`, `CHANGES_REQUESTED` là trạng thái đúng nhưng manager cần biết phải làm gì. | Trong danh sách requisition dùng CTA theo trạng thái: `Chờ HR duyệt`, `Cần chỉnh sửa`, `Tạo lại bản nháp`; hiển thị lý do ngay trên dòng. | P2 |

### Nguyên tắc thiết kế cho role này

Manager thường vào ATS ít hơn recruiter và thường vì một nhiệm vụ cụ thể. Vì vậy trang không nên ưu tiên báo cáo dài. Đặt các việc cần hoàn thành lên đầu, dùng ngôn ngữ nghiệp vụ (`Đánh giá`, `Xác nhận lịch`, `Yêu cầu tuyển dụng`) và luôn nói rõ hành động kế tiếp.

---

## 4. CANDIDATE — hành trình cần ít ma sát và tạo niềm tin

### Mục tiêu khi sử dụng

- Tìm hiểu công ty/vị trí, đăng ký nhanh, nộp CV và chắc chắn đơn đã được ghi nhận.
- Không phải đoán trạng thái đơn, lịch hay offer.
- Có thể phản hồi đúng hạn từ điện thoại.

### Điều đang tốt

- Career portal công khai có danh sách việc làm, lọc theo loại hình/địa điểm, chi tiết job và CTA đăng nhập/đăng ký; luồng đăng ký có bước xác thực email rõ ràng. **[Xác nhận]** `CompanyJobsPage.tsx`, `JobDetailApplyPage.tsx`, `RegisterPage.tsx`
- Candidate có khu vực riêng cho hồ sơ/CV, việc làm, đơn ứng tuyển, lịch, offer và thông báo. Phân biệt role tốt, không lộ chức năng nội bộ. **[Xác nhận]** `AppLayout.tsx`
- Offer là phần mạnh về UX: trạng thái được Việt hóa, đếm ngược hạn phản hồi, accept có xác nhận cuối, decline yêu cầu lý do và có nội dung thành công rõ ràng. **[Xác nhận]** `OfferCandidateViewPage.tsx`
- Empty state và thông báo CV còn thiếu giúp hướng người dùng mới đến bước cần làm tiếp theo.

### Vướng mắc trải nghiệm và đề xuất

| Nhận xét | Vì sao người dùng gặp khó | Cải thiện đề xuất | Ưu tiên |
| --- | --- | --- | --- |
| Từ job detail, bấm `Đăng nhập`/`Đăng ký` không lưu vị trí đang xem. **[Xác nhận]** | Điều hướng hiện đi thẳng `/login` hoặc `/register`; sau xác thực candidate về mặc định `/jobs`, phải tự tìm lại tin và ứng tuyển lại. | Lưu `returnTo` và `jobPostingId` xuyên login → verify → profile/CV. Sau khi đủ CV, mở lại job cụ thể với CTA `Nộp đơn ngay`. | P1 |
| Nguồn ứng tuyển được tự chọn giá trị đầu tiên. **[Xác nhận]** | Candidate có thể vô tình gửi sai “nguồn biết đến tin”; analytics nguồn tuyển bị nhiễu. | Hỏi một lần bằng câu thân thiện “Bạn biết đến vị trí này từ đâu?” khi bấm nộp; không default nếu dữ liệu cần chính xác. Có thể cho `Khác/Không muốn trả lời` nếu nghiệp vụ cho phép. | P1 |
| Trang “Đơn ứng tuyển của tôi” che lỗi API thành danh sách rỗng. **[Xác nhận]** | Khi tải lỗi, code dùng `setApplications([])`, khiến candidate thấy “chưa có hồ sơ” thay vì biết có lỗi. Đây là điểm dễ làm mất niềm tin nhất. | Tách state `error`; hiển thị lỗi có nút `Thử lại`, không hiện empty state khi chưa lấy được dữ liệu. | P0 |
| Timeline đơn là 4 bước cố định dù pipeline của posting có thể cấu hình. **[Xác nhận]** | Candidate có thể thấy “Sơ tuyển CV/Vòng phỏng vấn/Offer” không khớp pipeline thật hoặc một pipeline tùy biến. | Backend trả các trạng thái được phép hiển thị cho candidate. UI dùng progress động với ngôn ngữ thân thiện: `Đã nhận hồ sơ`, `Đang xem xét`, `Phỏng vấn`, `Hoàn tất`; không lộ nhận xét nội bộ. | P1 |
| Lịch phỏng vấn của candidate chỉ xác nhận lịch đã tạo; chưa có đường rõ để chọn slot hoặc đề nghị đổi lịch. **[Xác nhận]** | Route candidate là `/my-interviews`; route `/scheduling` chỉ dành cho internal role. Candidate phải xử lý đổi lịch qua kênh ngoài khi không tham gia được. | Trong lịch thêm `Tôi có thể tham gia` / `Tôi không thể tham gia` với lý do và đề xuất thời gian; hỗ trợ xem/chọn slot nếu HR gửi nhiều slot; có `.ics` và múi giờ rõ ràng. | P1 |
| Offer detail không hiển thị tên vị trí như một thông tin chính. **[Xác nhận]** | Candidate vào từ notification vẫn cần nhận diện ngay mình đang phản hồi offer cho công việc nào; tên job hiện chỉ được dùng trong hộp xác nhận. | Đặt `Tên vị trí · Phòng ban · Địa điểm` ngay dưới tiêu đề offer, trước lương/hợp đồng. | P1 |
| Nút yêu cầu xóa dữ liệu nằm đầu trang đơn ứng tuyển. **[Cần kiểm chứng]** | Đây là quyền riêng tư tích cực, nhưng vị trí cạnh nhiệm vụ theo dõi hồ sơ có thể khiến hành động nguy hiểm trở nên nổi bật quá mức. | Chuyển vào `Tài khoản & quyền riêng tư`; vẫn giữ xác nhận nhiều bước và nêu rõ phạm vi/khả năng phục hồi. | P2 |
| Career portal còn mang thương hiệu chung “ATS/Career Portal”. **[Xác nhận]** | Trên trang public, thương hiệu sản phẩm lấn át thương hiệu nhà tuyển dụng, có thể làm giảm tin cậy. | Dùng logo/tên công ty cấu hình được trong header, footer, title/favicon; `ATS` chỉ là fallback của môi trường demo. | P2 |

### Luồng candidate nên được ưu tiên thiết kế lại

```text
Job detail
  → Đăng ký/đăng nhập (ghi nhớ job)
  → Xác thực email
  → Kiểm tra CV tối thiểu
  → Trở lại chính job đó
  → Xác nhận nộp đơn
  → Trang thành công có: tên vị trí, việc tiếp theo, link theo dõi đơn
```

Sau khi nộp, candidate nên luôn trả lời được trong vài giây: **Tôi đã nộp vị trí nào? Đang ở trạng thái nào? Tôi cần làm gì tiếp? Ai sẽ liên hệ và khi nào?**

---

## 5. Nhận xét giao diện dùng chung

### Điểm mạnh

- Nhất quán màu sắc, card, spacing, tag trạng thái và hoạt ảnh nhẹ; giao diện nội bộ có cảm giác hiện đại, không giống form quản trị thô.
- Table, Kanban, timeline, filter bar và empty state phù hợp với dữ liệu vận hành nhiều dòng.
- Các thao tác rủi ro như reject/decline/accept đã có form hoặc xác nhận ở nhiều điểm quan trọng.
- Màn evaluation có breakpoint riêng và nội dung chia phần khá rõ.

### Cần cải thiện

| Hạng mục | Nhận xét | Đề xuất |
| --- | --- | --- |
| Mobile | CSS breakpoint 768px hiện chủ yếu giảm auth/page padding/header; AppLayout vẫn là sidebar cố định desktop. **[Xác nhận]** | Ở <= 768px, đổi sidebar thành drawer, giữ một CTA chính ở cuối màn hình với candidate, tăng vùng chạm tối thiểu 44px và ưu tiên list hơn table/kanban. |
| Khả năng truy cập | Có nút collapse có `aria-label`, nhưng nhiều card/div có `onClick` và Kanban kéo-thả cần audit bàn phím/screen reader. **[Xác nhận/Cần kiểm chứng thủ công]** | Dùng `Button`/`Link` semantic cho mọi thao tác điều hướng; test Tab/Enter/Escape, focus modal, contrast tag và thông báo cho screen reader. |
| Lỗi tải dữ liệu | Cách báo lỗi chưa nhất quán: Career portal có message lỗi, nhưng dashboard và danh sách đơn có thể trông như dữ liệu rỗng. **[Xác nhận]** | Chuẩn hóa `Loading → Error + Retry → Empty → Data`; mỗi state có nội dung khác nhau. |
| Mật độ thông tin | Dashboard có nhiều biểu đồ cùng lúc, trong khi việc tồn chưa nổi bật. **[Cần kiểm chứng]** | Tạo tầng “Hành động ngay” trước, báo cáo sau; cho phép thu gọn chart ít dùng. |
| Ngôn ngữ | Một số thuật ngữ `Offer`, `Career Portal`, `Funnel` còn là tiếng Anh. | Quy ước glossary: nội bộ có thể dùng `Offer (thư mời nhận việc)`, candidate dùng `Thư mời nhận việc`; tránh trộn nếu không có giải thích. |

---

## 6. Kế hoạch triển khai gợi ý

### Sprint 1 — bảo vệ niềm tin và không làm đứt luồng

1. Sửa UI lỗi tải dữ liệu cho Dashboard và `MyApplicationsPage` (error state, retry, không giả dữ liệu 0/rỗng).
2. Lưu deep link job qua register/login/verify; quay lại đúng job và tiếp tục apply.
3. Đưa xếp lịch vào một entry point không phụ thuộc URL `applicationId`.
4. Làm progress candidate theo stage được phép hiển thị thay vì timeline cứng.

### Sprint 2 — đưa công việc cần làm lên trước

1. Task inbox riêng cho recruiter và hiring manager, có badge số lượng ở menu.
2. SLA/tuổi hồ sơ và trạng thái cần làm trên Kanban/list.
3. Luồng candidate đổi lịch/chọn slot và thông tin vị trí đầy đủ trên offer.
4. Thiết kế mobile navigation drawer, sau đó test 360px / 390px / 768px.

### Sprint 3 — tối ưu vận hành và hoàn thiện

1. Checklist setup + exception center cho admin.
2. Nối evaluation → comparison → offer bằng một màn hình ra quyết định.
3. Chuẩn hóa thuật ngữ và branding Career Portal.
4. Audit accessibility với keyboard và screen reader.

## 7. Cách xác nhận các đánh giá bằng người dùng thật

Nên chạy 5–7 phiên test ngắn, mỗi phiên 30–45 phút, không hướng dẫn thao tác. Chỉ cần cho người dùng nói to suy nghĩ và đo thời gian/điểm mắc kẹt.

| Persona | Nhiệm vụ test | Tiêu chí thành công |
| --- | --- | --- |
| Admin | Thiết lập điều kiện tối thiểu để publish một tin; tìm một vấn đề cần can thiệp | Biết còn thiếu gì, hoàn thành không cần hỏi người hướng dẫn |
| Recruiter | Xử lý hồ sơ mới, xếp lịch, tìm đánh giá thiếu, tạo offer | Tìm được lối đi trong < 30 giây/mỗi việc; không cần URL hay nhớ module |
| Manager | Tạo requisition, xác nhận lịch, nộp evaluation | Biết chính xác việc mình phải làm và phần HR phụ trách |
| Candidate | Mở job, đăng ký, upload CV, quay lại nộp; xác nhận/đổi lịch; phản hồi offer | Không mất job đang quan tâm, hiểu trạng thái và deadline |

Các dữ liệu hữu ích để tinh chỉnh vòng đánh giá tiếp theo:

- Ảnh hoặc video màn hình ở desktop và mobile, đặc biệt cho flow login → apply và scheduling.
- Vai trò/người dùng thực tế, số lượng hồ sơ mỗi ngày và SLA tuyển dụng của doanh nghiệp.
- Nghiệp vụ chốt: candidate có được tự đề nghị đổi lịch không, manager có được đề xuất lương không, ai phải duyệt offer.
- Sự kiện analytics hiện có: rơi rụng đăng ký, tỷ lệ nộp đơn, thời gian ở mỗi stage, số offer quá hạn.

## Kết luận

ATS đã có độ bao phủ chức năng tốt và UI nội bộ khá nhất quán. Điểm cải thiện có lợi nhất không phải thêm nhiều module mới, mà là làm cho mỗi role thấy **đúng việc của mình, đúng lúc, trong đúng ngữ cảnh**. Ưu tiên cao nhất là bảo vệ niềm tin dữ liệu, khép kín hành trình apply của candidate và bỏ các điểm bắt người dùng phải tự ghép URL/module để hoàn thành công việc.
