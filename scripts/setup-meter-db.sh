#!/usr/bin/env bash
# meter DB 생성 및 gwon 사용자 연결 테스트 (서버 ~/meter 에서 실행)
set -euo pipefail

cd "$(dirname "$0")/.."

ENV_FILE="backend/.env.production"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "setup-meter-db: $ENV_FILE 없음 → ./scripts/prepare-env.sh ../.env.production 먼저 실행"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

: "${DB_USERNAME:?DB_USERNAME missing in $ENV_FILE}"
: "${DB_PASSWORD:?DB_PASSWORD missing in $ENV_FILE}"

if ! docker ps --format '{{.Names}}' | grep -qx 'gwon-db'; then
  echo "setup-meter-db: gwon-db 컨테이너가 실행 중이 아닙니다."
  echo "  docker ps | grep gwon-db 로 확인하세요."
  exit 1
fi

echo "=== gwon-db DNS (global_network) ==="
docker run --rm --network global_network busybox:1.36 nslookup gwon-db 2>/dev/null || true

echo ""
echo "=== meter DB 생성 시도 (gwon 계정) ==="
if docker exec gwon-db mysql -u"$DB_USERNAME" -p"$DB_PASSWORD" -e \
    "CREATE DATABASE IF NOT EXISTS meter CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null; then
  echo "OK: CREATE DATABASE meter (gwon)"
else
  echo "WARN: gwon 으로 DB 생성 실패 — root 로 GRANT 필요할 수 있습니다."
  cat <<'SQL'

  docker exec -it gwon-db mysql -uroot -p
  CREATE DATABASE IF NOT EXISTS meter CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  GRANT ALL PRIVILEGES ON meter.* TO 'gwon'@'%';
  FLUSH PRIVILEGES;

SQL
  exit 1
fi

echo ""
echo "=== meter DB 연결 테스트 ==="
docker exec gwon-db mysql -u"$DB_USERNAME" -p"$DB_PASSWORD" -e "USE meter; SELECT 'meter DB OK' AS status;"

echo ""
echo "setup-meter-db: OK — 이제 docker compose up -d --build backend"
