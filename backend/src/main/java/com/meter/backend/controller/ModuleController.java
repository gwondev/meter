package com.meter.backend.controller;

import com.meter.backend.entity.DisposalRecord;
import com.meter.backend.entity.Module;
import com.meter.backend.repository.DisposalRecordRepository;
import com.meter.backend.repository.ModuleRepository;
import com.meter.backend.repository.RewardHistoryRepository;
import com.meter.backend.service.GeoAnchorService;
import com.meter.backend.service.ModuleMaintenanceService;
import com.meter.backend.service.TableIdCompactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 모듈 조회·관리 API.
 *
 * <p>모듈은 신호 수신 시 자동 등록되므로 여기서는 위치·분류 보정과 삭제만 다룬다.
 */
@RestController
@RequestMapping("/api/modules")
@RequiredArgsConstructor
public class ModuleController {

    private static final Set<String> ALLOWED_TYPES =
            Set.of("CLOTHING", "PLASTIC", "CAN", "MEDICINE", "GENERAL");

    private final ModuleRepository moduleRepository;
    private final DisposalRecordRepository disposalRecordRepository;
    private final RewardHistoryRepository rewardHistoryRepository;
    private final TableIdCompactionService tableIdCompactionService;
    private final ModuleMaintenanceService moduleMaintenanceService;
    private final GeoAnchorService geoAnchorService;

    /** 지도·목록용 전체 모듈. 신호가 없는 모듈도 «신호 대기중» 으로 함께 내려간다. */
    @GetMapping
    public List<Map<String, Object>> getAllModules() {
        return moduleRepository.findAll().stream().map(ModuleController::toDto).toList();
    }

    /** 관리자가 위치를 미리 등록해 두는 경로. 신호가 오면 자동으로 활성화된다. */
    @PostMapping
    public Map<String, Object> createModule(@RequestBody Map<String, Object> body) {
        String serialNumber = body.get("serialNumber") == null ? null : body.get("serialNumber").toString().trim();
        if (serialNumber == null || serialNumber.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "serialNumber is required");
        }
        if (moduleRepository.findBySerialNumber(serialNumber).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "serialNumber already exists");
        }

        Module module = Module.builder()
                .serialNumber(serialNumber)
                .deviceType(Module.deviceTypeFromSerial(serialNumber))
                .organization(stringOrDefault(body.get("organization"), "CHOSUN_IT"))
                .lat(doubleOrNull(body.get("lat")))
                .lon(doubleOrNull(body.get("lon")))
                .type(stringOrDefault(body.get("type"), "GENERAL").toUpperCase())
                .depthCm(doubleOrNull(body.get("depthCm")))
                .createdAt(LocalDateTime.now())
                .build();

        /* lat/lon 미입력 시 사용자 위치 기준 50m 랜덤 */
        if (module.getLat() == null || module.getLon() == null) {
            double[] pos = geoAnchorService.randomNearAnchor();
            if (module.getLat() == null) module.setLat(Math.round(pos[0] * 1_000_000d) / 1_000_000d);
            if (module.getLon() == null) module.setLon(Math.round(pos[1] * 1_000_000d) / 1_000_000d);
        }

        Module saved = moduleRepository.save(module);
        moduleRepository.flush();
        tableIdCompactionService.compactAllAfterDelete();
        return toDto(moduleRepository.findBySerialNumber(serialNumber).orElse(saved));
    }

    @PutMapping("/{id}")
    @Transactional
    public Map<String, Object> updateModule(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Module module = moduleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Module not found"));

        if (body.containsKey("serialNumber") && body.get("serialNumber") != null) {
            String sn = body.get("serialNumber").toString().trim();
            if (!sn.isBlank()) {
                moduleRepository.findBySerialNumber(sn).ifPresent(other -> {
                    if (!other.getId().equals(id)) {
                        throw new ResponseStatusException(HttpStatus.CONFLICT, "serialNumber already exists");
                    }
                });
                module.setSerialNumber(sn);
                module.setDeviceType(Module.deviceTypeFromSerial(sn));
            }
        }
        if (body.containsKey("organization") && body.get("organization") != null) {
            module.setOrganization(body.get("organization").toString().trim());
        }
        if (body.containsKey("lat")) {
            module.setLat(doubleOrNull(body.get("lat")));
        }
        if (body.containsKey("lon")) {
            module.setLon(doubleOrNull(body.get("lon")));
        }
        if (body.containsKey("type") && body.get("type") != null) {
            String type = body.get("type").toString().trim().toUpperCase();
            if (!ALLOWED_TYPES.contains(type)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "type must be one of: " + String.join(", ", ALLOWED_TYPES));
            }
            module.setType(type);
        }
        if (body.containsKey("depthCm")) {
            module.setDepthCm(doubleOrNull(body.get("depthCm")));
        }
        return toDto(moduleRepository.save(module));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public void deleteModule(@PathVariable Long id) {
        Module module = moduleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Module not found"));

        List<DisposalRecord> records = disposalRecordRepository.findByModule_Id(module.getId());
        for (DisposalRecord dr : records) {
            rewardHistoryRepository.findByDisposalRecord(dr).ifPresent(rewardHistoryRepository::delete);
            disposalRecordRepository.delete(dr);
        }
        moduleRepository.delete(module);
        moduleRepository.flush();
        tableIdCompactionService.compactAllAfterDelete();
    }

    /** 무신호 모듈 즉시 정리 — 스케줄러를 기다리지 않고 관리자가 바로 실행할 때. */
    @PostMapping("/cleanup")
    public Map<String, Object> cleanup() {
        int removed = moduleMaintenanceService.cleanupStaleModules();
        return Map.of("removed", removed, "retentionDays", moduleMaintenanceService.getStaleRetentionDays());
    }

    /**
     * 프론트가 쓰는 표현으로 변환한다.
     * {@code signalState} 는 WAITING(회색) / ACTIVE(활성) 두 값만 가진다.
     */
    static Map<String, Object> toDto(Module module) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", module.getId());
        dto.put("serialNumber", module.getSerialNumber());
        dto.put("organization", module.getOrganization());
        dto.put("lat", module.getLat());
        dto.put("lon", module.getLon());
        dto.put("type", module.getType());
        dto.put("deviceType", module.getDeviceType());
        dto.put("heightCm", module.getHeightCm());
        dto.put("depthCm", module.getDepthCm());
        dto.put("fillPercent", module.getFillPercent());
        dto.put("lastImageUrl", module.getLastImageUrl());
        dto.put("lastSignalAt", module.getLastSignalAt());
        dto.put("createdAt", module.getCreatedAt());
        dto.put("signalState", module.isSignalActive() ? "ACTIVE" : "WAITING");
        return dto;
    }

    private static String stringOrDefault(Object raw, String fallback) {
        if (raw == null) return fallback;
        String value = raw.toString().trim();
        return value.isBlank() ? fallback : value;
    }

    private static Double doubleOrNull(Object raw) {
        if (raw == null) return null;
        try {
            return Double.parseDouble(raw.toString().trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
