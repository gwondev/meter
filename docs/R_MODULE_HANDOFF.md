# METER 모듈2 (R · 라즈베리파이) 인수 명세

> **분리 개발용 단권.** 자세한 전체 맥락은 `DEVICE_SPEC.md` 참고.  
> 갱신: 2026-09-02

## 목표

현장 카메라로 적재/오염 정도를 **0~100%** 로 보고하고, 가능하면 **현재 사진**을 서버에 올리면 지도에 표시된다.

## 필수 계약

| 항목 | 값 |
|---|---|
| Base | `https://meter.gwon.run` |
| POST | `/api/device/modules/{serial}/report` |
| 예 | `https://meter.gwon.run/api/device/modules/r1/report` |
| Header | `X-METER-DEVICE-TOKEN: <토큰>` |
| Body | `multipart`: `fillPercent` + optional `image` **또는** JSON `{ "fillPercent": 72.5 }` |
| 시리얼 | `r1`, `r2`, … |
| 주기 | 5분 |

토큰은 서버 관리자가 `METER_DEVICE_TOKEN` 으로 발급해 **별도 채널**로 전달한다.

## 하지 말 것

- MQTT 필수로 쓰지 말 것 (사진은 HTTP 만)
- 시리얼을 `m*` 로 쓰지 말 것
- 토큰을 깃에 커밋하지 말 것

## 스모크 테스트

```bash
curl -X POST "https://meter.gwon.run/api/device/modules/r1/report" \
  -H "X-METER-DEVICE-TOKEN: $METER_DEVICE_TOKEN" \
  -F "fillPercent=50" \
  -F "image=@./sample.jpg"
```

200 + JSON `ok:true` 이면 연동 성공. 웹 지도에 📷 마커·적재율이 보여야 한다.

전체 Python 예제·오류 코드·선택 MQTT 는 `DEVICE_SPEC.md` §2 참고.
