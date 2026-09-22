# Đánh giá trải nghiệm người dùng ATS — theo từng role

> **Cách đánh giá:** đi hết luồng nghiệp vụ Requisition → Posting → Application → Interview → Comparison → Offer trên bản code hiện tại, đóng vai từng role và ghi lại đúng những gì gặp phải. Có cả điểm tốt và điểm dở. Những chỗ nêu số liệu (số click, tên màn hình, tên trường) đều đối chiếu với code, không suy đoán.
>
> **Phạm vi:** frontend React 19 + Ant Design, sidebar theo role. Không đánh giá hiệu năng backend.

---

## 1. RECRUITER — người dùng nặng nhất của hệ thống

### 1.1 Trải nghiệm tổng thể

Ấn tượng đầu khá tốt. Sidebar đi đúng trình tự công việc: Tuyển dụng → Hồ sơ ứng viên → Lịch phỏng vấn → Offer. Nhìn menu là đoán được quy trình, không phải dò.

Trang Tổng quan mở ra là khối **Việc cần xử lý**: CV mới cần xem, buổi phỏng vấn chờ đánh giá, ứng viên đang ở vòng Offer, offer chờ duyệt. Bấm vào ô nào thì sang thẳng danh sách đã lọc sẵn theo ô đó. Đây là thứ quyết định cảm giác "hệ thống này hiểu việc của tôi" — không phải biểu đồ.

**Điểm tốt cụ thể:**

- Trang chi tiết hồ sơ gom đủ CV, lịch sử, phỏng vấn, đánh giá, offer trong các tab. Không phải mở nhiều màn hình để hiểu một ứng viên.
- Bảng hồ sơ có lọc theo tin đăng, giai đoạn, người phụ trách, nguồn tuyển, thời gian — đủ cho khối lượng lớn.
- Thao tác hàng loạt (chuyển vòng, từ chối, phân công) tiết kiệm thời gian thật.
- Bảng so sánh ứng viên xếp hạng sẵn theo đánh giá, kèm số suất tuyển còn lại. Đây là màn hình tôi thích nhất — nó trả lời đúng câu hỏi khó nhất: "offer ai?"

### 1.2 Quy trình — điểm mượt và điểm gãy

**Mượt:** đoạn từ so sánh ứng viên tới tạo offer.

```
So sánh ứng viên → bấm "Chọn để offer" → xác nhận các vòng sẽ đi qua
→ hệ thống tự chuyển hồ sơ tới vòng Offer → form tạo offer mở sẵn
→ lương và phúc lợi điền sẵn theo JD đã đăng
```

Sáu click từ lúc mở màn so sánh tới lúc có form offer điền sẵn. Đoạn này làm tốt: không bắt tôi nhớ ứng viên tên gì, không bắt tôi chuyển vòng thủ công, không bắt tôi tra lại khoảng lương đã đăng.

**Bước thừa:** không nhiều. Việc chuyển hồ sơ tới vòng Offer đã được gộp vào nút chọn ứng viên.

**Bước thiếu:** không có nơi nào xác nhận "ứng viên này đã đủ điều kiện offer chưa" ngoài chính bảng so sánh.

### 1.3 Giao diện

Nhất quán tốt: mọi bảng dùng chung kiểu thẻ, chung kiểu lọc, chung kiểu phân trang. Trạng thái rỗng có thông điệp riêng theo ngữ cảnh chứ không phải chữ "No data" mặc định — chi tiết nhỏ nhưng tạo cảm giác được chăm sóc.

Thứ bậc thị giác ổn ở các trang danh sách: hàng thẻ số liệu → bộ lọc → bảng. Bấm vào thẻ số liệu lọc luôn theo trạng thái đó, hành vi này đoán được.

Chi tiết hồ sơ mở sẵn đúng tab của việc đang cần làm theo giai đoạn, kèm nhãn nhỏ trên tab đó. Bảng so sánh cho tick 2–4 người rồi mở dạng cột, tiêu chí xếp hàng ngang và tô đậm người cao điểm nhất từng tiêu chí.

**Chưa ổn:**

- Nhóm menu Tuyển dụng và Offer đều có mục con, nhưng khi thu gọn sidebar thì không còn cách nào biết mục con là gì.

### 1.4 Vấn đề và đề xuất

| # | Vấn đề | Ưu tiên | Giải pháp ngắn |
|---|---|---|---|
| R1 | Không có trường số năm kinh nghiệm | Thấp | Bảng so sánh đang dùng vị trí hiện tại và học vấn thay thế; muốn đúng nghĩa thì thêm trường vào hồ sơ ứng viên |

---

## 2. CANDIDATE — nơi quyết định tỉ lệ chuyển đổi

### 2.1 Trải nghiệm tổng thể

Đây là role có điều hướng gọn nhất và ít gây bối rối nhất. Menu đi đúng tâm lý người tìm việc: Hồ sơ của tôi → Việc làm → Đơn ứng tuyển → Lịch phỏng vấn → Thư mời nhận việc.

Điểm làm tôi hài lòng nhất là màn thư mời nhận việc: offer đang chờ tôi trả lời được đẩy lên đầu danh sách, viền nổi, có đếm ngược "Còn 2 ngày 4 giờ", nút ghi rõ "Xem và phản hồi". Tôi không phải đoán mình cần làm gì. Trước khi bấm chấp nhận còn có bước xác nhận nhắc lại vị trí, mức lương, ngày bắt đầu — đúng mức trang trọng cho một quyết định nghề nghiệp.

### 2.2 Quy trình — điểm gãy lớn nhất nằm ngay đầu phễu

**Gãy 1 — bắt đăng nhập mới được ứng tuyển.** Ở trang việc làm công khai, bấm vào tin rồi bấm ứng tuyển thì nhận được nút "Đăng nhập". Đây là điểm rơi lớn nhất của cả hệ thống về mặt chuyển đổi: người đang hứng thú với tin tuyển dụng bị chặn lại bởi một form đăng ký.

Với một công ty chưa có thương hiệu tuyển dụng mạnh, phần lớn người xem sẽ rời đi ở đây.

**Gãy 2 — không rút được đơn.** Nộp nhầm tin, hoặc đã nhận việc chỗ khác, thì không có cách nào rút. Đơn nằm đó mãi. HR cũng không biết ứng viên đã không còn quan tâm, nên vẫn xếp lịch phỏng vấn.

**Gãy 3 — lịch phỏng vấn chỉ xác nhận được, không đổi được.** Tôi chỉ có đúng một nút "Xác nhận tham gia". Trùng lịch thì phải gọi điện hoặc gửi email ra ngoài hệ thống — và thế là dữ liệu lệch khỏi hệ thống ngay từ vòng đầu.

Cũng không có nút tải file lịch hay thêm vào Google Calendar, dù backend đã có sẵn endpoint xuất `.ics`.

**Gãy 4 — timeline tiến độ đoán sai với quy trình tùy biến.** Màn đơn ứng tuyển vẽ timeline với các mốc ghi cứng như "Đã vượt qua vòng Sơ tuyển CV". Nhưng pipeline là do admin tự cấu hình. Công ty nào bỏ vòng sơ tuyển CV thì timeline hiển thị sai.

### 2.3 Giao diện

Thẻ offer trình bày sạch, số tiền nổi bật đúng mức, ngày tháng theo định dạng Việt Nam. Trạng thái đã được Việt hóa theo góc nhìn ứng viên: `APPROVED` hiện thành "Đang chờ bạn phản hồi" chứ không phải chữ tiếng Anh in hoa. Các trạng thái nội bộ như nháp hay chờ duyệt được gộp thành "Chưa gửi" — đúng, vì ứng viên không cần biết bên trong công ty đang duyệt tới đâu.

**Chưa ổn:**

- Thẻ đơn ứng tuyển hiện tên vòng lấy thẳng từ cấu hình pipeline. "Sàng lọc CV" thì còn hiểu được, nhưng nếu admin đặt tên vòng theo thuật ngữ nội bộ thì ứng viên sẽ đọc phải ngôn ngữ không dành cho mình.
- Thư mời không nói rõ phòng ban và địa điểm làm việc — hai thứ ứng viên cân nhắc trước khi nhận việc.
- Hết hạn phản hồi thì nút bị khóa nhưng không giải thích rõ phải làm gì tiếp theo.

### 2.4 Vấn đề và đề xuất

| # | Vấn đề | Ưu tiên | Giải pháp ngắn |
|---|---|---|---|
| C1 | Bắt đăng nhập mới được ứng tuyển | **Cao** | Cho nộp CV trước, tạo tài khoản sau bằng link xác thực gửi qua email |
| C2 | Không rút được đơn | **Cao** | Thêm trạng thái `WITHDRAWN` và nút rút đơn khi hồ sơ còn ở vòng đầu |
| C3 | Không đề nghị đổi lịch phỏng vấn được | **Cao** | Nút "Đề nghị đổi lịch" kèm ô lý do, đẩy về hàng đợi của HR |
| C4 | Thiếu tải lịch `.ics` / thêm vào Calendar | Trung bình | Lộ endpoint `.ics` đã có ra nút trên màn lịch phỏng vấn của ứng viên |
| C5 | Timeline ghi cứng tên vòng | Trung bình | Dựng timeline từ pipeline thật của tin đăng |
| C6 | Thư mời thiếu phòng ban, địa điểm | Trung bình | Bổ sung hai trường này vào thư mời |
| C7 | Tên vòng dùng ngôn ngữ nội bộ | Thấp | Thêm trường "tên hiển thị cho ứng viên" khi cấu hình pipeline |

---

## 3. HIRING_MANAGER — role bị bỏ quên nhất

### 3.1 Trải nghiệm tổng thể

Menu đã được cắt gọn đúng: chỉ còn Tuyển dụng, Ứng viên phòng ban, Lịch phỏng vấn, Kết quả tuyển dụng. Mục offer được đổi tên thành "Kết quả tuyển dụng" — chi tiết nhỏ nhưng quan trọng, vì nó báo trước đây là chỗ *xem* chứ không phải chỗ *làm*, tránh việc bấm vào rồi thất vọng.

Phân quyền chặt và nhất quán: manager không tạo, không duyệt, không gửi offer — chặn ở cả giao diện lẫn API. Ghi chú nội bộ của HR trên offer cũng được ẩn hẳn. Đây là điểm làm tốt.

### 3.2 Quy trình

Việc của tôi rất đơn giản: phỏng vấn xong thì chấm điểm — và giờ có mục **Đánh giá** riêng trong menu, mở ra là thấy ngay những buổi mình còn nợ, bấm nộp tại chỗ. Không phải lục trong lịch phỏng vấn nữa.

Trang Tổng quan cũng có khối **Việc cần xử lý** đếm sẵn số đánh giá tôi còn nợ và số buổi phỏng vấn sắp tới.

### 3.3 Giao diện

Ổn, vì dùng lại toàn bộ thành phần chung. Form chấm điểm rõ ràng, thang 1–5 thống nhất, có ô nhận xét từng tiêu chí.

Nhãn "Lương đề xuất" đã được đổi thành "Đề xuất mức lương tham khảo" kèm dòng giải thích HR sẽ xem xét trước khi tạo offer — trước đó tôi không rõ con số mình nhập có phải là offer chính thức không.

Màn Đánh giá ghi rõ hạn nộp là 24 giờ sau buổi phỏng vấn, quá hạn thì đổi màu cảnh báo. Hạn này khớp với mốc hệ thống tự gửi thông báo nhắc, nên con số trên màn hình và hành vi của hệ thống nói cùng một thứ.

Trang Tổng quan có dòng nêu rõ số liệu đang trong phạm vi phòng ban — trước đó dữ liệu vốn đã được lọc đúng ở backend nhưng màn hình không nói gì, dễ khiến manager đọc nhầm thành số toàn công ty.

### 3.4 Vấn đề và đề xuất

Không còn vấn đề nào ở mức Trung bình trở lên. Các điểm còn lại là vấn đề chung của mọi role, xem mục 5.

---

## 4. COMPANY_ADMIN

### 4.1 Trải nghiệm tổng thể

Menu được chia hai nhóm rõ ràng: **Vận hành tuyển dụng** và **Quản trị hệ thống**. Phần vận hành giống hệt recruiter nên admin và HR nói cùng một ngôn ngữ khi trao đổi — giải thích được trong một câu: *"Admin bằng HR cộng thêm nhóm quản trị."*

### 4.2 Quy trình

Đủ dùng. Quản lý người dùng, danh mục, pipeline và nhật ký đều có.

**Chưa ổn:** ranh giới giữa admin và HR đã mờ đi sau khi mở quyền quản trị danh mục cho HR. Giờ HR sửa được cả phòng ban, chức danh và mẫu email. Khác biệt thật sự chỉ còn ở quản lý người dùng và nhật ký. Nếu đây là chủ ý thì nên nói rõ trong tài liệu phân quyền, vì nhìn vào menu sẽ khó đoán.

### 4.3 Giao diện

"Danh mục và phòng ban" gom quá nhiều loại cấu hình khác nhau vào một chỗ: pipeline, tiêu chí phỏng vấn, mẫu email, phòng ban, chức danh, kỹ năng. Sửa pipeline là việc ảnh hưởng tới mọi hồ sơ đang chạy, mà giao diện không cảnh báo gì trước khi lưu.

### 4.4 Vấn đề và đề xuất

| # | Vấn đề | Ưu tiên | Giải pháp ngắn |
|---|---|---|---|
| A1 | Sửa pipeline không cảnh báo ảnh hưởng | **Cao** | Trước khi lưu, hiện số hồ sơ đang ở các vòng bị tác động |
| A2 | Ranh giới admin và HR mờ | Trung bình | Ghi rõ trong tài liệu, hoặc thu hẹp quyền HR về nhóm danh mục tuyển dụng |
| A3 | Tổng quan thiếu chỉ số quản trị | Trung bình | Thêm tài khoản chưa kích hoạt, tin quá hạn, sự kiện đồng bộ lỗi |

---

## 5. Vấn đề xuyên suốt mọi role

### 5.1 Không dùng được trên điện thoại

Đây là vấn đề nghiêm trọng nhất về giao diện và không role nào thoát.

Toàn bộ khung ứng dụng nội bộ khóa cứng theo màn hình desktop: `body` đặt `height: 100vh` với `overflow: hidden`, sidebar rộng cố định 240px, các trang dùng bố cục cao 100% chỉ cho bảng bên trong cuộn. Cả dự án chỉ có **một** điểm ngắt responsive ở 768px, và nó chỉ xử lý trang đăng nhập.

Hệ quả thực tế theo từng role:

- **Manager** là người thiệt nhất. Đây đúng là loại việc người ta làm trên điện thoại: vừa phỏng vấn xong, ngồi chờ thang máy, mở máy chấm điểm. Hiện tại không làm được.
- **Ứng viên** xem tin tuyển dụng và phản hồi thư mời chủ yếu trên điện thoại. Phần công khai còn tạm, phần sau đăng nhập thì hỏng bố cục.
- **HR** ít bị ảnh hưởng vì làm việc trên máy tính.

Đề xuất: ưu tiên làm responsive cho **màn ứng viên** và **màn chấm đánh giá** trước, chưa cần đụng tới các bảng quản trị.

### 5.2 Thông báo chưa khép vòng

Có chuông và trang thông báo, có deep-link về đúng màn hình. Nhưng thông báo bắn xong là trôi: không phân biệt "cần hành động" với "để biết", không đánh dấu đã xử lý. Nhắc "manager chưa nộp đánh giá" mà HR đọc lướt qua là mất luôn.

### 5.3 Trạng thái phỏng vấn thiếu so với thực tế

Chỉ có 4 trạng thái: đã lên lịch, đã xác nhận, hoàn thành, đã hủy. Thực tế còn: ứng viên không đến, người phỏng vấn vắng, cần đổi lịch, quá giờ nhưng chưa chấm. Thiếu những trạng thái này thì dữ liệu sẽ bị nhét bừa vào "đã hủy", và báo cáo về sau mất chính xác.

### 5.4 Điểm tốt đáng ghi nhận

- **Đánh giá bị che cho tới khi người phỏng vấn nộp bài của mình.** Đây là quy tắc tinh tế, tránh việc nhận định của người này làm lệch điểm người kia. Không phải ATS nào cũng nghĩ tới.
- **Duyệt offer đồng thời là gửi offer.** Không có bước "gửi" riêng nên không bao giờ xảy ra tình huống offer đã duyệt mà quên gửi.
- **Ghi chú nội bộ tách khỏi ghi chú cho ứng viên.** HR viết thoải mái mà không sợ lộ.
- **Chặn vượt số lượng tuyển ngay khi tạo offer**, và offer bị từ chối thì tự trả lại suất.

---

## 6. Bảng tổng hợp ưu tiên

### Ưu tiên cao — làm trước

| # | Role | Vấn đề | Ảnh hưởng |
|---|---|---|---|
| C1 | Candidate | Bắt đăng nhập mới được ứng tuyển | Mất ứng viên ngay đầu phễu |
| C2 | Candidate | Không rút được đơn | Dữ liệu sai, HR xếp lịch cho người đã rút |
| C3 | Candidate | Không đề nghị đổi lịch được | Trao đổi tràn ra ngoài hệ thống |
| A1 | Admin | Sửa pipeline không cảnh báo | Rủi ro hỏng dữ liệu đang chạy |
| — | Mọi role | Không dùng được trên điện thoại | Chặn hẳn việc chấm đánh giá di động |

### Ưu tiên trung bình

| # | Role | Vấn đề |
|---|---|---|
| C4 | Candidate | Thiếu `.ics` và thêm vào Calendar |
| C5 | Candidate | Timeline ghi cứng tên vòng |
| C6 | Candidate | Thư mời thiếu phòng ban, địa điểm |
| A2 | Admin | Ranh giới admin và HR mờ |
| A3 | Admin | Tổng quan thiếu chỉ số quản trị |
| — | Mọi role | Thông báo chưa phân loại cần hành động |
| — | Mọi role | Trạng thái phỏng vấn thiếu no-show, đổi lịch |

### Ưu tiên thấp

| # | Role | Vấn đề |
|---|---|---|
| R1 | Recruiter | Không có trường số năm kinh nghiệm |
| C7 | Candidate | Tên vòng dùng ngôn ngữ nội bộ |
| — | Mọi role | Sidebar thu gọn che mất mục con |

---

## 7. Kết luận

Hệ thống có **nền nghiệp vụ chắc**. Quy trình từ yêu cầu tuyển dụng tới offer đầy đủ và có quy tắc thật, không phải chỉ là CRUD: phân vai rõ giữa HR và quản lý phòng ban, che đánh giá chống thiên lệch, kiểm soát số lượng tuyển, duyệt là gửi. Đây là phần khó nhất và đã làm được.

Phía vận hành nội bộ đã được vá phần nặng nhất: HR và quản lý phòng ban đều có hàng đợi việc riêng, biết đang chờ ai và còn thiếu đánh giá của ai.

Khoảng cách còn lại dồn về phía ứng viên và thiết bị:

- Đầu phễu bị thắt lại bởi yêu cầu đăng nhập — chỗ này ảnh hưởng trực tiếp tới số hồ sơ thu về.
- Ứng viên không rút được đơn và không đề nghị đổi lịch được, nên phần trao đổi tràn ra ngoài hệ thống.
- Phần sau đăng nhập chỉ dùng được trên máy tính, trong khi hai role hưởng lợi nhiều nhất từ di động lại là quản lý phòng ban và ứng viên.

Nếu chỉ chọn được ba việc tiếp theo: **cho ứng tuyển không cần đăng nhập**, **rút đơn và đề nghị đổi lịch cho ứng viên**, và **làm responsive cho màn ứng viên**. Cả ba đều nằm ở phía ứng viên — nơi quyết định số hồ sơ đầu vào.
