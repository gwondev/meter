package com.meter.backend.service;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.paho.client.mqttv3.IMqttDeliveryToken;
import org.eclipse.paho.client.mqttv3.MqttCallbackExtended;
import org.eclipse.paho.client.mqttv3.MqttClient;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.eclipse.paho.client.mqttv3.MqttException;
import org.eclipse.paho.client.mqttv3.MqttMessage;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;

/**
 * IoT → 백엔드: {@code meter/+/status} 구독 (수신 전용, 하향 명령 없음).
 *
 * <p>브로커에 ESP32 메시지가 보이는데 웹 로그가 비면 대개 이 구독자가 죽은 상태다.
 * Docker 재배포 후 {@code /api/mosquitto/diag} 의 {@code buildVerifyTag}·{@code subscribed} 를 확인한다.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MqttSubscriberService implements Runnable {

    /**
     * === BACKEND VERIFY MARKER (유지보수 규칙) ===
     * 배포 확인용. docker compose up --build 후 /api/mosquitto/diag 또는 로그에
     * 이 문자열이 보이면 새 JAR 이 올라간 것이다. 코드를 고칠 때마다 태그를 바꾼다.
     */
    public static final String BUILD_VERIFY_TAG = "METER-BE 2026-09-02b dummy-table";

    private final ModuleIotMqttHandler moduleIotMqttHandler;
    private final MqttTrafficLogService mqttTrafficLogService;

    @Value("${mqtt.broker-url:tcp://meter-mosquitto:1883}")
    private String brokerUrl;

    @Value("${mqtt.subscriber-client-id:meter-backend-sub}")
    private String subscriberClientIdBase;

    private final AtomicBoolean running = new AtomicBoolean(true);
    private final AtomicLong inboundCount = new AtomicLong();
    private Thread thread;
    private volatile MqttClient client;
    private volatile String activeClientId;
    private volatile boolean subscribed;
    private volatile String lastError;
    private volatile long lastMessageAtMs;
    private volatile long connectedAtMs;

    /** /api/mosquitto/diag — 구독자 연결·구독 상태 확인용 */
    public Map<String, Object> diagnostics() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("buildVerifyTag", BUILD_VERIFY_TAG);
        m.put("brokerUrl", brokerUrl);
        m.put("subscriberClientId", activeClientId != null ? activeClientId : subscriberClientIdBase);
        MqttClient c = client;
        m.put("subscriberConnected", c != null && c.isConnected());
        m.put("subscribed", subscribed);
        m.put("inboundCount", inboundCount.get());
        m.put("lastError", lastError);
        m.put("lastMessageAtMs", lastMessageAtMs > 0 ? lastMessageAtMs : null);
        m.put("connectedAtMs", connectedAtMs > 0 ? connectedAtMs : null);
        return m;
    }

    @PostConstruct
    public void start() {
        log.info("MQTT subscriber VERIFY={} brokerUrl={} baseClientId={}",
                BUILD_VERIFY_TAG, brokerUrl, subscriberClientIdBase);
        thread = new Thread(this, "mqtt-subscriber");
        thread.setDaemon(true);
        thread.start();
    }

    @PreDestroy
    public void stop() {
        running.set(false);
        if (thread != null) {
            thread.interrupt();
        }
        disconnectQuietly();
    }

    @Override
    public void run() {
        while (running.get() && !Thread.currentThread().isInterrupted()) {
            try {
                connectAndConsume();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            } catch (Exception e) {
                lastError = e.getMessage();
                subscribed = false;
                log.warn("MQTT subscriber loop error, retry in 3s: {}", e.toString());
                try {
                    Thread.sleep(3000);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }
        log.warn("MQTT subscriber thread exit");
    }

    private void connectAndConsume() throws MqttException, InterruptedException {
        disconnectQuietly();

        /* 매 연결마다 clientId 를 유니크하게 — 이전 세션/좀비 연결이 구독을 가로채는 걸 막는다.
         * Persistence 는 파일 락 대신 메모리만 사용 (Docker 에서 잔여 락으로 connect 실패 방지). */
        activeClientId = subscriberClientIdBase + "-" + UUID.randomUUID().toString().substring(0, 8);
        client = new MqttClient(brokerUrl, activeClientId, new MemoryPersistence());

        MqttConnectOptions options = new MqttConnectOptions();
        // 수동 재연결 루프와 Paho 자동 재연결이 동시에 켜지면 같은 clientId 로 레이스가 난다.
        options.setAutomaticReconnect(false);
        options.setCleanSession(true);
        options.setConnectionTimeout(10);
        options.setKeepAliveInterval(30);
        options.setMaxInflight(50);

        client.setCallback(new MqttCallbackExtended() {
            @Override
            public void connectComplete(boolean reconnect, String serverURI) {
                connectedAtMs = System.currentTimeMillis();
                log.info("MQTT subscriber connected. reconnect={} uri={} clientId={} VERIFY={}",
                        reconnect, serverURI, activeClientId, BUILD_VERIFY_TAG);
                try {
                    subscribeTopics();
                } catch (Exception e) {
                    lastError = e.getMessage();
                    log.warn("MQTT subscriber subscribe failed after connect", e);
                }
            }

            @Override
            public void connectionLost(Throwable cause) {
                subscribed = false;
                lastError = cause != null ? cause.getMessage() : "connectionLost";
                log.warn("MQTT subscriber connection lost: {}", lastError);
            }

            @Override
            public void messageArrived(String topic, MqttMessage message) {
                try {
                    lastMessageAtMs = System.currentTimeMillis();
                    inboundCount.incrementAndGet();
                    String payload = new String(message.getPayload(), StandardCharsets.UTF_8);
                    mqttTrafficLogService.add("IN", topic, payload);
                    log.info("MQTT IN topic={} bytes={} VERIFY={}", topic, payload.length(), BUILD_VERIFY_TAG);
                    String[] parts = topic.split("/");
                    if (parts.length != 3 || !"meter".equals(parts[0])) {
                        log.warn("Unexpected MQTT topic {}", topic);
                        return;
                    }
                    String serial = parts[1];
                    String suffix = parts[2];
                    if ("status".equals(suffix)) {
                        moduleIotMqttHandler.handleStatusPayload(serial, payload);
                    }
                } catch (Exception e) {
                    log.error("MQTT subscriber message handling failed. topic={}", topic, e);
                }
            }

            @Override
            public void deliveryComplete(IMqttDeliveryToken token) {
                // not publishing from this client
            }
        });

        log.info("MQTT subscriber connecting to {} as {}", brokerUrl, activeClientId);
        lastError = null;
        client.connect(options);
        subscribeTopics();

        long lastHeartbeatLog = System.currentTimeMillis();
        while (running.get() && client != null && client.isConnected()) {
            Thread.sleep(500);
            long now = System.currentTimeMillis();
            if (now - lastHeartbeatLog >= 60_000L) {
                lastHeartbeatLog = now;
                log.info("MQTT subscriber alive connected={} subscribed={} inbound={} clientId={}",
                        client.isConnected(), subscribed, inboundCount.get(), activeClientId);
            }
        }
        disconnectQuietly();
    }

    private void subscribeTopics() throws MqttException {
        if (client == null || !client.isConnected()) {
            return;
        }
        client.subscribe("meter/+/status", 1);
        subscribed = true;
        log.info("MQTT subscriber subscribed meter/+/status clientId={} VERIFY={}",
                activeClientId, BUILD_VERIFY_TAG);
    }

    private void disconnectQuietly() {
        subscribed = false;
        try {
            if (client != null && client.isConnected()) {
                client.disconnect();
            }
        } catch (Exception ignored) {
        }
        try {
            if (client != null) {
                client.close();
            }
        } catch (Exception ignored) {
        }
        client = null;
    }
}
