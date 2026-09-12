/*
 * METER 모듈2 — r1 성권 테스트 전용 (프로토콜 검증)
 *
 * 수혁 담당 실기기는 r2, r3 (이 파일과 시리얼 겹치면 안 됨).
 * 역할: JPEG(또는 tiny 테스트 JPEG)만 MQTT 전송. fill%는 서버.
 *
 * 로컬에서 이미지 없이 빠르게 보내려면:
 *   python scripts/r1_mqtt_test.py --original
 *   python scripts/r1_mqtt_test.py --count 10
 */
#include <Arduino.h>
#include <cstdio>
#include <cstring>
#include <memory>
#include <WiFi.h>
#include <ArduinoJson.h>
#include <mqtt_client.h>
#include <mbedtls/base64.h>

#if __has_include("esp_camera.h")
#include "esp_camera.h"
#define METER_HAS_CAMERA 1
#else
#define METER_HAS_CAMERA 0
#endif

static const char *const MODULE_SERIAL = "r1";
static const char *const BUILD_VERIFY_TAG = "METER-FW r1 2026-09-12b image-only";
static const char *MQTT_WS_URI = "ws://mqtt-meter.gwon.run:80";

static const char *WIFI_SSIDS[] = {"gwon", "iptime", "devsign"};
static const char *WIFI_PASSWORDS[] = {"00000000", "Gwondev0323", ""};
static const int WIFI_SSID_COUNT = sizeof(WIFI_SSIDS) / sizeof(WIFI_SSIDS[0]);
static const int WIFI_PASSWORD_COUNT = sizeof(WIFI_PASSWORDS) / sizeof(WIFI_PASSWORDS[0]);
static const unsigned long WIFI_ATTEMPT_TIMEOUT_MS = 8000UL;

/* 보드가 정하는 전송 간격 (예: 3분) */
static const unsigned long PUBLISH_INTERVAL_MS = 3UL * 60UL * 1000UL;

static bool s_sendNextAsOriginal = true;
static esp_mqtt_client_handle_t s_mqtt = nullptr;
static volatile bool s_mqtt_connected = false;
static char s_mqtt_client_id[28] = "";
static char s_topicStatus[52] = "";
static unsigned long s_lastPublishMs = 0;

#if METER_HAS_CAMERA
#define PWDN_GPIO_NUM 32
#define RESET_GPIO_NUM -1
#define XCLK_GPIO_NUM 0
#define SIOD_GPIO_NUM 26
#define SIOC_GPIO_NUM 27
#define Y9_GPIO_NUM 35
#define Y8_GPIO_NUM 34
#define Y7_GPIO_NUM 39
#define Y6_GPIO_NUM 36
#define Y5_GPIO_NUM 21
#define Y4_GPIO_NUM 19
#define Y3_GPIO_NUM 18
#define Y2_GPIO_NUM 5
#define VSYNC_GPIO_NUM 25
#define HREF_GPIO_NUM 23
#define PCLK_GPIO_NUM 22
#endif

/* 최소 JPEG — 카메라 없을 때 프로토콜 검증용 */
static const uint8_t kTinyJpeg[] = {
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
    0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
    0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
    0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20, 0x24, 0x2E, 0x27, 0x20,
    0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29, 0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27,
    0x39, 0x3D, 0x38, 0x32, 0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xFF, 0xC4, 0x00, 0x14,
    0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00, 0x7F, 0xFF, 0xD9};

static bool connectWifi() {
  for (int si = 0; si < WIFI_SSID_COUNT; si++) {
    for (int pi = 0; pi < WIFI_PASSWORD_COUNT; pi++) {
      WiFi.disconnect(true);
      delay(100);
      Serial.printf("WiFi try SSID=%s\n", WIFI_SSIDS[si]);
      WiFi.begin(WIFI_SSIDS[si], WIFI_PASSWORDS[pi]);
      unsigned long start = millis();
      while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_ATTEMPT_TIMEOUT_MS) {
        delay(200);
      }
      if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("WiFi OK %s ip=%s\n", WIFI_SSIDS[si], WiFi.localIP().toString().c_str());
        return true;
      }
    }
  }
  return false;
}

static void mqttEvent(void *handler_args, esp_event_base_t base, int32_t event_id, void *event_data) {
  auto *event = (esp_mqtt_event_handle_t)event_data;
  switch ((esp_mqtt_event_id_t)event_id) {
    case MQTT_EVENT_CONNECTED:
      s_mqtt_connected = true;
      Serial.println("MQTT connected");
      break;
    case MQTT_EVENT_DISCONNECTED:
      s_mqtt_connected = false;
      Serial.println("MQTT disconnected");
      break;
    default:
      break;
  }
}

static void startMqtt() {
  snprintf(s_mqtt_client_id, sizeof(s_mqtt_client_id), "%s-%04X", MODULE_SERIAL, (unsigned)(ESP.getEfuseMac() & 0xffff));
  snprintf(s_topicStatus, sizeof(s_topicStatus), "meter/%s/status", MODULE_SERIAL);

  esp_mqtt_client_config_t cfg = {};
  cfg.broker.address.uri = MQTT_WS_URI;
  cfg.credentials.client_id = s_mqtt_client_id;
  cfg.session.keepalive = 60;
  cfg.network.disable_auto_reconnect = false;
  s_mqtt = esp_mqtt_client_init(&cfg);
  esp_mqtt_client_register_event(s_mqtt, (esp_mqtt_event_id_t)ESP_EVENT_ANY_ID, mqttEvent, nullptr);
  esp_mqtt_client_start(s_mqtt);
}

#if METER_HAS_CAMERA
static bool initCamera() {
  camera_config_t config = {};
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size = FRAMESIZE_QVGA;
  config.jpeg_quality = 18;
  config.fb_count = 1;
  return esp_camera_init(&config) == ESP_OK;
}
#endif

static bool encodeBase64(const uint8_t *data, size_t len, String &out) {
  size_t olen = 0;
  mbedtls_base64_encode(nullptr, 0, &olen, data, len);
  out.reserve(olen + 4);
  out.remove(0);
  std::unique_ptr<unsigned char[]> buf(new unsigned char[olen + 1]);
  size_t written = 0;
  if (mbedtls_base64_encode(buf.get(), olen + 1, &written, data, len) != 0) {
    return false;
  }
  buf[written] = 0;
  out = (char *)buf.get();
  return true;
}

static void publishImage(bool asOriginal) {
  if (!s_mqtt_connected || !s_mqtt) {
    Serial.println("skip publish: mqtt down");
    return;
  }

  const uint8_t *jpeg = kTinyJpeg;
  size_t jpegLen = sizeof(kTinyJpeg);

#if METER_HAS_CAMERA
  camera_fb_t *fb = esp_camera_fb_get();
  if (fb && fb->format == PIXFORMAT_JPEG && fb->len > 0) {
    jpeg = fb->buf;
    jpegLen = fb->len;
  } else if (fb) {
    esp_camera_fb_return(fb);
    fb = nullptr;
    Serial.println("camera capture fail — tiny jpeg");
  }
#endif

  String b64;
  if (!encodeBase64(jpeg, jpegLen, b64)) {
    Serial.println("base64 fail");
#if METER_HAS_CAMERA
    if (fb) esp_camera_fb_return(fb);
#endif
    return;
  }

#if METER_HAS_CAMERA
  if (fb) esp_camera_fb_return(fb);
#endif

  DynamicJsonDocument doc(b64.length() + 512);
  doc["moduleSerial"] = MODULE_SERIAL;
  doc["imageRole"] = asOriginal ? "original" : "sample";
  doc["imageFormat"] = "jpg";
  doc["imageBase64"] = b64;

  String payload;
  serializeJson(doc, payload);
  int msgId = esp_mqtt_client_publish(s_mqtt, s_topicStatus, payload.c_str(), payload.length(), 1, 0);
  Serial.printf("publish %s role=%s jpeg=%u msgId=%d\n",
                s_topicStatus, asOriginal ? "original" : "sample", (unsigned)jpegLen, msgId);
}

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println(BUILD_VERIFY_TAG);
  Serial.printf("serial=%s intervalMs=%lu\n", MODULE_SERIAL, PUBLISH_INTERVAL_MS);

#if METER_HAS_CAMERA
  if (!initCamera()) {
    Serial.println("camera unavailable — protocol demo mode");
  }
#else
  Serial.println("esp_camera.h 없음 — tiny jpeg demo mode");
#endif

  if (!connectWifi()) {
    Serial.println("WiFi fail — reboot in 10s");
    delay(10000);
    ESP.restart();
  }
  startMqtt();
  s_lastPublishMs = 0;
}

void loop() {
  while (Serial.available() > 0) {
    char c = (char)Serial.read();
    if (c == 'o' || c == 'O') {
      s_sendNextAsOriginal = true;
      Serial.println("next frame = original");
    }
  }

  unsigned long now = millis();
  if (s_lastPublishMs == 0 || now - s_lastPublishMs >= PUBLISH_INTERVAL_MS) {
    bool asOriginal = s_sendNextAsOriginal;
    publishImage(asOriginal);
    if (asOriginal) s_sendNextAsOriginal = false;
    s_lastPublishMs = now;
  }
  delay(50);
}
