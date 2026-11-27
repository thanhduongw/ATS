# ATS — hướng dẫn làm việc với repo

Hệ thống quản lý tuyển dụng cho **một doanh nghiệp**: 9 service Spring Boot + API Gateway, ai-service (Python/FastAPI),
web (React + Vite + Ant Design) và app di động (Expo / React Native). Quy ước riêng của app: `mobile/CLAUDE.md`.

## Chạy hệ thống

Cả hệ thống chạy bằng Docker, **giống nhau ở local và VPS** (một `docker-compose.yml`, hướng dẫn: `deploy/README.md`):

```bash
cp .env.example .env            # lần đầu: điền mật khẩu, JWT_SECRET, PUBLIC_URL (local: http://localhost)
bash deploy/build.sh            # build lần lượt từng image rồi khởi động theo đợt (lần đầu 20–30 phút)
bash deploy/build.sh frontend   # sửa code service nào thì build lại service đó
docker compose ps               # trạng thái;  docker compose logs -f <service>  để xem log
```

- Mở `PUBLIC_URL`. Chỉ Caddy mở cổng 80/443; các service không mở cổng ra máy.
- Cần thêm 4 file bí mật không có trên GitHub: `auth-service/.env`, `candidate-service/.env`,
  `notification-service/.env`, `ai-service/.env` (mail, S3, khóa AI).
- Mobile chạy ngoài Docker: `cd mobile && npx expo start`, `EXPO_PUBLIC_API_BASE_URL=<PUBLIC_URL>/api` trong `mobile/.env`.
- Thêm service hoặc biến môi trường mới: sửa `docker-compose.yml`, `.env.example` và danh sách trong `deploy/build.sh`,
  `deploy/start.sh`.
- Máy dev có thể có thêm cách chạy dev riêng (không commit); nếu có thì xem `CLAUDE.local.md`.

## Deploy (VPS)

VPS `~/ats` clone nhánh `main`: `git pull && bash deploy/build.sh [service...]`. Dữ liệu nằm ở volume `ats_pgdata`.

## Bẫy môi trường

- Spring Boot không tự đọc `.env` của service: trong Docker chúng được nạp qua `env_file` của `docker-compose.yml`.
- `application-service` và `offer-service` chỉ có `mvnw.cmd` (không có `mvnw`).
- Gateway chỉ mở sẵn một số đường dẫn công khai (`JwtAuthGlobalFilter`). Thêm API công khai mới ở service thì phải thêm ở đó.
- `PUBLIC_URL` phải khớp đúng địa chỉ trên trình duyệt, nếu không gateway chặn CORS (403).
- OTP đăng ký / đặt lại mật khẩu lưu dạng băm bcrypt, token lời mời lưu SHA-256 — không tra được mã thật từ DB.
- Email tới miền thử nghiệm (`example.com`, `.test`, `.invalid`…) bị bỏ qua có chủ ý ở auth-service và notification-service.
- Truy vấn DB: `docker compose exec postgres psql -U ats_user -d <db> -tAc "..."` (DB: `ats_auth`, `ats_masterdata`,
  `ats_recruitment`, `ats_candidate`, `ats_application`, `ats_interview`, `ats_offer`, `ats_notification`, `ats_ai`).
- Khi kiểm tra giao diện, **không bấm "Xuất Excel"** (tải file thật về máy) — chặn `saveAs` / `URL.createObjectURL` trước.

## Dữ liệu ban đầu

DB mới (volume trống) chỉ có công ty và quản trị viên do `docker/postgres-init` tạo: `le.quan@example.com` /
`Password123!` — đổi mật khẩu sau lần đăng nhập đầu. Danh mục mặc định (chức danh, cấp bậc, kỹ năng, quy trình…) do masterdata-service tự nạp mỗi lần khởi động; **không nạp phòng ban** — Quản trị tự tạo.
Repo không có script tạo dữ liệu demo: mọi dữ liệu nhập trên giao diện như người dùng thật.

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
- Giao diện theo `E:/ATS-archive/docs/UI`; không đổi phông chữ, không đổi bố cục khối chính của màn.
- Tiến độ và kết quả đợt hoàn thiện tháng 11/2026: `E:/ATS-archive/docs/TIEN_DO_HOAN_THIEN.md`, `E:/ATS-archive/docs/KET_QUA_HOAN_THIEN.md`.
