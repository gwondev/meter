# r1 비전 검증용 JPEG (001–100)

- `001.jpg` — 흰 화면 (MQTT `original`)
- `002.jpg`–`100.jpg` — 검은 점이 점점 더 채워짐 (MQTT `sample`)

보드가 이름순으로 1→100 루프 전송. 001일 때만 original.

```bash
cd meter_iot/module2
pio run -t uploadfs
pio run -t upload
```
