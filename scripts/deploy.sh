#!/usr/bin/env bash
# 서버 배포 (~/meter 에서 실행)
set -euo pipefail
cd "$(dirname "$0")/.."

git fetch origin main
git checkout main
git reset --hard origin/main

chmod +x scripts/prepare-env.sh
./scripts/prepare-env.sh ../.env.production

docker compose down
docker compose up --build -d
docker compose ps

echo ""
echo "헬스체크: curl -s https://meter.gwon.run/api/health"
echo "백엔드 로그: docker logs meter-backend --tail 80"
