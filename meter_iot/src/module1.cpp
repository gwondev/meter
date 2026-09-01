/*
 * METER 모듈1 — 적재 높이 측정 노드
 *
 * 역할: HC-SR04P 초음파 센서로 용기 내부 빈 거리(cm)를 재고, MQTT 로 5초마다 발행한다.
 * 발행 토픽: meter/m1/status   (단일 페이로드, status 구분 없음)
 * 구독: 없음 (발행 전용 단방향)
 *
 * 모듈2(라즈베리파이 영상 판정 노드)는 이 파일과 무관하다.
 *
 * === FIRMWARE VERIFY MARKER (유지보수 규칙 — 에이전트/개발자 공통) ===
 * 목적: `pio run -t clean` 후 `pio run -t upload` 했을 때 시리얼 모니터에
 *       BUILD_VERIFY_TAG 문자열이 setup() 에서 정확히 한 번 출력되는지 확인해
 *       새 펌웨어가 보드에 올라갔는지 검증한다.
 * 규칙:
 *  1) 이 파일(또는 IoT 관련 코드)을 수정할 때마다 BUILD_VERIFY_TAG 문자열을 바꾼다
 *     (날짜 + 짧은 메모, 예: "METER-FW m1 2026-09-01c LED=R/Y/B").
 *  2) setup() 안에서만 Serial.println(BUILD_VERIFY_TAG) 를 호출한다. loop() 에 넣지 말 것.
 *  3) 업로드 후 `pio device monitor` 에서 해당 태그가 보이면 배포 성공으로 본다.
 *  4) 이후 IoT 코드를 또 고쳐도 위 1~3을 반드시 반복한다.
 */
#include <Arduino.h>
#include <cstdio>
#include <cstring>
#include <WiFi.h>
#include <ArduinoJson.h>
#include <mqtt_client.h>
#include <esp_sntp.h>
#include <time.h>

/* 모듈 고유 이름 — 높이 센서 계열은 m1, m2, m3 …
 * 보드마다 이 상수만 바꿔서 빌드한다. (platformio.ini 의 build_flags 사용하지 않음) */
static const char *const MODULE_SERIAL = "m1";

/*
 * 펌웨어 배포 확인 태그 — 수정할 때마다 이 문자열을 갱신한다.
 * setup() 에서 한 번만 출력됨. (위 파일 헤더 VERIFY MARKER 규칙 참고)
 */
static const char *const BUILD_VERIFY_TAG = "METER-FW m1 2026-09-02a PUB=30s LED=R/Y/B";

static const char *MQTT_WS_URI = "ws://mqtt-meter.gwon.run:80";

/* WiFi 후보 — SSID × PASSWORD 전 조합을 순차 시도한다.
 * 비밀번호 없는 개방 AP 도 시도하도록 빈 문자열을 포함한다. */
static const char *WIFI_SSIDS[] = {"gwon", "iptime", "devsign"};
static const char *WIFI_PASSWORDS[] = {"00000000", "Gwondev0323", ""};
static const int WIFI_SSID_COUNT = sizeof(WIFI_SSIDS) / sizeof(WIFI_SSIDS[0]);
static const int WIFI_PASSWORD_COUNT = sizeof(WIFI_PASSWORDS) / sizeof(WIFI_PASSWORDS[0]);
static const unsigned long WIFI_ATTEMPT_TIMEOUT_MS = 8000UL;

static const int PIN_TRIG = 32;
static const int PIN_ECHO = 33;

/* RGB 상태 LED
 *  - 빨강: MQTT 연결 실패/끊김
 *  - 노랑(R+G): MQTT 연결 성공(유지)
 *  - 파랑: MQTT 전송 성공 순간 플래시
 */
static const int PIN_LED_R = 25;
static const int PIN_LED_G = 26;
static const int PIN_LED_B = 27;
static const unsigned long LED_FLASH_MS = 450UL;

static const float DIST_MIN_CM = 2.0f;
static const float DIST_MAX_CM = 100.0f; /* 1m 초과 시 100cm(1m)로 전송 */

static esp_mqtt_client_handle_t s_mqtt = nullptr;
static volatile bool s_mqtt_connected = false;
static char s_mqtt_client_id[28] = "";
static char s_topicStatus[52] = "";
static unsigned long s_lastPublishMs = 0;
static unsigned long s_lastUltraPingMs = 0;
static unsigned long s_lastUltraLogMs = 0;
static unsigned long s_ledFlashUntilMs = 0;
static float s_lastDistCm = -1.0f;

/* 발행 주기 — 높이값 1건을 이 간격으로 계속 보낸다. 서버는 수신 시각을 생존 신호로 쓴다. */
static const unsigned long PUBLISH_INTERVAL_MS = 30UL * 1000UL;
static const unsigned long ULTRA_PING_INTERVAL_MS = 15;
static const unsigned long ULTRA_LOG_INTERVAL_MS = 10000UL;

static void setLedRgb(bool r, bool g, bool b) {
  digitalWrite(PIN_LED_R, r ? HIGH : LOW);
  digitalWrite(PIN_LED_G, g ? HIGH : LOW);
  digitalWrite(PIN_LED_B, b ? HIGH : LOW);
}

static void updateStatusLed() {
  unsigned long now = millis();
  if (!s_mqtt_connected) {
    setLedRgb(true, false, false); /* 빨강 — MQTT 미연결 */
  } else if (now < s_ledFlashUntilMs) {
    setLedRgb(false, false, true); /* 파랑 — 전송 성공 */
  } else {
    setLedRgb(true, true, false); /* 노랑 — MQTT 연결 유지 */
  }
}

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
  if (cm > DIST_MAX_CM) {
    return DIST_MAX_CM; /* 1m 넘으면 100cm(1m)로 전송 */
  }
  if (cm < DIST_MIN_CM) {
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
  if (s_lastDistCm >= 0 && (now - s_lastUltraLogMs >= ULTRA_LOG_INTERVAL_MS)) {
    s_lastUltraLogMs = now;
    Serial.printf("[ULTRA] dist=%.1f cm\n", s_lastDistCm);
  }
}

/* SSID 하나에 대해 모든 비밀번호를 시도한다. */
static bool tryConnectSsid(const char *ssid) {
  for (int p = 0; p < WIFI_PASSWORD_COUNT; p++) {
    const char *password = WIFI_PASSWORDS[p];
    Serial.printf("[NET] SSID=\"%s\" pw#%d %s ", ssid, p, strlen(password) == 0 ? "(open)" : "(psk)");

    WiFi.disconnect(true, true);
    delay(120);
    if (strlen(password) == 0) {
      WiFi.begin(ssid);
    } else {
      WiFi.begin(ssid, password);
    }

    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_ATTEMPT_TIMEOUT_MS) {
      delay(250);
      Serial.print(".");
    }
    Serial.println();

    if (WiFi.status() == WL_CONNECTED) {
      Serial.printf("[NET] connected SSID=\"%s\" IP=%s\n", ssid, WiFi.localIP().toString().c_str());
      return true;
    }
  }
  return false;
}

bool connectWifiFromLists() {
  WiFi.mode(WIFI_STA);
  Serial.println("[NET] WiFi connect start (SSID x PASSWORD 전 조합)");
  for (int s = 0; s < WIFI_SSID_COUNT; s++) {
    if (tryConnectSsid(WIFI_SSIDS[s])) {
      return true;
    }
  }
  Serial.println("[NET] WiFi connect failed — 모든 조합 실패");
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
    return;
  }
  /* 전송 큐 수락 = 전송 성공으로 보고 파란 LED 플래시 */
  s_ledFlashUntilMs = millis() + LED_FLASH_MS;
}

/* 단일 페이로드: {"moduleSerial":"m1","heightCm":25.3} */
void publishHeight(float cm) {
  StaticJsonDocument<128> doc;
  doc["moduleSerial"] = MODULE_SERIAL;
  doc["heightCm"] = cm;

  char buf[160];
  size_t n = serializeJson(doc, buf, sizeof(buf));
  if (n == 0 || n >= sizeof(buf)) {
    Serial.println("publishHeight: buffer too small");
    return;
  }
  buf[n] = '\0';
  Serial.printf(">>> PUB %s %s\n", s_topicStatus, buf);
  mqttPublishRaw(s_topicStatus, buf);
}

static void mqtt_event_handler(void *handler_args, esp_event_base_t base, int32_t event_id, void *event_data) {
  (void)handler_args;
  (void)base;
  (void)event_data;

  switch ((esp_mqtt_event_id_t)event_id) {
    case MQTT_EVENT_CONNECTED:
      Serial.println("MQTT_EVENT_CONNECTED");
      s_mqtt_connected = true;
      if (s_lastDistCm >= 0) {
        publishHeight(s_lastDistCm);
        s_lastPublishMs = millis();
      }
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
  cfg.buffer_size = 2048;

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
  Serial.println("======== METER MODULE1 BOOT ========");
  /* VERIFY: clean+upload 후 이 줄이 한 번 보이면 새 펌웨어 반영 완료 */
  Serial.println(BUILD_VERIFY_TAG);
  Serial.printf("MODULE_SERIAL=%s  PUB: meter/%s/status (%lus)\n",
                MODULE_SERIAL, MODULE_SERIAL, PUBLISH_INTERVAL_MS / 1000UL);
  Serial.printf("build %s %s\n", __DATE__, __TIME__);
  Serial.println("====================================");

  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  digitalWrite(PIN_TRIG, LOW);

  pinMode(PIN_LED_R, OUTPUT);
  pinMode(PIN_LED_G, OUTPUT);
  pinMode(PIN_LED_B, OUTPUT);
  setLedRgb(true, false, false); /* 부팅 직후: 미연결(빨강) */

  while (!connectWifiFromLists()) {
    Serial.println("WiFi retry 5s");
    delay(5000);
  }

  configTime(9 * 3600, 0, "pool.ntp.org", "time.google.com");
  buildMqttClientId();
  buildMqttTopics();
  startMqttClient();
  s_lastPublishMs = millis();
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
  if (now - s_lastPublishMs >= PUBLISH_INTERVAL_MS) {
    /* 발행 시점마다 재측정 — 1m 초과는 measureDistanceCm 에서 100cm 로 클램프 */
    float cm = measureDistanceCm();
    if (cm >= 0) {
      s_lastDistCm = cm;
      publishHeight(cm);
    } else if (s_lastDistCm >= 0) {
      publishHeight(s_lastDistCm);
    } else {
      Serial.println("[ULTRA] invalid sample — publish skipped");
    }
    s_lastPublishMs = now;
  }

  updateStatusLed();
  delay(20);
}
