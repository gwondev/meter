# METER 디바이스 · 서버 · 웹 통합 명세서

> 대상: 모듈1(ESP32) / 모듈2(라즈베리파이 5) / 모듈3(전원부) / 백엔드 / 프론트엔드
> 최종 갱신: 2026-09-01

---

## 0. 시리얼 번호 규약

모든 노드는 **시리얼 번호(serialNumber)** 로 식별된다. 접두어가 디바이스 계열을 결정하며,
서버는 접두어만 보고 `deviceType` 을 자동으로 판별한다.

| 계열 | 시리얼 예 | deviceType | 측정 방식 | 전송 방식 |
|---|---|---|---|---|
| 모듈1 | `m1`, `m2`, `m3` … | `HEIGHT_SENSOR` | 초음파 높이(cm) | MQTT, 5초 주기 |
| 모듈2 | `r1`, `r2`, `r3` … | `VISION_CAM` | 영상 변화 비교(%) | HTTPS, 5분 주기 |

> 서버에 시리얼을 미리 등록해 둘 필요는 없다. 첫 신호가 도착하면 모듈이 자동 생성된다.
> 다만 위치(lat/lon)는 신호에 포함되지 않으므로 관리자 화면에서 지정해야 지도에 표시된다.

---

# 모듈1 명세 (적재 높이 측정 노드)

## [구현개요]

1. HC-SR04P 초음파 센서가 용기 내부의 **빈 거리(cm)** 를 측정한다. 값이 작을수록 가득 찬 상태다.
2. 15ms 간격으로 계속 샘플링하고, 유효 범위(2~100cm)를 벗어난 값은 무효(-1)로 버린다.
3. **5초마다** 가장 최근 유효 측정값 1건을 MQTT 로 발행한다.
4. `HEARTBEAT` / `HEIGHT` 같은 상태 구분은 없다. 발행 자체가 생존 신호를 겸한다.
5. RGB LED, 하향 명령(cmd) 수신, IR 투입 검증은 사용하지 않는다. **발행 전용 단방향** 노드다.

## [설치]

- 쓰레기통 옆면에 C클램프 등을 활용하여 부착
- 센서 헤드는 용기 내부 최상단에서 수직 아래를 향하도록 고정

## [MCU · 배선]

| 항목 | 값 |
|---|---|
| 보드 | LilyGO **T-SIM7000G** (ESP32 계열) / PlatformIO `board = esp32dev` |
| 프레임워크 | Arduino (espressif32) |
| 초음파 센서 | **HC-SR04P** |
| TRIG | **GPIO32** |
| ECHO | **GPIO33** |
| 전원 | 충전기 구멍 왼쪽 아래 기준 VCC / GND / TRIG / ECHO |
| 시리얼 모니터 | 115200 bps |

## [초음파 측정 규약]

- 유효 범위: **2cm ~ 100cm**. 벗어나면 `-1`(무효) 처리하고 발행을 건너뛴다.
- 거리 환산: `cm = pulseIn(ECHO, HIGH, 30000) / 58.0`
- 무효 샘플이 계속되면 발행이 없으므로 서버에서 «신호 대기중» 으로 떨어진다.

## [브로커]

| 항목 | 값 |
|---|---|
| URI | `ws://mqtt-meter.gwon.run:80` |
| 프로토콜 | MQTT over WebSocket (TLS 없음) |
| 브로커 내부 리스너 | `1883/mqtt`, `9001/websockets` |
| 경유 | Cloudflare Tunnel → `meter-mosquitto:9001` |
| clientId | `{serial}-{MAC 6바이트 HEX}` (예: `m1-A4CF12B93D01`) |
| keepalive | 15초 |
| clean session | true |
| 자동 재연결 | 활성 (`reconnect_timeout_ms = 5000`) |

## [MQTT 발행]

| 항목 | 값 |
|---|---|
| 토픽 | `meter/{serial}/status` (예: `meter/m1/status`) |
| QoS | **1** |
| retain | **false** |
| 주기 | **5초** |

페이로드 (JSON, 단일 형태):

```json
{ "moduleSerial": "m1", "heightCm": 25.3 }
```

- `moduleSerial` (string, 필수) — 시리얼 번호
- `heightCm` (number, 필수) — 센서에서 내용물 표면까지의 빈 거리(cm)
- 서버는 `height_cm` 표기도 함께 허용한다.
- **구독은 하지 않는다.** 서버 → 모듈 하향 채널은 존재하지 않는다.

## [WiFi 접속]

SSID 목록 × 비밀번호 목록의 **전 조합을 순차 시도**한다 (인덱스 1:1 대응이 아니다).
어떤 현장에 설치되든 목록 안의 조합 하나만 맞으면 붙는다.

```
SSID     : gwon, iptime, devsign
PASSWORD : 00000000, Gwondev0323, "" (개방 AP)
```

- 조합당 타임아웃 8초, 전 조합 실패 시 5초 후 처음부터 재시도
- 루프 중 연결이 끊기면 다시 전 조합을 돌린 뒤 MQTT 를 재시작한다

## [소스 위치]

- `meter_iot/src/module1.cpp`
- 시리얼 번호는 파일 최상단 상수에서 직접 수정한다 (`platformio.ini` 의 `build_flags` 미사용)

```cpp
static const char *const MODULE_SERIAL = "m1";
```

---

# 모듈2 명세 (영상 판정 노드)

> **모듈2 제작자용 인수 명세.** 아래 3개 기능만 구현하면 웹과 연동된다.

## [구현개요]

### 기능 1 — 기준 영상 확보

- 설치 직후(또는 수거 직후) 현장의 **깨끗한 상태 원본 사진**을 1장 촬영해 로컬에 보관한다.
- 이 원본이 «치워진 상태 = 0%» 의 기준이다.

### 기능 2 — 변화량 판정 (5분 주기)

- 5분마다 현재 사진을 촬영하고 **원본 ↔ 현재** 를 비교한다.
- 비교 결과를 **백분위 정수/실수 0~100** 으로 환산한다.
  - `0` = 변화 없음, 수거 불필요
  - `100` = 변화 최대, 즉시 수거 필요
- 판정 알고리즘은 자유(프레임 차분, SSIM, 세그멘테이션, 객체 검출 면적비 등).
  **서버는 최종 0~100 값만 받는다.**

### 기능 3 — 서버 전송 (5분 주기)

- 위 백분위 값과 **현재 사진**을 HTTPS 로 1회 POST 한다.
- 사진은 MQTT 로 보내지 않는다. 아래 HTTP 경로를 쓴다.

## [보드 · 하드웨어]

| 항목 | 값 |
|---|---|
| 보드 | **Raspberry Pi 5 8GB** |
| 카메라 | CSI 카메라 1대 (Picamera2 등) |
| OS | Raspberry Pi OS (64-bit) 권장 |
| 부착 | 아무데나 부착 가능. 한 구역 전체를 프레임에 담는다 |
| 전원 | 모듈3 (보조배터리 20000mAh / 100W 이상, 뚜껑부 태양광) |

## [발행처 — HTTP 엔드포인트]

| 항목 | 값 |
|---|---|
| 메서드 | `POST` |
| URL | `https://meter.gwon.run/api/device/modules/{serial}/report` |
| 예시 | `https://meter.gwon.run/api/device/modules/r1/report` |
| Content-Type | `multipart/form-data` |
| 인증 헤더 | `X-METER-DEVICE-TOKEN: <디바이스 토큰>` |
| 주기 | **5분** |

멀티파트 필드:

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `fillPercent` | number (0~100) | 필수 | 수거 필요도 백분위. 0 = 불필요, 100 = 즉시 수거 |
| `image` | file (jpg/jpeg/png/webp) | 선택 | 현재 상태 사진. 최대 12MB |

사진 없이 수치만 보낼 때는 동일 URL 에 `Content-Type: application/json` 으로 보낸다:

```json
{ "fillPercent": 72.5 }
```

응답 (200):

```json
{
  "ok": true,
  "serialNumber": "r1",
  "fillPercent": 72.5,
  "imageUrl": "/api/uploads/r1/1772345678901.jpg",
  "lastSignalAt": "2026-09-01T16:05:00"
}
```

오류 응답:

| 상태 | 의미 | 조치 |
|---|---|---|
| `400` | `fillPercent` 누락/범위 초과, 잘못된 시리얼 | 값 확인 |
| `401` | 토큰 불일치 | 헤더 값 확인 |
| `503` | 서버에 토큰 미설정 | 서버 관리자 문의 |

## [디바이스 토큰]

- 환경변수 `METER_DEVICE_TOKEN` 으로 서버에 저장되어 있다. 값은 **별도 채널(카카오톡)로 전달**한다.
- `/api/device/**` 전체가 이 토큰으로만 열린다. 토큰이 없으면 요청은 401, 서버에 미설정이면 503 이다.
- 라즈베리파이에서는 코드에 박지 말고 환경변수로 읽는다.

## [구현 예시 — Python]

```python
import os, time, requests

SERIAL = "r1"
BASE = "https://meter.gwon.run/api/device/modules"
TOKEN = os.environ["METER_DEVICE_TOKEN"]
INTERVAL_SEC = 300  # 5분

def capture() -> bytes:
    """현재 상태 사진 1장을 JPEG 바이트로 반환."""
    ...

def estimate_fill_percent(current_jpeg: bytes) -> float:
    """원본 대비 변화량을 0~100 으로 환산. 0=수거 불필요, 100=즉시 수거."""
    ...

def report(fill_percent: float, jpeg: bytes) -> None:
    requests.post(
        f"{BASE}/{SERIAL}/report",
        headers={"X-METER-DEVICE-TOKEN": TOKEN},
        data={"fillPercent": f"{fill_percent:.1f}"},
        files={"image": (f"{SERIAL}.jpg", jpeg, "image/jpeg")},
        timeout=30,
    ).raise_for_status()

while True:
    try:
        jpeg = capture()
        report(estimate_fill_percent(jpeg), jpeg)
    except Exception as e:
        print("report failed:", e)
    time.sleep(INTERVAL_SEC)
```

```bash
# 연결 확인용 단발 테스트
curl -X POST "https://meter.gwon.run/api/device/modules/r1/report" \
  -H "X-METER-DEVICE-TOKEN: $METER_DEVICE_TOKEN" \
  -F "fillPercent=72.5" \
  -F "image=@./sample.jpg"
```

---

# 모듈3 명세 (전원부)

## [구현개요]

1. 모듈2의 전원부 역할을 담당한다 (시연용).
2. 보조배터리 **20000mAh / 100W 이상** 으로 라즈베리파이 5를 상시 구동한다.
3. 뚜껑 부분에 태양광 패널을 부착해 보조 충전한다.

> 서버·웹과 직접 통신하지 않는다. 별도 프로토콜이 없다.

---

# 서버 명세 (백엔드)

## [구현개요]

1. MQTT `meter/+/status` 를 구독해 모듈1의 높이값을 수신한다.
2. `/api/device/**` 로 모듈2의 백분위 값과 사진을 수신한다.
3. 두 계열의 서로 다른 측정값을 **`fillPercent` (0~100) 단일 지표**로 정규화한다.
4. 등록되지 않은 시리얼의 신호가 오면 모듈을 **자동 생성**한다.
5. 신호가 10일 이상 끊긴 모듈은 **자동 삭제**한다.

## [수신 경로]

| 경로 | 계열 | 프로토콜 | 인증 |
|---|---|---|---|
| `meter/+/status` | 모듈1 | MQTT (구독) | 없음 (내부 브로커) |
| `POST /api/device/modules/{serial}/report` | 모듈2 | HTTPS | `X-METER-DEVICE-TOKEN` |

## [적재율 정규화]

두 계열의 값이 달라서 그대로는 최적 경로 계산에 함께 넣을 수 없다. `fillPercent` 로 통일한다.

- **모듈1** — 빈 거리를 용기 깊이로 나눠 환산한다.

```
fillPercent = clamp((depthCm - heightCm) / depthCm × 100, 0, 100)
```

`depthCm` 이 지정되지 않은 모듈은 서버 기본값(`meter.module.default-depth-cm`, 기본 60cm)을 쓴다.
관리자 화면에서 모듈별로 지정할 수 있다.

- **모듈2** — 보고한 값을 그대로 사용한다 (0~100 범위 검증만 수행).

## [신호 상태 판정]

`lastSignalAt` 기준으로 계열별 발행 주기에 여유를 둔다. 한두 번 유실되어도 바로 회색이 되지 않는다.

| 계열 | 허용 지연 | 초과 시 |
|---|---|---|
| 모듈1 (5초 주기) | 60초 | `WAITING` (신호 대기중) |
| 모듈2 (5분 주기) | 12분 | `WAITING` (신호 대기중) |

## [모듈 자동 정리]

- 매시 정각 스케줄러가 실행된다.
- `lastSignalAt` 이 **10일** 이상 지난 모듈, 그리고 신호가 한 번도 없이 등록 후 10일이 지난 모듈을 삭제한다.
- 보관 기간은 `meter.module.stale-retention-days` 로 조정한다.
- 관리자 화면의 «무신호 정리» 버튼(`POST /api/modules/cleanup`)으로 즉시 실행할 수도 있다.

## [이미지 저장 · 서빙]

| 항목 | 값 |
|---|---|
| 저장 위치 | `/backend/uploads/{serial}/{epochMillis}.{ext}` (docker 볼륨 `backend_uploads`) |
| 공개 URL | `/api/uploads/{serial}/{파일명}` |
| 허용 확장자 | jpg, jpeg, png, webp (그 외는 jpg 로 저장) |
| 업로드 상한 | 12MB (`spring.servlet.multipart.max-file-size`) |
| 보관 개수 | 모듈당 최근 50장, 초과분은 오래된 것부터 삭제 |

## [조회 API]

`GET /api/modules` — 지도·목록 공용. 신호가 없는 모듈도 함께 내려간다.

```json
[
  {
    "id": 1,
    "serialNumber": "m1",
    "organization": "CHOSUN_IT",
    "lat": 35.1462, "lon": 126.9229,
    "type": "GENERAL",
    "deviceType": "HEIGHT_SENSOR",
    "heightCm": 12.4,
    "depthCm": 60.0,
    "fillPercent": 79.3,
    "lastImageUrl": null,
    "lastSignalAt": "2026-09-01T16:04:58",
    "createdAt": "2026-08-20T10:00:00",
    "signalState": "ACTIVE"
  }
]
```

| 엔드포인트 | 설명 |
|---|---|
| `GET /api/modules` | 전체 모듈 조회 |
| `POST /api/modules` | 관리자 사전 등록 (위치·분류·depthCm) |
| `PUT /api/modules/{id}` | 위치·분류·depthCm 수정 |
| `DELETE /api/modules/{id}` | 수동 삭제 |
| `POST /api/modules/cleanup` | 무신호 모듈 즉시 정리 |

> `fillPercent`, `lastSignalAt`, `heightCm` 은 디바이스가 보고하는 값이므로 관리 API 로 수정하지 않는다.

## [환경 변수]

| 변수 | 기본값 | 설명 |
|---|---|---|
| `METER_DEVICE_TOKEN` | (없음) | `/api/device/**` 사전 공유 토큰. 미설정 시 503 |
| `METER_MODULE_DEFAULT_DEPTH_CM` | `60` | depthCm 미지정 모듈의 기본 용기 깊이 |
| `METER_MODULE_STALE_RETENTION_DAYS` | `10` | 무신호 모듈 자동 삭제 기준 |
| `METER_UPLOAD_DIR` | `/backend/uploads` | 스냅샷 저장 디렉터리 |
| `METER_UPLOAD_KEEP_PER_MODULE` | `50` | 모듈당 스냅샷 보관 개수 |

---

# 웹 명세 (프론트엔드)

## [구현개요]

1. **DB 에 있는 모듈은 우선 전부 표시된다.** 신호가 없으면 회색 «신호 대기중».
2. **신호가 들어오면 활성 상태**로 바뀌고 적재율에 따라 색이 붙는다.
3. **최적경로**를 누르면 현재 화면에 보이는 모듈만으로 경로를 계산해 **지도 위에 직접 그린다.** 페이지 이동이 없다.
4. 하단 액션 버튼은 아이콘 + 라벨 카드형으로 정돈했다.
5. 좌상단 `METER · 사용자명` 은 검은 박스 + 흰 글씨로 항상 읽힌다.
6. AI 챗봇은 마크다운 없이 간결하게 답하고, 패널이 커졌다.

## [모듈 표시 상태]

| 상태 | 조건 | 색 |
|---|---|---|
| 신호 대기중 | `signalState = WAITING` | 회색 `#6b6b6b`, grayscale, 투명도 45% |
| 여유 | 활성 · `fillPercent < 50` | 초록 |
| 주의 | 활성 · `50 ≤ fillPercent < 80` | 주황 |
| 수거 필요 | 활성 · `fillPercent ≥ 80` | 빨강 |
| 측정 대기 | 활성 · `fillPercent = null` | 회백색 |

- 모듈 목록은 5초마다 폴링한다.
- 마커 클릭 시 시리얼, 계열, 적재율, 마지막 신호 시각, 모듈2의 최신 스냅샷을 보여준다.
- 좌상단 칩으로 «활성 N / 신호 대기중 N» 을 항상 노출한다.

## [최적 수거 경로]

- 대상: **현재 지도 뷰포트 안** + `signalState = ACTIVE` + `fillPercent ≥ 50`
- 출발점: 사용자 현재 위치. 위치 권한이 없으면 가장 급한 모듈에서 시작
- 알고리즘: 적재율 가중 최근접 이웃으로 초기 순회 생성 → **2-opt** 로 교차 구간 개선
  - 비용 = 하버사인 거리 × `(1 + (100 - fillPercent) / 100)`
  - 가득 찬 거점을 먼저 들르도록 유도하면서 총 이동거리를 줄인다
- 결과: 지도 위 흰색 폴리라인 + 방문 순번 배지 + 우측 상단 순서 요약 패널(총 거리 km)
- 같은 버튼을 다시 누르면 «경로 해제»
- 조건을 만족하는 모듈이 2곳 미만이면 스낵바로 이유를 알린다
- 구현: `frontend/src/utils/collectionRoute.js`, `frontend/src/pages/MapView.jsx`

## [AI 챗봇]

- 프롬프트에서 마크다운을 금지하고, 서버·클라이언트 양쪽에서 `**`, `#`, 백틱 등을 제거한다.
- 3문장 이내로 결론부터 답하도록 지시한다.
- 패널: 480×640 (모바일 `94vw × 76dvh`), 본문 0.95rem, FAB 64px
- 컨텍스트로 모듈별 `fillPercent`, `signalState`, `deviceType`, `lastSignalAt` 을 넘긴다.

## [관리자 화면]

- 모듈 표: 시리얼 / 계열(초음파·영상) / 분류 / 신호(활성·대기중 + 경과 시간) / 적재율 / 좌표
- 등록·수정 가능 필드: `serialNumber`, `organization`, `lat`, `lon`, `type`, `depthCm`
- 「무신호 정리」 버튼으로 10일 초과 모듈 즉시 삭제

---

## 부록 — 전체 데이터 흐름

```
[모듈1 ESP32]  --MQTT ws://mqtt-meter.gwon.run:80--> meter/m1/status ─┐
   HC-SR04P 높이(cm) / 5초                                            │
                                                                      ├─> [Mosquitto] ─> [Spring Boot]
[모듈2 RPi5]   --HTTPS POST /api/device/modules/r1/report-------------┘         │  fillPercent 정규화
   변화량 %(0~100) + JPEG / 5분   (X-METER-DEVICE-TOKEN)                        │  자동 등록 / 10일 정리
        ▲                                                                       ▼
   [모듈3 전원부]                                                          [MySQL: modules]
   20000mAh 100W+ / 태양광                                                      │
                                                                                ▼
                                                        [React + Kakao Map]  GET /api/modules (5s)
                                                        회색 대기 / 활성 색상 / 지도 위 최적경로 / AI 챗봇
```
