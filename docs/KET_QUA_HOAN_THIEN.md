# Kết quả đợt hoàn thiện ATS (16–17/11/2026)

Theo đề bài `docs/GIAO_VIEC_FABLE.md`, làm trên nhánh `dev`. Nhật ký chi tiết từng bước: `docs/TIEN_DO_HOAN_THIEN.md`.

**Đọc trước:** phần lớn các mục dưới đây đã có mã và qua test tự động, nhưng **chỉ một phần được kiểm lại trên giao diện**
(mục 7 của đề bài chưa làm hết). Cột "Đã kiểm" ghi đúng cách đã kiểm; chỗ nào ghi "chưa xem trên giao diện" thì là chưa xem.

Chú thích cột "Đã kiểm": **T** = test tự động của service / type-check qua · **API** = gọi thử qua gateway ·
**UI** = đã thấy chạy đúng trên trình duyệt (web `localhost:3000` hoặc Expo web) với dữ liệu demo mới.

## 1. Commit

| Commit | Nội dung |
|---|---|
| `efbbd01` | Nhóm A, B và phần đầu nhóm C |
| `7db6190` | Mobile theo kịp backend (đồng ý xử lý dữ liệu, đã rút đơn, hết hạn, cảnh báo CV), 3.10, 3.12, Việt hoá thông báo backend, danh mục IT mặc định |
| `5ee07da` | 3.3, 3.11, 3.14 |
| `da55a16` | ai-service tự nối lại hàng đợi chấm điểm |
| `aea5ffb` | Mục 4: màu thương hiệu, nền phần đầu trang tuyển dụng, nhắc lịch, tìm không dấu |
| `4a21e32` | Sửa số phiên bản migration nhắc lịch |
| `c639726` | Bộ script dữ liệu demo, `CLAUDE.md` gốc, tài khoản demo |
| `3af74d9` | Sửa sau khi kiểm giao diện + báo cáo này (bản đầu) |
| `fd677af` | `init-databases.sql` chỉ còn dòng công ty và quản trị viên đầu tiên |
| `83d26f1`, `9e58ab1` | Kế hoạch phần còn lại (`docs/KE_HOACH_CON_LAI.md`) |
| `b9fe19f` | Phần E: volume Postgres mới khởi động được mọi service (migration V3_1 ở recruitment, candidate) |
| `1882901` | Phần E: canh gác hàng đợi chấm điểm của ai-service không còn treo |
| `76dfa0c` | Phần E: xoá `logs$1.log`, bỏ qua `*.log`; sinh lại kiểu API cho mobile, xoá import thừa |
| `9f1b1fd` | Phần E: nhật ký hệ thống hiện tên tài khoản ứng viên ở cột Đối tượng |
| (commit này) | Cập nhật `TIEN_DO_HOAN_THIEN.md` và báo cáo này sau phần E |

## 2. Mục 3 — lỗi trong `docs/KIEM_TRA_GIAO_DIEN_16-11-2026.md`

### Nhóm A

| Mã | Trạng thái | Đã kiểm | Ghi chú |
|---|---|---|---|
| 1.1 Vào đánh giá từ mọi lối | xong | T | Chưa bấm thử trên giao diện |
| 1.2 Người phỏng vấn là HR xác nhận được | xong | T, UI | Việc "Xác nhận tham gia phỏng vấn" hiện ở *Việc của tôi* của trưởng bộ phận; nút ở danh sách lịch có đủ Xác nhận / Đề xuất giờ khác |
| 1.3 Ứng viên xin dời → đặt lịch mới | xong | T, UI | Chi tiết buổi hiện lý do xin dời và nút "Đặt lịch mới"; chưa bấm tạo lịch mới trên giao diện (script dữ liệu đã gọi API này thành công) |
| 1.4 Mọi chuyên viên tuyển dụng duyệt được yêu cầu | xong | T, UI | Trang yêu cầu ghi "Người duyệt: Chuyên viên tuyển dụng", có đủ 3 nút |
| 1.5 AI không chấm đơn mới | xong | T, thử thật | Lần sửa đầu chưa đủ: ngày 17/11 worker lại mất consumer giữa chừng. Đã thêm canh gác 30 giây tự nối lại (`da55a16`), nhưng 17:50 cùng ngày lỗi tái diễn vì chính canh gác treo khi kênh RabbitMQ hỏng — sửa ở `1882901` (mọi thao tác có giới hạn thời gian). Thử bằng `rabbitmqctl close_connection` hai lần: consumer được đăng ký lại sau 28 và 20 giây. Lần chạy `seed.py` sau đó AI chấm đủ 41 đơn |
| 1.6 AI xếp "Phù hợp" cho hồ sơ trái ngành | xong | T, dữ liệu thật | Hồ sơ kinh doanh nộp Backend: 18,8 điểm, Không phù hợp |
| 1.7 Cảnh báo CV chèn lệnh | xong | T, UI | Thẻ Kanban có nhãn "CV bất thường". Lưu ý: hồ sơ bị gắn cờ vẫn có điểm và xếp loại (66,7 – Không phù hợp), không bị ép về "Chưa phân loại" trong mọi trường hợp |
| 1.8 Xoá dữ liệu cá nhân | xong | T | **Chưa thử trên giao diện.** File CV trên S3 không xoá (theo yêu cầu) |

### Nhóm B

| Mã | Trạng thái | Đã kiểm |
|---|---|---|
| 2.1 Kiểm nội dung file CV | xong | T |
| 2.2 Kiểm nội dung file ảnh, bỏ SVG | xong | T; tải logo/ảnh PNG qua API chạy đúng |
| 2.3 Trưởng bộ phận không tạo được danh mục | xong | T, API (403) |
| 2.4 Quản trị vào Danh mục; mobile chặn Quản trị | xong | UI (menu Danh mục có ở Quản trị; mobile báo "chỉ dùng trên web") |
| 2.5 Người phỏng vấn phải đang hoạt động | xong | T |
| 2.6 Đồng ý xử lý dữ liệu | xong | T, API |
| 2.7 Thân lỗi thống nhất, đăng nhập sai trả 401 | xong | T, API |

### Nhóm C

| Mã | Trạng thái | Đã kiểm | Ghi chú |
|---|---|---|---|
| 3.1 Chặn sang Thư mời khi chưa có đánh giá | xong | T | Script dữ liệu đi đúng thứ tự này |
| 3.2 Trạng thái "Đã rút đơn" | xong | T, dữ liệu thật | 2 đơn đã rút trong dữ liệu demo |
| 3.3 Sửa tin đang tuyển | xong | T, UI | Form khoá các ô không được sửa, còn một nút "Lưu thay đổi". Chưa bấm lưu trên giao diện |
| 3.4, 3.5, 3.6, 3.9, 3.13, 3.16, 3.18 | xong | T | Chưa xem lại từng mục trên giao diện |
| 3.7 Nhận việc thì đóng đơn khác | xong | T, UI | Ứng viên Đinh Thị Thu Trang: đơn Frontend "Đã tuyển", đơn Mobile "Ngừng xử lý" |
| 3.8 Lịch hết hạn | xong | T | |
| 3.10 Thêm ứng viên rồi gắn vào tin | xong | T | Chưa xem trên giao diện |
| 3.11 Nhật ký còn thiếu + lịch sử | xong | T, UI | Khối "Lịch sử" của yêu cầu và tab "Hoạt động" của hồ sơ hiện đủ bước; trang Nhật ký hiện tên người |
| 3.12 Quý trên Tổng quan | xong | T | Trang Tổng quan mở đúng; chưa thử đổi quý |
| 3.14 Đổi vai trò / phòng ban | xong | T | **Chưa thử trên giao diện** |
| 3.15 Email bất đồng bộ | xong | T | |
| 3.17 Thông báo có tên vị trí | xong | T | |
| 3.19 Kéo thẻ vào dải từ chối | không phải lỗi | UI | Kéo bằng chuột mở đúng hộp thoại lý do từ chối |

### Nhóm D (mục 4 của file kiểm tra)

Đã làm: Việt hoá thông báo backend (4.1); tìm không dấu (4.2); dữ liệu demo sạch (4.3); thông báo nổi không che ô tìm kiếm;
hạn phản hồi thư mời mặc định 17:00; danh mục loại hợp đồng rút gọn; mobile hiện tên doanh nghiệp thay cho "ATS";
nút ở *Việc của tôi* đổi thành "Xem và xác nhận" và mở thẳng buổi phỏng vấn.

**Chưa làm / chưa rà:** các mục nhỏ còn lại của 4.4 (lưới giờ 60 phút, menu sắp xếp bị cắt chữ, tiêu đề `/offers` của trưởng bộ
phận, ghi chú "không bắt buộc" ở Ngày sinh / Giới tính, giới hạn dung lượng file không thống nhất, hai mục mobile về tiêu đề
"Xác nhận phỏng vấn" và dòng "Hình thức").

## 3. Mục 4 — chức năng mới

| Việc | Trạng thái | Đã kiểm | Ghi chú |
|---|---|---|---|
| 4.1 Màu thương hiệu | xong | T, UI | Web: chọn màu là cả giao diện đổi ngay, rời trang không lưu thì trả lại màu cũ; có báo tỉ lệ tương phản. Trang công khai và mobile (Expo web) nhận màu đã lưu. Chưa thử trường hợp chọn màu quá nhạt trên giao diện |
| 4.2 Nền phần đầu trang tuyển dụng | xong | T, UI một phần | Thấy bộ chọn trong trình soạn; chưa thử đổi sang "Một màu / Chuyển màu" rồi xuất bản |
| 4.3 Email bất đồng bộ | xong | T | |
| 4.4 Nhắc lịch 24h / 1h | xong | T | **Chưa thấy một lời nhắc thật nào được phát** (cần chờ tới mốc giờ). Miền `example.com` bị bỏ qua nên dữ liệu demo không gửi mail |
| 4.5 Tìm không dấu | xong | T, UI | "lap trinh backend" ra đúng tin ở trang việc làm công khai. Ctrl+K và tìm ở backend chưa thử trên giao diện |

## 4. Mục 5 — tinh chỉnh giao diện

**Chưa làm thành một đợt riêng.** Những thay đổi so với `docs/UI` đã có:

- Màu chủ đạo không còn cố định `#0A59F7` mà theo màu Quản trị chọn (yêu cầu 4.1). Màu ngữ nghĩa và dải màu AI giữ nguyên.
- Phần đầu trang tuyển dụng: khi không có ảnh bìa thì dùng ảnh đời sống đầu tiên, không có ảnh thì chỉ còn chữ (trước đây là ô màu giả ảnh).
- Thông báo nổi hạ xuống dưới thanh trên cùng.
- Nhãn nhật ký viết đủ "phỏng vấn" thay cho "PV".

Việc cắt câu chữ dài, bớt ô biểu tượng trang trí, bớt thẻ lồng thẻ **chưa làm**.

## 5. Mục 6 — dữ liệu demo

Xong. `scripts/demo-data/seed.py` chạy trọn một lần ngày 17/11, sau nhiều lần dừng giữa chừng (nguyên nhân từng lần ghi ở
`TIEN_DO_HOAN_THIEN.md`). Kết quả: 9 tài khoản nội bộ, 10 yêu cầu tuyển dụng, 6 tin (4 đang tuyển, 1 tạm dừng, 1 đã đóng),
33 ứng viên có CV PDF, 41 đơn (AI chấm đủ 41: 19 Phù hợp, 22 Không phù hợp), 20 buổi phỏng vấn, 7 thư mời
(nháp, đã gửi, hết hạn, từ chối, 3 đã nhận), mốc thời gian từ 06/09 đến 16/11/2026.

Sau lần chạy đó script được sửa thêm hai chỗ (lần đăng nhập gần nhất của nhân viên, giờ hẹn trong dòng nhật ký đặt lịch).
**Bản script mới đã chạy lại trọn vẹn** lúc 18:58–19:17 ngày 17/11 (phần E): cùng số đơn, buổi, thư mời, cùng mã số như bảng
"Dữ liệu demo hiện có" trong `docs/KE_HOACH_CON_LAI.md`; AI chấm đủ 41 (19 Phù hợp, 22 Không phù hợp); "Đăng nhập gần nhất"
của nhân viên trong 2 ngày qua; nhật ký đặt lịch của buổi tháng 9–10 ghi đúng giờ hẹn quá khứ. Lưu ý khi đọc dòng tổng kết
của script: buổi 8 (đã qua giờ, còn thiếu phiếu) chỉ sang "Chờ đánh giá" ở lượt chạy kế tiếp của job 5 phút, nên tổng kết in
CANDIDATE_CONFIRMED 3 / EVALUATION_PENDING 0, vài phút sau là 2 / 1. Chuông của `tran.ha` còn 32 thông báo chưa đọc (C-9 chưa làm).

`docker/postgres-init/init-databases.sql` đã bỏ seed cũ (công ty "TechCorp Vietnam", 3 tài khoản `@test.net`, phòng "Human Resources"): chỉ còn dòng công ty và quản trị viên đầu tiên.
File này chỉ chạy khi tạo volume Postgres mới; với DB đang có thì script reset đã thay thế.
**Đã thử với volume mới** (container tạm, không đụng `ats_pgdata`): file chạy không lỗi, đăng nhập được bằng `le.quan@example.com` /
`Password123!`. Khởi động 8 service Java trên DB đó thì recruitment-service và candidate-service không lên (migration `ALTER`
bảng mà Hibernate chưa tạo) — đã sửa ở `b9fe19f`; sau khi sửa cả 8 lên, masterdata tự nạp danh mục IT, schema 6 DB trùng hệt
DB đang dùng. Khác biệt còn lại (không chặn chạy): DB mới thiếu một index sắp xếp theo điểm AI của bảng `application`, và có
thêm hai bảng không dùng của ai-service (`ai_feedback`, `cv_document_chunks`).

## 6. Mục 7 — kiểm tra giao diện

Đã xem trên web: Quản trị (Tổng quan, Người dùng, Thông tin doanh nghiệp, Trang tuyển dụng, Nhật ký), Chuyên viên tuyển dụng
(Việc của tôi, danh sách tin, Kanban một tin, hồ sơ ứng viên, sửa tin, yêu cầu chờ duyệt, lịch phỏng vấn, chi tiết buổi),
Trưởng bộ phận (Việc của tôi, Kết quả tuyển dụng, bị chặn ở tin phòng khác), Ứng viên (Tổng quan, Thư mời, Đơn ứng tuyển,
tìm việc). Trên mobile (Expo web): đăng nhập, chặn Quản trị, ứng viên (Việc làm, Lịch, Hồ sơ), trang chủ Chuyên viên tuyển dụng.

**Chưa kiểm:** đăng ký / OTP / quên mật khẩu, sửa hồ sơ và tải CV, ứng tuyển từ giao diện, rút đơn, đồng ý / xin dời lịch,
nhận / từ chối thư mời và PDF, xoá dữ liệu, soạn và gửi thư mời, lên lịch từ giao diện, viết đánh giá, so sánh ứng viên,
AI đọc CV, xuất Excel, Danh mục, Ctrl+K, thông báo, cài đặt, mời / khoá người dùng, đổi vai trò, phân quyền qua URL,
phần lớn màn mobile của nhân viên. Không thấy lỗi ở các màn đã mở, nhưng console trình duyệt chưa được đọc có hệ thống.

Lỗi mới phát hiện trong lúc làm và đã sửa:

- ai-service mất consumer RabbitMQ giữa chừng (xem 1.5).
- Tạo thư mời có hạn phản hồi sau ngày đi làm trả lỗi 500 → giờ báo "Hạn phản hồi phải trước ngày bắt đầu làm việc".
- Gateway chưa mở đường dẫn công khai `/api/auth/public/theme`.
- `scripts/dev/svc.sh`: service khởi động lỗi để lại tiến trình treo giữ file log, lần khởi động sau không lên.
- Nút "Xác nhận" ở *Việc của tôi* của trưởng bộ phận chỉ mở danh sách lịch.
- (Phần E) Volume Postgres mới: recruitment-service và candidate-service không khởi động được → migration `V3_1` (`b9fe19f`).
- (Phần E) Canh gác hàng đợi chấm điểm của ai-service treo khi kênh RabbitMQ hỏng → `1882901`.
- (Phần E) Nhật ký hệ thống: dòng của tài khoản ứng viên không có tên ở cột Đối tượng → `9f1b1fd`.
- (Phần E) Lint mobile: import `PillButton` thừa ở màn đơn ứng tuyển của ứng viên → `76dfa0c`.

Kiểm chốt phần E (17/11, sau khi chạy lại `seed.py`), đã thấy chạy đúng trên web: `/careers/home` chưa đăng nhập, `/dashboard`
của Quản trị, `/audit-logs`, `/my-work` của `tran.ha`; console không lỗi. Chi tiết từng việc E-1 … E-10 ở
`docs/TIEN_DO_HOAN_THIEN.md` mục "Phần E".

## 7. Còn lại

1. Kiểm nốt mục 7 (danh sách "Chưa kiểm" ở trên), cả web và mobile.
2. Mục 5 (tinh chỉnh câu chữ và bố cục).
3. Các mục nhỏ còn lại của nhóm D.
4. Vài chỗ chữ bị cắt đã thấy nhưng chưa sửa: tên phòng ban và tên người ở bảng "Theo phòng ban" của Tổng quan, tên ứng viên
   trên thẻ Kanban; liên kết "Mời" ở khối "Cần chú ý" tràn ra ngoài thẻ (B-1, B-2, B-4 — vẫn thấy khi kiểm chốt phần E).
5. Nút "Từ chối" trong hộp thoại từ chối hồ sơ chưa dùng màu đỏ như quy ước nút không hoàn tác.
6. Chuông `tran.ha` 32 thông báo chưa đọc sau khi tạo dữ liệu (C-9: đánh dấu đã đọc thông báo cũ hơn 3 ngày).
7. `ats_pgdata` báo "collation version mismatch" (DB tạo với glibc 2.41, image `pgvector/pgvector:pg16` hiện tại 2.36). Chưa
   gây lỗi; sửa phải `REINDEX` từng DB rồi `ALTER DATABASE … REFRESH COLLATION VERSION` trên DB đang dùng — cần người dùng đồng ý.

Thứ tự và chi tiết từng việc còn lại: `docs/KE_HOACH_CON_LAI.md` (phần E đã xong).

## 8. Quyết định kỹ thuật

- **Ngưỡng AI:** T = 62,5, δ = 5 → Phù hợp khi ≥ 67,5, Không phù hợp khi < 57,5. Thiếu yêu cầu bắt buộc của tin thì xếp Không phù
  hợp dù điểm cao (ví dụ 81 điểm nhưng thiếu CI/CD) — đây là hành vi sẵn có, không đổi.
- **Ẩn danh hoá:** sự kiện `candidate.data_deleted`; candidate-service ẩn danh và gỡ liên kết CV, auth-service khoá tài khoản,
  application / interview / offer đổi tên hiển thị, ai-service xoá bản trích xuất. Dòng dữ liệu giữ lại để thống kê không đổi.
- **Màu thương hiệu:** web dùng biến CSS `--ats-brand*`, Ant Design dựng chủ đề từ bảng màu; mobile đọc đồng bộ màu đã lưu lúc
  khởi động nên màu mới có hiệu lực từ lần mở app sau. Màu dưới 4,5:1 so với chữ trắng tự làm đậm, backend từ chối nếu vẫn không đạt.
- **Nhắc lịch:** bỏ hàng đợi trễ (tin có thời gian chờ khác nhau chặn nhau), thay bằng job mỗi phút ở interview-service và hai
  cột đánh dấu đã nhắc.
- **Tìm không dấu ở backend:** dùng hàm `translate` của Postgres, không cần extension `unaccent`.
- **Dữ liệu demo:** tạo bằng API thật ở "hiện tại" rồi dời mọi mốc thời gian sinh ra trong lúc chạy về 3 tháng gần đây; các chỗ
  chỉnh DB có kiểm soát liệt kê ở đầu `seed.py`.
- **Migration cho DB mới (phần E):** không sửa migration đã chạy (đổi checksum thì mọi DB hiện có báo "checksum mismatch" và
  service không khởi động). Thêm `V3_1` tạo bảng tối thiểu nếu chưa có, bật `spring.flyway.out-of-order` ở recruitment và
  candidate để DB đang ở V4–V6 vẫn nhận V3_1 (không làm gì vì bảng đã có). Migration mới về sau phải tự chạy được trên DB trống
  (guard `to_regclass` như interview V2 / application V4, hoặc tạo bảng nếu chưa có như recruitment V3).
- **Canh gác RabbitMQ của ai-service:** aio-pika tự nối lại kết nối nhưng không đăng ký lại consumer, nên vẫn cần canh gác; mọi
  thao tác trong canh gác có giới hạn thời gian (kiểm 10 giây, nối lại 30 giây) vì kênh hỏng có thể chờ vô hạn.
