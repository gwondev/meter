package com.meter.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Base64;
import java.util.Locale;

/**
 * MQTT {@code meter/{serial}/status} 수신 처리.
 *
 * <p>M·R 모두 동일 토픽. 페이로드는 JSON:
 * <ul>
 *   <li>{@code fillPercent} (0~100) — 필수에 가깝게 권장</li>
 *   <li>{@code imageBase64} + 선택 {@code imageFormat} — R 계열 압축 JPEG 등 (선택)</li>
 *   <li>구형 {@code heightCm} — M 레거시 환산</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ModuleIotMqttHandler {

    /** base64 디코드 후 상한 — 압축 JPEG 기준 (원본 고해상도 금지). */
    private static final int MAX_IMAGE_BYTES = 900_000;

    private final ModuleSignalService moduleSignalService;
    private final SnapshotStorageService snapshotStorageService;
    private final ObjectMapper objectMapper;

    public void handleStatusPayload(String serialNumber, String payload) {
        try {
            JsonNode root = objectMapper.readTree(payload);
            String imageUrl = storeOptionalImage(serialNumber, root);

            Double fill = readFillPercent(root);
            if (fill != null) {
                moduleSignalService.applyFillPercent(serialNumber, fill, imageUrl);
                return;
            }

            /* 이미지만 오고 fill 이 없으면 생존 + 사진만 (적재율 유지) */
            if (imageUrl != null) {
                moduleSignalService.applyImageOrTouch(serialNumber, imageUrl);
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
            log.error("MQTT payload 처리 실패 serial={} bytes={}",
                    serialNumber, payload == null ? 0 : payload.length(), e);
        }
    }

    /**
     * {@code imageBase64} / {@code image} 필드가 있으면 디스크에 저장하고 공개 URL 반환.
     * data URI({@code data:image/jpeg;base64,...}) 도 허용.
     */
    private String storeOptionalImage(String serialNumber, JsonNode root) {
        String raw = null;
        if (root.hasNonNull("imageBase64")) {
            raw = root.path("imageBase64").asText();
        } else if (root.hasNonNull("image")) {
            raw = root.path("image").asText();
        }
        if (raw == null || raw.isBlank()) {
            return null;
        }

        String format = "jpg";
        if (root.hasNonNull("imageFormat")) {
            format = root.path("imageFormat").asText("jpg");
        } else if (root.hasNonNull("imageExt")) {
            format = root.path("imageExt").asText("jpg");
        }

        String b64 = raw.trim();
        if (b64.startsWith("data:")) {
            int comma = b64.indexOf(',');
            if (comma < 0) {
                log.warn("MQTT image data-URI 형식 오류 serial={}", serialNumber);
                return null;
            }
            String header = b64.substring(0, comma).toLowerCase(Locale.ROOT);
            if (header.contains("png")) format = "png";
            else if (header.contains("webp")) format = "webp";
            else if (header.contains("jpeg") || header.contains("jpg")) format = "jpg";
            b64 = b64.substring(comma + 1);
        }

        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(b64.replaceAll("\\s", ""));
        } catch (IllegalArgumentException e) {
            log.warn("MQTT imageBase64 decode 실패 serial={}: {}", serialNumber, e.getMessage());
            return null;
        }
        if (bytes.length == 0) {
            return null;
        }
        if (bytes.length > MAX_IMAGE_BYTES) {
            log.warn("MQTT image 너무 큼 serial={} bytes={} limit={}", serialNumber, bytes.length, MAX_IMAGE_BYTES);
            return null;
        }

        try {
            return snapshotStorageService.storeBytes(serialNumber, bytes, format);
        } catch (Exception e) {
            log.error("MQTT image 저장 실패 serial={}", serialNumber, e);
            return null;
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
