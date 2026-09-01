package com.meter.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * 모듈1(m*) MQTT 수신 처리 — 토픽 {@code meter/{serial}/status}.
 *
 * <p>페이로드는 단일 형태이며 status 구분이 없다.
 * <pre>{"moduleSerial":"m1","heightCm":25.3}</pre>
 *
 * <p>heightCm 이 없거나 음수(무효 측정)면 생존 신호로만 처리한다.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ModuleIotMqttHandler {

    private final ModuleSignalService moduleSignalService;
    private final ObjectMapper objectMapper;

    public void handleStatusPayload(String serialNumber, String payload) {
        try {
            JsonNode root = objectMapper.readTree(payload);
            double heightCm = readHeightCm(root);

            if (heightCm >= 0) {
                moduleSignalService.applyHeight(serialNumber, heightCm);
            } else {
                moduleSignalService.touch(serialNumber);
                log.debug("MQTT 측정값 없음 — 생존 신호로 처리 serial={}", serialNumber);
            }
        } catch (Exception e) {
            log.error("MQTT payload 처리 실패 serial={} payload={}", serialNumber, payload, e);
        }
    }

    /** heightCm / height_cm 두 표기를 모두 허용한다. 없으면 -1. */
    private static double readHeightCm(JsonNode root) {
        if (root.hasNonNull("heightCm")) {
            return root.path("heightCm").asDouble(-1);
        }
        if (root.hasNonNull("height_cm")) {
            return root.path("height_cm").asDouble(-1);
        }
        return -1;
    }
}
