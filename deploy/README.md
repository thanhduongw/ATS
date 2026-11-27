# Chạy và deploy ATS

Cả hệ thống chạy bằng **một** `docker-compose.yml`, giống nhau ở máy local và trên VPS:
clone repo → tạo các file `.env` → `bash deploy/build.sh`.

```
Trình duyệt ─► Caddy :80/:443 ─► frontend (nginx) ─► /api, /ws ─► api-gateway ─► 9 service + ai-service
                                                                    Postgres · RabbitMQ · Redis (không mở cổng ra ngoài)
```

| File | Vai trò |
|---|---|
| `docker-compose.yml` | Toàn bộ stack. Chỉ Caddy mở cổng 80/443; heap mỗi JVM giới hạn; giờ +7 |
| `.env.example` | Mẫu `.env` ở gốc repo (mật khẩu hạ tầng, JWT, địa chỉ truy cập) |
| `deploy/build.sh` | Build lần lượt từng image (không song song để khỏi hết RAM) rồi gọi `start.sh` |
| `deploy/start.sh` | Khởi động theo đợt 3 service |
| `deploy/backup.sh` | `pg_dumpall` ra `backups/`, giữ 14 ngày |
| `deploy/Caddyfile` | Reverse proxy; có domain thì tự cấp HTTPS |
| `docker/postgres-init` | Tạo các DB và quản trị viên đầu tiên khi volume Postgres còn trống |

---

## Chạy ở máy local

Cần Docker Desktop (cấp cho Docker từ 8 GB RAM) và Git Bash.

```bash
git clone https://github.com/thanhduongw/ATS.git && cd ATS
cp .env.example .env          # để DOMAIN=:80, PUBLIC_URL=http://localhost; điền mật khẩu và JWT_SECRET
# chép 4 file bí mật của service vào đúng chỗ (xem bước 3 bên dưới)
bash deploy/build.sh
```

Mở http://localhost. Cổng 80 trên máy phải trống. Cách đăng nhập lần đầu: bước 5 bên dưới.

---

## Trên VPS

### 1. Cài đặt VPS (user root)

```bash
apt update && apt upgrade -y
adduser deploy && usermod -aG sudo deploy
curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable
timedatectl set-timezone Asia/Ho_Chi_Minh
# Chưa có swap (free -h thấy Swap: 0B) thì thêm:
# fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
# echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### 2. Lấy code (user deploy)

```bash
ssh deploy@<IP_VPS>
git clone -b main https://github.com/thanhduongw/ATS.git ~/ats
```

### 3. File bí mật

Từ máy đang có sẵn các file này (Git Bash, ở gốc repo) — chúng không có trên GitHub:

```bash
for s in auth-service candidate-service notification-service ai-service; do
  scp $s/.env deploy@<IP_VPS>:~/ats/$s/.env
done
```

Trên VPS:

```bash
cd ~/ats
cp .env.example .env
openssl rand -hex 24                          # → POSTGRES_PASSWORD
openssl rand -hex 24                          # → RABBITMQ_PASSWORD
openssl rand -base64 64 | tr -d '\n'; echo    # → JWT_SECRET
nano .env                                     # điền 3 chuỗi trên + DOMAIN, PUBLIC_URL
chmod 600 .env */.env
```

`DOMAIN` / `PUBLIC_URL`:

| | `DOMAIN` | `PUBLIC_URL` |
|---|---|---|
| Có domain (bản ghi A đã trỏ về IP VPS) | `ats.tenmien.vn` | `https://ats.tenmien.vn` |
| Chưa có domain (không HTTPS, không Google SSO) | `:80` | `http://<IP_VPS>` |

`PUBLIC_URL` phải khớp đúng địa chỉ gõ trên trình duyệt, không có `/` ở cuối — sai là API bị chặn CORS (403).

### 4. Build và chạy

```bash
cd ~/ats
bash deploy/build.sh 2>&1 | tee build.log
```

Lần đầu 30–50 phút trên VPS 4 vCPU (ai-service tải PaddleOCR lâu nhất). Ngắt SSH giữa chừng sẽ dừng build — muốn chạy nền:
`nohup bash deploy/build.sh > build.log 2>&1 &` rồi xem `tail -f build.log`.

### 5. Kiểm tra

```bash
docker compose ps                                  # tất cả "Up"
docker compose logs --tail=80 auth-service
docker stats --no-stream                           # RAM từng container
```

Mở `PUBLIC_URL` trên trình duyệt. DB mới chỉ có quản trị viên tạo bởi `docker/postgres-init`:
`le.quan@example.com` / `Password123!` — **đổi mật khẩu ngay** (mật khẩu này công khai trong repo).

### Sửa code sau này (nếu bắt buộc)

```bash
cd ~/ats && git pull
bash deploy/build.sh frontend auth-service      # chỉ build lại service có thay đổi; bỏ tham số = build tất cả
```

Script tự dừng các service ứng dụng trước khi build (web ngừng trong lúc build), DB vẫn chạy và giữ dữ liệu.

**Lần cập nhật đầu tiên sau khi gộp compose (11/2026):** image đổi tên từ `ghcr.io/thanhduongw/ats/*` sang
`ats/*`, nên phải build lại **tất cả**: `git pull && bash deploy/build.sh` (không tham số). Volume `ats_pgdata`
giữ nguyên nên dữ liệu không mất. Xong thì xoá image cũ: `docker image prune -a -f`. Dòng `REGISTRY`/`TAG`
trong `~/ats/.env` không còn dùng, xoá được.

---

## Vận hành

- **Sao lưu hằng ngày:** `crontab -e` thêm
  `0 2 * * * /home/deploy/ats/deploy/backup.sh >> /home/deploy/ats/backups/backup.log 2>&1`
- **Tắt / bật cả hệ thống:** `docker compose stop` / `bash deploy/start.sh`.
  VPS khởi động lại thì container tự chạy lại (`restart: unless-stopped`).
- **Xem DB:** `docker compose exec postgres psql -U ats_user -d ats_auth`
- **RabbitMQ UI:** từ máy dev `ssh -L 15672:localhost:15672 deploy@<IP_VPS>` rồi mở http://localhost:15672
- **Google SSO** (chỉ khi có domain): thêm `<PUBLIC_URL>/api/auth/login/oauth2/code/google` vào Authorized redirect
  URIs, điền `GOOGLE_CLIENT_ID/SECRET` vào `.env`, rồi `docker compose up -d auth-service`.
- **Mobile:** `EXPO_PUBLIC_API_BASE_URL=<PUBLIC_URL>/api`.
- **Dọn ổ đĩa** sau khi build xong: `docker builder prune -f` (xóa cache build, lần build sau sẽ lâu hơn).

## Lỗi thường gặp

| Triệu chứng | Nguyên nhân / cách xử lý |
|---|---|
| Build bị `Killed` / exit 137, VPS đơ | Hết RAM. VPS: kiểm tra swap (`free -h`); local: tăng RAM cho Docker Desktop, đừng chạy gì khác trong lúc build |
| Container `OOMKilled` khi chạy | Giảm `JAVA_MAX_HEAP` trong `.env` (vd `320m`) rồi `bash deploy/start.sh` |
| `password authentication failed` | Volume `pgdata` được tạo với mật khẩu khác. Chưa có dữ liệu: `docker compose down -v` rồi chạy lại. Có dữ liệu rồi: `ALTER USER` |
| Đăng nhập xong gọi API 401 | `JWT_SECRET` trống hoặc vừa đổi — đăng xuất, đăng nhập lại |
| POST bị 403 `Invalid CORS request` | `PUBLIC_URL` không khớp địa chỉ trên thanh trình duyệt |
| Caddy không lấy được chứng chỉ | DNS chưa trỏ đúng IP, hoặc nhà cung cấp chặn 80/443 |
| Không nhận mail | `auth-service/.env` / `notification-service/.env` thiếu `MAIL_*`; email miền `example.com` bị bỏ qua có chủ ý |
