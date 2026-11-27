# Deploy ATS lên VPS

Hai cách, dùng chung `docker-compose.prod.yml`:

- **Cách A — build ngay trên VPS** (đang dùng: deploy một lần để báo cáo). `git clone` → `bash deploy/build.sh`.
- **Cách B — GitHub Actions build, VPS chỉ kéo image** (khi cần cập nhật thường xuyên). Xem cuối file.

```
Internet ─► Caddy :80/:443 ─► frontend (nginx) ─► /api, /ws ─► api-gateway ─► 10 service + ai-service
                                                                   Postgres · RabbitMQ · Redis (không mở cổng ra ngoài)
```

| File | Vai trò |
|---|---|
| `docker-compose.prod.yml` | Stack chạy trên VPS. Chỉ Caddy mở cổng 80/443; heap mỗi JVM giới hạn; giờ +7 |
| `docker-compose.build.yml` | Bổ sung `build:` cho cách A |
| `deploy/build.sh` | Cách A: build lần lượt từng service (không song song để khỏi hết RAM) rồi gọi `start.sh` |
| `deploy/start.sh` | Khởi động theo đợt 3 service |
| `deploy/backup.sh` | `pg_dumpall` ra `~/ats/backups`, giữ 14 ngày |
| `deploy/Caddyfile` | Reverse proxy; có domain thì tự cấp HTTPS |
| `deploy/.env.example` | Mẫu `~/ats/.env` |

---

## Cách A — build trên VPS

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

Từ máy dev (Git Bash, thư mục `E:\ATS`) — các file này không có trên GitHub:

```bash
for s in auth-service candidate-service notification-service ai-service; do
  scp $s/.env deploy@<IP_VPS>:~/ats/$s/.env
done
```

Trên VPS:

```bash
cd ~/ats
cp deploy/.env.example .env
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

Lần đầu 30–50 phút (ai-service tải PaddleOCR lâu nhất). Ngắt SSH giữa chừng sẽ dừng build — muốn chạy nền:
`nohup bash deploy/build.sh > build.log 2>&1 &` rồi xem `tail -f build.log`.

### 5. Kiểm tra

```bash
docker compose -f docker-compose.prod.yml ps                       # tất cả "Up"
docker compose -f docker-compose.prod.yml logs --tail=80 auth-service
docker stats --no-stream                                           # RAM từng container
```

Mở `PUBLIC_URL` trên trình duyệt. DB mới chỉ có quản trị viên tạo bởi `docker/postgres-init`:
`le.quan@example.com` / `Password123!` — **đổi mật khẩu ngay** (mật khẩu này công khai trong repo).

### Sửa code sau này (nếu bắt buộc)

```bash
cd ~/ats && git pull
bash deploy/build.sh frontend auth-service      # chỉ build lại service có thay đổi; bỏ tham số = build tất cả
```

Script tự dừng các service ứng dụng trước khi build (web ngừng trong lúc build), DB vẫn chạy và giữ dữ liệu.

---

## Vận hành

- **Sao lưu hằng ngày:** `crontab -e` thêm
  `0 2 * * * /home/deploy/ats/deploy/backup.sh >> /home/deploy/ats/backups/backup.log 2>&1`
- **Tắt / bật cả hệ thống:** `docker compose -f docker-compose.prod.yml stop` / `NO_PULL=1 bash deploy/start.sh`.
  VPS khởi động lại thì container tự chạy lại (`restart: unless-stopped`).
- **Xem DB:** `docker compose -f docker-compose.prod.yml exec postgres psql -U ats_user -d ats_auth`
- **RabbitMQ UI:** từ máy dev `ssh -L 15672:localhost:15672 deploy@<IP_VPS>` rồi mở http://localhost:15672
- **Google SSO** (chỉ khi có domain): thêm `<PUBLIC_URL>/api/auth/login/oauth2/code/google` vào Authorized redirect
  URIs, điền `GOOGLE_CLIENT_ID/SECRET` vào `.env`, rồi `docker compose -f docker-compose.prod.yml up -d auth-service`.
- **Mobile:** `EXPO_PUBLIC_API_BASE_URL=<PUBLIC_URL>/api`.
- **Dọn ổ đĩa** sau khi build xong: `docker builder prune -f` (xóa cache build, lần build sau sẽ lâu hơn).

## Lỗi thường gặp

| Triệu chứng | Nguyên nhân / cách xử lý |
|---|---|
| Build bị `Killed` / exit 137, VPS đơ | Hết RAM. Kiểm tra swap (`free -h`), đừng chạy gì khác trong lúc build |
| Container `OOMKilled` khi chạy | Giảm `JAVA_MAX_HEAP` trong `.env` (vd `320m`) rồi `NO_PULL=1 bash deploy/start.sh` |
| `password authentication failed` | Volume `pgdata` được tạo với mật khẩu khác. Chưa có dữ liệu: `docker compose -f docker-compose.prod.yml down -v` rồi chạy lại. Có dữ liệu rồi: `ALTER USER` |
| Đăng nhập xong gọi API 401 | `JWT_SECRET` trống hoặc vừa đổi — đăng xuất, đăng nhập lại |
| POST bị 403 `Invalid CORS request` | `PUBLIC_URL` không khớp địa chỉ trên thanh trình duyệt |
| Caddy không lấy được chứng chỉ | DNS chưa trỏ đúng IP, hoặc nhà cung cấp chặn 80/443 |
| Không nhận mail | `auth-service/.env` / `notification-service/.env` thiếu `MAIL_*`; email miền `example.com` bị bỏ qua có chủ ý |

---

## Cách B — GitHub Actions (tùy chọn)

`.github/workflows/deploy.yml` build 12 image lên `ghcr.io/thanhduongw/ats/*`, SSH vào VPS chạy `deploy/start.sh`.
Hiện chỉ chạy khi bấm tay; muốn tự chạy khi push `main` thì thêm `push: branches: [main]` vào `on:`.

1. Máy dev: `ssh-keygen -t ed25519 -f ~/.ssh/ats_deploy -N ""` rồi `ssh-copy-id -i ~/.ssh/ats_deploy.pub deploy@<IP>`.
2. Repo → Settings → Secrets and variables → Actions: `VPS_HOST` (IP), `VPS_USER` (`deploy`), `VPS_SSH_KEY`
   (nội dung `~/.ssh/ats_deploy`), tùy chọn `VPS_PORT`.
3. `~/ats` trên VPS cần `.env` và 4 file `.env` của service như bước 3 ở trên; workflow tự chép compose và script.
4. Quay về bản cũ: image gắn tag theo SHA commit — `TAG=<sha> bash deploy/start.sh` (`cat ~/ats/.deployed_tag`).
