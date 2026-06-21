package com.meter.backend.controller;

import com.meter.backend.service.MqttPublisherService;
import com.meter.backend.service.MqttTrafficLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/mosquitto")
@RequiredArgsConstructor
public class MosquittoController {
    private final MqttTrafficLogService mqttTrafficLogService;
    private final MqttPublisherService mqttPublisherService;

    @GetMapping("/logs")
    public List<Map<String, Object>> logs(@RequestParam(defaultValue = "20") int limit) {
        return mqttTrafficLogService.latest(limit);
    }

    /**
     * 브라우저에서 GET 호출로 확인: 백엔드가 실제로 어느 MQTT URL에 붙는지.
     * UI [OUT] 과 mosquitto_sub 가 안 맞을 때 여기 brokerUrl 과 publisherConnected 를 본다.
     */
    @GetMapping("/diag")
    public Map<String, Object> diag() {
        return mqttPublisherService.diagnostics();
    }
}
