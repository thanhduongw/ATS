#!/usr/bin/env bash
# Sao lưu toàn bộ Postgres ra ~/ats/backups/ats_YYYY-MM-DD_HHMM.sql.gz, giữ 14 ngày.
# Cron (crontab -e):  0 2 * * * /home/deploy/ats/deploy/backup.sh >> /home/deploy/ats/backups/backup.log 2>&1
# Khôi phục:  gunzip -c backups/<file>.sql.gz | docker compose -f docker-compose.prod.yml exec -T postgres psql -U ats_user -d postgres
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a

mkdir -p backups
f="backups/ats_$(date +%F_%H%M).sql.gz"
docker compose -f docker-compose.prod.yml exec -T postgres pg_dumpall -U "$POSTGRES_USER" | gzip > "$f"
find backups -name 'ats_*.sql.gz' -mtime +14 -delete
echo "$(date '+%F %T') đã sao lưu $f ($(du -h "$f" | cut -f1))"
