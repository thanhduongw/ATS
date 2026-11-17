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

## Mục 4 — code xong (17/11), chưa kiểm trên giao diện

| Việc | Trạng thái | Đã kiểm bằng gì | Ghi chú |
|---|---|---|---|
| 4.1 Màu thương hiệu | code xong | test auth-service, tsc web, typecheck + lint mobile; `GET /api/auth/public/theme` trả 200 qua gateway | Web: `COLORS.primary…` trỏ tới biến CSS `--ats-brand*` (`frontend/src/app/brand.ts`), Ant Design dựng chủ đề từ bảng màu; trang Thông tin doanh nghiệp có bảng chọn màu, xem trước trực tiếp, báo tỉ lệ tương phản; màu nhạt hơn 4,5:1 tự làm đậm, backend từ chối màu không đạt. Mobile: đọc đồng bộ màu đã lưu lúc khởi động, màu mới có hiệu lực từ lần mở app sau |
| 4.2 Nền phần đầu trang tuyển dụng | code xong | tsc web | Chọn "Màu thương hiệu / Một màu / Chuyển màu" trong trình soạn trang tuyển dụng; không có ảnh bìa thì dùng ảnh đời sống, không có ảnh nào thì chỉ còn chữ |
| 4.3 Email bất đồng bộ | code xong | test auth, notification | auth-service (đợt trước) và notification-service gửi mail ở luồng nền; bỏ qua địa chỉ sai dạng và miền thử nghiệm |
| 4.4 Nhắc lịch phỏng vấn | code xong | test interview, notification | Job mỗi phút ở interview-service, hai cột `reminder_24h_sent_at` / `reminder_1h_sent_at` (migration V12) chống nhắc trùng, đổi giờ thì nhắc lại; notification-service gửi thông báo + email cho người phỏng vấn và ứng viên. Bỏ cơ chế hàng đợi trễ cũ (tin TTL khác nhau chặn nhau) |
| 4.5 Tìm không dấu | code xong | test recruitment / application / candidate, tsc web | Web: `matchesKeyword` cho Ctrl+K, các danh sách, danh mục, việc làm công khai. Backend: `TextSearch.fold` (hàm `translate` của Postgres, không cần extension) |

Kèm theo: ai-service tự kiểm tra consumer của hàng đợi chấm điểm mỗi 30 giây và nối lại (lỗi 1.5 tái diễn ngày 17/11:
kết nối RabbitMQ rớt, thư viện không đăng ký lại consumer); hạn phản hồi thư mời mặc định 17:00; thông báo nổi nằm dưới thanh trên cùng.

## Mục 6 — script đã viết, đang chạy

Bộ script ở `scripts/demo-data/` (chạy bằng Python của ai-service; cách dùng ở `CLAUDE.md` gốc):
`reset_db.py`, `seed.py`, `jobs.py`, `people.py`, `cv_pdf.py`, `images.py`, `lib.py`.

Các lần chạy 17/11: (1) hỏng do script gọi nhầm bash của WSL và đọc sai trường trả về; (2) máy khởi động lại, Docker tắt;
(3) ai-service rớt consumer + access token hết hạn giữa chừng; (4) interview-service không lên vì migration trùng số;
(5) bị dừng vì máy thiếu RAM. Mỗi nguyên nhân đã sửa. Lần (4) đã tạo đủ 41 đơn và AI chấm xong cả 41.
Sau đó: (6) tạo thư mời lỗi 500 vì DB bắt hạn phản hồi trước ngày đi làm, và trigger khoá sửa thư đã niêm phong chặn bước
dời thời gian. **Lần (7) chạy trọn tới cuối, không lỗi** (13:09–13:47 ngày 17/11): 41 đơn, 20 buổi phỏng vấn, 7 thư mời.
**Lần (8) — bản script mới nhất, chạy trọn** (18:58–19:17 ngày 17/11, phần E bên dưới).

## Mục 7 — đã kiểm một phần (17/11)

Đã mở trên web bằng 4 vai trò và trên Expo web (đăng nhập, ứng viên, trang chủ chuyên viên tuyển dụng); danh sách màn đã xem,
chưa xem và lỗi mới sửa ở `docs/KET_QUA_HOAN_THIEN.md` mục 6. 3.19 (kéo thả từ chối) chạy đúng, không phải lỗi.

## Mục 9 — đã viết

`docs/KET_QUA_HOAN_THIEN.md`, `CLAUDE.md` gốc, `frontend/docs/TEST_ACCOUNTS.md`, bổ sung `mobile/CLAUDE.md`.

## Phần E của `docs/KE_HOACH_CON_LAI.md` — chốt (17/11, 18:30–19:30)

Làm trước các phần khác theo yêu cầu người dùng. Commit: `b9fe19f`, `1882901`, `76dfa0c`, `9f1b1fd` (đã push `origin/dev`).

| Mã | Kết quả | Đã kiểm bằng gì |
|---|---|---|
| E-1 | Đạt | `mvnw.cmd -q test` lần lượt 9 service: cả 9 mã thoát 0, **153 test, 0 lỗi** (auth 52, masterdata 6, recruitment 15, candidate 10, application 37, interview 7, offer 23, notification 2, dashboard 1 — đếm từ `target/surefire-reports`); recruitment + candidate chạy lại sau khi sửa migration, vẫn qua. `npx tsc -b --noEmit` web sạch (chạy lại sau sửa nhật ký, sạch). Mobile `typecheck` sạch; `lint` 0 lỗi, có 1 cảnh báo mới (`PillButton` import thừa ở `app/(candidate)/applications/index.tsx`) → đã xoá, còn 3 cảnh báo axios có sẵn. pytest ai-service theo từng file: `test_schemas_jd` 11, `test_schemas_scoring` 12, `test_scoring_aggregate` 59, `test_scoring_prompt` 11, `test_scoring_rules` 206, `test_jd_extraction` 11, `test_phase2_unit` 32 — qua hết; file mới `test_scoring_watchdog` 6 qua. Không chạy các file gọi Gemini thật / benchmark |
| E-2 | Đạt | `npm run gen:types -- -Base http://localhost:8080`: chỉ `auth.ts` (thêm `PublicThemeResponse`, `UpdateUserRoleRequest`, `PATCH /users/{id}/role`, `GET /public/theme`) và `notification.ts` (`GET /audit-logs/resource`) đổi; typecheck + lint lại sạch |
| E-3 | Đạt | Chạy lần (8) 18:58–19:17, không dòng `!!` / `Traceback`. Tổng kết: 41 đơn đúng từng giai đoạn như kế hoạch; 7 thư mời đúng (DRAFT 1, APPROVED 1, EXPIRED 1, DECLINED 1, ACCEPTED 3); AI 19 Phù hợp / 22 Không phù hợp. Phỏng vấn lúc in tổng kết: CANDIDATE_CONFIRMED 3, EVALUATION_PENDING 0 — buổi 8 (Lê Thị Ngọc Trâm, đã qua giờ) do job 5 phút của interview-service chuyển sang EVALUATION_PENDING lúc 19:20; sau đó cả 20 buổi khớp kế hoạch. Mã số đơn / ứng viên / buổi / thư mời trùng bảng "Dữ liệu demo hiện có" của kế hoạch (đối chiếu bằng SQL) |
| E-4 | Không cần | `ai_status <> 'COMPLETED'` = 0 / 41 |
| E-5 | Đạt (trừ chuông) | UI: `/careers/home` chưa đăng nhập (màu `#0F6E66`, 4 việc đang mở), `/dashboard` Quản trị, `/audit-logs` (260 thao tác), `/my-work` của `tran.ha` (đủ việc theo kịch bản); console không lỗi. SQL: "Đăng nhập gần nhất" của 8 nhân viên trong 2 ngày qua; nhật ký "Đặt lịch phỏng vấn" của buổi tháng 9–10 ghi giờ hẹn thật (vd. "14:00 21/09/2026"). Chuông `tran.ha` **32** chưa đọc — mức ≤ 9 cần C-9 (chưa làm) |
| E-6 | Đạt sau khi sửa | Container tạm `ats-pg-thu` (cổng 5442 — 55432 bị Windows giữ), volume ẩn danh mới, **không đụng `ats_pgdata`**. `init-databases.sql` chạy không lỗi: 10 DB, công ty "Mộc Lam Software", `le.quan@example.com` với mật khẩu `Password123!` khớp (kiểm bằng `crypt`). Thử thêm: khởi động lần lượt 8 service Java trỏ vào DB đó (RabbitMQ / Redis trỏ cổng giả để không đụng broker thật) → **recruitment-service và candidate-service không khởi động được** (xem E-B1). Sau khi sửa: cả 8 lên; masterdata tự nạp 7 phòng ban IT, 50 kỹ năng, 11 lý do từ chối; schema 6 DB trùng hệt DB đang dùng (so bảng / cột / ràng buộc / index / trigger). Đã xoá container (volume đi theo) |
| E-7 … E-10 | Đạt | Hai tài liệu này cập nhật; `TEST_ACCOUNTS.md` không phải đổi (dữ liệu khớp); push `origin/dev` |
| — | Đạt | Xoá `logs$1.log` (commit nhầm ở `efbbd01`, nội dung là lỗi "'run-service.bat' is not recognized" của một lệnh chuyển hướng gõ tay, không script nào sinh ra) và thêm `*.log` vào `.gitignore` |

Lỗi phát hiện trong phần E và đã sửa:

| Mã | Lỗi | Sửa ở | Đã kiểm |
|---|---|---|---|
| E-B1 | Volume Postgres mới: Flyway chạy trước Hibernate `ddl-auto`, nên V4/V5 của recruitment (`ALTER TABLE job_posting`) và V4 của candidate (`ALTER TABLE candidate`) lỗi "relation does not exist" → hai service không bao giờ khởi động | Migration mới `V3_1__ensure_job_posting_table.sql`, `V3_1__ensure_candidate_table.sql` (tạo bảng chỉ có khoá chính nếu chưa có, như V3 đã làm với `job_requisition`) + `spring.flyway.out-of-order: true` ở hai service. Không sửa migration đã chạy (đổi checksum sẽ làm mọi DB hiện có không khởi động được) | DB mới: 8/8 service lên, schema trùng DB đang dùng. DB đang dùng: hai service tự khởi động lại, chạy V3.1 "[out of order]" không lỗi; test hai service qua |
| E-B2 | ai-service lại mất consumer hàng đợi chấm điểm (kết nối RabbitMQ đóng lúc 17:50, từ đó 0 consumer) dù đã có canh gác 30 giây: lệnh hỏi hàng đợi không có giới hạn thời gian, kênh "robust" của aio-pika chờ nối lại mãi nên chính vòng canh gác treo | `ai-service/app/workers/scoring_watchdog.py` (mới, `main.py` gọi vào): mọi thao tác RabbitMQ trong canh gác có giới hạn 10 / 30 giây; thao tác bị thư viện huỷ ngang coi là lỗi kết nối | 6 test mới (kênh treo, bị huỷ, 0 consumer, nối lại lỗi…). Thử thật: `rabbitmqctl close_connection` hai lần → aio-pika tự nối lại nhưng 0 consumer (tái hiện đúng lỗi) → canh gác đăng ký lại sau 28 giây và 20 giây, không thừa kết nối. Sau đó seed chấm đủ 41 đơn |
| E-B3 | Nhật ký hệ thống: dòng "Đăng nhập" của ứng viên chỉ ghi "Người dùng", không có tên — danh sách tra tên bị lọc bỏ ứng viên (vốn để làm ô lọc "Người thực hiện") | `frontend/src/features/auditlog/pages/AuditLogPage.tsx`: giữ đủ danh sách, chỉ lọc ở ô chọn | UI: "Người dùng · Ngô Gia Bảo"; ô lọc vẫn chỉ có nhân viên; tsc sạch |

Ghi nhận, không sửa:

- DB mới thiếu index hiệu năng `idx_application_posting_ai_score_active` (application V4 có guard, chạy khi bảng chưa có). Chỉ ảnh hưởng tốc độ sắp xếp theo điểm AI.
- DB mới có thêm bảng `ai_feedback`, `cv_document_chunks` và extension `vector` (do `init-databases.sql` tạo); DB đang dùng không có. Hai bảng có model nhưng không chỗ nào dùng.
- `ats_auth` chỉ khác ở extension `pgcrypto`, do `reset_db.py` tạo trên DB đang dùng để băm mật khẩu quản trị viên.
- `ats_pgdata` báo "collation version mismatch" (DB tạo với glibc 2.41, image hiện tại 2.36). Sửa phải `REINDEX` + `ALTER DATABASE … REFRESH COLLATION VERSION` trên DB đang dùng — để người dùng quyết.

## Phần D của `docs/KE_HOACH_CON_LAI.md` — kiểm luồng ghi (17/11, 19:25–20:05, **dở dang**)

Dừng giữa chừng vì hết hạn mức phiên. Dữ liệu demo **đang bẩn** (chưa chạy lại `seed.py`).

| Mã | Kết quả | Đã kiểm bằng gì |
|---|---|---|
| W-1 … W-8 | Đạt | UI web + SQL. Đăng nhập ứng viên về `/careers/home` (quyết định 13/11, kế hoạch ghi `/my-home` là cũ). API nộp lại tin 1: "Bạn đã ứng tuyển vị trí này rồi" |
| W-9 | Đạt sau khi sửa D-B1, D-B2 | Gemini 503 → "Chấm lỗi"; "Chấm lại" đúng 1 request `rescore` → 75 "Không phù hợp" |
| W-10, W-11, W-12b | Đạt | Sai mật khẩu cũ → "Mật khẩu hiện tại không đúng"; phiên khác bị thu hồi (refresh 400); tab "Đã rút đơn" có đơn mới; API chặn nộp lại kèm lý do |
| W-12 | Đạt sau khi sửa D-B4, D-B5 | Ẩn danh hoá ở auth / candidate / application; `cv_extractions` 34 → 33 |
| W-13 … W-17 | Đạt (W-16 sau khi sửa D-B6) | UI web 4 vai trò + SQL + bảng `notification` |
| W-18 | **Lỗi chưa sửa (D-B7)** | Ba thao tác chạy; nhật ký chỉ có "Đổi lịch", "Huỷ lịch" |
| W-19 … W-59 | Chưa làm | — |

Lỗi tìm thấy trong phần D:

| Mã | Lỗi | Sửa ở | Đã kiểm |
|---|---|---|---|
| D-B1 | Băng lỗi AI hiện nguyên văn lỗi Gemini tiếng Anh ("Gemini call failed: 503 UNAVAILABLE {...}") | `ai-service/app/core/public_errors.py` (mới), `application_scoring.py`, `cv_extraction_engine.py`, `cv_extraction_store.py`, `api/cv_extraction.py`: giao diện chỉ nhận câu tiếng Việt, lỗi gốc ghi log / `ai_jobs` | pytest `test_public_errors` 4, `test_phase2_scoring` 31, `test_phase1_extraction` 50, `test_phase2_unit` + `test_jd_extraction` 43 — qua; ai-service đã khởi động lại |
| D-B2 | Console có 6 lỗi đỏ (API cũ của Ant Design 6) ở tab Điểm AI | `CvParseResultPanel.tsx` (`styles.label/content`, bỏ `List`), `WorkExperienceTimeline.tsx` (`icon`, `content`) | UI: console sạch, khối Chứng chỉ hiện đúng; tsc sạch |
| D-B3 | Thẻ Kanban không báo AI đang chấm / chấm lỗi | `ApplicationKanbanBoard.tsx` | tsc sạch; **chưa thấy trên UI** (đơn mới đã có điểm) |
| D-B4 | Đơn của ứng viên đã xoá dữ liệu: trang chi tiết báo "không tìm thấy / không có quyền" + 2 toast lỗi | `CandidateApplicationDetailPage.tsx`: báo "Hồ sơ ứng viên đã bị xoá" | UI |
| D-B5 | Console "useForm is not connected" ở trang cài đặt ứng viên | `AccountSettingsPage.tsx` | UI: console sạch |
| D-B6 | Đặt lịch mới thay buổi trực tuyến: địa điểm mặc định "Đà Nẵng" thay vì văn phòng của tin | `ScheduleInterviewPage.tsx` | UI: ra "Văn phòng TP. Hồ Chí Minh" |
| D-B8 | Ứng viên rút đơn chưa giao người phụ trách → không chuyên viên nào được báo | `notification-service/.../BusinessEventListener.java` (báo mọi RECRUITER như khi đơn mới đến) + `BusinessEventListenerTest` (3 ca) | `mvnw test` notification-service: 5 test qua |
| D-B7 | **Chưa sửa:** interview-service không ghi nhật ký khi thêm người phỏng vấn (`updateInterviewers`) và khi duyệt đề xuất đổi giờ (`approveHmProposal`); đổi giờ / huỷ buổi không gửi thông báo cho người phỏng vấn | `interview-service/.../InterviewService.java` (dòng ~457, ~498, ~559, ~701) | — |

Ghi nhận, không sửa: khung CV trống trong ảnh chụp chỉ vì công cụ chụp màn không chụp được trình xem PDF của Chrome
(S3 trả `application/pdf` đúng). Hộp xoá dữ liệu bắt gõ "XOA DU LIEU" không dấu (cố ý cho dễ gõ).

## Việc dở dang — đọc trước khi "làm tiếp"

**Phần D dở dang (bảng ngay trên):** sửa D-B7, làm tiếp W-18 … W-59, rồi chạy lại `seed.py` và cập nhật
`docs/KET_QUA_HOAN_THIEN.md`.

**Kế hoạch chi tiết cho phần còn lại (từng việc, bước làm, kết quả phải đạt): `docs/KE_HOACH_CON_LAI.md`.**
Phần E đã xong (bảng trên). Còn lại theo kế hoạch: B (lỗi đã biết B-1 … B-16), F (test còn thiếu), A (kiểm giao diện luồng
chỉ đọc), C (mục 5 — câu chữ, bố cục; gồm C-9 để chuông `tran.ha` ≤ 9), D (kiểm giao diện luồng ghi). Phần D làm bẩn dữ liệu
demo → làm xong thì chạy lại `seed.py` (E-3) trước khi bàn giao.

## Công cụ đã thêm

- `scripts/dev/svc.sh` + `scripts/dev/start-service.ps1`: khởi động lại service ở chế độ nền, log vào `logs/<service>.log`.
