# Tiến độ hoàn thiện ATS (theo docs/GIAO_VIEC_FABLE.md)

Bắt đầu: 16/11/2026, nhánh `dev`. Thứ tự: mục 3 (A → B → C) → mục 6 → mục 7 → mục 4 → mục 5 → mục 3 nhóm D → mục 9.

**Chú thích trạng thái:** `code xong` = đã viết mã; `test` = đã chạy test tự động của service / type-check;
`UI` = đã kiểm lại trên giao diện. Chưa mục nào được kiểm trên giao diện (xem "Việc dở dang" cuối file).

## Nhóm A — nghiêm trọng

| Mã | Trạng thái | Đã kiểm bằng gì | Ghi chú |
|---|---|---|---|
| 1.1 | code xong | tsc web | `MyWorkPage` thêm `?interviewId=`; `EvaluationFormPage` tự chuyển tới buổi của mình hoặc báo "không có buổi chờ đánh giá" khi không phải HR |
| 1.2 | code xong | test interview-service (trước nhóm B), tsc web | HR tạo lịch mà chính mình phỏng vấn → `HM_CONFIRMED` luôn; nút Xác nhận hiện cho mọi người phỏng vấn; thêm việc "Xác nhận tham gia" vào *Việc của tôi* và tab *Cần xử lý* của HR |
| 1.3 | code xong | như trên | `PUT /interviews/{id}` nhận `CANDIDATE_DECLINED`; `POST /interviews` nhận `replaceInterviewId` (đóng buổi cũ); form *Đặt lịch mới* điền sẵn + hiện lý do |
| 1.4 | code xong | test recruitment-service, tsc web | `approver_id` nullable (Flyway V6), mọi RECRUITER duyệt được, lưu người thực sự duyệt; thông báo gửi mọi RECRUITER |
| 1.5 | code xong | — | Nguyên nhân: worker của ai-service không còn nghe hàng đợi (đơn #26 kẹt trong `ai.application-created.queue`, 0 consumer). Sửa: ai-service tự thử kết nối lại RabbitMQ; application-service phát `application.created` sau khi commit |
| 1.6 | code xong | pytest `test_scoring_aggregate.py` + 3 file scoring (288 pass) | `relevance_gate`: Kỹ năng / Kinh nghiệm liên quan (và Lĩnh vực nếu JD bắt buộc) ≤ mức 1, hoặc nhận xét AI kết luận "không phù hợp" → hạ Phù hợp về Chưa phân loại. Ngưỡng: T = 62,5, δ = 5 → Phù hợp khi ≥ 67,5, Không phù hợp khi < 57,5 |
| 1.7 | code xong | test application-service (trước nhóm B), tsc web | Cờ `injection_detected` trong kết quả chấm + cột `ai_injection_detected`; web: banner đỏ ở tab Điểm AI, badge "CV bất thường" ở danh sách và Kanban. **Mobile chưa làm** |
| 1.8 | code xong | chưa chạy test | Sự kiện `candidate.data_deleted`: candidate-service ẩn danh hoá + gỡ liên kết CV; auth-service khoá tài khoản + thu hồi refresh token; application / interview / offer-service đổi tên; ai-service xoá bản trích xuất. File S3 chưa xoá |

## Nhóm B — bảo mật & phân quyền

| Mã | Trạng thái | Đã kiểm bằng gì | Ghi chú |
|---|---|---|---|
| 2.1 | code xong | test candidate-service lỗi 1 ca do dữ liệu giả, đã sửa test, **chưa chạy lại** | Magic bytes PDF / DOCX / DOC ở mọi đường tải CV |
| 2.2 | code xong | chưa chạy test | Bỏ SVG, kiểm chữ ký PNG / JPEG / WEBP; thống nhất câu chữ |
| 2.3 | code xong | chưa chạy test | `POST /masterdata/skills`, `/job-titles` → `requireHr`; web ẩn "thêm nhanh" với trưởng bộ phận |
| 2.4 | code xong | tsc web | Web: Admin vào `/masterdata`, thêm menu, sửa ma trận quyền. Mobile: Admin bị chặn ở màn đăng nhập ("chỉ dùng trên web") |
| 2.5 | code xong | chưa chạy test | Danh bạ nội bộ trả `status`; interview-service và web chỉ nhận người `ACTIVE` |
| 2.6 | code xong | test auth lỗi 3 ca (đã sửa test, **chưa chạy lại**) | `consentAccepted` bắt buộc khi đăng ký và khi ứng viên tự nộp đơn; lưu `consent_at`. **Mobile chưa thêm checkbox** → hiện mobile đăng ký / ứng tuyển sẽ bị 400 cho tới khi làm xong |
| 2.7 | code xong | chưa chạy test | `GlobalExceptionHandler` chung cho 9 service: 400 / 401 / 403 / 404 / 413 / 500, không lộ chi tiết kỹ thuật; đăng nhập sai → 401; web + mobile không refresh token cho các endpoint `/auth/*` |

## Nhóm C — nghiệp vụ

| Mã | Trạng thái | Đã kiểm bằng gì | Ghi chú |
|---|---|---|---|
| 3.1 | code xong | test application-service (trước nhóm B) | Backend chặn chuyển sang Thư mời khi chưa có đánh giá đã nộp; web khoá nút kèm lý do |
| 3.2 | code xong | như trên | `closed_reason` + loại giai đoạn ảo `WITHDRAWN`; web có nhãn và tab "Đã rút đơn". **Mobile chưa làm** |
| 3.4 | code xong | test recruitment-service, tsc web | Kiểm khoảng lương ở form và backend |
| 3.5 | code xong (qua 2.7) | — | Thân lỗi có cả `message` và `error` nên toast hiện câu của backend |
| 3.6 | code xong | chưa type-check lại | `Promise.allSettled`, cột ứng viên hiện "—" khi không đếm được |
| 3.7 | code xong | test application-service (trước nhóm B) | Nhận thư mời → đóng đơn khác ("Ngừng xử lý – đã nhận việc"), chặn nộp đơn mới; đã rút thì báo rõ lý do. Trang chi tiết việc (web / mobile) chưa hiện sẵn lý do trước khi bấm nộp |
| 3.8 | code xong | test interview-service (trước nhóm B) | Trạng thái `EXPIRED`, job 5 phút/lần; chặn đánh giá / vắng mặt trước giờ. **Mobile chưa có nhãn EXPIRED** (cần `gen:types`) |
| 3.9 | code xong | chưa type-check lại | Web ứng viên: link họp / địa chỉ văn phòng, nhóm "Đã huỷ" riêng. Mobile chưa làm |
| 3.13 | code xong | chưa type-check lại | Lọc theo phòng của người dùng |
| 3.15 | code xong | chưa chạy test | Mail của auth-service `@Async`; bỏ qua địa chỉ thử nghiệm (example.com, .invalid…) |
| 3.16 | code xong | chưa type-check lại | Chặn bấm đúp bằng ref |
| 3.17 | code xong | test notification-service | Thông báo có tên vị trí; bỏ "Offer #", "application #" |
| 3.18 | code xong | chưa type-check lại | Sự kiện `ats:notifications-changed` |
| 3.3, 3.10, 3.11 (phần còn lại), 3.12, 3.14, 3.19 | **chưa làm** | | |

## Chưa bắt đầu

Mục 4 (màu thương hiệu, hero, nhắc lịch qua email, tìm không dấu — riêng email bất đồng bộ của auth đã xong),
mục 5, mục 6 (reset + dữ liệu demo), mục 7 (kiểm tra giao diện), nhóm D, mục 9 (bàn giao).

## Cập nhật 16/11 (tối) — sau khi chạy lại test

- Test `mvnw.cmd -q test` **pass ở cả 9 service** (auth, candidate, application, interview, offer, masterdata, recruitment,
  notification, dashboard); 288 test chấm điểm của ai-service pass; `tsc` web sạch; mobile `typecheck` + `lint` sạch (0 lỗi).
- Cả 11 service đã khởi động lại bằng mã mới (`scripts/dev/svc.sh`).
- Đã kiểm qua API (curl qua gateway): đăng nhập sai → 401; JSON hỏng → 400 "Dữ liệu gửi lên không hợp lệ"; đường dẫn lạ → 404;
  thư mời không tồn tại → 404; đăng ký thiếu đồng ý → 400; trưởng bộ phận tạo kỹ năng / chức danh → 403; danh bạ có `status`.
- 1.5 đã xác nhận: ai-service bản mới có consumer trên `ai.application-created.queue`, đơn #26 kẹt trong hàng đợi đã được nhận.
- Mobile đã làm xong: ô đồng ý ở đăng ký + ứng tuyển (2.6), nhãn "Hết hạn" (3.8), "Đã rút đơn" (3.2), cảnh báo CV bất thường (1.7),
  người phỏng vấn là HR xác nhận được giờ (1.2), chặn Admin (2.4). Đã `gen:types`.
- Thêm ở web: 3.10 (tạo ứng viên xong mở luôn bước thêm vào tin), 3.12 (quý nằm trên URL `?quarter=`, bảng phòng ban theo quý,
  một công thức "thời gian tuyển" = từ ứng tuyển đến nhận việc cho mọi màn).
- 4.1: Việt hoá các câu thông báo còn tiếng Anh / không dấu ở backend (auth, candidate, offer…).
- Danh mục mặc định của masterdata (`DefaultDataSeeder`) chuyển sang lĩnh vực IT (phòng ban, chức danh, cấp bậc, kỹ năng,
  nguồn, lý do từ chối, tiêu chí đánh giá, 3 văn phòng) — có hiệu lực với DB mới / sau khi reset.

**Còn lại của nhóm C:** 3.3 (sửa tin đang tuyển), 3.11 (audit còn thiếu + hiển thị lịch sử), 3.14 (đổi vai trò / phòng ban),
3.19 (kéo thả vào ô từ chối — cần thử bằng chuột). **Chưa kiểm mục nào trên giao diện.**

## Việc dở dang — đọc trước khi "làm tiếp"

1. **Chạy lại test 9 service** (`mvnw.cmd -q test` từng service). Lần chạy tối 16/11 bị dừng giữa chừng vì máy hết RAM
   (30 tiến trình java, phần lớn là tiến trình Maven mồ côi của các cửa sổ cũ). auth và candidate đã lỗi 4 ca do test cũ,
   đã sửa test nhưng chưa chạy lại; 7 service còn lại chưa chạy sau khi đổi `GlobalExceptionHandler`.
2. **Khởi động lại service** bằng `scripts/dev/svc.sh restart <tên>` (log ở `logs/`). Các service đang chạy mang mã của
   khoảng 17:20 ngày 16/11 (trước nhóm B) — riêng recruitment / notification / offer / masterdata / ai mới hơn một chút.
3. **Mobile**: chạy `npm run gen:types` sau khi backend lên bản mới, rồi làm: checkbox đồng ý ở đăng ký + ứng tuyển (2.6),
   nhãn `EXPIRED` (3.8), "Đã rút đơn" (3.2), banner CV bất thường (1.7), link họp / địa điểm (3.9).
4. Chưa kiểm bất kỳ mục nào trên giao diện.
5. Đơn #26 còn nằm trong hàng đợi RabbitMQ; ai-service bản mới sẽ tự nhận và chấm khi khởi động.

## Công cụ đã thêm

- `scripts/dev/svc.sh` + `scripts/dev/start-service.ps1`: khởi động lại service ở chế độ nền, log vào `logs/<service>.log`.
