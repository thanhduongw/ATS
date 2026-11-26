# Kiểm thử toàn bộ chức năng trên giao diện — 26/11/2026

Thử như người dùng thật trên web (http://localhost:3000) và app mobile chạy trên Expo web (http://localhost:19006),
lần lượt với 5 vai: Khách vãng lai, Ứng viên, Chuyên viên tuyển dụng (HR), Đại diện phòng ban (PB), Quản trị (QT).
Sao lưu DB trước khi thử: `backups/ui-test-2026-11-26/*.dump`.

Lưu ý môi trường: trong lúc thử máy luôn 100% CPU, còn ~1,7 GB RAM trống (có tiến trình `find` quét ổ đĩa — đã dừng,
và Whisper chép âm thanh của một phiên khác — giữ). Vì vậy các hiện tượng "đứng 10–20 giây" ở mục D cần thử lại
khi máy rảnh. Lỗi treo ở mục A1 thì tái hiện ổn định nên nhiều khả năng là lỗi thật.

---

## A. Lỗi — chức năng không hoạt động (nên sửa)

| # | Vai | Chức năng | Hiện tượng | Gợi ý nguyên nhân |
|---|---|---|---|---|
| A1 | HR, QT | Danh mục > **Phòng ban**, **Lý do từ chối** | Mở ra là **treo trình duyệt** (Phòng ban 3/3 lần, Lý do từ chối 1/1). "Trình độ học vấn" treo 1 lần, lần sau mở được | Hai danh mục này có cột phụ tải bất đồng bộ trong `useExtraColumns` (`CatalogPanel.tsx:33`), trả mảng cột mới mỗi lần render + `FitTable/useFitPageSize` tính lại số dòng → vòng lặp render |
| A2 | Khách, Ứng viên | **Đăng nhập bằng Google** | Bấm → JSON 404 "Không tìm thấy đường dẫn" | `auth-service/.env` không có `GOOGLE_CLIENT_ID/SECRET` nên OAuth tắt, nhưng nút vẫn hiện. Cấu hình khoá Google hoặc ẩn nút |
| A3 | HR | Danh mục > **Trường tuỳ chỉnh** | HR thấy nút "Thêm mới", nhập xong bấm lưu → "Bạn không có quyền thực hiện thao tác này" | API chỉ cho QT (`CustomFieldDefinitionController`). Ẩn nút với HR hoặc mở quyền |
| A4 | QT | **Trường tuỳ chỉnh** nói chung | QT tạo được, nhưng **không nơi nào trên giao diện dùng** | Chỉ hiện trong form "Thêm ứng viên" (`CandidateFormModal`) mà form này tắt bởi `SHOW_ADD_CANDIDATE = false` (`ApplicationsPage.tsx:68`) |
| A5 | QT | Chi tiết người dùng > **Lịch sử tài khoản** | Luôn "Chưa có thao tác nào" dù vừa khoá / mở khoá / đổi vai trò (Nhật ký hệ thống có ghi đủ) | Khối này không đọc được nhật ký theo người dùng |
| A6 | HR | **Lên lịch hàng loạt** | Danh sách chọn ứng viên có cả người **đã rút đơn** và người đang ở **Thư mời**; ô chọn giờ cho chọn **ngày quá khứ** | Lọc theo giai đoạn Phỏng vấn; chặn ngày đã qua |
| A7 | HR | **Đóng tin** | Đóng ngay, **không hỏi xác nhận**, sau đó **không có nút mở lại** | Thêm hộp xác nhận (đây là thao tác không hoàn tác) |
| A8 | HR, Ứng viên | Tin **đã đủ người** | Tin Backend "Đã đủ người 2/2", tin Mobile vừa tuyển 1/1 nhưng vẫn "Đang tuyển": trang công khai **vẫn nhận đơn**, vẫn lên lịch phỏng vấn được, chỉ bị chặn ở bước gửi thư mời | Tự đóng hoặc tạm dừng nhận đơn khi đủ suất |
| A9 | QT | **Tổng quan** theo Quý 4 | Backend "Còn cần 0" nhưng "Đã tuyển/tổng 1/2"; thẻ "Đã tuyển trong quý 3" nhưng phễu "Đã tuyển 2" | Số liệu lệch giữa các khối khi lọc theo quý (chọn "Tất cả" thì khớp) |
| A10 | PB | **Kết quả tuyển dụng** | Thẻ "Vị trí đang tuyển 1 · 2 người cần tuyển" trong khi đã tuyển 2/2 | Đếm cả tin đã đủ người |

## B. Chức năng thừa / gây hiểu nhầm (cân nhắc bỏ hoặc sửa)

| # | Vai | Chức năng | Ghi chú |
|---|---|---|---|
| B1 | HR | Nút **"Tạo mới"** (góc trên) | 4 mục có mũi tên ">" như có menu con nhưng không có. "Việc làm", "Ứng viên", "Lịch phỏng vấn" chỉ mở **danh sách**, không mở form tạo. Chỉ "Thư mời" mở đúng trang So sánh |
| B2 | HR | "Tạo mới → **Ứng viên — Thêm thủ công**" | Chức năng thêm ứng viên mới đã bị tắt; chỉ còn "Thêm ứng viên" có sẵn vào tin (ở trang tin, chạy được) |
| B3 | HR | Bước **"Chờ duyệt"** của tin tuyển dụng | HR gửi duyệt rồi chính HR bấm "Đăng tin"; phòng ban không tham gia. Bước này hiện không có ý nghĩa |
| B4 | HR | Tab "Hết hạn / **thu hồi**" ở Thư mời | Không có nút thu hồi thư mời đã gửi |
| B5 | QT | Ma trận **Vai trò & quyền** | Ghi HR "Xem số liệu tổng hợp ✓" nhưng HR không có màn Tổng quan |

## C. Thiếu chức năng / web và mobile không đồng nhất

| # | Nội dung |
|---|---|
| C1 | API xuất **báo cáo PDF** (`/api/dashboard/report/pdf`) có sẵn nhưng **không có nút** trên giao diện QT |
| C2 | PB **không xoá được bản nháp** yêu cầu của mình (API xoá chỉ cho HR); không rút lại được yêu cầu đang chờ duyệt |
| C3 | Ứng viên mobile: **không có đổi mật khẩu**, không hiện **kỹ năng** trong hồ sơ |
| C4 | PB mobile: chỉ **Xác nhận** lịch, **không có "Đề xuất giờ khác"** (web có); không tạo yêu cầu mới (chỉ sửa nháp) |
| C5 | HR mobile: không lên lịch, không soạn thư mời, không tạo tin (app hướng sang bản web) |
| C6 | Form ứng tuyển: mobile có "Nguồn tuyển" + "Lời nhắn", web không có. Tiến trình đơn: web 5 bước, mobile 4 bước |
| C7 | Ứng viên không mở xem lại được **CV đã nộp** ở chi tiết đơn (web) |
| C8 | Chọn "**Tải CV khác**" khi ứng tuyển (web) **âm thầm thay CV chính** trong hồ sơ |
| C9 | Không có thông báo "Đã nhận hồ sơ" cho ứng viên sau khi nộp đơn (chỉ có thông báo khi rút đơn, đổi giai đoạn) |
| C10 | Bộ lọc "Kinh nghiệm" ở mobile lấy chuỗi mô tả tự do ("Từ 2 năm với React") làm lựa chọn, chỉ phủ 2/4 tin |

## D. Lỗi nhỏ / giao diện

- Đăng ký từ nút "Ứng tuyển ngay" → xác minh OTP xong về trang đăng nhập trơn, mất đường quay lại tin đang ứng tuyển.
- File DOCX hiện biểu tượng PDF.
- Danh sách yêu cầu của PB ghi "**Phòng Phòng Backend**".
- Thẻ Kỹ năng ở tổng quan Danh mục ghi 50 mục, vào trong ghi 51 (đếm cả mục đã tắt).
- Mẫu email hiện mã tiếng Anh thô (APPLICATION_COMMENT_MENTION…); trang So sánh có chữ "hiring manager".
- Thư mời mặc định lương 20 triệu, không lấy mức 25 triệu đã đề xuất trong đánh giá.
- Đếm "Đánh giá 0/1" không tính đánh giá HR vừa thêm; nhận xét từng tiêu chí không hiện lại trong thẻ đánh giá.
- Kết luận đánh giá mặc định chọn sẵn "Nên tuyển"; nút "Nộp đánh giá" ở đầu trang, form dài phải cuộn ngược lên.
- Buổi phỏng vấn đã huỷ vẫn có "Tải tệp lịch (.ics)"; buổi đã qua 8 ngày vẫn có "Huỷ buổi".
- Buổi Đỗ Minh Tuấn: chip "Ứng viên xin dời" nhưng ô Ứng viên ghi "Đã xác nhận 16/11".
- Huy hiệu số ở menu (Yêu cầu tuyển dụng, Việc làm) không tự cập nhật sau thao tác.
- Mở khoá tài khoản không hỏi xác nhận; ô chọn phòng ban khi mời người dùng gõ lọc không ăn.
- Lần bấm "Gửi duyệt" đầu tiên ngay sau khi đóng "Xem trước" không gửi.
- Hiệu năng: trang chi tiết hồ sơ, Cài đặt, Trang tuyển dụng có lúc đứng 10–20 giây (đo lúc máy quá tải — thử lại).
- Dữ liệu demo đã cũ (seed ~19/11): nhiều buổi hết hạn, các kịch bản trong `TEST_ACCOUNTS.md` (Hồ Thị Bích Ngọc, Bùi Gia Huy, Lương Minh Khôi, "Kỹ sư AI/ML chờ duyệt"…) không còn đúng; một số điểm AI vẫn "chấm theo cách cũ".

## E. Chưa thử — và lý do

| Chức năng | Lý do |
|---|---|
| Ứng viên **Yêu cầu xoá dữ liệu** (bước cuối nhập "XOA DU LIEU") | Công cụ chặn thao tác xoá vĩnh viễn; cần bạn cho phép (hoặc tự bấm) |
| QT **Xuất bản** Trang tuyển dụng | Bản nháp đang có (lưu tự động 08:36) khác bản công khai, ô Ảnh bìa trống → xuất bản có thể làm mất ảnh trên trang thật. Đã thử "Xem trước" |
| HR "Yêu cầu sửa" / "Từ chối" yêu cầu tuyển dụng | Đã mở form nhưng không gửi (chỉ có 1 yêu cầu chờ duyệt, dùng để thử Duyệt) |
| **Xuất Excel**, tải CV, tải PDF thư mời, "Thêm vào lịch (.ics)" | Tải file thật về máy. Đã kiểm API PDF thư mời và .ics bằng fetch: chạy |
| Khung xem CV ngay trong trang HR | Lần đầu hiện xám (công cụ chụp không bắt được PDF nhúng); lần sau với hồ sơ khác thì hiện đúng → coi là chạy |
| Gửi email thật (OTP, lời mời, đặt lại mật khẩu, thông báo) | Mọi tài khoản dùng `example.com` nên hệ thống cố ý không gửi. Mã OTP / token lời mời đã được ghi đè trong DB để thử tiếp luồng |
| Mobile: Đăng ký, Quên mật khẩu, Thay CV, Thư mời của ứng viên, PB viết đánh giá, Kết quả tuyển dụng, Cài đặt | Hết thời gian; các chức năng tương ứng trên web đã thử |
| Mobile ở khổ màn hình điện thoại | Không thu nhỏ được cửa sổ trình duyệt; đã thử ở bố cục rộng |
| Thông báo realtime / tác vụ hẹn giờ (nhắc lịch, thư mời hết hạn, dọn dữ liệu) | Cần chờ theo giờ, không kiểm qua giao diện |

## F. Đã thử và chạy đúng

**Khách vãng lai:** trang chủ tuyển dụng; tìm kiếm không dấu; lọc phòng ban/địa điểm; sắp xếp lương; xem chi tiết tin;
ứng tuyển khi chưa đăng nhập → chuyển đăng nhập; đăng ký (bắt buộc đồng ý chính sách); OTP sai/đúng; đăng nhập sai/đúng;
quên mật khẩu → đặt lại.

**Ứng viên (web):** sửa hồ sơ + kỹ năng; tải CV PDF/DOCX; chặn file PDF giả; ảnh đại diện; ứng tuyển; chặn ứng tuyển trùng;
danh sách/chi tiết đơn; rút đơn; tổng quan; thông báo; đổi mật khẩu (sai mật khẩu cũ báo lỗi, đúng thì bắt đăng nhập lại);
đồng ý lịch phỏng vấn; từ chối lịch → xin dời (bắt buộc lý do); nhận thư mời → trang chào mừng; từ chối thư mời (lý do);
xem chính sách bảo mật.

**Ứng viên (mobile):** chặn tài khoản QT; trang chủ; việc làm + tìm + lọc; chi tiết tin; ứng tuyển; rút đơn;
danh sách/chi tiết đơn (kèm lịch); chi tiết lịch; hồ sơ + sửa; thông báo.

**HR (web):** Việc của tôi (Của tôi/Cả nhóm); danh sách ứng viên + lọc; AI tự chấm đơn mới, chấm lại, xem tiêu chí;
ghi chú; chuyển giai đoạn; từ chối hàng loạt (lý do); giao người phụ trách hàng loạt; kéo thả Kanban; chế độ Danh sách;
thêm ứng viên có sẵn vào tin; so sánh ứng viên; lên lịch 1 người (lưới giờ) và hàng loạt; thêm người phỏng vấn;
đặt lịch mới khi ứng viên xin dời; đổi giờ; huỷ buổi; ghi nhận vắng mặt; duyệt đề xuất đổi giờ của PB; thêm đánh giá;
soạn → sửa → gửi thư mời (kiểm khung lương, suất, đánh giá); duyệt yêu cầu tuyển dụng; tạo tin từ yêu cầu,
xem trước máy tính/điện thoại, đăng tin, tạm dừng, mở lại; danh mục: thêm/sửa/bật-tắt, báo trùng; mẫu email:
xem trước, render thử, sửa; tìm nhanh Ctrl K; thông báo + đánh dấu đã đọc; cài đặt; đăng xuất.

**HR (mobile):** việc của tôi; từ chối hồ sơ (lý do); danh sách ứng viên; lịch tuần; yêu cầu tuyển dụng; thư mời.

**Đại diện phòng ban:** Việc của tôi; xác nhận lịch (web + mobile); đề xuất giờ khác; viết đánh giá (lưu nháp, kiểm bắt buộc,
nộp → khoá); tạo yêu cầu (kiểm đủ 10 trường) → gửi duyệt; mở nháp → lưu nháp; kết quả tuyển dụng + phễu; ứng viên phòng mình.

**Quản trị:** tổng quan (đổi quý, chi tiết phòng ban); người dùng: mời, khoá (chặn đăng nhập), mở khoá, đổi vai trò,
gửi email đặt lại mật khẩu; nhận lời mời → đặt mật khẩu → đăng nhập đúng vai; vai trò & quyền; đổi màu thương hiệu
(toàn giao diện đổi ngay); xem trước trang tuyển dụng; nhật ký hệ thống (tìm, lọc); thêm trường tuỳ chỉnh.

## G. Dữ liệu đã thay đổi trong lúc thử

Đã trả lại: màu thương hiệu `#0F6E66`, SĐT của Thu Hà, vai trò của Ngô Thanh Mai, mật khẩu `uv.kiemthu`.

Vẫn còn (dữ liệu thử): tài khoản `uv.kiemthu@example.com` (3 đơn, 1 lịch PV 27/11 14:00), `moi.kiemthu@example.com` (PB Backend);
REQ-012 (đã duyệt); tin "Kỹ sư AI/Machine Learning" (đã đóng); kỹ năng "Rust" (đã tắt); trường tuỳ chỉnh `ma_gioi_thieu`;
Bùi Gia Huy đã nhận việc Mobile; Tạ Thị Kim Ngân đã từ chối thư mời; Hồ Thị Bích Ngọc bị từ chối; Mai Đăng Khoa, Lâm Quốc Thái
bị từ chối ở tin Backend; Nguyễn Trọng Nghĩa vắng mặt; buổi PV của Đỗ Minh Tuấn huỷ và xếp lại 30/11; Châu Ngọc Diệp xin dời 30/11.

Khôi phục toàn bộ về trước lúc thử: `pg_restore --clean` từng file trong `backups/ui-test-2026-11-26/`
(hoặc chạy lại `scripts/demo-data/seed.py` để có dữ liệu demo mới, mốc thời gian mới).

---

## H. Quyết định của chủ dự án (26/11/2026)

### Bỏ / ẩn
| Mục | Quyết định |
|---|---|
| A1 Danh mục treo | **Bỏ các cột phụ** (Đại diện phòng ban, Tài khoản ở Phòng ban; Đã dùng ở Lý do từ chối) |
| A2 Đăng nhập Google | **Bỏ** nút trên web và cấu hình OAuth2 ở auth-service |
| A3+A4 Trường tuỳ chỉnh | **Bỏ hẳn** (giao diện, API, bảng) |
| B1+B2 Nút "Tạo mới" của HR | **Bỏ hẳn** |
| B3 Bước "Chờ duyệt" của tin | **Bỏ**: tin chỉ còn Bản nháp → Đang tuyển |
| B4 Tab "Hết hạn / thu hồi" | **Đổi tên thành "Hết hạn"**, không làm thu hồi |
| Kỹ năng (master data) | **Ẩn khỏi giao diện** ở cả 3 chỗ: hồ sơ ứng viên (web + mobile, kể cả tab Thông tin của HR), ô Kỹ năng yêu cầu ở yêu cầu/tin, thẻ Kỹ năng trong Danh mục. AI chấm dựa trên phần mô tả Yêu cầu |
| C6 Form ứng tuyển mobile | **Bỏ** 2 ô "Bạn biết tin từ đâu" + "Lời nhắn"; tiến trình đơn mobile theo 5 bước như web |
| C10 Lọc Kinh nghiệm mobile | **Bỏ** |

### Sửa
| Mục | Quyết định |
|---|---|
| A5 Lịch sử tài khoản | Hiện đúng các dòng nhật ký của người dùng đó |
| A6 Lên lịch hàng loạt | Chỉ liệt kê ứng viên ở giai đoạn Phỏng vấn chưa có lịch; chặn ngày giờ đã qua |
| A7 Đóng tin | Thêm hộp xác nhận (nói rõ không mở lại được) |
| A8 Tin đủ người | **Tự đóng tin** khi số đã tuyển = số cần tuyển, gỡ khỏi trang công khai |
| A9+A10 Số liệu | Thống nhất cách đếm: tin đủ người không tính là đang tuyển; mọi khối cùng mốc thời gian khi lọc quý |
| B5 Ma trận quyền | Ghi HR **không** xem số liệu tổng hợp |
| C2 Nháp yêu cầu | Phòng ban xoá được bản nháp của mình |
| C3 Mobile | Thêm đổi mật khẩu cho ứng viên |
| C7 | Ứng viên mở xem được CV đã nộp ở chi tiết đơn |
| C8 | "Tải CV khác" khi ứng tuyển chỉ dùng cho đơn đó, không ghi đè CV chính |
| C9 | Thêm thông báo "đã nhận hồ sơ" khi nộp đơn |
| Danh mục dùng thật | (1) Email từ chối gửi ứng viên kèm **lý do** đã chọn từ danh mục Lý do từ chối; (2) ô Kinh nghiệm ở yêu cầu/tin chọn từ danh mục **Mức kinh nghiệm** thay cho gõ tự do; (3) rà mọi email gửi đi đều lấy từ **Mẫu email** |
| D Lỗi nhỏ | Sửa cả 4 nhóm: chữ sai/tiếng Anh, đếm/hiển thị sai, luồng thao tác, nút không hợp lý |

### Giữ nguyên
- C1 API báo cáo PDF: để đó, không thêm nút.
- C4/C5 Mobile phòng ban "Đề xuất giờ khác", mobile HR lên lịch/soạn thư mời: không bổ sung.
- Form "Thêm ứng viên mới" của HR: để nguyên cờ tắt (`SHOW_ADD_CANDIDATE = false`).

### Việc sau khi sửa
- Chủ dự án tự thử "Yêu cầu xoá dữ liệu" ứng viên.
- Đối chiếu bản nháp Trang tuyển dụng với bản công khai, bổ sung ảnh bìa rồi xuất bản.
- Thử nốt các màn mobile chưa thử (đăng ký, quên mật khẩu, thay CV, phòng ban viết đánh giá).

---

## I. Đã làm (26/11/2026) và ghi chú phần backend

### Chỉ ẩn trên giao diện — backend còn nguyên, cần dọn sau nếu bỏ hẳn
| Mục | Cách ẩn | Backend còn lại |
|---|---|---|
| Đăng nhập Google | cờ `SHOW_GOOGLE_LOGIN = false` (`LoginPage.tsx`) | OAuth2 ở auth-service (`SecurityConfig`, `OAuth2PreLoginController`, `OAuth2LoginSuccessHandler`, `/oauth2/callback` web) |
| Trường tuỳ chỉnh | `HIDDEN_CATALOGS` (`catalogConfigs.ts`), đường dẫn cũ tự quay về Danh mục | API `/candidate/custom-field-definitions`, bảng định nghĩa ở candidate-service, `CustomFieldDefinitionPanel.tsx` (không còn dùng) |
| Kỹ năng | cờ `SHOW_SKILLS = false` (`app/featureFlags.ts`): hồ sơ ứng viên, tab Thông tin của HR, so sánh ứng viên, form + trang xem yêu cầu / tin; ẩn khỏi Danh mục | danh mục `skills` ở masterdata, `skillIds` của hồ sơ / yêu cầu / tin vẫn lưu; ai-service vẫn đọc `skillIds` của tin cũ làm kỹ năng bắt buộc |
| Nút "Tạo mới" của HR | cờ `SHOW_CREATE_MENU = false` (`AppLayout.tsx`) | — |
| Bước "Chờ duyệt" của tin | nút "Đăng tin" gọi lần lượt `submit-review` rồi `publish`; tab "Chờ duyệt" gộp vào "Bản nháp", nhãn `APPROVED` = "Chưa đăng" | trạng thái `APPROVED`, endpoint `submit-review` / `request-edit` vẫn còn |
| Thu hồi thư mời | đổi tên tab thành "Hết hạn" | — |
| Báo cáo PDF | giữ nguyên, không thêm nút | `/api/dashboard/report/pdf` |
| Form "Thêm ứng viên mới" | để nguyên cờ `SHOW_ADD_CANDIDATE = false` | — |

### Có sửa backend
| Mục | Service | Thay đổi |
|---|---|---|
| A8 tin đủ người tự đóng | offer-service, recruitment-service | Nhận thư mời → offer-service phát `posting.hired_count` (số thư mời đã nhận của tin); recruitment-service (`PostingHiredCountListener`) đóng tin Đang tuyển / Tạm dừng khi đạt số lượng của yêu cầu, ghi nhật ký. Tin đã đủ người từ trước (Backend 2/2, Mobile 1/1) không tự đóng vì không có sự kiện mới — HR đóng tay |
| C2 phòng ban xoá nháp | recruitment-service | `DELETE /requisitions/{id}` mở cho nhân viên nội bộ; đại diện phòng ban chỉ xoá bản nháp do mình tạo |
| C8 CV khác cho một đơn | candidate-service, application-service | API mới `POST /candidate/me/application-resume` (lưu file, không thay CV hồ sơ); đơn tự nộp nhận `resumeUrl` nếu file nằm trong `candidates/{id}/` của chính ứng viên |
| C9 thông báo đã nhận hồ sơ | application-service, notification-service | sự kiện `application.created` thêm `candidateUserId` (khi ứng viên tự nộp); loại thông báo mới `APPLICATION_RECEIVED` (trong ứng dụng + email theo mẫu cùng mã) |
| Lý do từ chối vào email | application-service, notification-service | sự kiện `application.status_changed` thêm `rejectionReason`; thông báo / email từ chối kèm "Lý do: …" |

### Rà Mẫu email
- Mọi thông báo của notification-service gửi email theo Mẫu email có mã = loại thông báo; chưa có mẫu thì dùng nội dung mặc định. Màn Mẫu email giờ liệt kê đủ 19 loại (thêm `REQUISITION_REVIEWED`, `APPLICATION_RECEIVED`, `INTERVIEW_CANDIDATE_DECLINED`, `INTERVIEW_CANCELLED`) và hiện tên tiếng Việt.
- **Chưa dùng Mẫu email**: email OTP đăng ký, đặt lại mật khẩu, lời mời người dùng — do auth-service (`MailService`) tự soạn. Muốn sửa được trên giao diện thì phải chuyển các email này sang mẫu (việc backend, chưa làm).

### Kiểm lại sau khi sửa (26/11/2026 chiều)
- `npx tsc -b --noEmit` (web), `npm run typecheck` + `npm run lint` (mobile, chỉ còn 5 cảnh báo cũ), `mvnw test` cho recruitment, offer, application, candidate, notification: đạt.
- Đã khởi động lại 5 service trên; hàng đợi `recruitment.posting-hired-count.queue` đã có.
- Trên giao diện: Danh mục > Phòng ban và Lý do từ chối mở bình thường (không treo); Kỹ năng và Trường tuỳ chỉnh không còn ở Danh mục; không còn nút "Tạo mới"; ô Kinh nghiệm chọn từ danh mục; tạo tin → "Đăng tin" đăng thẳng, số trên menu tự cập nhật.
- Chạy trọn một vòng trên tin thử "Kỹ sư Backend Kotlin (kiểm thử)" (chỉ tiêu 1): ứng viên nộp bằng "CV khác" (đơn dùng PDF mới, CV hồ sơ giữ DOCX cũ) → ứng viên nhận thông báo "Đã nhận hồ sơ ứng tuyển" → HR đánh giá (tab ghi "Đánh giá 1/1") → soạn thư mời tự điền lương đề xuất 22 triệu → gửi → ứng viên nhận → **tin tự chuyển "Đã đóng"**, nhật ký ghi "(đã tuyển đủ 1 người)".
- Từ chối hồ sơ có tài khoản ứng viên → thông báo/email ghi "Lý do: Chưa đủ số năm kinh nghiệm." (ghi chú nội bộ không gửi). Hồ sơ HR nhập không có tài khoản thì không có thông báo (như cũ).
- Phòng ban xoá bản nháp REQ-011: có hộp xác nhận, xoá mềm thành công.
- Chưa kiểm lại trên giao diện mobile (chỉ typecheck + lint): form ứng tuyển bỏ 2 ô, tiến trình 5 bước, bỏ lọc Kinh nghiệm, đổi mật khẩu ứng viên.
