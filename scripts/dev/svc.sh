#!/usr/bin/env bash
# Khoi dong lai mot (hoac nhieu) service cua ATS o che do nen, ghi log vao logs/<service>.log.
# Dung trong Git Bash:  scripts/dev/svc.sh restart interview-service application-service
#                       scripts/dev/svc.sh stop auth-service
#                       scripts/dev/svc.sh status
#                       scripts/dev/svc.sh wait interview-service   (cho toi khi cong mo, toi da 240s)
# Ten service: api-gateway auth-service masterdata-service recruitment-service candidate-service
#              interview-service notification-service dashboard-service application-service offer-service ai-service
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
declare -A PORT=( [api-gateway]=8080 [auth-service]=8081 [masterdata-service]=8082 [recruitment-service]=8083
  [candidate-service]=8084 [interview-service]=8085 [notification-service]=8086 [dashboard-service]=8087
  [ai-service]=8088 [application-service]=8089 [offer-service]=8090 )

pid_of() { netstat -ano | grep LISTENING | grep -E "[:.]$1 " | awk '{print $5}' | sort -u | head -1; }

stop_one() {
  local pid; pid="$(pid_of "${PORT[$1]}")"
  if [ -n "$pid" ]; then
    taskkill //F //T //PID "$pid" > /dev/null 2>&1; echo "da dung $1 (pid $pid)"
    # Cho tien trinh cu nha file log: khoi dong ngay se khong mo duoc logs/<service>.log va service khong len.
    sleep 3
  fi
}

start_one() {
  powershell -NoProfile -ExecutionPolicy Bypass -File "$(cygpath -w "$ROOT/scripts/dev/start-service.ps1")" "$1"
  echo "dang khoi dong $1 (log: logs/$1.log)"
}

wait_one() {
  for _ in $(seq 1 120); do
    [ -n "$(pid_of "${PORT[$1]}")" ] && { echo "$1 da san sang"; return 0; }
    sleep 2
  done
  echo "$1 CHUA mo cong sau 240s - xem logs/$1.log"; return 1
}

cmd="${1:-status}"; shift || true
case "$cmd" in
  status) for s in "${!PORT[@]}"; do printf '%-22s %s\n' "$s" "$( [ -n "$(pid_of "${PORT[$s]}")" ] && echo UP || echo DOWN )"; done | sort ;;
  stop) for s in "$@"; do stop_one "$s"; done ;;
  restart) for s in "$@"; do stop_one "$s"; start_one "$s"; done; rc=0; for s in "$@"; do wait_one "$s" || rc=1; done; exit $rc ;;
  wait) rc=0; for s in "$@"; do wait_one "$s" || rc=1; done; exit $rc ;;
  *) echo "lenh khong hop le: $cmd"; exit 2 ;;
esac
