# r1 테스트용 JPEG 넣기

이 폴더(`meter_iot/module2/data/images/`)에 `.jpg` / `.jpeg` 를 넣으면
보드가 LittleFS에서 읽어 10초마다 MQTT로 순환 전송한다.

- 장수: 수십~100장 OK (플래시 용량 안에서)
- 권장: 장당 200KB 이하 (QVGA~VGA JPEG)
- `original` / `sample` 은 **파일 이름이 아니라 MQTT imageRole** 로 구분
  (10번마다 1회 original, 나머지 sample)

업로드:

```bash
cd meter_iot/module2
pio run -t uploadfs
pio run -t upload
```

이미지가 없으면 1x1 tiny JPEG fallback 만 나간다.
