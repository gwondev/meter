#include <Arduino.h>
#include <cstdio>
#include <cstring>
#include <WiFi.h>
#include <ArduinoJson.h>
#include <mqtt_client.h>
#include <esp_sntp.h>
#include <time.h>

#ifndef METER_MODULE_SERIAL
#error Set METER_MODULE_SERIAL in platformio.ini (build_flags = -DMETER_MODULE_SERIAL=m1)
#endif
#define METER_MS_XSTR(s) #s
#define METER_MS_STR(s) METER_MS_XSTR(s)
static const char MODULE_SERIAL_BUF[] = METER_MS_STR(METER_MODULE_SERIAL);
static const char *const MODULE_SERIAL = MODULE_SERIAL_BUF;

static const char *MQTT_WS_URI = "ws://mqtt-meter.gwon.run:80";

static const char *WIFI_SSIDS[] = {"gwon", "iptime"};
static const char *WIFI_PASSWORDS[] = {"00000000", "Gwondev0323", ""};
static const int WIFI_SSID_COUNT = 2;
static const int WIFI_PASSWORD_COUNT = 3;

static const int PIN_TRIG = 32;
static const int PIN_ECHO = 33;
static const int PIN_LED_R = 25;
static const int PIN_LED_G = 26;
static const int PIN_LED_B = 27;

static const unsigned long HEARTBEAT_INTERVAL_MS = 5UL * 60UL * 1000UL;
static const unsigned long HEIGHT_INTERVAL_MS = 1UL * 60UL * 1000UL;
static const unsigned long ULTRA_PING_INTERVAL_MS = 15;
static const unsigned long ULTRA_LOG_INTERVAL_MS = 10000UL;

static const float THRESH_RED_CM = 10.0f;
static const float THRESH_ORANGE_CM = 30.0f;
static const float THRESH_GREEN_CM = 50.0f;

static const uint32_t LEDC_FREQ_HZ = 10000;
static const uint8_t LEDC_RES_BITS = 8;
static const int LEDC_CH_R = 0;
static const int LEDC_CH_G = 1;
static const int LEDC_CH_B = 2;

static esp_mqtt_client_handle_t s_mqtt = nullptr;
static volatile bool s_mqtt_connected = false;
static char s_mqtt_client_id[28] = "";
static char s_topicStatus[52] = "";
static unsigned long s_lastHeartbeatMs = 0;
static unsigned long s_lastHeightPublishMs = 0;
static unsigned long s_lastUltraPingMs = 0;
static unsigned long s_lastUltraLogMs = 0;
static float s_lastDistCm = -1.0f;

static void buildMqttClientId() {
  uint64_t mac = ESP.getEfuseMac();
  snprintf(
      s_mqtt_client_id,
      sizeof(s_mqtt_client_id),
      "%s-%02X%02X%02X%02X%02X%02X",
      MODULE_SERIAL,
      (unsigned)((mac >> 40) & 0xff),
      (unsigned)((mac >> 32) & 0xff),
      (unsigned)((mac >> 24) & 0xff),
      (unsigned)((mac >> 16) & 0xff),
      (unsigned)((mac >> 8) & 0xff),
      (unsigned)(mac & 0xff));
}

static void buildMqttTopics() {
  snprintf(s_topicStatus, sizeof(s_topicStatus), "meter/%s/status", MODULE_SERIAL);
}

void rgbPwm(uint8_t r, uint8_t g, uint8_t b) {
  ledcWrite(LEDC_CH_R, r);
  ledcWrite(LEDC_CH_G, g);
  ledcWrite(LEDC_CH_B, b);
}

void applyFillLevelLed(float cm) {
  if (cm < 0) {
    rgbPwm(40, 40, 40);
    return;
  }
  if (cm <= THRESH_RED_CM) {
    rgbPwm(255, 0, 0);
  } else if (cm <= THRESH_ORANGE_CM) {
    rgbPwm(255, 80, 0);
  } else if (cm <= THRESH_GREEN_CM) {
    rgbPwm(0, 200, 60);
  } else {
    rgbPwm(0, 0, 0);
  }
}

float measureDistanceCm() {
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);
  unsigned long durationUs = pulseIn(PIN_ECHO, HIGH, 30000);
  if (durationUs == 0) {
    return -1.0f;
  }
  float cm = (float)durationUs / 58.0f;
  if (cm < 2.0f || cm > 400.0f) {
    return -1.0f;
  }
  return cm;
}

void updateUltrasonicSample() {
  unsigned long now = millis();
  if (now - s_lastUltraPingMs < ULTRA_PING_INTERVAL_MS) {
    return;
  }
  s_lastUltraPingMs = now;
  s_lastDistCm = measureDistanceCm();
  applyFillLevelLed(s_lastDistCm);
  if (s_lastDistCm >= 0 && (now - s_lastUltraLogMs >= ULTRA_LOG_INTERVAL_MS)) {
    s_lastUltraLogMs = now;
    Serial.printf("[ULTRA] dist=%.1f cm\n", s_lastDistCm);
  }
}

bool connectWifiFromLists() {
  WiFi.mode(WIFI_STA);
  Serial.println("[NET] WiFi connect start");
  for (int s = 0; s < WIFI_SSID_COUNT; s++) {
    for (int p = 0; p < WIFI_PASSWORD_COUNT; p++) {
      Serial.printf("WiFi: SSID=\"%s\" ", WIFI_SSIDS[s]);
      if (strlen(WIFI_PASSWORDS[p]) == 0) {
        Serial.println("(open)");
        WiFi.begin(WIFI_SSIDS[s]);
      } else {
        Serial.println("(psk)");
        WiFi.begin(WIFI_SSIDS[s], WIFI_PASSWORDS[p]);
      }
      unsigned long start = millis();
      while (WiFi.status() != WL_CONNECTED && millis() - start < 12000UL) {
        delay(300);
        Serial.print(".");
      }
      Serial.println();
      if (WiFi.status() == WL_CONNECTED) {
        Serial.print("IP: ");
        Serial.println(WiFi.localIP());
        return true;
      }
      delay(300);
    }
  }
  Serial.println("[NET] WiFi connect failed");
  return false;
}

static void mqttPublishRaw(const char *topic, const char *payload, int qos = 1) {
  if (!s_mqtt || !s_mqtt_connected) {
    Serial.println("mqttPublishRaw: not connected");
    return;
  }
  int len = (int)strlen(payload);
  int mid = esp_mqtt_client_publish(s_mqtt, topic, payload, len, qos, 0);
  if (mid < 0) {
    Serial.printf("publish failed topic=%s\n", topic);
  }
}

template <size_t N>
void publishDoc(const char *topic, StaticJsonDocument<N> &doc) {
  char buf[256];
  size_t n = serializeJson(doc, buf, sizeof(buf));
  if (n == 0 || n >= sizeof(buf)) {
    Serial.println("publishDoc: buffer too small");
    return;
  }
  buf[n] = '\0';
  Serial.printf(">>> PUB %s %s\n", topic, buf);
  mqttPublishRaw(topic, buf);
}

void publishHeartbeat() {
  StaticJsonDocument<96> doc;
  doc["status"] = "HEARTBEAT";
  doc["moduleSerial"] = MODULE_SERIAL;
  publishDoc(s_topicStatus, doc);
}

void publishHeight(float cm) {
  StaticJsonDocument<128> doc;
  doc["status"] = "HEIGHT";
  doc["moduleSerial"] = MODULE_SERIAL;
  doc["heightCm"] = cm;
  publishDoc(s_topicStatus, doc);
}

static void mqtt_event_handler(void *handler_args, esp_event_base_t base, int32_t event_id, void *event_data) {
  esp_mqtt_event_handle_t event = (esp_mqtt_event_handle_t)event_data;
  (void)handler_args;
  (void)base;

  switch ((esp_mqtt_event_id_t)event_id) {
    case MQTT_EVENT_CONNECTED:
      Serial.println("MQTT_EVENT_CONNECTED");
      s_mqtt_connected = true;
      publishHeartbeat();
      s_lastHeartbeatMs = millis();
      break;
    case MQTT_EVENT_DISCONNECTED:
      s_mqtt_connected = false;
      Serial.println("MQTT_EVENT_DISCONNECTED");
      break;
    default:
      break;
  }
}

void startMqttClient() {
  if (s_mqtt) {
    esp_mqtt_client_stop(s_mqtt);
    esp_mqtt_client_destroy(s_mqtt);
    s_mqtt = nullptr;
    s_mqtt_connected = false;
  }
  if (s_mqtt_client_id[0] == '\0') {
    buildMqttClientId();
  }

  esp_mqtt_client_config_t cfg = {};
  cfg.uri = MQTT_WS_URI;
  cfg.client_id = s_mqtt_client_id;
  cfg.keepalive = 15;
  cfg.refresh_connection_after_ms = 120000;
  cfg.disable_clean_session = false;
  cfg.disable_auto_reconnect = false;
  cfg.reconnect_timeout_ms = 5000;
  cfg.network_timeout_ms = 10000;
  cfg.buffer_size = 4096;

  s_mqtt = esp_mqtt_client_init(&cfg);
  esp_mqtt_client_register_event(s_mqtt, MQTT_EVENT_ANY, mqtt_event_handler, nullptr);
  esp_err_t err = esp_mqtt_client_start(s_mqtt);
  if (err != ESP_OK) {
    Serial.printf("esp_mqtt_client_start err=%d\n", (int)err);
  }
}

void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println();
  Serial.println("======== METER BOOT ========");
  Serial.printf("MODULE_SERIAL=%s  MQTT: meter/%s/status\n", MODULE_SERIAL, MODULE_SERIAL);
  Serial.printf("build %s %s\n", __DATE__, __TIME__);
  Serial.println("===========================");

  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  digitalWrite(PIN_TRIG, LOW);
  ledcSetup(LEDC_CH_R, LEDC_FREQ_HZ, LEDC_RES_BITS);
  ledcSetup(LEDC_CH_G, LEDC_FREQ_HZ, LEDC_RES_BITS);
  ledcSetup(LEDC_CH_B, LEDC_FREQ_HZ, LEDC_RES_BITS);
  ledcAttachPin(PIN_LED_R, LEDC_CH_R);
  ledcAttachPin(PIN_LED_G, LEDC_CH_G);
  ledcAttachPin(PIN_LED_B, LEDC_CH_B);
  applyFillLevelLed(-1);

  while (!connectWifiFromLists()) {
    Serial.println("WiFi retry 5s");
    delay(5000);
  }

  configTime(9 * 3600, 0, "pool.ntp.org", "time.google.com");
  buildMqttClientId();
  buildMqttTopics();
  startMqttClient();
  s_lastHeartbeatMs = millis();
  s_lastHeightPublishMs = millis();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    s_mqtt_connected = false;
    while (!connectWifiFromLists()) {
      delay(3000);
    }
    startMqttClient();
  }

  updateUltrasonicSample();
  unsigned long now = millis();

  if (now - s_lastHeartbeatMs >= HEARTBEAT_INTERVAL_MS) {
    publishHeartbeat();
    s_lastHeartbeatMs = now;
  }

  if (now - s_lastHeightPublishMs >= HEIGHT_INTERVAL_MS) {
    if (s_lastDistCm >= 0) {
      publishHeight(s_lastDistCm);
    }
    s_lastHeightPublishMs = now;
  }

  delay(20);
}
