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
├── docs/             # DEVICE_SPEC.txt (기능·D/R/전원 통합 명세)
├── docker-compose.yml
└── 로고(METER).png
```

---

## 디바이스 통신

전체 명세(기능·D모듈·R인수·POWER TANK)는 **[`docs/DEVICE_SPEC.txt`](docs/DEVICE_SPEC.txt)**.

### 시리얼 규약

| 계열 | 시리얼 | deviceType | 측정 | 전송 |
|------|--------|-----------|------|------|
| 모듈1 (ESP32) | `m1`, `m2` … | `HEIGHT_SENSOR` | 초음파 → fill% | MQTT / 30초 |
| 모듈2 (RPi5) | `r1`, `r2` … | `VISION_CAM` | 영상 → fill% (+사진) | MQTT / 5분 |

### MQTT (M·R 공통)

| 항목 | 값 |
|------|-----|
| URI | `ws://mqtt-meter.gwon.run:80` |
| 토픽 | `meter/{serial}/status` (QoS 1, retain false) |
| M 페이로드 | `{"moduleSerial":"m1","fillPercent":72.5}` |
| R 페이로드 | 위 + 선택 `"imageBase64":"...","imageFormat":"jpg"` |
| 주기 | M 30초 · R 5분 |

하향 명령(`cmd`)은 사용하지 않는다. 발행 전용.

HTTP `POST /api/device/modules/{serial}/report` 는 **레거시/비상용**. R 인수 시 MQTT만 쓰면 된다.

---

## REST API (주요)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/modules` | 거점 목록 (fillPercent, signalState, lastSignalAt 포함) |
| POST | `/api/modules/cleanup` | 무신호 모듈 즉시 정리 |
| POST | `/api/device/modules/{serial}/report` | (레거시) R HTTP 보고 — 정식은 MQTT |
| GET | `/api/uploads/{serial}/{file}` | 모듈2 스냅샷 정적 서빙 |
| POST | `/api/ai/analyze` | AI Vision 분류·안내 |
| POST | `/api/ai/chat` | AI 챗봇 (마크다운 제거된 평문 응답) |
| GET | `/api/iot/config` | IoT용 MQTT 호스트 정보 |

---

## 디바이스 인증 (`/api/device/**`) — 레거시

R 모듈 정식 경로는 **MQTT** 이다. 아래 HTTP 토큰 API 는 비상·수동 테스트용으로만 남아 있다.

| 항목 | 값 |
|------|-----|
| 보호 경로 | `/api/device/**` |
| 헤더 | `X-METER-DEVICE-TOKEN` |
| 설정 | `METER_DEVICE_TOKEN` (미설정 시 해당 경로 503) |

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
