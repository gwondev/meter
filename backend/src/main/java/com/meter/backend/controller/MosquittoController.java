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
import java.net.InetAddress;
import java.net.URI;
import java.util.Arrays;

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
        /* buildVerifyTag 가 보이면 새 백엔드 JAR 배포 확인 */
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("buildVerifyTag", MqttSubscriberService.BUILD_VERIFY_TAG);
        out.putAll(mqttPublisherService.diagnostics());
        out.putAll(mqttSubscriberService.diagnostics());
        out.put("inLogCount", mqttTrafficLogService.latest(100).stream()
                .filter(r -> "IN".equals(r.get("direction"))).count());
        out.put("brokerDns", resolveBrokerDns(out.get("brokerUrl")));
        return out;
    }

    private static Map<String, Object> resolveBrokerDns(Object brokerUrlObj) {
        Map<String, Object> dns = new LinkedHashMap<>();
        String brokerUrl = brokerUrlObj != null ? brokerUrlObj.toString() : "";
        String host = extractHost(brokerUrl);
        dns.put("host", host);
        try {
            dns.put("ips", Arrays.stream(InetAddress.getAllByName(host))
                    .map(InetAddress::getHostAddress)
                    .toList());
        } catch (Exception e) {
            dns.put("error", e.getMessage());
        }
        try {
            dns.put("meterMosquittoIps", Arrays.stream(InetAddress.getAllByName("meter-mosquitto"))
                    .map(InetAddress::getHostAddress)
                    .toList());
        } catch (Exception e) {
            dns.put("meterMosquittoError", e.getMessage());
        }
        return dns;
    }

    private static String extractHost(String brokerUrl) {
        try {
            URI uri = URI.create(brokerUrl.replace("tcp://", "http://").replace("ssl://", "https://"));
            return uri.getHost();
        } catch (Exception e) {
            return brokerUrl;
        }
    }
}
