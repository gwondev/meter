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

/**
 * IoT → 백엔드: {@code meter/+/status} 구독 (수신 전용, 하향 명령 없음).
 *
 * <p>배포 확인: {@link #DEPLOY_MARKER} 가 기동 로그·/api/mosquitto/diag 에 한 번 찍혀야
 * 새 백엔드 이미지가 올라간 것이다. 마커가 안 보이면 옛 컨테이너다.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MqttSubscriberService implements Runnable {

    /**
     * 배포 확인용 수정 문자.
     * 백엔드 MQTT 구독 로직을 고칠 때마다 이 문자열을 바꿔라.
     * docker compose up --build 후 {@code docker logs meter-backend | grep DEPLOY} 로 확인.
     */
    public static final String DEPLOY_MARKER = "METER-DEPLOY-20260901-MQTT-SUB-V3";

    private final ModuleIotMqttHandler moduleIotMqttHandler;
    private final MqttTrafficLogService mqttTrafficLogService;

    @Value("${mqtt.broker-url:tcp://mosquitto:1883}")
    private String brokerUrl;

    @Value("${mqtt.subscriber-client-id:meter-backend-sub}")
    private String subscriberClientIdPrefix;

    private final AtomicBoolean running = new AtomicBoolean(true);
    private Thread thread;
    private volatile MqttClient client;
    private volatile boolean subscribed;
    private volatile String lastError;
    private volatile long lastMessageAtMs;
    private volatile String activeClientId;
    private volatile long receivedCount;

    /** /api/mosquitto/diag — 구독자 연결·구독 상태 확인용 */
    public Map<String, Object> diagnostics() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("deployMarker", DEPLOY_MARKER);
        m.put("brokerUrl", brokerUrl);
        m.put("subscriberClientId", activeClientId != null ? activeClientId : subscriberClientIdPrefix);
        MqttClient c = client;
        m.put("subscriberConnected", c != null && c.isConnected());
        m.put("subscribed", subscribed);
        m.put("lastError", lastError);
        m.put("receivedCount", receivedCount);
        m.put("lastMessageAtMs", lastMessageAtMs > 0 ? lastMessageAtMs : null);
        return m;
    }

    @PostConstruct
    public void start() {
        // 배포 확인: 이 한 줄이 로그에 보이면 새 코드가 기동된 것
        log.info("[{}] MQTT subscriber thread start. brokerUrl={}", DEPLOY_MARKER, brokerUrl);
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
                log.warn("[{}] MQTT subscriber loop error, retry in 3s: {}", DEPLOY_MARKER, e.getMessage(), e);
                try {
                    Thread.sleep(3000);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }
    }

    private void connectAndConsume() throws MqttException, InterruptedException {
        disconnectQuietly();

        // 고정 clientId 는 재기동·다중 인스턴스에서 서로 kick 한다. 부팅마다 unique.
        activeClientId = subscriberClientIdPrefix + "-" + UUID.randomUUID().toString().substring(0, 8);
        client = new MqttClient(brokerUrl, activeClientId, new MemoryPersistence());

        MqttConnectOptions options = new MqttConnectOptions();
        // 수동 재연결 루프와 Paho 자동 재연결이 동시에 켜지면 같은 clientId 로 레이스가 난다.
        options.setAutomaticReconnect(false);
        options.setCleanSession(true);
        options.setConnectionTimeout(10);
        options.setKeepAliveInterval(30);

        client.setCallback(new MqttCallbackExtended() {
            @Override
            public void connectComplete(boolean reconnect, String serverURI) {
                log.info("[{}] MQTT subscriber connected. reconnect={} uri={} clientId={}",
                        DEPLOY_MARKER, reconnect, serverURI, activeClientId);
                try {
                    subscribeTopics();
                } catch (Exception e) {
                    lastError = e.getMessage();
                    log.warn("[{}] MQTT subscriber subscribe failed after connect", DEPLOY_MARKER, e);
                }
            }

            @Override
            public void connectionLost(Throwable cause) {
                subscribed = false;
                lastError = cause != null ? cause.getMessage() : "connectionLost";
                log.warn("[{}] MQTT subscriber connection lost: {}", DEPLOY_MARKER, lastError);
            }

            @Override
            public void messageArrived(String topic, MqttMessage message) {
                try {
                    lastMessageAtMs = System.currentTimeMillis();
                    receivedCount++;
                    String payload = new String(message.getPayload(), StandardCharsets.UTF_8);
                    mqttTrafficLogService.add("IN", topic, payload);
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

        log.info("[{}] MQTT subscriber connecting to {} as {}", DEPLOY_MARKER, brokerUrl, activeClientId);
        lastError = null;
        client.connect(options);
        subscribeTopics();

        while (running.get() && client != null && client.isConnected()) {
            Thread.sleep(500);
        }
        disconnectQuietly();
    }

    private void subscribeTopics() throws MqttException {
        if (client == null || !client.isConnected()) {
            return;
        }
        client.subscribe("meter/+/status", 1);
        subscribed = true;
        log.info("[{}] MQTT subscriber subscribed meter/+/status", DEPLOY_MARKER);
    }

    private void disconnectQuietly() {
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
        subscribed = false;
    }
}
