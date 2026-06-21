#!/usr/bin/env bash
# meter-backend 502 원인 진단 (서버 ~/meter 에서 실행)
set -u

cd "$(dirname "$0")/.."

echo "=== docker compose ps ==="
docker compose ps || true

echo ""
echo "=== meter-backend 최근 로그 (80줄) ==="
docker logs meter-backend --tail 80 2>&1 || echo "meter-backend 컨테이너 없음"

echo ""
echo "=== env 파일 존재 여부 ==="
for f in backend/.env.production frontend/.env.production .env; do
  if [[ -f "$f" ]]; then
    echo "OK  $f"
  else
    echo "MISS $f  → ./scripts/prepare-env.sh ../.env.production 실행 필요"
  fi
done

echo ""
echo "=== backend/.env.production 필수 키 ==="
if [[ -f backend/.env.production ]]; then
  for key in DB_USERNAME DB_PASSWORD GOOGLE_CLIENT_ID GEMINI_API_KEY; do
    if grep -q "^${key}=." backend/.env.production 2>/dev/null; then
      echo "OK  $key"
    else
      echo "MISS/EMPTY  $key"
    fi
  done
fi

echo ""
echo "=== MySQL meter DB 연결 테스트 ==="
if [[ -f backend/.env.production ]] && docker ps --format '{{.Names}}' | grep -qx 'gwon-db'; then
  set -a
  # shellcheck disable=SC1091
  source backend/.env.production
  set +a
  if docker exec gwon-db mysql -u"${DB_USERNAME:-gwon}" -p"$DB_PASSWORD" -e "USE meter; SELECT 1;" >/dev/null 2>&1; then
    echo "OK: gwon → meter DB 연결 성공"
  else
    echo "FAIL: gwon → meter DB 연결 실패 (DB 없음 또는 권한 없음)"
    echo "  해결: ./scripts/setup-meter-db.sh"
    docker exec gwon-db mysql -u"${DB_USERNAME:-gwon}" -p"$DB_PASSWORD" -e "SHOW DATABASES LIKE 'meter';" 2>&1 | tail -5 || true
  fi
else
  echo "SKIP: backend/.env.production 또는 gwon-db 없음"
fi

echo ""
echo "=== Docker 네트워크에서 backend 헬스체크 ==="
if docker ps --format '{{.Names}}' | grep -qx 'meter-backend'; then
  docker run --rm --network global_network curlimages/curl:8.5.0 -fsS -m 10 \
    http://meter-backend:8080/api/health && echo "OK: meter-backend 응답 정상" \
    || echo "FAIL: global_network 에서 meter-backend:8080 접속 불가"
else
  echo "SKIP: meter-backend 컨테이너가 실행 중이 아님"
fi

echo ""
echo "=== gwon-db 연결 테스트 (meter-backend 컨테이너 내부) ==="
if docker ps --format '{{.Names}}' | grep -qx 'meter-backend'; then
  docker exec meter-backend sh -c 'getent hosts gwon-db && echo gwon-db DNS OK' 2>&1 \
    || echo "FAIL: gwon-db 호스트명 해석 실패 (global_network 확인)"
else
  echo "SKIP"
fi

echo ""
echo "=== 외부 HTTPS 헬스체크 ==="
curl -fsS -m 10 https://meter.gwon.run/api/health && echo "" && echo "OK: Cloudflare → backend 경로 정상" \
  || echo "FAIL: https://meter.gwon.run/api/health (502면 Cloudflare origin 또는 backend 다운)"

echo ""
echo "=== 자주 필요한 MySQL 권한 (meter DB 생성만 했을 때) ==="
cat <<'SQL'
mysql -u root -p
GRANT ALL PRIVILEGES ON meter.* TO 'gwon'@'%';
FLUSH PRIVILEGES;
SQL

echo ""
echo "=== Cloudflare Tunnel origin 확인 ==="
echo "  meter.gwon.run /api/*  → http://meter-backend:8080"
echo "  meter.gwon.run *       → http://meter-frontend:5173"
