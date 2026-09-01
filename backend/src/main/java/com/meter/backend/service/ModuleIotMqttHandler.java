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
 * <p>토픽 형식은 m* / r* 가 같다. 계열은 시리얼 접두어로 나눈다.
 * <ul>
 *   <li>{@code m*} → HEIGHT_SENSOR — heightCm 로 적재율 환산</li>
 *   <li>{@code r*} → VISION_CAM — fillPercent(또는 생존 touch). 사진은 HTTP report 권장</li>
 * </ul>
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
            String deviceType = Module.deviceTypeFromSerial(serialNumber);

            if (Module.DEVICE_VISION_CAM.equals(deviceType)) {
                /* r* — 카메라 계열. MQTT 로 fillPercent 만 와도 활성화된다. */
                if (root.hasNonNull("fillPercent") || root.hasNonNull("fill_percent")) {
                    double fill = root.hasNonNull("fillPercent")
                            ? root.path("fillPercent").asDouble(0)
                            : root.path("fill_percent").asDouble(0);
                    moduleSignalService.applyVisionReport(serialNumber, fill, null);
                } else {
                    moduleSignalService.touch(serialNumber);
                    log.debug("MQTT r* 생존 신호 serial={}", serialNumber);
                }
                return;
            }

            /* m* — 초음파 높이 */
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
