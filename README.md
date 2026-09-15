# METER — 사각지대 감시와 최적 수거를 잇는 자원순환 AIoT 플랫폼

> **Multi-resource Environment Tracking & Efficiency Reporter**  
> ICT 빌드업캠프(2026) · 호남권 ICT 이노베이션스퀘어

**서비스**: [https://meter.gwon.run](https://meter.gwon.run)  
**저장소**: [https://github.com/gwondev/meter](https://github.com/gwondev/meter)  
**보고서 요약**: [`docs/REPORT_OVERVIEW.txt`](docs/REPORT_OVERVIEW.txt) ← 팀·배경·목표·모듈 한눈·기대효과  
**기술 명세**: [`docs/DEVICE_SPEC.txt`](docs/DEVICE_SPEC.txt) ← MQTT·API·Docker·스택·경로

---

## 한눈에 보기

| 영역 | 구성 | 한 줄 |
|------|------|--------|
| **WEB** | React 19 + Vite, MUI, Kakao Map | 지도 · AI 안내 · 최적 수거 · 관리자 |
| **API** | Spring Boot 4 (Java 21) + JPA | 인증 · AI · MQTT 구독 · 모듈 API |
| **DB** | MySQL `meter` / H2(로컬) | User · Module · DummyModule … |
| **AI** | Gemini 2.5 Flash | 품목 분류 · 챗봇 |
| **IoT** | D모듈(ESP32) · R모듈(카메라) | D: MQTT fill% · R: MQTT 이미지만 → 서버 vision fill% |
| **MQTT** | Eclipse Mosquitto | `meter/{serial}/status` (HTTP 디바이스 API 없음) |
| **INFRA** | Docker Compose + Cloudflare Tunnel | backend · frontend · mosquitto |

---

## 핵심 가치

- **사각지대 감시**: D/R 모듈로 순회가 어려운 거점 상태를 상시 확인
- **최적 수거**: 화면 내 모듈 전부 방문 · 만재 우선 · 도로망 경로
- **자원순환 안내**: AI로 품목 판별·투입 거점 위치 안내
- **공통 지표 `fillPercent`**: 0=수거 불필요 · 100=즉시 수거 (보드에서 산출)

---

## 시스템 아키텍처

```
D모듈 (m*) ──MQTT fill%────────┐
                               ├→ mqtt-meter.gwon.run → mosquitto → backend → MySQL
R모듈 (r*) ──MQTT 이미지만─────┘              (+ vision)              │
                                                                      ▼
                                                            frontend (meter.gwon.run)
```

| 호스트 | 경로 | Origin |
|--------|------|--------|
| `meter.gwon.run` | `/api/*` | `http://meter-backend:8080` |
| `meter.gwon.run` | `*` | `http://meter-frontend:5173` |
| `mqtt-meter.gwon.run` | `*` | `http://meter-mosquitto:9001` |

---

## 모노레포

```
meter/
├── backend/           # Spring Boot API
├── frontend/          # React + Vite
├── vision_service/    # R 이미지 비교 (OpenCV FastAPI)
├── meter_iot/         # D모듈 + module2(R 예시)
├── meter_HW/          # 하드웨어 CAD
├── mosquitto/         # MQTT 브로커 (패킷 한도 2MB)
├── scripts/           # prepare-env.sh
├── docs/
│   ├── REPORT_OVERVIEW.txt   # 보고서용 통합 요약
│   └── DEVICE_SPEC.txt       # 개발 기술명세 (API·MQTT·Docker)
└── docker-compose.yml
```

---

## 디바이스 (요약)

상세는 **[`docs/DEVICE_SPEC.txt`](docs/DEVICE_SPEC.txt)**, 보고서용은 **[`docs/REPORT_OVERVIEW.txt`](docs/REPORT_OVERVIEW.txt)**.

| 모듈 | 시리얼 | 역할 | 전송 |
|------|--------|------|------|
| **D** | `m1`, `m2`… | 초음파 → 보드에서 fill% | MQTT 30초 |
| **R** | `r1`, `r2`… | 이미지만 MQTT (간격=보드 결정). 서버가 원본+최근 10장 비교 → fill% | MQTT |
| POWER TANK | — | 전원만 (통신 없음) | — |

- URI: `ws://mqtt-meter.gwon.run:80` · Topic: `meter/{serial}/status` · QoS 1
- R: `imageRole=original` → baseline 덮어쓰기 · `sample` → 최근 10장 · `meter-vision`이 fill%
- 웹 R 클릭 시 최신 이미지. 디바이스 **HTTP/토큰 없음**

---

## REST API (웹·관리용)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/modules` | 거점 목록 (`fillPercent`, `signalState`, `lastImageUrl` …) |
| POST | `/api/modules/cleanup` | 무신호 모듈 정리 |
| GET | `/api/uploads/{serial}/{file}` | R 스냅샷 서빙 (MQTT로 수신한 파일) |
| POST | `/api/ai/analyze` | AI Vision |
| POST | `/api/ai/chat` | AI 챗봇 |
| GET | `/api/iot/config` | MQTT 호스트 정보 |

수거 유형 코드: `CLOTHING` · `PLASTIC` · `CAN` · `MEDICINE`

---

## 배포

```bash
cd meter
./scripts/prepare-env.sh ../.env.production
docker compose up -d --build
```

| 키 | 용도 |
|----|------|
| `GOOGLE_CLIENT_ID_METER` | Google OAuth |
| `METER_GEMINI_API_KEY` | Gemini |
| `KAKAO_API_METER` | Kakao Map |
| `DB_PASSWORD` | MySQL |
| `METER_MODULE_DEFAULT_DEPTH_CM` | 구형 heightCm 환산용 깊이 (기본 60) |
| `METER_MODULE_STALE_RETENTION_DAYS` | 무신호 자동 삭제 일수 (기본 10) |
| `METER_UPLOAD_DIR` | R 스냅샷 경로 |
| `METER_UPLOAD_KEEP_PER_MODULE` | R 샘플 보관 장수 (기본 10) |
| `METER_VISION_URL` | vision 서비스 URL (기본 `http://meter-vision:8090`) |
| `METER_VISION_ENABLED` | vision 호출 on/off |

---

## D모듈 펌웨어 빌드

```bash
cd meter_iot
# src/module1.cpp → MODULE_SERIAL = "m1";
iot.cmd run -t upload
```

- HC-SR04P (TRIG=GPIO32, ECHO=GPIO33) · 보드에서 `fillPercent` 산출 후 MQTT 발행

### R모듈 예시 (ESP32-CAM)

```bash
cd meter_iot/module2
pio run -t upload
```

- `imageRole=original|sample` 만 전송. fill%는 서버 `meter-vision`이 산출.

---

## 팀 METER

| 역할 | 이름 | 담당 |
|------|------|------|
| 팀장 | 이성권 | IoT · Infra · Security |
| 팀원 | 이건영 | Frontend · AI UX |
| 팀원 | 이수혁 | HW · ESP32 펌웨어 |
| 팀원 | 최은서 | Backend · DB · 분석 |

화이트 & 블랙 다크 UI — `#000000` 배경, 적재 상태는 빨강/주황/초록.
