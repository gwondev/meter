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
├── docker-compose.yml
└── 로고(METER).png
```

---

## MQTT 프로토콜

| 방향 | 토픽 | 페이로드 예시 |
|------|------|---------------|
| 모듈 → 서버 | `meter/{serial}/status` | `{"status":"HEARTBEAT"}` (5분) |
| 모듈 → 서버 | `meter/{serial}/status` | `{"status":"HEIGHT","heightCm":25.3}` (1분) |

### IoT LED (핀: R=25, G=26, B=27)

| 거리 | LED |
|------|-----|
| ≤ 10cm | 빨강 (적재 위험) |
| ≤ 30cm | 주황 |
| ≤ 50cm | 초록 |
| > 50cm | OFF |

### 지도 연결 상태

- `lastHeartbeat` 기준 **N분 전 확인됨** 표시
- **24시간 이상** 미수신 → **모듈점검필요**

---

## REST API (주요)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/modules/{serial}/dispose` | 투입 카운트 +1 (리워드/MQTT 검증 없음) |
| GET | `/api/modules` | 거점 목록 (heightCm, lastHeartbeat 포함) |
| POST | `/api/ai/analyze` | AI Vision 분류·안내 |
| GET | `/api/iot/config` | IoT용 MQTT 호스트 정보 |

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

---

## IoT 빌드

```bash
cd meter_iot
# platformio.ini → build_flags = -DMETER_MODULE_SERIAL=m1
iot.cmd run -t upload
```

펌웨어 MQTT: `ws://mqtt-meter.gwon.run:80`  
토픽: `meter/{serial}/status`

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
