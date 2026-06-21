package com.greeneye.backend.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 외부 ESP32 등이 브로커 주소를 백엔드와 동일한 기준으로 맞추기 위한 공개 설정.
 * 펌웨어 상수(MQTT_HOST)는 이 응답의 mqttHost 와 같아야 함.
 */
@RestController
@RequestMapping("/api/iot")
public class IotConfigController {

    @Value("${meter.iot.mqtt-host}")
    private String mqttHost;

    @Value("${meter.iot.mqtt-port:80}")
    private int mqttPort;

    @GetMapping("/config")
    public Map<String, Object> config() {
        return Map.of(
                "mqttHost", mqttHost,
                "mqttPort", mqttPort,
                "mqttScheme", "ws",
                "mqttTls", false
        );
    }
}
