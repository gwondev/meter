# METER — 사각지대 감시와 최적 수거를 잇는 자원순환 AIoT 플랫폼

> **Multi-resource Environment Tracking & Efficiency Reporter**  
> ICT 빌드업캠프(2026) · 호남권 ICT 이노베이션스퀘어

**서비스**: [https://meter.gwon.run](https://meter.gwon.run)  
**저장소**: [https://github.com/gwondev/meter](https://github.com/gwondev/meter)  
**디바이스·기능 명세**: [`docs/DEVICE_SPEC.txt`](docs/DEVICE_SPEC.txt) ← D/R·MQTT·POWER TANK 상세는 여기만 본다

---

## 한눈에 보기

| 영역 | 구성 | 한 줄 |
|------|------|--------|
| **WEB** | React 19 + Vite, MUI, Kakao Map | 지도 · AI 안내 · 최적 수거 · 관리자 |
| **API** | Spring Boot 4 (Java 21) + JPA | 인증 · AI · MQTT 구독 · 모듈 API |
| **DB** | MySQL `meter` / H2(로컬) | User · Module · DummyModule … |
| **AI** | Gemini 2.5 Flash | 품목 분류 · 챗봇 |
| **IoT** | D모듈(ESP32) · R모듈(RPi5) | 보드가 `fillPercent` 0~100 계산 후 MQTT만 전송 |
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
R모듈 (r*) ──MQTT fill%+사진───┘                                      │
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
├── meter_iot/         # D모듈 펌웨어 (PlatformIO, module1.cpp)
├── meter_HW/          # 하드웨어 CAD
├── mosquitto/         # MQTT 브로커 (패킷 한도 2MB)
├── scripts/           # prepare-env.sh
├── docs/DEVICE_SPEC.txt
└── docker-compose.yml
```

---

## 디바이스 (요약)

상세·페이로드·주기는 **[`docs/DEVICE_SPEC.txt`](docs/DEVICE_SPEC.txt)**.

| 모듈 | 시리얼 | 역할 | 전송 |
|------|--------|------|------|
| **D** | `m1`, `m2`… | 초음파 → 보드에서 fill% | MQTT 30초 |
| **R** | `r1`, `r2`… | 1분 촬영·원본비교 → 5분마다 fill%+압축 JPEG | MQTT 5분 |
| POWER TANK | — | 전원만 (통신 없음) | — |

- URI: `ws://mqtt-meter.gwon.run:80` · Topic: `meter/{serial}/status` · QoS 1
- R 클릭 시 웹은 최신 이미지(`lastImageUrl`) 표시 · 서버는 모듈당 최근 **20장** 보관
- 디바이스 → 서버 **HTTP/토큰 없음** (MQTT만)

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
| `METER_UPLOAD_KEEP_PER_MODULE` | 모듈당 보관 장수 (기본 20) |

---

## D모듈 펌웨어 빌드

```bash
cd meter_iot
# src/module1.cpp → MODULE_SERIAL = "m1";
iot.cmd run -t upload
```

- HC-SR04P (TRIG=GPIO32, ECHO=GPIO33) · 보드에서 `fillPercent` 산출 후 MQTT 발행

---

## 팀 METER

| 역할 | 이름 | 담당 |
|------|------|------|
| 팀장 | 이성권 | IoT · Infra · Security |
| 팀원 | 이건영 | Frontend · AI UX |
| 팀원 | 이수혁 | HW · ESP32 펌웨어 |
| 팀원 | 최은서 | Backend · DB · 분석 |

화이트 & 블랙 다크 UI — `#000000` 배경, 적재 상태는 빨강/주황/초록.
