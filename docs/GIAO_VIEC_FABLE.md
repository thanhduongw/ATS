# Giao việc trọn gói — hoàn thiện ATS trước hạn nộp 25/11/2026

Tài liệu này là **đề bài duy nhất** cho phiên làm việc. Mọi quyết định nghiệp vụ dưới đây đã được chủ dự án chốt;
không hỏi lại những gì đã ghi ở đây. Chỉ dừng lại hỏi khi gặp điều **không có trong tài liệu** và có thể làm mất dữ liệu
hoặc thay đổi hướng sản phẩm.

Tài liệu đi kèm (đọc trước khi bắt đầu):
- `docs/KIEM_TRA_GIAO_DIEN_16-11-2026.md` — danh sách ~40 lỗi kèm nguyên nhân và cách sửa đề xuất (đánh số 1.x, 2.x, 3.x, 4.x).
- `mobile/CLAUDE.md` — quy ước bắt buộc khi sửa mobile và các "sự thật về backend" đã kiểm chứng.
- `docs/UI/*.html` — nguồn thiết kế (Candidate, HR, Department, Admin, Mobile, Interactive UI Prototype).

**Không đọc các file README** (yêu cầu của chủ dự án).

---

## 0. Mục tiêu

1. Sửa toàn bộ lỗi trong `docs/KIEM_TRA_GIAO_DIEN_16-11-2026.md` theo các quyết định ở mục 3.
2. Làm các chức năng mới ở mục 4.
3. Tinh chỉnh giao diện web + mobile để bớt cảm giác "AI làm" (mục 5), giữ bố cục `docs/UI`.
4. Xoá sạch dữ liệu hiện có, tạo lại bộ dữ liệu IT như người dùng thật bằng script gọi API (mục 6).
5. Kiểm tra toàn bộ chức năng theo từng vai trò, từng màn hình, trên web và mobile (mục 7); sửa mọi lỗi phát hiện thêm.
6. Bàn giao: báo cáo kết quả + cập nhật tài liệu (mục 9).

Ngoài phạm vi đợt này: **deploy cloud, build APK, chạy lại benchmark AI** (để sau).

---

## 1. Quy tắc làm việc

### Git
- Làm trên nhánh **`dev`** (đã tạo sẵn từ `feature/candidate-mobile`, đã có trên `origin/dev`, chứa sẵn 2 file đề bài).
  Bắt đầu bằng `git checkout dev && git pull`. Nhánh cũ tên `develop` là nhánh khác — không dùng.
- **Commit theo từng nhóm việc** (mỗi nhóm lỗi / mỗi chức năng một commit), **push lên `origin/dev`**.
  **Không tạo Pull Request, không merge vào `main`** — chủ dự án tự merge.
- Bản sao lưu DB trước khi reset nằm ở `backups/2026-11-16-truoc-reset/` (không commit thư mục này).
- Commit message tiếng Anh, theo kiểu đang dùng trong repo: `fix(interview): ...`, `feat(web): ...`.
- **Tuyệt đối không** thêm `Co-Authored-By` hay dòng "Generated with Claude Code" vào commit.
- Không commit file `.env`, thư mục `target/`, `node_modules`, `.venv`, log.

### Quyền trên máy local (đã được cho phép)
- Bật/tắt service, kill tiến trình **của project** (java/node/python thuộc E:\ATS).
- Sửa DB local, thêm migration Flyway (service nào đang dùng Flyway thì thêm `V{n}__*.sql`).
- Dùng Chrome (Claude in Chrome) để kiểm tra UI.
- Cài thư viện mới khi cần (Apache Tika, Postgres `unaccent`, ...). Mobile: chỉ cài qua `npx expo install`,
  và tôn trọng quy tắc "không thêm thư viện" của `mobile/CLAUDE.md` trừ khi bắt buộc — ghi lý do vào báo cáo.
- **Không** xoá file trên S3 (giữ nguyên bucket). **Không** gửi email tới địa chỉ thật.

### Hạn mức (gói Pro sẽ chạm giới hạn giữa chừng)
- Duy trì file **`docs/TIEN_DO_HOAN_THIEN.md`**: sau **mỗi** việc xong ghi một dòng (mã việc, trạng thái, commit hash, cách đã kiểm).
- Khi được bảo "làm tiếp": đọc file tiến độ, `git log`, rồi làm tiếp từ việc chưa xong. Không làm lại việc đã xong.
- Thứ tự ưu tiên nếu hết thời gian: mục 3 (A → B → C) → mục 6 → mục 7 → mục 4 → mục 5 → mục 3 nhóm D.

### Định nghĩa "xong" cho mỗi việc
- Backend: `mvnw.cmd -q test` của service đó pass.
- Web: `npx tsc -b --noEmit` trong `frontend` sạch.
- Mobile: `npm run typecheck` và `npm run lint` trong `mobile` sạch.
- AI service: test liên quan trong `ai-service/tests` pass (lưu ý `pytest tests` chạy cả thư mục đang lỗi
  `I/O operation on closed file` — chạy theo từng file, và sửa luôn lỗi này nếu tìm ra nguyên nhân).
- **Đã kiểm lại trên giao diện** đúng kịch bản gây lỗi ban đầu.

---

## 2. Môi trường — những bẫy đã gặp

- Khởi động backend: `start-backend.bat` (nạp `.env` từng service qua `run-service.bat`). Nếu chạy ngầm bằng script riêng:
  - `application-service` và `offer-service` **không có file `mvnw`**, chỉ có `mvnw.cmd` → gọi `.\mvnw.cmd` từ PowerShell/cmd.
  - `JAVA_HOME` đang trống; java lấy từ PATH (JDK 22).
  - Đặt `JAVA_TOOL_OPTIONS=-Duser.timezone=Asia/Ho_Chi_Minh`.
- Cổng: gateway 8080, auth 8081, masterdata 8082, recruitment 8083, candidate 8084, interview 8085, notification 8086,
  dashboard 8087, ai 8088 (chỉ 127.0.0.1), application 8089, offer 8090, web 5173.
  Expo web phải chạy cổng khác 8081: `npx expo start --web --port 19006`.
- Hạ tầng Docker: container `ats-postgres` (user `ats_user`, DB `ats_auth`, `ats_application`, `ats_candidate`,
  `ats_interview`, `ats_masterdata`, `ats_notification`, `ats_offer`, `ats_recruitment`, `ats_dashboard`, `ats_ai`),
  `ats-rabbitmq`, `ats-redis`. Truy vấn: `docker exec ats-postgres psql -U ats_user -d <db> -tAc "..."`.
- Máy chỉ có ~16 GB RAM, thường còn 1–2 GB trống khi chạy đủ service: đừng chạy song song thêm build nặng.
- OTP đăng ký / đặt lại mật khẩu lưu **bcrypt** (bảng `email_verification`, `password_reset_tokens`); token mời lưu **SHA-256 hex**
  (`user_invitation.token_hash`). Muốn test luồng cần mã: ghi hash của mã đã biết vào đúng bản ghi test
  (bcrypt sinh bằng `BCryptPasswordEncoder` trong `~/.m2/.../spring-security-crypto`).
- Kiểm tra UI bằng Chrome: đăng nhập nhanh bằng JS — gọi `POST /api/auth/login`, rồi `GET /api/auth/me`,
  lưu `localStorage.ats_auth = {accessToken, refreshToken, user:{userId:String(id), email, role, departmentId, fullName, avatarUrl}}`.
  Mobile web dùng sessionStorage — đăng nhập bằng form.
- **Không bấm "Xuất Excel" khi test** — `file-saver` sẽ tải file thật về máy; kiểm bằng cách chặn `saveAs`/`URL.createObjectURL`.
- Đơn ứng tuyển bị chặn tạo thư mời khi tin hết suất — dữ liệu test phải tính đủ `headcount`.

---

## 3. Sửa lỗi — kèm quyết định đã chốt

Làm theo `docs/KIEM_TRA_GIAO_DIEN_16-11-2026.md`. Những điểm dưới đây **ghi đè** đề xuất trong file đó nếu khác nhau.

### Nhóm A — nghiêm trọng (làm trước)
| Mã | Quyết định |
|---|---|
| 1.1 | Thêm `?interviewId=` ở `MyWorkPage.tsx:273, 380`; trang đánh giá không cho người không phải HR điền khi thiếu `interviewId`. |
| 1.2 | HR là người phỏng vấn được xác nhận (frontend + tab *Cần xử lý*); HR tạo lịch mà chính mình là người phỏng vấn thì tự tính là đã xác nhận. |
| 1.3 | *Đổi giờ* dùng được khi ứng viên xin dời; lịch thay thế đóng lịch cũ; form *Đặt lịch mới* điền sẵn dữ liệu cũ + hiện lý do ứng viên. |
| 1.4 | **Mọi HR (RECRUITER) đều duyệt được yêu cầu tuyển dụng.** Bỏ ràng buộc người duyệt cố định; lưu `approvedBy` = người thực sự duyệt. Bỏ việc tự gán `approvers[0]`. |
| 1.5 | Đơn nộp từ mobile phải được AI chấm như web (dùng chung luồng phát sự kiện). |
| 1.6 | **Thêm chốt chặn theo lĩnh vực**: chiều chuyên môn/lĩnh vực thấp → không được FIT; nhận xét kết luận "không phù hợp" mà điểm ≥ ngưỡng → UNCLASSIFIED. Thống nhất ngưỡng (67,5 vs 62,5) và ghi rõ vào báo cáo. **Không chạy lại benchmark.** |
| 1.7 | Lưu cờ prompt injection vào kết quả chấm; web + mobile hiện banner đỏ ở tab Điểm AI và badge ở danh sách. |
| 1.8 | **Ẩn danh hoá ngay**: khoá tài khoản (thu hồi refresh token), đổi tên/email/SĐT trong đơn, phỏng vấn, thư mời thành "Ứng viên đã xoá dữ liệu", xoá bản trích xuất CV ở ai-service, gỡ liên kết CV (không xoá file S3 trong đợt này — ghi chú vào báo cáo). Giữ số liệu thống kê. |

### Nhóm B — bảo mật & phân quyền
| Mã | Quyết định |
|---|---|
| 2.1 | Kiểm tra magic bytes khi upload CV (PDF/DOCX) ở candidate-service, từ chối file không khớp. |
| 2.2 | Ảnh đại diện / logo: **bỏ SVG**, chỉ PNG/JPEG/WEBP; thống nhất câu hướng dẫn và câu lỗi. |
| 2.3 + 2.4 | **Quyền đã chốt:** **Admin** = quản trị người dùng, thông tin công ty, trang tuyển dụng (kể cả màu sắc/ảnh), nhật ký, tổng quan số liệu, **danh mục**. **HR** = toàn bộ nghiệp vụ tuyển dụng + **danh mục**. **Trưởng bộ phận** = không sửa danh mục. Admin **không** vào nghiệp vụ tuyển dụng (yêu cầu, tin, hồ sơ, lịch, thư mời) trên web lẫn mobile; mobile chặn Admin đăng nhập vào khu HR (hiện thông báo dùng web). Mở menu *Danh mục* cho Admin trên web. Cập nhật ma trận *Vai trò & quyền* cho khớp. Backend masterdata chặn POST/PUT/PATCH với HIRING_MANAGER và CANDIDATE. |
| 2.5 | Danh sách người phỏng vấn chỉ gồm tài khoản `ACTIVE`. |
| 2.6 | Bắt buộc đồng ý xử lý dữ liệu khi đăng ký (backend) và khi ứng tuyển trên mobile (thêm checkbox), lưu thời điểm đồng ý. |
| 2.7 | Thông báo lỗi chuẩn: 400 dữ liệu không hợp lệ, 404 không tìm thấy, 401 sai đăng nhập; không lộ chi tiết kỹ thuật. |

### Nhóm C — nghiệp vụ
| Mã | Quyết định |
|---|---|
| 3.1 | **Chặn hẳn**: chỉ chuyển sang *Thư mời* khi đã có ít nhất 1 đánh giá đã nộp (backend + ẩn/disable nút kèm lý do). |
| 3.2 | Thêm trạng thái **Đã rút đơn** riêng (thông báo, nhãn, tab, tiến trình mobile). |
| 3.3 | **Sửa trực tiếp tin đang tuyển**, giữ trạng thái đang tuyển: cho sửa mô tả, yêu cầu, quyền lợi, hạn nộp, lương hiển thị (trong khung đã duyệt); ghi lịch sử thay đổi. |
| 3.7 | Ứng viên **đã rút đơn không được nộp lại** cùng việc (giữ), nhưng trang chi tiết việc báo rõ lý do. Ứng viên **chấp nhận thư mời → tự đóng các đơn đang mở khác** ("Ngừng xử lý – đã nhận việc") **và chặn nộp đơn mới**. |
| 3.8 | Job định kỳ đánh dấu hết hạn lịch phỏng vấn quá giờ chưa xác nhận; tab *Sắp tới* chỉ lấy lịch tương lai; chặn hoàn tất/đánh giá trước giờ phỏng vấn ở backend. |
| 3.11 | Ghi audit đủ các thao tác còn thiếu; lịch sử yêu cầu tuyển dụng / hồ sơ hiển thị đủ sự kiện. |
| Còn lại (3.4–3.6, 3.9, 3.10, 3.12–3.19) | Làm theo đề xuất trong file kiểm tra. 3.14: thêm đổi vai trò/phòng ban người dùng cho Admin. |

### Nhóm D — giao diện, câu chữ
Làm theo mục 4 của file kiểm tra; gộp chung với mục 5 (tinh chỉnh giao diện) của tài liệu này.

---

## 4. Chức năng mới

1. **Màu thương hiệu do Admin chọn, áp dụng toàn hệ thống web + mobile.**
   - Admin chọn màu chủ đạo (đã có ô "Màu thương hiệu" ở Thông tin doanh nghiệp) → màu chính của nút, link, menu, tab, hero…
     ở **cả khu nội bộ, cổng ứng viên, trang tuyển dụng công khai và app mobile**.
   - Web: `frontend/src/app/theme.ts` sinh token từ màu công ty (tự tính các sắc độ hover/tonal/chữ trên nền, đảm bảo tương phản ≥ 4.5:1;
     nếu màu quá sáng thì tự chọn chữ tối). Mobile: `src/theme/` + `src/theme/paper.ts` đọc cấu hình công ty khi khởi động (cache lại, có màu mặc định khi offline).
   - Có API công khai trả cấu hình giao diện (màu) để trang công khai và mobile chưa đăng nhập cũng dùng được.
   - Xem trước trực tiếp trong trang Admin trước khi lưu. Font giữ nguyên Be Vietnam Pro.
2. **Tuỳ biến hero trang tuyển dụng**: Admin chọn màu nền hero hoặc gradient 2 màu (kèm ảnh bìa đã có); có xem trước, lưu nháp/xuất bản như các khối khác.
3. **Email bất đồng bộ**: đăng ký, mời người dùng, đặt lại mật khẩu, thông báo… không còn chờ gửi mail trong request (RabbitMQ/notification-service hoặc `@Async`), lỗi gửi mail được ghi log và không làm hỏng thao tác.
4. **Tự hết hạn lịch + nhắc lịch qua email**: lịch quá giờ chưa xác nhận → Hết hạn; email nhắc ứng viên và người phỏng vấn trước 24 giờ và 1 giờ (không gửi trùng; chỉ gửi tới email hợp lệ — dữ liệu test dùng @example.com).
5. **Tìm kiếm không dấu**: Ctrl+K, danh sách ứng viên/việc làm nội bộ, trang việc làm công khai, tìm trong danh mục (Postgres `unaccent` hoặc cột tìm kiếm không dấu).

---

## 5. Tinh chỉnh giao diện "bớt giống AI làm" (web + mobile)

Giữ bố cục và cấu trúc màn của `docs/UI` (không đổi thứ tự/khối chính của màn). Được phép tinh chỉnh:

- **Câu chữ**: cắt câu dẫn dài và giải thích thừa; nhãn ngắn, tự nhiên như sản phẩm thật; giảm lạm dụng "·" và "—";
  không lặp ý giữa tiêu đề và mô tả; thông báo thành công/lỗi ngắn, cụ thể; việt hoá 100% (kể cả lỗi backend, nhật ký, danh mục).
- **Bố cục rập khuôn**: bớt icon tile trang trí ở mọi thẻ, bớt thẻ lồng thẻ, bớt gradient; ưu tiên bảng/danh sách gọn,
  khoảng trắng và phân cấp chữ rõ; KPI chỉ giữ ở nơi thật sự cần. Trạng thái, chip, nút thống nhất một kiểu.
- **Màu sắc**: lấy màu chủ đạo từ cấu hình Admin (mục 4.1); nền trung tính, dùng màu nhấn tiết kiệm; dải màu AI chỉ cho điểm AI.
- **Dữ liệu hiển thị**: hết dữ liệu không dấu, tên/ảnh/nội dung giả lộ liễu (xử lý ở mục 6).
- Mọi thay đổi mobile phải theo `mobile/CLAUDE.md` (token trong `src/theme/`, chuỗi trong `src/lib/strings.ts`, …).
- Ghi lại trong báo cáo danh sách những chỗ đã đổi so với `docs/UI` và lý do.

---

## 6. Xoá và tạo lại dữ liệu (chỉ lĩnh vực IT)

### Xoá
- Xoá **toàn bộ** dữ liệu nghiệp vụ và **toàn bộ tài khoản** hiện có (kể cả `admin.company@test.net`, `hr.recruiter@test.net`,
  `dept.manager@test.net`, `levuthanhduong2004@gmail.com`, `nguyenthixuanquynh1901@gmail.com` và mọi tài khoản test).
- Xoá ở tất cả DB `ats_*` (kể cả `ats_ai`: trích xuất CV, điểm, JD extraction). Giữ schema/migration.
- **Không xoá file trên S3.**
- Viết thành script có thể chạy lại (mục "reset demo").

### Tạo lại — bằng script gọi API thật
- Script đặt tại `scripts/demo-data/` (Node/TypeScript hoặc Python), chạy được nhiều lần: reset DB → tạo dữ liệu qua API (để AI chấm thật, sự kiện/thông báo sinh thật).
  Bước nào API không cho làm (ví dụ thời điểm quá khứ để có lịch sử, xác minh OTP) thì được chỉnh DB có kiểm soát và ghi rõ trong script.
- **Công ty mới**: tự đặt tên một công ty phần mềm hư cấu (không trùng công ty thật có tiếng ở Việt Nam), có đủ thông tin pháp lý, logo dạng chữ, khẩu hiệu, giới thiệu, văn phòng.
- **Chỉ lĩnh vực IT**: phòng ban kiểu Backend, Frontend, Mobile, QA, DevOps/Cloud, Data/AI, Nhân sự (để có HR). Chức danh, cấp bậc, kỹ năng, chứng chỉ, nguồn tuyển dụng, lý do từ chối, tiêu chí đánh giá đều theo IT.
- **Người dùng**: 1 Admin, 2 HR, mỗi phòng IT 1 trưởng bộ phận. Tên Việt Nam tự nhiên, có dấu; email dạng `ho.ten@example.com`
  (**chỉ dùng domain example.com**). Mật khẩu chung `Password123!`.
- **Quy mô "vừa đủ demo"**: ~8 yêu cầu tuyển dụng (đủ trạng thái: nháp, chờ duyệt, yêu cầu sửa, đã duyệt, từ chối), ~6 tin
  (đang tuyển, tạm dừng, đã đóng), ~30 ứng viên có hồ sơ đầy đủ (ảnh đại diện tuỳ chọn, SĐT, địa chỉ, học vấn, kỹ năng, kinh nghiệm)
  và **CV PDF thật** sinh từ dữ liệu ứng viên (nội dung IT, có dấu), ~40 đơn trải đều các giai đoạn (gồm đã rút, bị từ chối, đã tuyển),
  ~15 buổi phỏng vấn (sắp tới, đã xác nhận, xin dời, đã đánh giá, đã huỷ), ~6 thư mời (nháp, đã gửi, đã nhận, đã từ chối, hết hạn),
  thông báo, nhật ký tương ứng. Có 1–2 CV mẫu chứa prompt injection để demo cảnh báo.
- Thời gian trải trong khoảng 3 tháng gần đây để biểu đồ/tổng quan theo quý có ý nghĩa; mọi số liệu khớp nhau giữa các màn.
- Trang tuyển dụng công khai được cấu hình đầy đủ (màu thương hiệu, hero, khối đời sống, phúc lợi, văn phòng) — **không** dùng ảnh sơ đồ kiến trúc.
- Cập nhật `docker/postgres-init/init-databases.sql` nếu còn seed cũ không phù hợp.

---

## 7. Kiểm tra toàn bộ trên giao diện

Sau khi có dữ liệu mới, kiểm từng vai trò, **từng màn hình, từng chức năng**, cả web và mobile (Expo web):

- **Ứng viên** (web + mobile): đăng ký/OTP, đăng nhập/xuất, quên/đổi mật khẩu, hồ sơ, ảnh đại diện, CV, tìm/lọc/sắp xếp việc,
  ứng tuyển (kể cả chặn trùng, chặn sau khi nhận việc), đơn + tiến trình, rút đơn, lịch phỏng vấn (đồng ý, xin dời, .ics, link/địa điểm),
  thư mời (xem, PDF, nhận, từ chối), trang chào mừng, thông báo, quyền riêng tư, xoá dữ liệu.
- **HR** (web + mobile): việc của tôi, yêu cầu tuyển dụng (duyệt/yêu cầu sửa/từ chối), tin (tạo, sửa khi đang tuyển, vòng đời),
  Kanban (kéo thả, chọn nhiều, từ chối hàng loạt, giao phụ trách), so sánh, hồ sơ (điểm AI, cảnh báo injection, chấm lại, ghi chú, hoạt động),
  thêm ứng viên, AI đọc CV, xuất Excel (không tải file thật), lịch (lên lịch, xác nhận, đổi giờ, đề xuất, thêm người, huỷ, vắng mặt, lịch tuần, lọc),
  đánh giá, thư mời (nháp, sửa, kiểm tra trước gửi, gửi, xoá), danh mục, Ctrl+K, thông báo, cài đặt.
- **Trưởng bộ phận** (web + mobile): việc của tôi, tạo/sửa/gửi lại yêu cầu, ứng viên phòng mình, xác nhận/đề xuất giờ, đánh giá
  (vào từ mọi lối: việc của tôi, chi tiết buổi, lịch), kết quả tuyển dụng, cài đặt, không truy cập được dữ liệu phòng khác.
- **Admin** (web; mobile phải bị chặn đúng cách): tổng quan + đổi quý + chi tiết phòng ban, người dùng (mời, kích hoạt, khoá/mở,
  đặt lại mật khẩu, đổi vai trò/phòng ban), vai trò & quyền, thông tin công ty, **màu thương hiệu áp dụng toàn hệ thống**,
  trang tuyển dụng (khối, hero, ảnh, xuất bản), danh mục, nhật ký.
- **Phân quyền**: mỗi vai trò thử mở URL/API của vai trò khác và dữ liệu của người khác → bị chặn.
- Mỗi màn: không lỗi API/JS trong console, không chữ tiếng Anh/không dấu, không chữ bị cắt, trạng thái rỗng/lỗi/đang tải hợp lý.
- Lỗi mới phát hiện → sửa ngay (theo quy tắc mục 1) và ghi vào báo cáo.

---

## 8. Không được làm

- Không deploy, không build APK, không chạy benchmark AI.
- Không xoá file S3, không gửi email tới địa chỉ ngoài `example.com`.
- Không tạo PR, không merge, không push lên nhánh nào khác ngoài `dev`.
- Không đổi font. Không phá bố cục `docs/UI`.
- Không thêm Co-Authored-By / dòng sinh bởi Claude trong commit.

---

## 9. Bàn giao

1. **`docs/KET_QUA_HOAN_THIEN.md`**: từng mã lỗi/chức năng → trạng thái (xong / một phần / chưa), commit, cách đã kiểm;
   lỗi mới phát hiện và đã sửa; những gì còn lại + lý do; danh sách thay đổi giao diện so với `docs/UI`;
   các quyết định kỹ thuật quan trọng (ví dụ cách ẩn danh hoá, cách áp màu thương hiệu, ngưỡng AI).
2. **Cập nhật tài liệu**:
   - `frontend/docs/TEST_ACCOUNTS.md` — tài khoản mới, vai trò, kịch bản demo theo dữ liệu mới.
   - **`CLAUDE.md` ở thư mục gốc** (mới) — cách chạy toàn hệ thống, cổng, bẫy môi trường (mục 2), quy tắc commit,
     cách reset dữ liệu demo, cách kiểm tra.
   - Hướng dẫn chạy script reset dữ liệu (`scripts/demo-data/` có hướng dẫn trong `CLAUDE.md` gốc).
   - `mobile/CLAUDE.md` — bổ sung phần màu thương hiệu động và các thay đổi quy ước nếu có.
3. `docs/TIEN_DO_HOAN_THIEN.md` cập nhật đến việc cuối cùng.
