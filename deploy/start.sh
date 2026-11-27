#!/usr/bin/env bash
# Khởi động cả hệ thống theo từng đợt để máy không hết RAM khi 10 JVM cùng lên.
# Container nào image không đổi thì `up -d` để nguyên, nên chạy lại script này là an toàn.
# Thường không gọi trực tiếp: deploy/build.sh build xong sẽ gọi script này.
#
#   bash deploy/start.sh               # khởi động / khởi động lại với image đã build
#   NO_PULL=1 bash deploy/start.sh     # không kéo image hạ tầng mới (máy không có mạng)
set -euo pipefail
cd "$(dirname "$0")/.."

C="docker compose"
WAIT="${WAIT:-30}"

wave() {
  local before after
  before=$($C ps -q "$@" 2>/dev/null | sort | tr '\n' ' ')
  $C up -d --no-build --remove-orphans "$@"
  after=$($C ps -q "$@" 2>/dev/null | sort | tr '\n' ' ')
  # Chỉ chờ khi đợt này có container mới được tạo / thay.
  if [ "$before" != "$after" ]; then
    echo "  ... chờ ${WAIT}s cho đợt [$*] khởi động"
    sleep "$WAIT"
  fi
}

if [ "${NO_PULL:-0}" != 1 ]; then
  echo "==> Kéo image hạ tầng"
  $C pull --quiet postgres rabbitmq redis caddy
fi

echo "==> Hạ tầng"
$C up -d --wait postgres rabbitmq redis

echo "==> Service"
wave auth-service masterdata-service recruitment-service
wave candidate-service application-service interview-service
wave notification-service dashboard-service offer-service
wave ai-service
$C up -d --no-build --remove-orphans api-gateway frontend caddy

docker image prune -f >/dev/null
echo "==> Trạng thái"
$C ps --format "table {{.Service}}\t{{.Status}}"
