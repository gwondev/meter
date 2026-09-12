/*
 * METER 모듈2 — r1 성권 테스트 전용
 * 10초마다 tiny 더미 JPEG MQTT 전송. 10번마다 1회 original.
 * 수혁 실기기: r2, r3
 */
#include <Arduino.h>
#include <cstdio>
#include <cstring>
#include <memory>
#include <WiFi.h>
#include <ArduinoJson.h>
#include <mqtt_client.h>
#include <mbedtls/base64.h>

static const char *const MODULE_SERIAL = "r1";
static const char *const BUILD_VERIFY_TAG = "METER-FW r1 2026-09-12d dummy-10s";
static const char *MQTT_WS_URI = "ws://mqtt-meter.gwon.run:80";

static const char *WIFI_SSIDS[] = {"gwon", "iptime", "devsign"};
static const char *WIFI_PASSWORDS[] = {"00000000", "Gwondev0323", ""};
static const int WIFI_SSID_COUNT = sizeof(WIFI_SSIDS) / sizeof(WIFI_SSIDS[0]);
static const int WIFI_PASSWORD_COUNT = sizeof(WIFI_PASSWORDS) / sizeof(WIFI_PASSWORDS[0]);
static const unsigned long WIFI_ATTEMPT_TIMEOUT_MS = 8000UL;

/* 테스트: 10초마다 더미 이미지. 10회마다 original */
static const unsigned long PUBLISH_INTERVAL_MS = 10UL * 1000UL;
static const int ORIGINAL_EVERY_N = 10;

static esp_mqtt_client_handle_t s_mqtt = nullptr;
static volatile bool s_mqtt_connected = false;
static char s_mqtt_client_id[28] = "";
static char s_topicStatus[52] = "";
static unsigned long s_lastPublishMs = 0;
static unsigned long s_publishCount = 0;

/* 1x1 더미 JPEG */
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
  cfg.uri = MQTT_WS_URI;
  cfg.client_id = s_mqtt_client_id;
  cfg.keepalive = 60;
  cfg.disable_auto_reconnect = false;
  cfg.reconnect_timeout_ms = 5000;
  cfg.network_timeout_ms = 15000;
  cfg.buffer_size = 8192;

  s_mqtt = esp_mqtt_client_init(&cfg);
  esp_mqtt_client_register_event(s_mqtt, MQTT_EVENT_ANY, mqttEvent, nullptr);
  esp_err_t err = esp_mqtt_client_start(s_mqtt);
  if (err != ESP_OK) {
    Serial.printf("esp_mqtt_client_start err=%d\n", (int)err);
  }
  Serial.printf("MQTT start uri=%s client=%s\n", MQTT_WS_URI, s_mqtt_client_id);
}

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

static void publishDummy(bool asOriginal) {
  if (!s_mqtt_connected || !s_mqtt) {
    Serial.println("skip publish: mqtt down");
    return;
  }

  String b64;
  if (!encodeBase64(kTinyJpeg, sizeof(kTinyJpeg), b64)) {
    Serial.println("base64 fail");
    return;
  }

  DynamicJsonDocument doc(b64.length() + 512);
  doc["moduleSerial"] = MODULE_SERIAL;
  doc["imageRole"] = asOriginal ? "original" : "sample";
  doc["imageFormat"] = "jpg";
  doc["imageBase64"] = b64;

  String payload;
  serializeJson(doc, payload);
  int msgId = esp_mqtt_client_publish(s_mqtt, s_topicStatus, payload.c_str(), payload.length(), 1, 0);
  Serial.printf("publish #%lu %s role=%s jpeg=%u msgId=%d\n",
                s_publishCount, s_topicStatus, asOriginal ? "original" : "sample",
                (unsigned)sizeof(kTinyJpeg), msgId);
}

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println(BUILD_VERIFY_TAG);
  Serial.printf("serial=%s mqtt=%s every=%lums originalEvery=%d (dummy jpeg only)\n",
                MODULE_SERIAL, MQTT_WS_URI, PUBLISH_INTERVAL_MS, ORIGINAL_EVERY_N);

  if (!connectWifi()) {
    Serial.println("WiFi fail — reboot in 10s");
    delay(10000);
    ESP.restart();
  }
  startMqtt();
  s_lastPublishMs = 0;
  s_publishCount = 0;
}

void loop() {
  unsigned long now = millis();
  if (s_lastPublishMs == 0 || now - s_lastPublishMs >= PUBLISH_INTERVAL_MS) {
    s_publishCount++;
    /* 1, 11, 21… 번째 = original (매 10번마다) */
    bool asOriginal = (s_publishCount % (unsigned long)ORIGINAL_EVERY_N) == 1UL;
    publishDummy(asOriginal);
    s_lastPublishMs = now;
  }
  delay(50);
}
