package com.meter.backend.controller;

import com.meter.backend.service.MqttPublisherService;
import com.meter.backend.service.MqttSubscriberService;
import com.meter.backend.service.MqttTrafficLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/mosquitto")
@RequiredArgsConstructor
public class MosquittoController {
    private final MqttTrafficLogService mqttTrafficLogService;
    private final MqttPublisherService mqttPublisherService;
    private final MqttSubscriberService mqttSubscriberService;

    @GetMapping("/logs")
    public List<Map<String, Object>> logs(@RequestParam(defaultValue = "20") int limit) {
        return mqttTrafficLogService.latest(limit);
    }

    /**
     * 브라우저에서 GET 호출로 확인: 백엔드가 실제로 어느 MQTT URL에 붙는지.
     * publisherConnected / subscriberConnected 둘 다 true 여야 IoT → 웹 파이프가 정상이다.
     */
    @GetMapping("/diag")
    public Map<String, Object> diag() {
        Map<String, Object> out = new LinkedHashMap<>(mqttPublisherService.diagnostics());
        out.putAll(mqttSubscriberService.diagnostics());
        out.put("inLogCount", mqttTrafficLogService.latest(100).stream()
                .filter(r -> "IN".equals(r.get("direction"))).count());
        // deployMarker 는 subscriber diagnostics 에 포함됨 — UI/curl 로 배포 여부 확인
        return out;
    }
}
