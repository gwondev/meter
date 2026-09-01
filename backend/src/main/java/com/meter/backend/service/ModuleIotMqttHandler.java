package com.meter.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.meter.backend.entity.Module;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * MQTT {@code meter/{serial}/status} 수신 처리.
 *
 * <p>M·R 모두 {@code fillPercent}(0~100) 를 보낸다. 계열은 시리얼 접두어(m/r)로만 구분한다.
 * 구형 펌웨어의 {@code heightCm} 은 하위 호환으로만 환산한다.
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
            Double fill = readFillPercent(root);
            if (fill != null) {
                moduleSignalService.applyFillPercent(serialNumber, fill, null);
                return;
            }

            /* 구형 m* 펌웨어: heightCm → 서버에서 환산 */
            double heightCm = readHeightCm(root);
            if (heightCm >= 0) {
                moduleSignalService.applyHeightLegacy(serialNumber, heightCm);
                return;
            }

            moduleSignalService.touch(serialNumber);
            log.debug("MQTT 생존 신호 serial={}", serialNumber);
        } catch (Exception e) {
            log.error("MQTT payload 처리 실패 serial={} payload={}", serialNumber, payload, e);
        }
    }

    private static Double readFillPercent(JsonNode root) {
        if (root.hasNonNull("fillPercent")) {
            return root.path("fillPercent").asDouble();
        }
        if (root.hasNonNull("fill_percent")) {
            return root.path("fill_percent").asDouble();
        }
        return null;
    }

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
