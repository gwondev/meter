package com.meter.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.meter.backend.entity.Module;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.nio.file.Path;
import java.util.Base64;
import java.util.List;
import java.util.Locale;

/**
 * MQTT {@code meter/{serial}/status} 수신 처리.
 *
 * <ul>
 *   <li>D({@code m*}) — {@code fillPercent} (보드 산출). 선택적 레거시 {@code heightCm}.</li>
 *   <li>R({@code r*}) — 이미지만. {@code imageRole=original|sample}.
 *       원본은 baseline 덮어쓰기. 샘플은 최근 10장 보관 후 vision 서비스가 fillPercent 산출.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ModuleIotMqttHandler {

    private static final int MAX_IMAGE_BYTES = 900_000;

    private final ModuleSignalService moduleSignalService;
    private final SnapshotStorageService snapshotStorageService;
    private final VisionCompareClient visionCompareClient;
    private final ObjectMapper objectMapper;

    public void handleStatusPayload(String serialNumber, String payload) {
        try {
            JsonNode root = objectMapper.readTree(payload);
            boolean isR = Module.DEVICE_VISION_CAM.equals(Module.deviceTypeFromSerial(serialNumber));

            if (isR) {
                handleRModule(serialNumber, root);
                return;
            }

            handleDModule(serialNumber, root);
        } catch (Exception e) {
            log.error("MQTT payload 처리 실패 serial={} bytes={}",
                    serialNumber, payload == null ? 0 : payload.length(), e);
        }
    }

    private void handleDModule(String serialNumber, JsonNode root) {
        Double fill = readFillPercent(root);
        if (fill != null) {
            moduleSignalService.applyFillPercent(serialNumber, fill, null);
            return;
        }
        double heightCm = readHeightCm(root);
        if (heightCm >= 0) {
            moduleSignalService.applyHeightLegacy(serialNumber, heightCm);
            return;
        }
        moduleSignalService.touch(serialNumber);
        log.debug("MQTT 생존 신호 serial={}", serialNumber);
    }

    private void handleRModule(String serialNumber, JsonNode root) {
        DecodedImage image = decodeImage(serialNumber, root);
        if (image == null) {
            moduleSignalService.touch(serialNumber);
            log.warn("R MQTT 이미지 없음 — touch only serial={}", serialNumber);
            return;
        }

        if (isOriginalRole(root)) {
            String url = snapshotStorageService.storeBaseline(serialNumber, image.bytes(), image.format());
            /* 원본 = 치운 상태 → 적재율 0 */
            moduleSignalService.applyFillPercent(serialNumber, 0.0, url);
            log.info("R 원본(baseline) 갱신 serial={}", serialNumber);
            return;
        }

        String url = snapshotStorageService.storeSample(serialNumber, image.bytes(), image.format());
        Double fill = null;
        if (snapshotStorageService.hasBaseline(serialNumber)) {
            Path baseline = snapshotStorageService.baselineAbsolutePath(serialNumber);
            List<Path> samples = snapshotStorageService.listSampleAbsolutePaths(serialNumber);
            fill = visionCompareClient.compare(baseline, samples);
        } else {
            log.warn("R baseline 없음 — 샘플만 저장 serial={}", serialNumber);
        }

        if (fill != null) {
            moduleSignalService.applyFillPercent(serialNumber, fill, url);
        } else {
            moduleSignalService.applyImageOrTouch(serialNumber, url);
        }
    }

    private static boolean isOriginalRole(JsonNode root) {
        if (root.has("isOriginal") && root.get("isOriginal").asBoolean(false)) {
            return true;
        }
        if (root.has("original") && root.get("original").asBoolean(false)) {
            return true;
        }
        if (root.hasNonNull("imageRole")) {
            String role = root.path("imageRole").asText("").trim().toLowerCase(Locale.ROOT);
            return "original".equals(role) || "baseline".equals(role) || "origin".equals(role);
        }
        if (root.hasNonNull("role")) {
            String role = root.path("role").asText("").trim().toLowerCase(Locale.ROOT);
            return "original".equals(role) || "baseline".equals(role);
        }
        return false;
    }

    private DecodedImage decodeImage(String serialNumber, JsonNode root) {
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
        return new DecodedImage(bytes, format);
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

    private record DecodedImage(byte[] bytes, String format) {}
}
