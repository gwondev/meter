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
 * 모듈2(r*) 전용 보고 API — 라즈베리파이가 5분 주기로 호출한다.
 *
 * <p>{@code /api/device/**} 는 {@code DeviceTokenFilter} 가 지키므로
 * 요청에 {@code X-METER-DEVICE-TOKEN} 헤더가 반드시 있어야 한다.
 *
 * <p>사진은 MQTT 가 아니라 이 HTTP 경로로 보낸다 — 브라우저가 이미지를 표시하려면
 * 어차피 서버에 저장된 URL 이 필요하고, MQTT 는 대용량 재전송에 불리하기 때문.
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
