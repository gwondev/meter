# METER 통합 기능 · 디바이스 명세서

> 최종 갱신: 2026-09-02  
> 서비스: [https://meter.gwon.run](https://meter.gwon.run)  
> 대상: 백엔드 / 프론트엔드 / 모듈1(ESP32·M) / 모듈2(라즈베리파이·R) / 모듈3(전원)

---

## 1. 프로젝트 총괄

### 1.1 한 줄 요약

METER 는 **수거 거점(모듈)의 적재 상태(0~100%)** 를 실시간으로 모아, 지도·최적 수거 경로·사용자 리워드·AI 분류를 제공하는 웹·IoT 플랫폼이다.

### 1.2 시스템 구성

```
[모듈1 ESP32 M]  --MQTT WS-->  mqtt-meter.gwon.run:80  --> meter-mosquitto
                                                          |
[모듈2 RPi R]   --HTTPS----->  meter.gwon.run/api/device/...
                                                          v
                                                    meter-backend (:8080)
                                                          |
                                                    MySQL (meter DB)
                                                          |
[브라우저]      <--HTTPS----  meter.gwon.run  <--  meter-frontend
```

| 구성요소 | 역할 |
|---|---|
| `meter-frontend` | 지도·로그인·관리자·챗봇 UI (React) |
| `meter-backend` | API · MQTT 구독 · 모듈/유저 DB · 디바이스 토큰 검증 |
| `meter-mosquitto` | MQTT 브로커 (1883 TCP / 9001 WebSocket) |
| MySQL (`gwon-db`) | `users`, `modules`, `dummy_modules`, 배출·리워드 기록 |
| Cloudflare Tunnel | `meter.gwon.run`, `mqtt-meter.gwon.run` 공개 |

### 1.3 계열 규약 (M / R / 더미)

| 표기 | 시리얼 | deviceType | 의미 | 전송 |
|---|---|---|---|---|
| **M** | `m1`, `m2` … | `HEIGHT_SENSOR` | 부착형 초음파 모듈 | MQTT `fillPercent` |
| **R** | `r1`, `r2` … | `VISION_CAM` | 카메라 영상 판정 | HTTPS `fillPercent` + 사진 |
| **D(M)** / **D(R)** | `dm1`, `dr1` … (m/r 접두어 금지) | 동일 | 관리자 임시 데이터 (별도 테이블·별도 ID) | 웹에서 수동 입력 |

- 서버·웹은 **적재율 `fillPercent` (0~100 실수)** 만 공통 지표로 쓴다.
- `0` = 수거 불필요, `100` = 즉시 수거.
- 측정 원본 높이(cm)는 웹에 표시하지 않는다. M 보드는 자체 환산 후 `%` 만 송신한다.

### 1.4 동작하는 주요 기능 (웹)

| 기능 | 설명 |
|---|---|
| Google 로그인 / 닉네임 | OAuth → 세션. 관리자는 `users.role=ADMIN` |
| 지도 | 카카오맵. M=📟 / R=📷 마커. 적재율·신호 상태 배지 |
| 최적 수거 경로 | 화면 안 모듈 **전부** 방문. 만재 우선 TSP + OSRM 도로망. 도로가 모듈 앞에서 끊기면 **직선 링크**. 진행 방향 **화살표** |
| AI 카메라 | Gemini Vision 으로 품목 분류 → 투입·리워드 연동 |
| 챗봇 | 모듈 DB 스냅샷 기반 질의 |
| 관리자 페이지 | 유저/모듈/더미 CRUD, 무신호 정리, MQTT 진단 |
| 더미 모듈 | `dummy_modules` 별도 ID. 무신호 자동삭제 제외. 지도·경로에 포함 |

### 1.5 서버 공통 동작

1. 미등록 시리얼의 첫 신호 → `modules` 자동 생성 (위치는 사용자 지도 앵커 근처 랜덤, 관리자가 수정).
2. `fillPercent` · `lastSignalAt` 갱신.
3. 신호 허용 지연: **M 90초**, **R 12분** 초과 시 `WAITING`(회색).
4. 실기기 무신호 **10일** 이상 → 자동 삭제 (더미 제외). `POST /api/modules/cleanup` 로 즉시 실행 가능.
5. 삭제 후 PK 를 1부터 재정렬 (modules / dummy_modules 각각).

---

## 2. 모듈2 (R · 라즈베리파이) — 분리 개발 인수 명세

> **이 절만 복사해 모듈2 담당자에게 전달하면 된다.**  
> 웹·서버와 연동하려면 아래 계약만 지키면 된다. 판정 알고리즘은 자유.

### 2.1 해야 할 일 (3가지만)

1. **기준 영상** — 설치/수거 직후 «비어 있는 상태» 원본 사진 1장을 로컬 보관.
2. **5분마다** 현재 사진 촬영 → 원본과 비교 → **0~100 `fillPercent`** 산출.
3. **HTTPS 로 보고** — 수치 + (권장) 현재 사진. MQTT 불필요.

### 2.2 보드 · 환경

| 항목 | 값 |
|---|---|
| 보드 | Raspberry Pi 5 (8GB 권장) |
| 카메라 | CSI (Picamera2 등) |
| OS | Raspberry Pi OS 64-bit |
| 전원 | 모듈3 (보조배터리 20000mAh / 100W+, 뚜껑 태양광) |
| 시리얼 | `r1`, `r2`, … (소문자 `r` + 숫자). **보드마다 고유** |

### 2.3 URI · 인증 (필수)

| 항목 | 값 |
|---|---|
| Base URL | `https://meter.gwon.run` |
| 보고 URL | `https://meter.gwon.run/api/device/modules/{serial}/report` |
| 예시 | `https://meter.gwon.run/api/device/modules/r1/report` |
| 인증 헤더 | `X-METER-DEVICE-TOKEN: <토큰>` |
| 토큰 출처 | 서버 env `METER_DEVICE_TOKEN` — **카카오톡 등 별도 채널로 수령**. 코드에 하드코딩 금지, 환경변수 권장 |
| 주기 | **5분 (300초)** |

토큰이 틀리면 `401`, 서버에 토큰 미설정이면 `503`.

### 2.4 요청 형식 A — 사진 포함 (권장)

```http
POST /api/device/modules/r1/report HTTP/1.1
Host: meter.gwon.run
X-METER-DEVICE-TOKEN: <토큰>
Content-Type: multipart/form-data; boundary=....
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `fillPercent` | number 0~100 | 필수 | 수거 필요도 |
| `image` | file jpg/jpeg/png/webp | 선택 | 현재 스냅샷 (최대 12MB) |

### 2.5 요청 형식 B — 수치만 (JSON)

```http
POST /api/device/modules/r1/report
Content-Type: application/json
X-METER-DEVICE-TOKEN: <토큰>

{ "fillPercent": 72.5 }
```

### 2.6 성공 응답 (200)

```json
{
  "ok": true,
  "serialNumber": "r1",
  "fillPercent": 72.5,
  "imageUrl": "/api/uploads/r1/1772345678901.jpg",
  "lastSignalAt": "2026-09-02T01:05:00"
}
```

공개 이미지 URL 예: `https://meter.gwon.run/api/uploads/r1/1772345678901.jpg`

### 2.7 오류

| HTTP | 의미 |
|---|---|
| 400 | `fillPercent` 누락·범위 초과·잘못된 시리얼 |
| 401 | 토큰 불일치 |
| 503 | 서버 토큰 미설정 |

### 2.8 MQTT (선택 · 비권장)

R 은 **사진 때문에 HTTP 가 본선**이다.  
생존만 빠르게 찍고 싶다면 M 과 동일하게 MQTT 도 가능하나, 필수 아님.

| 항목 | 값 (선택 시) |
|---|---|
| Broker URI | `ws://mqtt-meter.gwon.run:80` |
| Topic | `meter/{serial}/status` 예: `meter/r1/status` |
| Payload | `{ "moduleSerial":"r1", "fillPercent":72.5 }` |
| QoS | 1 / retain false |

사진 URL 은 MQTT 로 보낼 수 없다.

### 2.9 최소 Python 스케치

```python
import os, time, requests

SERIAL = "r1"
URL = f"https://meter.gwon.run/api/device/modules/{SERIAL}/report"
TOKEN = os.environ["METER_DEVICE_TOKEN"]

def capture_jpeg() -> bytes: ...
def estimate_fill(jpeg: bytes) -> float: ...  # 0~100

while True:
    try:
        jpeg = capture_jpeg()
        fill = estimate_fill(jpeg)
        r = requests.post(
            URL,
            headers={"X-METER-DEVICE-TOKEN": TOKEN},
            data={"fillPercent": f"{fill:.1f}"},
            files={"image": (f"{SERIAL}.jpg", jpeg, "image/jpeg")},
            timeout=30,
        )
        r.raise_for_status()
        print(r.json())
    except Exception as e:
        print("report failed:", e)
    time.sleep(300)
```

```bash
curl -X POST "https://meter.gwon.run/api/device/modules/r1/report" \
  -H "X-METER-DEVICE-TOKEN: $METER_DEVICE_TOKEN" \
  -F "fillPercent=72.5" \
  -F "image=@./sample.jpg"
```

### 2.10 R 담당자가 하지 않아도 되는 것

- 지도 UI, 최적 경로, 로그인, DB 스키마
- `modules` 사전 등록 (첫 보고 시 서버가 자동 생성)
- 위치(lat/lon) 전송 (관리자 화면에서 지정)

### 2.11 연동 확인 체크리스트

- [ ] `METER_DEVICE_TOKEN` 환경변수 설정
- [ ] `r1`(또는 배정 시리얼) 로 report 200 수신
- [ ] [관리자페이지](https://meter.gwon.run/manage) 또는 지도에 R 마커(📷) · 적재율 표시
- [ ] 사진 있으면 마커 팝업에 스냅샷 표시
- [ ] 12분 이상 미보고 시 회색 «신호 대기중»

---

## 3. 모듈1 (M · ESP32) 명세

### 3.1 개요

HC-SR04P 로 빈 거리(cm)를 재고, **보드에서 `fillPercent` 0~100 으로 환산**해 MQTT 발행. 구독 없음(단방향).

### 3.2 연결

| 항목 | 값 |
|---|---|
| Broker | `ws://mqtt-meter.gwon.run:80` (MQTT over WebSocket) |
| 경유 | Cloudflare → `meter-mosquitto:9001` |
| clientId | `{serial}-{MAC HEX}` |
| Topic | `meter/{serial}/status` |
| 주기 | **30초** |
| QoS / retain | 1 / false |

### 3.3 페이로드

```json
{ "moduleSerial": "m1", "fillPercent": 72.5 }
```

환산(펌웨어): 용기 깊이 100cm 기준  
`fillPercent = clamp((100 - emptyCm) / 100 × 100, 0, 100)`  
빈 거리 클수록 적재율↓.

구형 `heightCm` 페이로드는 서버가 하위 호환으로 환산한다.

### 3.4 하드웨어

| 항목 | 값 |
|---|---|
| 보드 | ESP32 (`esp32dev` / T-SIM7000G 등) |
| TRIG / ECHO | GPIO32 / GPIO33 |
| LED | R=미연결, Y=연결, B=발행 플래시 |
| 소스 | `meter_iot/src/module1.cpp` — `MODULE_SERIAL` 상수 |

---

## 4. 모듈3 (전원부)

- 모듈2 상시 전원. 서버 통신 없음.
- 보조배터리 20000mAh / 100W+ , 뚜껑 태양광 보조 충전.

---

## 5. 서버 API 요약

### 5.1 공개 · 앱

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/modules` | 모듈+더미 목록 (더미 먼저). `fillPercent`, `series`, `signalState` |
| GET | `/api/admin/overview` | 관리자 통합 |
| POST/PUT/DELETE | `/api/modules` … | 실기기 CRUD (m/r 시리얼 웹 수정 잠금) |
| POST/PUT/DELETE | `/api/dummy-modules` … | 더미 CRUD (별도 ID, series M/R) |
| POST | `/api/modules/cleanup` | 무신호 실기기 정리 |
| POST | `/api/device/modules/{serial}/report` | **R 전용** (토큰) |
| GET | `/api/uploads/**` | R 스냅샷 공개 |
| GET | `/api/mosquitto/diag` | MQTT 구독 진단 |

### 5.2 MQTT (백엔드)

| 항목 | 값 |
|---|---|
| Broker (컨테이너) | `tcp://meter-mosquitto:1883` |
| Subscribe | `meter/+/status` |
| 처리 | `fillPercent` 우선, 없으면 legacy `heightCm` 환산 |

---

## 6. 최적 수거 경로 (웹)

1. 지도 **화면에 보이는** 좌표 있는 모듈을 모두 후보로 한다.
2. 출발점 = 사용자 위치(있으면).
3. 방문 순서 = 적재율 가중 TSP (≤8 완전탐색, 그 외 NN+2-opt).
4. 구간마다 OSRM driving 도로망 폴리라인.
5. 도로가 모듈까지 **~18m 이상 못 오면** 도로 끝 → 모듈 **직선(점선) 링크**.
6. 경로 위 **화살표**로 진행 방향 표시 (왕복·겹침 시 방향 식별).
7. 선 색: 검정(도로 실선 / 링크 점선) + 흰 외곽.

---

## 7. 데이터 모델 (요지)

### `modules` (실기기)

`id`(자체 AUTO_INCREMENT), `serial_number`, `device_type`, `fill_percent`, `lat`, `lon`, `type`, `last_signal_at`, `last_image_url`, …

### `dummy_modules` (임시)

별도 `id` 공간. `device_type` = M 또는 R → UI `D(M)` / `D(R)`.

---

## 8. 배포 · 환경 변수 (요약)

| 변수 | 용도 |
|---|---|
| `METER_DEVICE_TOKEN` | R 모듈 HTTP 인증 |
| `KAKAO_API_METER` / `VITE_KAKAO_API` | 카카오맵 |
| `MQTT_BROKER_URL` | 백엔드 브로커 (예: `tcp://meter-mosquitto:1883`) |
| DB_* | MySQL |

서버 배포 예:

```bash
cd ~
rm -rf meter && git clone https://github.com/gwondev/meter.git && cd meter
./scripts/prepare-env.sh ~/.env.production
docker compose up --build -d
```

---

## 9. 엔드투엔드 흐름도

```
[M ESP32]  measure emptyCm → fill% → MQTT meter/m1/status ──┐
                                                            ├─► backend → MySQL
[R RPi5]   camera → fill% + jpeg → HTTPS /api/device/.../report ─┘
                                                            │
[Web]  GET /api/modules → 지도 마커 · 경로 · 관리자 UI ◄─────┘
```

---

## 10. 문서 유지

- R 담당자 전달용: **§2 만** 발췌해도 충분하다.
- IoT 펌웨어 변경 시 `module1.cpp` 의 `BUILD_VERIFY_TAG` 를 갱신하고 clean+upload 로 검증한다.
- 백엔드 배포 검증: `/api/mosquitto/diag` 의 `buildVerifyTag`.
