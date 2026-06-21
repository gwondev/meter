#!/usr/bin/env bash
# 서버 배포 (~/meter 에서 실행)
set -euo pipefail
cd "$(dirname "$0")/.."

git fetch origin main
git checkout main
git reset --hard origin/main

chmod +x scripts/prepare-env.sh scripts/diagnose.sh scripts/setup-meter-db.sh
./scripts/prepare-env.sh ../.env.production
./scripts/setup-meter-db.sh || echo "WARN: setup-meter-db 실패 — root 로 GRANT 후 재시도"

if [[ ! -s backend/.env.production ]]; then
  echo "deploy: backend/.env.production 이 비어 있습니다. prepare-env 실패"
  exit 1
fi

docker compose down
docker compose up --build -d

echo ""
echo "=== 컨테이너 상태 ==="
docker compose ps

echo ""
echo "=== backend 기동 대기 (최대 90초) ==="
ok=0
for i in $(seq 1 18); do
  if docker run --rm --network global_network curlimages/curl:8.5.0 -fsS -m 5 \
      http://meter-backend:8080/api/health >/dev/null 2>&1; then
    ok=1
    break
  fi
  sleep 5
done

if [[ "$ok" -eq 1 ]]; then
  echo "OK: meter-backend /api/health 응답"
  curl -fsS https://meter.gwon.run/api/health || echo "WARN: 외부 HTTPS 헬스체크 실패 — Cloudflare origin 확인"
else
  echo "FAIL: meter-backend 가 기동하지 않았습니다."
  docker logs meter-backend --tail 120
  echo ""
  echo "진단: ./scripts/diagnose.sh"
  exit 1
fi
