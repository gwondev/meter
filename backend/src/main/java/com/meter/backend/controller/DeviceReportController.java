package com.meter.backend.controller;

import com.meter.backend.entity.Module;
import com.meter.backend.service.ModuleSignalService;
import com.meter.backend.service.SnapshotStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 모듈2(r*) HTTP 보고 API — <b>레거시/비상용</b>.
 *
 * <p>정식 경로는 MQTT {@code meter/{serial}/status} (fillPercent + 선택 imageBase64).
 * 이 엔드포인트는 하위 호환·수동 테스트용으로만 남긴다.
 * {@code X-METER-DEVICE-TOKEN} 헤더 필요.
 */
@RestController
@RequestMapping("/api/device/modules")
@RequiredArgsConstructor
@Slf4j
public class DeviceReportController {

    private final ModuleSignalService moduleSignalService;
    private final SnapshotStorageService snapshotStorageService;

    /**
     * 영상 판정 결과 보고.
     *
     * @param fillPercent 0 = 수거 불필요, 100 = 즉시 수거
     * @param image       현재 상태 사진 (선택 — 없으면 수치만 반영)
     */
    @PostMapping(value = "/{serialNumber}/report", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, Object> report(
            @PathVariable String serialNumber,
            @RequestParam("fillPercent") double fillPercent,
            @RequestParam(value = "image", required = false) MultipartFile image
    ) {
        if (fillPercent < 0 || fillPercent > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "fillPercent must be between 0 and 100");
        }

        String imageUrl = null;
        if (image != null && !image.isEmpty()) {
            imageUrl = snapshotStorageService.store(serialNumber, image);
        }

        Module module = moduleSignalService.applyVisionReport(serialNumber, fillPercent, imageUrl);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("ok", true);
        response.put("serialNumber", module.getSerialNumber());
        response.put("fillPercent", module.getFillPercent());
        response.put("imageUrl", module.getLastImageUrl());
        response.put("lastSignalAt", module.getLastSignalAt());
        return response;
    }

    /** 사진 없이 수치만 보낼 때 쓰는 JSON 변형. */
    @PostMapping(value = "/{serialNumber}/report", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> reportJson(
            @PathVariable String serialNumber,
            @RequestBody Map<String, Object> body
    ) {
        Object raw = body.get("fillPercent");
        if (raw == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "fillPercent is required");
        }
        double fillPercent;
        try {
            fillPercent = Double.parseDouble(raw.toString());
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "fillPercent must be a number");
        }
        if (fillPercent < 0 || fillPercent > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "fillPercent must be between 0 and 100");
        }

        Module module = moduleSignalService.applyVisionReport(serialNumber, fillPercent, null);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("ok", true);
        response.put("serialNumber", module.getSerialNumber());
        response.put("fillPercent", module.getFillPercent());
        response.put("lastSignalAt", module.getLastSignalAt());
        return response;
    }
}
