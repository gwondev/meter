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
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 모듈 조회·관리 API.
 *
 * <p>모듈은 신호 수신 시 자동 등록되므로 여기서는 위치·분류 보정과 삭제만 다룬다.
 * m/r 접두어 실기기 시리얼은 웹에서 변경할 수 없다.
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

    /** 지도·목록용 전체 모듈. 더미가 먼저, 그다음 실기기. */
    @GetMapping
    public List<Map<String, Object>> getAllModules() {
        return moduleRepository.findAll().stream()
                .sorted(moduleListOrder())
                .map(ModuleController::toDto)
                .toList();
    }

    /** 관리자 등록. dummy=true 면 무신호 정리 제외·시리얼 자유. */
    @PostMapping
    public Map<String, Object> createModule(@RequestBody Map<String, Object> body) {
        String serialNumber = body.get("serialNumber") == null ? null : body.get("serialNumber").toString().trim();
        if (serialNumber == null || serialNumber.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "serialNumber is required");
        }
        if (moduleRepository.findBySerialNumber(serialNumber).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "serialNumber already exists");
        }

        boolean dummy = Boolean.TRUE.equals(body.get("dummy"))
                || "true".equalsIgnoreCase(String.valueOf(body.get("dummy")));

        /* 더미가 아니면 시리얼 접두어로 계열 추론. 더미는 DUMMY. */
        String deviceType = dummy ? Module.DEVICE_DUMMY : Module.deviceTypeFromSerial(serialNumber);

        Module module = Module.builder()
                .serialNumber(serialNumber)
                .deviceType(deviceType)
                .dummy(dummy)
                .organization(stringOrDefault(body.get("organization"), "CHOSUN_IT"))
                .lat(doubleOrNull(body.get("lat")))
                .lon(doubleOrNull(body.get("lon")))
                .type(stringOrDefault(body.get("type"), "GENERAL").toUpperCase())
                .depthCm(doubleOrNull(body.get("depthCm")))
                .fillPercent(dummy ? doubleOrNull(body.get("fillPercent")) : null)
                .lastSignalAt(dummy ? LocalDateTime.now() : null)
                .createdAt(LocalDateTime.now())
                .build();

        if (module.getLat() == null || module.getLon() == null) {
            double[] pos = geoAnchorService.randomNearAnchor();
            if (module.getLat() == null) module.setLat(Math.round(pos[0] * 1_000_000d) / 1_000_000d);
            if (module.getLon() == null) module.setLon(Math.round(pos[1] * 1_000_000d) / 1_000_000d);
        }
        if (dummy && module.getFillPercent() == null) {
            module.setFillPercent(55.0);
        }

        Module saved = moduleRepository.save(module);
        moduleRepository.flush();
        if (!dummy) {
            tableIdCompactionService.compactAllAfterDelete();
            return toDto(moduleRepository.findBySerialNumber(serialNumber).orElse(saved));
        }
        return toDto(saved);
    }

    @PutMapping("/{id}")
    @Transactional
    public Map<String, Object> updateModule(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Module module = moduleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Module not found"));

        if (body.containsKey("serialNumber") && body.get("serialNumber") != null) {
            String sn = body.get("serialNumber").toString().trim();
            if (!sn.isBlank() && !sn.equals(module.getSerialNumber())) {
                /* 실기기 시리얼(m/r)은 충돌 방지를 위해 웹에서 변경 불가 */
                if (!module.isDummy() && Module.isDeviceSerial(module.getSerialNumber())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "실기기 시리얼(m/r)은 수정할 수 없습니다");
                }
                if (!module.isDummy() && Module.isDeviceSerial(sn)) {
                    /* 더미가 아닌데 m/r 로 바꾸려는 경우도 잠금 — 자동등록 전용 */
                }
                moduleRepository.findBySerialNumber(sn).ifPresent(other -> {
                    if (!other.getId().equals(id)) {
                        throw new ResponseStatusException(HttpStatus.CONFLICT, "serialNumber already exists");
                    }
                });
                module.setSerialNumber(sn);
                if (!module.isDummy()) {
                    module.setDeviceType(Module.deviceTypeFromSerial(sn));
                }
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
        if (module.isDummy() && body.containsKey("fillPercent")) {
            module.setFillPercent(doubleOrNull(body.get("fillPercent")));
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

    @PostMapping("/cleanup")
    public Map<String, Object> cleanup() {
        int removed = moduleMaintenanceService.cleanupStaleModules();
        return Map.of("removed", removed, "retentionDays", moduleMaintenanceService.getStaleRetentionDays());
    }

    static Comparator<Module> moduleListOrder() {
        return Comparator
                .comparing((Module m) -> !(m.isDummy() || Module.DEVICE_DUMMY.equals(m.getDeviceType())))
                .thenComparing(m -> m.getId() == null ? Long.MAX_VALUE : m.getId());
    }

    static Map<String, Object> toDto(Module module) {
        Map<String, Object> dto = new LinkedHashMap<>();
        boolean dummy = module.isDummy() || Module.DEVICE_DUMMY.equals(module.getDeviceType());
        dto.put("id", module.getId());
        dto.put("idDisplay", module.getId() == null ? "-" : String.valueOf(module.getId()));
        dto.put("serialNumber", module.getSerialNumber());
        dto.put("organization", module.getOrganization());
        dto.put("lat", module.getLat());
        dto.put("lon", module.getLon());
        dto.put("type", module.getType());
        dto.put("deviceType", module.getDeviceType());
        dto.put("dummy", dummy);
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
