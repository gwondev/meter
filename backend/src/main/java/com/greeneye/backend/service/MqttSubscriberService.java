package com.greeneye.backend.service;

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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * IoT → 백엔드: {@code meter/+/status}, {@code meter/+/events} 구독.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MqttSubscriberService implements Runnable {

    private final ModuleIotMqttHandler moduleIotMqttHandler;
    private final MqttTrafficLogService mqttTrafficLogService;

    @Value("${mqtt.broker-url:tcp://localhost:1883}")
    private String brokerUrl;

    @Value("${mqtt.subscriber-client-id:meter-backend-sub}")
    private String subscriberClientId;

    private final AtomicBoolean running = new AtomicBoolean(true);
    private Thread thread;
    private volatile MqttClient client;

    @PostConstruct
    public void start() {
        log.info("MQTT subscriber thread start. brokerUrl={}, clientId={}", brokerUrl, subscriberClientId);
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
                log.warn("MQTT subscriber loop error, retry in 3s", e);
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
        client = new MqttClient(brokerUrl, subscriberClientId);
        MqttConnectOptions options = new MqttConnectOptions();
        options.setAutomaticReconnect(true);
        options.setCleanSession(false);
        options.setConnectionTimeout(10);
        options.setKeepAliveInterval(30);

        client.setCallback(new MqttCallbackExtended() {
            @Override
            public void connectComplete(boolean reconnect, String serverURI) {
                log.info("MQTT subscriber connected. reconnect={}, uri={}", reconnect, serverURI);
                try {
                    subscribeTopics();
                } catch (Exception e) {
                    log.warn("MQTT subscriber subscribe failed after connect", e);
                }
            }

            @Override
            public void connectionLost(Throwable cause) {
                log.warn("MQTT subscriber connection lost", cause);
            }

            @Override
            public void messageArrived(String topic, MqttMessage message) {
                try {
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
                    } else if ("events".equals(suffix)) {
                        moduleIotMqttHandler.handleEventsPayload(serial, payload);
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

        log.info("MQTT subscriber connecting to {}", brokerUrl);
        client.connect(options);
        subscribeTopics();

        while (running.get() && client.isConnected()) {
            Thread.sleep(500);
        }
        disconnectQuietly();
    }

    private void subscribeTopics() throws MqttException {
        if (client == null || !client.isConnected()) {
            return;
        }
        client.subscribe("meter/+/status", 1);
        client.subscribe("meter/+/events", 1);
        log.info("MQTT subscriber subscribed meter/+/status, meter/+/events");
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
    }
}
