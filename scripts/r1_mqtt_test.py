#!/usr/bin/env python3
"""r1 테스트용 MQTT 이미지 발행.
아무 JPEG(글자 그림)를 만들어 original/sample 로 보낸다.

  pip install paho-mqtt pillow
  python scripts/r1_mqtt_test.py              # sample 1장
  python scripts/r1_mqtt_test.py --original   # 원본
  python scripts/r1_mqtt_test.py --count 5    # sample 5장
"""
from __future__ import annotations

import argparse
import base64
import io
import json
import time
from datetime import datetime

import paho.mqtt.client as mqtt
from PIL import Image, ImageDraw, ImageFont

BROKER = "mqtt-meter.gwon.run"
PORT = 80
SERIAL = "r1"
TOPIC = f"meter/{SERIAL}/status"


def make_jpeg(label: str, fill_hint: int = 0) -> bytes:
    img = Image.new("RGB", (320, 240), (12, 12, 12))
    draw = ImageDraw.Draw(img)
    # 가짜 적재: 아래쪽 박스가 클수록 더 찬 느낌
    h = int(20 + fill_hint * 1.8)
    draw.rectangle([40, 220 - h, 280, 220], fill=(80, 180, 90) if fill_hint < 50 else (220, 120, 40) if fill_hint < 80 else (220, 60, 60))
    draw.rectangle([8, 8, 312, 232], outline=(255, 255, 255), width=2)
    text = f"{SERIAL} {label}\n{datetime.now().strftime('%H:%M:%S')}\nfill~{fill_hint}"
    draw.multiline_text((20, 24), text, fill=(255, 255, 255), spacing=6)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=70)
    return buf.getvalue()


def publish(role: str, jpeg: bytes) -> None:
    payload = {
        "moduleSerial": SERIAL,
        "imageRole": role,
        "imageFormat": "jpg",
        "imageBase64": base64.b64encode(jpeg).decode("ascii"),
    }
    body = json.dumps(payload)
    client = mqtt.Client(client_id=f"{SERIAL}-test", transport="websockets")
    client.ws_set_options(path="/")
    client.connect(BROKER, PORT, keepalive=30)
    client.loop_start()
    time.sleep(0.4)
    info = client.publish(TOPIC, body, qos=1)
    info.wait_for_publish(timeout=10)
    print(f"published role={role} bytes={len(jpeg)} mid={info.mid}")
    client.loop_stop()
    client.disconnect()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--original", action="store_true")
    ap.add_argument("--count", type=int, default=1)
    args = ap.parse_args()
    if args.original:
        publish("original", make_jpeg("ORIGINAL", 0))
        return
    for i in range(args.count):
        hint = min(100, 10 + i * 15)
        publish("sample", make_jpeg(f"SAMPLE#{i+1}", hint))
        time.sleep(0.6)


if __name__ == "__main__":
    main()
