/*
 * METER 모듈2 — r1 테스트
 * data/images/*.jpg 를 LittleFS에서 읽어 10초마다 MQTT 전송.
 * 10번마다 1회 imageRole=original, 나머지는 sample.
 *
 * 이미지 넣기:
 *   meter_iot/module2/data/images/ 에 jpg 두기 (수십~100장 OK, 장당 200KB 이하 권장)
 *   pio run -t uploadfs
 *   pio run -t upload
 */
#include <Arduino.h>
#include <cstdio>
#include <cstring>
#include <memory>
#include <vector>
#include <string>
#include <WiFi.h>
#include <LittleFS.h>
#include <ArduinoJson.h>
#include <mqtt_client.h>
#include <mbedtls/base64.h>

static const char *const MODULE_SERIAL = "r1";
static const char *const BUILD_VERIFY_TAG = "METER-FW r1 2026-09-12e littlefs-imgs";
static const char *MQTT_WS_URI = "ws://mqtt-meter.gwon.run:80";
static const char *IMAGES_DIR = "/images";

static const char *WIFI_SSIDS[] = {"gwon", "iptime", "devsign"};
static const char *WIFI_PASSWORDS[] = {"00000000", "Gwondev0323", ""};
static const int WIFI_SSID_COUNT = sizeof(WIFI_SSIDS) / sizeof(WIFI_SSIDS[0]);
static const int WIFI_PASSWORD_COUNT = sizeof(WIFI_PASSWORDS) / sizeof(WIFI_PASSWORDS[0]);
static const unsigned long WIFI_ATTEMPT_TIMEOUT_MS = 8000UL;

static const unsigned long PUBLISH_INTERVAL_MS = 10UL * 1000UL;
static const int ORIGINAL_EVERY_N = 10;
static const size_t MAX_IMAGE_BYTES = 350000; /* base64 전 JPEG 상한 */

static esp_mqtt_client_handle_t s_mqtt = nullptr;
static volatile bool s_mqtt_connected = false;
static char s_mqtt_client_id[28] = "";
static char s_topicStatus[52] = "";
static unsigned long s_lastPublishMs = 0;
static unsigned long s_publishCount = 0;
static std::vector<std::string> s_imagePaths;
static size_t s_imageIndex = 0;

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
  cfg.network_timeout_ms = 20000;
  cfg.buffer_size = 65536; /* JPEG base64 JSON */

  s_mqtt = esp_mqtt_client_init(&cfg);
  esp_mqtt_client_register_event(s_mqtt, MQTT_EVENT_ANY, mqttEvent, nullptr);
  esp_err_t err = esp_mqtt_client_start(s_mqtt);
  if (err != ESP_OK) {
    Serial.printf("esp_mqtt_client_start err=%d\n", (int)err);
  }
  Serial.printf("MQTT start uri=%s\n", MQTT_WS_URI);
}

static bool endsWithIgnoreCase(const String &s, const char *suffix) {
  size_t n = strlen(suffix);
  if (s.length() < n) return false;
  for (size_t i = 0; i < n; i++) {
    char a = s[s.length() - n + i];
    char b = suffix[i];
    if (a >= 'A' && a <= 'Z') a = a - 'A' + 'a';
    if (b >= 'A' && b <= 'Z') b = b - 'A' + 'a';
    if (a != b) return false;
  }
  return true;
}

static void loadImageList() {
  s_imagePaths.clear();
  s_imageIndex = 0;
  if (!LittleFS.exists(IMAGES_DIR)) {
    Serial.printf("no %s dir — put jpgs in data/images then: pio run -t uploadfs\n", IMAGES_DIR);
    return;
  }
  File root = LittleFS.open(IMAGES_DIR);
  if (!root || !root.isDirectory()) {
    Serial.println("images dir open fail");
    return;
  }
  File f = root.openNextFile();
  while (f) {
    String name = f.name();
    if (!f.isDirectory() && (endsWithIgnoreCase(name, ".jpg") || endsWithIgnoreCase(name, ".jpeg"))) {
      /* LittleFS name may be full path or basename depending on core */
      String path = name;
      if (!path.startsWith("/")) {
        path = String(IMAGES_DIR) + "/" + path;
      } else if (path.indexOf(IMAGES_DIR) < 0) {
        path = String(IMAGES_DIR) + path;
      }
      s_imagePaths.push_back(std::string(path.c_str()));
    }
    f = root.openNextFile();
  }
  Serial.printf("loaded %u images from LittleFS\n", (unsigned)s_imagePaths.size());
}

static bool encodeBase64(const uint8_t *data, size_t len, String &out) {
  size_t olen = 0;
  mbedtls_base64_encode(nullptr, 0, &olen, data, len);
  out.reserve(olen + 4);
  out.remove(0);
  std::unique_ptr<unsigned char[]> buf(new (std::nothrow) unsigned char[olen + 1]);
  if (!buf) return false;
  size_t written = 0;
  if (mbedtls_base64_encode(buf.get(), olen + 1, &written, data, len) != 0) {
    return false;
  }
  buf[written] = 0;
  out = (char *)buf.get();
  return true;
}

static bool readNextImage(std::unique_ptr<uint8_t[]> &buf, size_t &len, String &label) {
  if (s_imagePaths.empty()) {
    buf.reset(new uint8_t[sizeof(kTinyJpeg)]);
    memcpy(buf.get(), kTinyJpeg, sizeof(kTinyJpeg));
    len = sizeof(kTinyJpeg);
    label = "fallback-tiny";
    return true;
  }
  const std::string &path = s_imagePaths[s_imageIndex % s_imagePaths.size()];
  s_imageIndex = (s_imageIndex + 1) % s_imagePaths.size();
  label = path.c_str();

  File f = LittleFS.open(path.c_str(), "r");
  if (!f) {
    Serial.printf("open fail %s\n", path.c_str());
    return false;
  }
  size_t sz = f.size();
  if (sz == 0 || sz > MAX_IMAGE_BYTES) {
    Serial.printf("bad size %s bytes=%u\n", path.c_str(), (unsigned)sz);
    f.close();
    return false;
  }
  buf.reset(new (std::nothrow) uint8_t[sz]);
  if (!buf) {
    f.close();
    return false;
  }
  size_t got = f.read(buf.get(), sz);
  f.close();
  if (got != sz) return false;
  len = sz;
  return true;
}

static void publishImage(bool asOriginal) {
  if (!s_mqtt_connected || !s_mqtt) {
    Serial.println("skip publish: mqtt down");
    return;
  }

  std::unique_ptr<uint8_t[]> jpeg;
  size_t jpegLen = 0;
  String label;
  if (!readNextImage(jpeg, jpegLen, label)) {
    Serial.println("read image fail");
    return;
  }

  String b64;
  if (!encodeBase64(jpeg.get(), jpegLen, b64)) {
    Serial.println("base64 fail");
    return;
  }

  DynamicJsonDocument doc(b64.length() + 1024);
  doc["moduleSerial"] = MODULE_SERIAL;
  doc["imageRole"] = asOriginal ? "original" : "sample";
  doc["imageFormat"] = "jpg";
  doc["imageBase64"] = b64;

  String payload;
  serializeJson(doc, payload);
  int msgId = esp_mqtt_client_publish(s_mqtt, s_topicStatus, payload.c_str(), payload.length(), 1, 0);
  Serial.printf("publish #%lu role=%s file=%s jpeg=%u msgId=%d\n",
                s_publishCount, asOriginal ? "original" : "sample",
                label.c_str(), (unsigned)jpegLen, msgId);
}

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println(BUILD_VERIFY_TAG);
  Serial.printf("serial=%s every=%lums originalEvery=%d\n",
                MODULE_SERIAL, PUBLISH_INTERVAL_MS, ORIGINAL_EVERY_N);

  if (!LittleFS.begin(true)) {
    Serial.println("LittleFS mount fail");
  } else {
    loadImageList();
  }

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
    bool asOriginal = (s_publishCount % (unsigned long)ORIGINAL_EVERY_N) == 1UL;
    publishImage(asOriginal);
    s_lastPublishMs = now;
  }
  delay(50);
}
