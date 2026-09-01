# METER — 범용 탈부착형 AIoT 모듈 기반 적재 자원 통합관리 플랫폼

> **Multi-resource Environment Tracking & Efficiency Reporter**  
> ICT 빌드업캠프(2026) · 호남권 ICT 이노베이션스퀘어

**서비스 URL**: [https://meter.gwon.run](https://meter.gwon.run)  
**저장소**: [https://github.com/gwondev/meter](https://github.com/gwondev/meter)

---

## 한눈에 보기

| 영역 | 구성 | 한 줄 요약 |
|------|------|-----------|
| **WEB** | React 19 + Vite, MUI, Kakao Map | 지도 기반 거점 모니터링 · AI 촬영 안내 · 통합 관제 |
| **API** | Spring Boot 4 (Java 21) + JPA | 인증 · AI · MQTT · 모듈/투입 API |
| **DB** | MySQL `meter` (배포) / H2 (로컬) | User · Module · DisposalRecord · RewardHistory |
| **AI** | Gemini 2.5 Flash | CLOTHING / PLASTIC / CAN / MEDICINE 분류·안내 |
| **IoT** | ESP32 + HC-SR04 + RGB LED | 5분 HEARTBEAT · 1분 HEIGHT · LED 10/30/50cm |
| **MQTT** | Eclipse Mosquitto | `meter/{serial}/status` |
| **INFRA** | Docker Compose + Cloudflare Tunnel | meter-backend · meter-frontend · meter-mosquitto |

---

## 핵심 가치

- **실시간 적재량 모니터링**: 초음파 센서로 용기 내부 거리(적재 높이) 측정
- **통합 관제**: 의류수거함 · 플라스틱쓰레기통 · 캔쓰레기통 · 폐의약품수거함을 하나의 플랫폼에서 관리
- **AI 안내**: 촬영 기반 품목 인식 및 올바른 배출·수거 방법 안내
- **운영 효율**: 수거 우선순위·최적 동선·데이터 분석으로 불필요한 현장 순회 감소

---

## 시스템 아키텍처

```
[ESP32 IoT] ──MQTT WS──► [mqtt-meter.gwon.run] ──► [meter-mosquitto:9001]
                              │
                              ▼
                    [meter-backend:8080] ◄──REST──► [meter-frontend:5173]
                              │
                              ▼
                    [MySQL gwon-db/meter]
```

### Cloudflare Tunnel 라우팅

| 호스트 | 경로 | Origin |
|--------|------|--------|
| `meter.gwon.run` | `/api/*` | `http://meter-backend:8080` |
| `meter.gwon.run` | `*` | `http://meter-frontend:5173` |
| `mqtt-meter.gwon.run` | `*` | `http://meter-mosquitto:9001` |

---

## 모노레포 구조

```
meter/
├── backend/          # Spring Boot API
├── frontend/         # React + Vite
├── meter_iot/        # ESP32 펌웨어 (PlatformIO)
├── meter_HW/         # 하드웨어 CAD
├── mosquitto/        # MQTT 브로커 설정
├── scripts/          # prepare-env.sh
├── docs/             # DEVICE_SPEC.txt (모듈·서버·웹 통합 명세), R_MODULE_HANDOFF.txt
├── docker-compose.yml
└── 로고(METER).png
```

---

## 디바이스 통신

전체 명세는 **[`docs/DEVICE_SPEC.txt`](docs/DEVICE_SPEC.txt)** 를 참조한다 (모듈1·모듈2·모듈3·서버·웹).
R(라즈베리) 담당자 전달용은 **[`docs/R_MODULE_HANDOFF.txt`](docs/R_MODULE_HANDOFF.txt)**.

### 시리얼 규약

| 계열 | 시리얼 | deviceType | 측정 | 전송 |
|------|--------|-----------|------|------|
| 모듈1 (ESP32) | `m1`, `m2` … | `HEIGHT_SENSOR` | 초음파 높이(cm) | MQTT / 5초 |
| 모듈2 (RPi5) | `r1`, `r2` … | `VISION_CAM` | 영상 변화 %(0~100) | HTTPS / 5분 |

### MQTT (모듈1)

| 항목 | 값 |
|------|-----|
| URI | `ws://mqtt-meter.gwon.run:80` (MQTT over WebSocket) |
| 토픽 | `meter/{serial}/status` (QoS 1, retain false) |
| 페이로드 | `{"moduleSerial":"m1","heightCm":25.3}` |
| 주기 | 5초 — `HEARTBEAT` / `HEIGHT` 구분 없는 단일 형태 |

하향 명령(`cmd`)과 `events` 토픽은 사용하지 않는다. 발행 전용 단방향이다.

### 적재율 정규화

두 계열의 측정 단위가 달라서 `fillPercent` (0~100) 로 통일한 뒤 최적 경로에 함께 넣는다.

- 모듈1: `clamp((depthCm - heightCm) / depthCm × 100, 0, 100)` — `depthCm` 미지정 시 기본 60cm
- 모듈2: 보고값 그대로

### 신호 상태

| 계열 | 허용 지연 | 초과 시 |
|------|----------|--------|
| 모듈1 | 60초 | `WAITING` (지도에서 회색 «신호 대기중») |
| 모듈2 | 12분 | `WAITING` |

신호가 10일 이상 끊긴 모듈은 매시 스케줄러가 자동 삭제한다.

---

## REST API (주요)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/modules` | 거점 목록 (fillPercent, signalState, lastSignalAt 포함) |
| POST | `/api/modules/cleanup` | 무신호 모듈 즉시 정리 |
| POST | `/api/device/modules/{serial}/report` | 모듈2 백분위 + 사진 업로드 (토큰 필요) |
| GET | `/api/uploads/{serial}/{file}` | 모듈2 스냅샷 정적 서빙 |
| POST | `/api/ai/analyze` | AI Vision 분류·안내 |
| POST | `/api/ai/chat` | AI 챗봇 (마크다운 제거된 평문 응답) |
| GET | `/api/iot/config` | IoT용 MQTT 호스트 정보 |

---

## 디바이스 인증 (`/api/device/**`)

브라우저 세션이 없는 IoT 디바이스(모듈2 라즈베리파이 등)는 Google OAuth 대신 **사전 공유 토큰**으로 인증한다.

| 항목 | 값 |
|------|-----|
| 보호 경로 | `/api/device/**` |
| 헤더 | `X-METER-DEVICE-TOKEN: <token>` (또는 `Authorization: Bearer <token>`) |
| 설정 키 | `METER_DEVICE_TOKEN` → `meter.device.token` |

토큰 생성:

```bash
openssl rand -hex 32
```

생성한 값을 서버 `.env.production`에 `METER_DEVICE_TOKEN=...` 으로 넣고 `./scripts/prepare-env.sh` 를 다시 실행한다.

호출 예시:

```bash
curl -X POST https://meter.gwon.run/api/device/... \
  -H "X-METER-DEVICE-TOKEN: $METER_DEVICE_TOKEN" \
  -F "image=@current.jpg"
```

응답 규약:

| 상태 | 의미 |
|------|------|
| `401` | 토큰 불일치 또는 헤더 누락 |
| `503` | 서버에 `METER_DEVICE_TOKEN` 미설정 (fail-closed) |

토큰이 설정되지 않으면 해당 경로는 **열리지 않고 전부 차단된다.** 설정 누락이 무인증 개방으로 이어지지 않게 하기 위함이며,
기동 로그의 `meter.device.token present=` 로 설정 여부를 확인할 수 있다.

---

## 모듈 분류 (TYPE)

| 코드 | 설명 |
|------|------|
| `CLOTHING` | 의류수거함 |
| `PLASTIC` | 플라스틱쓰레기통 |
| `CAN` | 캔쓰레기통 |
| `MEDICINE` | 폐의약품수거함 |

---

## 배포

```bash
# 서버 상위 .env.production 준비 후
cd meter
./scripts/prepare-env.sh ../.env.production
docker compose up -d --build
```

### 환경 변수 (`.env.production` 키 이름)

| 키 | 용도 |
|----|------|
| `GOOGLE_CLIENT_ID_METER` | Google OAuth |
| `METER_GEMINI_API_KEY` | Gemini Vision |
| `KAKAO_API_METER` | Kakao Map SDK |
| `DB_PASSWORD` | MySQL |
| `METER_DEVICE_TOKEN` | IoT 디바이스 API 토큰 (`openssl rand -hex 32`) |
| `METER_MODULE_DEFAULT_DEPTH_CM` | depthCm 미지정 모듈의 기본 용기 깊이 (기본 60) |
| `METER_MODULE_STALE_RETENTION_DAYS` | 무신호 모듈 자동 삭제 기준 일수 (기본 10) |
| `METER_UPLOAD_DIR` | 모듈2 스냅샷 저장 경로 (기본 `/backend/uploads`) |

---

## IoT 빌드

```bash
cd meter_iot
# src/module1.cpp 최상단 → static const char *const MODULE_SERIAL = "m1";
iot.cmd run -t upload
```

- 소스: `meter_iot/src/module1.cpp` (모듈1 전용)
- 시리얼 번호는 소스 상수에서 지정한다 (`platformio.ini` 의 `build_flags` 미사용)
- WiFi 는 SSID 목록 × 비밀번호 목록의 전 조합을 순차 시도한다
- 초음파: HC-SR04P (TRIG=GPIO32, ECHO=GPIO33), 유효 범위 2~100cm

---

## 팀 METER

| 역할 | 이름 | 담당 |
|------|------|------|
| 팀장 | 이성권 | IoT · Infra · Security |
| 팀원 | 이건영 | Frontend · AI UX |
| 팀원 | 이수혁 | HW · ESP32 펌웨어 |
| 팀원 | 최은서 | Backend · DB · 분석 |

---

## UI 테마

화이트 & 블랙 기반 다크 UI — `#0a0a0a` 배경, `#ffffff` 포인트, 적재 상태는 빨강/주황/초록으로 표시.
