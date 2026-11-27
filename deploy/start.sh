#!/usr/bin/env bash
# Kéo image mới và khởi động stack theo từng đợt để VPS không hết RAM khi 10 JVM cùng lên.
# Container nào image không đổi thì `up -d` để nguyên, nên chạy lại script này khi cập nhật là an toàn.
#
#   cd ~/ats && ./deploy/start.sh            # dùng TAG trong .env
#   TAG=<sha commit> ./deploy/start.sh        # chạy một bản cụ thể (rollback)
set -euo pipefail
cd "$(dirname "$0")/.."

C="docker compose -f docker-compose.prod.yml"
WAIT="${WAIT:-30}"

wave() {
  local before after
  before=$($C ps -q "$@" 2>/dev/null | sort | tr '\n' ' ')
  $C up -d --remove-orphans "$@"
  after=$($C ps -q "$@" 2>/dev/null | sort | tr '\n' ' ')
  # Chỉ chờ khi đợt này có container mới được tạo / thay.
  if [ "$before" != "$after" ]; then
    echo "  ... chờ ${WAIT}s cho đợt [$*] khởi động"
    sleep "$WAIT"
  fi
}

if [ "${NO_PULL:-0}" = 1 ]; then
  # Image ứng dụng vừa build tại chỗ (deploy/build.sh): chỉ kéo image hạ tầng.
  echo "==> Kéo image hạ tầng"
  $C pull --quiet postgres rabbitmq redis caddy
else
  echo "==> Kéo image (TAG=${TAG:-theo .env})"
  $C pull --quiet
fi

echo "==> Hạ tầng"
$C up -d --wait postgres rabbitmq redis

echo "==> Service"
wave auth-service masterdata-service recruitment-service
wave candidate-service application-service interview-service
wave notification-service dashboard-service offer-service
wave ai-service
$C up -d --remove-orphans api-gateway frontend caddy

docker image prune -f >/dev/null
echo "==> Trạng thái"
$C ps --format "table {{.Service}}\t{{.Status}}"
