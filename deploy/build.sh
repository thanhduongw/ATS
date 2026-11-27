#!/usr/bin/env bash
# Build image rồi khởi động cả hệ thống — chạy như nhau ở máy local (Git Bash) và trên VPS.
# Build LẦN LƯỢT từng service: máy 8 GB không đủ RAM để build song song, càng không đủ để vừa chạy vừa build,
# nên nếu hệ thống đang chạy, script dừng các service ứng dụng trước (Postgres/RabbitMQ/Redis vẫn chạy).
#
#   bash deploy/build.sh                           # build tất cả (lần đầu ~20–30 phút)
#   bash deploy/build.sh frontend auth-service     # chỉ build lại vài service sau khi sửa code
set -euo pipefail
cd "$(dirname "$0")/.."

APP_SERVICES=(auth-service masterdata-service recruitment-service candidate-service interview-service
              notification-service dashboard-service application-service offer-service api-gateway
              ai-service frontend)
TARGETS=("$@")
[ ${#TARGETS[@]} -eq 0 ] && TARGETS=("${APP_SERVICES[@]}")

# --- Kiểm tra file cấu hình trước khi tốn 30 phút build ---
missing=0
for f in .env auth-service/.env candidate-service/.env notification-service/.env ai-service/.env; do
  [ -f "$f" ] || { echo "Thiếu $f — xem deploy/README.md"; missing=1; }
done
for v in DOMAIN PUBLIC_URL POSTGRES_PASSWORD RABBITMQ_PASSWORD JWT_SECRET; do
  grep -qE "^$v=.+" .env || { echo "Chưa điền $v trong .env"; missing=1; }
done
[ $missing -eq 0 ] || exit 1

C="docker compose"

running=$($C ps -q "${APP_SERVICES[@]}" 2>/dev/null || true)
if [ -n "$running" ]; then
  echo "==> Dừng các service ứng dụng để lấy RAM cho build (DB vẫn chạy)"
  $C stop caddy "${APP_SERVICES[@]}"
fi

start=$(date +%s)
for s in "${TARGETS[@]}"; do
  echo "==> Build $s  ($(date +%T))"
  $C build "$s"
done
echo "==> Build xong sau $(( ($(date +%s) - start) / 60 )) phút"

NO_PULL=1 bash deploy/start.sh
