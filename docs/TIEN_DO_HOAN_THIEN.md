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
| 3.3, 3.11, 3.14, 3.19 | xem bảng "Cập nhật 17/11" bên dưới | | |

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

## Cập nhật 17/11 — xong phần mã của nhóm C

| Mã | Trạng thái | Đã kiểm bằng gì | Ghi chú |
|---|---|---|---|
| 3.3 | code xong | test recruitment-service, tsc web | Tin Đang tuyển / Tạm dừng sửa tại chỗ: chỉ mô tả, yêu cầu, quyền lợi, hạn nộp, lương hiển thị (trong khung đã duyệt), nhãn Tuyển gấp. Mỗi lần sửa ghi nhật ký `POSTING_UPDATED` nêu phần nào đổi. Form khoá các ô còn lại, chỉ còn nút "Lưu thay đổi". Tin Chờ đăng phải bấm "Sửa lại" trước |
| 3.11 | code xong | test auth / interview / masterdata / notification, tsc web | Thêm nhật ký: sửa thông tin doanh nghiệp, xuất bản trang tuyển dụng, đổi / đặt lại mật khẩu, đổi vai trò, đặt / đổi / huỷ lịch, vắng mặt, nộp đánh giá, mọi thao tác ghi trên danh mục (một interceptor ở masterdata), đổi trạng thái tin. API mới `GET /notification/audit-logs/resource` cho nhân viên nội bộ; khối "Lịch sử" của yêu cầu tuyển dụng và tab "Hoạt động" của hồ sơ đọc từ đó. Trang Nhật ký hiện tên người thay cho "Người dùng #14" |
| 3.14 | code xong | test auth-service, tsc web | `PATCH /auth/users/{id}/role` (chỉ Quản trị; không tự đổi mình; không đổi qua lại với ứng viên; thu hồi phiên cũ). Trang chi tiết người dùng có nút "Đổi vai trò / phòng ban", nhắc số việc đang phụ trách |
| 3.19 | chưa kiểm | — | Mã kéo thả vào dải từ chối nhìn đúng; cần thử bằng chuột ở mục 7 |

Phụ: khoá / vô hiệu hoá tài khoản thì thu hồi luôn phiên đăng nhập; `scripts/dev/svc.sh` chờ 3 giây sau khi dừng service
(trước đó khởi động lại nhiều service một lúc có cái không lên vì file log còn bị giữ).

## Mục 6 — đang làm

Bộ script ở `scripts/demo-data/` (chạy bằng Python của ai-service):

- `reset_db.py` — xoá mọi bảng của mọi DB `ats_*` (giữ `flyway_schema_history` và bảng `role`), tạo lại dòng công ty +
  quản trị viên đầu tiên, khởi động lại masterdata-service để nạp danh mục IT mặc định.
- `seed.py` — reset rồi tạo lại dữ liệu qua API thật (công ty Mộc Lam Software, 9 tài khoản nội bộ, 10 yêu cầu tuyển dụng,
  6 tin, 33 ứng viên có CV PDF sinh bằng PyMuPDF, 41 đơn, ~20 buổi phỏng vấn, 7 thư mời, 2 CV chèn lệnh).
  Các chỗ chỉnh DB có kiểm soát được liệt kê ở đầu file.
- `jobs.py`, `people.py` (dữ liệu), `cv_pdf.py`, `images.py` (logo chữ + 3 áp phích), `lib.py` (API, psql, đồng hồ giả lập).

**Chưa chạy lần nào** — bước kế tiếp là chạy `seed.py`, sửa lỗi phát sinh, rồi kiểm số liệu.

## Việc dở dang — đọc trước khi "làm tiếp"

1. Chạy `ai-service/.venv/Scripts/python.exe scripts/demo-data/seed.py` (mất 30–45 phút vì AI chấm thật từng đơn).
2. Mục 7: kiểm trên giao diện web + mobile — **chưa kiểm mục nào**, kể cả các mục nhóm A / B / C ở trên.
3. Mục 4 (màu thương hiệu, hero, nhắc lịch qua email, tìm không dấu), mục 5, nhóm D, mục 9.

## Công cụ đã thêm

- `scripts/dev/svc.sh` + `scripts/dev/start-service.ps1`: khởi động lại service ở chế độ nền, log vào `logs/<service>.log`.
