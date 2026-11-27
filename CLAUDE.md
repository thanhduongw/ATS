# ATS — hướng dẫn làm việc với repo

Hệ thống quản lý tuyển dụng cho **một doanh nghiệp**: 9 service Spring Boot + API Gateway, ai-service (Python/FastAPI),
web (React + Vite + Ant Design) và app di động (Expo / React Native). Quy ước riêng của app: `mobile/CLAUDE.md`.

## Chạy hệ thống

1. Hạ tầng (Docker Desktop phải đang chạy): `start-infrastructure.bat` → `ats-postgres`, `ats-rabbitmq`, `ats-redis`.
2. Backend: `start-backend.bat` (mở cửa sổ cho từng service), hoặc chạy nền từ Git Bash:

   ```bash
   scripts/dev/svc.sh restart auth-service masterdata-service api-gateway   # khởi động / khởi động lại
   scripts/dev/svc.sh status                                                # service nào đang lên
   scripts/dev/svc.sh stop interview-service
   ```

   Log ở `logs/<service>.log`. Máy 16 GB RAM: khởi động mỗi đợt 3–4 service, đừng chạy thêm build nặng song song.
3. Web: `cd frontend && npm run dev` → http://localhost:3000
4. Mobile trên trình duyệt: `cd mobile && npx expo start --web --port 19006` (cổng 8081 là của auth-service).

| Thành phần | Cổng | | Thành phần | Cổng |
|---|---|---|---|---|
| api-gateway | 8080 | | notification-service | 8086 |
| auth-service | 8081 | | dashboard-service | 8087 |
| masterdata-service | 8082 | | ai-service (chỉ 127.0.0.1) | 8088 |
| recruitment-service | 8083 | | application-service | 8089 |
| candidate-service | 8084 | | offer-service | 8090 |
| interview-service | 8085 | | web / Expo web | 3000 / 19006 |

## Deploy (VPS)

Đang deploy bằng cách build trên VPS: `git clone` vào `~/ats` rồi `bash deploy/build.sh` (`docker-compose.prod.yml` +
`docker-compose.build.yml`). `.github/workflows/deploy.yml` (build lên ghcr.io + SSH deploy) chỉ chạy khi bấm tay.
Hướng dẫn và xử lý lỗi: `deploy/README.md`. Thêm service hoặc biến môi trường mới thì sửa cả `docker-compose.yml` (dev),
`docker-compose.prod.yml`, `docker-compose.build.yml` và matrix trong workflow.

## Bẫy môi trường

- **Spring Boot không tự đọc `.env`.** Luôn khởi động qua `run-service.bat` / `start-backend.bat` / `scripts/dev/svc.sh`
  (chúng nạp `.env` của service). Chạy `mvnw spring-boot:run` tay thì gửi mail và tải file lên S3 hỏng âm thầm.
- `application-service` và `offer-service` chỉ có `mvnw.cmd` (không có `mvnw`).
- `JAVA_HOME` trống, java lấy từ PATH. Phải đặt `JAVA_TOOL_OPTIONS=-Duser.timezone=Asia/Ho_Chi_Minh` (các script đã đặt).
- Service chạy bằng spring-boot-devtools: **biên dịch lại (kể cả `mvnw test`) làm service đang chạy tự khởi động lại.**
  Riêng `application-service` và `offer-service` **không có devtools**: sửa mã xong phải
  `scripts/dev/svc.sh restart <service>` thì mã mới mới chạy.
  Đừng chạy test của một service khi đang có việc dài phụ thuộc vào nó (ví dụ script tạo dữ liệu demo).
- Gateway chỉ mở sẵn một số đường dẫn công khai (`JwtAuthGlobalFilter`). Thêm API công khai mới ở service thì phải thêm ở đó.
- Trong Python trên Windows, `bash` thường là bash của WSL; script dùng Git Bash (`reset_db.git_bash()`).
- OTP đăng ký / đặt lại mật khẩu lưu dạng băm bcrypt, token lời mời lưu SHA-256 — không tra được mã thật từ DB.
- Email tới miền thử nghiệm (`example.com`, `.test`, `.invalid`…) bị bỏ qua có chủ ý ở auth-service và notification-service.
- Truy vấn DB: `docker exec ats-postgres psql -U ats_user -d <db> -tAc "..."` (DB: `ats_auth`, `ats_masterdata`,
  `ats_recruitment`, `ats_candidate`, `ats_application`, `ats_interview`, `ats_offer`, `ats_notification`, `ats_ai`).
- Khi kiểm tra giao diện, **không bấm "Xuất Excel"** (tải file thật về máy) — chặn `saveAs` / `URL.createObjectURL` trước.

## Dữ liệu demo

Bộ script ở `scripts/demo-data/`, chạy bằng Python của ai-service (đã có requests, PyMuPDF, Pillow):

```bash
ai-service/.venv/Scripts/python.exe scripts/demo-data/seed.py                   # reset + tạo lại (30–45 phút, AI chấm thật)
ai-service/.venv/Scripts/python.exe scripts/demo-data/seed.py --rescore-failed  # chấm lại các đơn AI chấm lỗi
ai-service/.venv/Scripts/python.exe scripts/demo-data/reset_db.py --yes         # chỉ xoá sạch, còn lại 1 quản trị viên
```

- Cần đủ 11 service + gateway + Docker đang chạy. Reset xoá mọi bảng của mọi DB `ats_*` (giữ lịch sử migration và bảng
  `role`), **không xoá file trên S3**, rồi khởi động lại masterdata-service để nạp danh mục IT mặc định.
- Dữ liệu tạo qua API thật. Những chỗ phải chỉnh DB có kiểm soát (bỏ qua OTP, dời lịch phỏng vấn về quá khứ, dời mốc thời
  gian ra 3 tháng) ghi ở đầu `seed.py`.
- Công ty hư cấu **Mộc Lam Software**; mọi tài khoản dùng mật khẩu `Password123!`, email miền `example.com`.
  Danh sách tài khoản và kịch bản demo: `frontend/docs/TEST_ACCOUNTS.md`.

## Kiểm tra trước khi coi là xong

```bash
cd <service> && ./mvnw.cmd -q test          # từng service một, không chạy song song
cd frontend && npx tsc -b --noEmit
cd mobile && npm run typecheck && npm run lint
cd ai-service && .venv/Scripts/python.exe -m pytest tests/<file>.py -q   # chạy theo từng file
```

Sau đó kiểm lại trên giao diện (web và Expo web). Đăng nhập nhanh khi kiểm web bằng JS: gọi `POST /api/auth/login`, rồi
`GET /api/auth/me`, lưu `localStorage.ats_auth = {accessToken, refreshToken, user: {userId: String(id), email, role,
departmentId, fullName, avatarUrl}}`. Mobile web dùng sessionStorage — đăng nhập bằng form.

## Quy tắc commit

- Làm trên nhánh `dev`, push `origin/dev`. Không tạo Pull Request, không merge vào `main` khi chưa được bảo.
- Thông điệp tiếng Anh, dạng `fix(interview): ...` / `feat(web): ...`.
- **Không thêm `Co-Authored-By` hay dòng "Generated with Claude Code".**
- Không commit `.env`, `target/`, `node_modules`, `.venv`, `logs/`, `tmp/`, `backups/`.

## Quy ước mã

- Thông báo lỗi và mọi chữ hiển thị bằng tiếng Việt có dấu. Lỗi nghiệp vụ ném `BusinessException`; thân lỗi thống nhất
  `{message, error}` qua `GlobalExceptionHandler` của từng service.
- Sự kiện giữa các service đi qua RabbitMQ exchange `ats.events`; phát sau khi commit. Nhật ký hệ thống: phát `AuditEvent`
  với routing key `audit.log`, notification-service lưu vào `audit_log`.
- Màu thương hiệu do Quản trị chọn (`company.brand_color`, API công khai `GET /api/auth/public/theme`):
  web đọc qua biến CSS `--ats-brand*` (`frontend/src/app/brand.ts`, `COLORS.primary` trỏ tới biến đó — không nối đuôi alpha
  vào `COLORS.primary`, dùng `brandAlpha()`); mobile đọc lúc khởi động (`mobile/src/theme/brand.ts`).
- Tìm kiếm không phân biệt dấu: web dùng `matchesKeyword` (`frontend/src/app/text.ts`), backend dùng `TextSearch.fold`.
- Giao diện theo `docs/UI`; không đổi phông chữ, không đổi bố cục khối chính của màn.
- Tiến độ và kết quả đợt hoàn thiện tháng 11/2026: `docs/TIEN_DO_HOAN_THIEN.md`, `docs/KET_QUA_HOAN_THIEN.md`.
