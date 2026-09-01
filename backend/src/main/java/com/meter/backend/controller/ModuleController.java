package com.meter.backend.controller;

import com.meter.backend.entity.DisposalRecord;
import com.meter.backend.entity.Module;
import com.meter.backend.repository.DisposalRecordRepository;
import com.meter.backend.repository.DummyModuleRepository;
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
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 실기기(m/r) 모듈 조회·관리 API.
 *
 * <p>더미는 {@code /api/dummy-modules} · {@code dummy_modules} 테이블(별도 ID).
 * 지도용 GET 은 더미+실기기를 합쳐 돌려준다(더미 먼저).
 */
@RestController
@RequestMapping("/api/modules")
@RequiredArgsConstructor
public class ModuleController {

    private static final Set<String> ALLOWED_TYPES =
            Set.of("CLOTHING", "PLASTIC", "CAN", "MEDICINE", "GENERAL");

    private final ModuleRepository moduleRepository;
    private final DummyModuleRepository dummyModuleRepository;
    private final DisposalRecordRepository disposalRecordRepository;
    private final RewardHistoryRepository rewardHistoryRepository;
    private final TableIdCompactionService tableIdCompactionService;
    private final ModuleMaintenanceService moduleMaintenanceService;
    private final GeoAnchorService geoAnchorService;

    /** 지도·목록용. 더미(별도 ID) → 실기기 순, 각 그룹은 ID 오름차순. */
    @GetMapping
    public List<Map<String, Object>> getAllModules() {
        return mergedModuleDtos();
    }

    static List<Map<String, Object>> mergedModuleDtos(
            DummyModuleRepository dummyModuleRepository,
            ModuleRepository moduleRepository) {
        List<Map<String, Object>> out = new ArrayList<>();
        dummyModuleRepository.findAll().stream()
                .sorted(Comparator.comparing(d -> d.getId() == null ? Long.MAX_VALUE : d.getId()))
                .map(DummyModuleController::toDto)
                .forEach(out::add);
        moduleRepository.findAll().stream()
                .filter(m -> !m.isDummy())
                .sorted(Comparator.comparing(m -> m.getId() == null ? Long.MAX_VALUE : m.getId()))
                .map(ModuleController::toDto)
                .forEach(out::add);
        return out;
    }

    private List<Map<String, Object>> mergedModuleDtos() {
        return mergedModuleDtos(dummyModuleRepository, moduleRepository);
    }

    /** 실기기만 등록. 더미는 {@code POST /api/dummy-modules}. */
    @PostMapping
    public Map<String, Object> createModule(@RequestBody Map<String, Object> body) {
        boolean dummy = Boolean.TRUE.equals(body.get("dummy"))
                || "true".equalsIgnoreCase(String.valueOf(body.get("dummy")));
        if (dummy) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "더미는 POST /api/dummy-modules 를 사용하세요");
        }

        String serialNumber = body.get("serialNumber") == null ? null : body.get("serialNumber").toString().trim();
        if (serialNumber == null || serialNumber.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "serialNumber is required");
        }
        if (moduleRepository.findBySerialNumber(serialNumber).isPresent()
                || dummyModuleRepository.existsBySerialNumber(serialNumber)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "serialNumber already exists");
        }

        Module module = Module.builder()
                .serialNumber(serialNumber)
                .deviceType(Module.deviceTypeFromSerial(serialNumber))
                .dummy(false)
                .organization(stringOrDefault(body.get("organization"), "CHOSUN_IT"))
                .lat(doubleOrNull(body.get("lat")))
                .lon(doubleOrNull(body.get("lon")))
                .type(stringOrDefault(body.get("type"), "GENERAL").toUpperCase())
                .depthCm(doubleOrNull(body.get("depthCm")))
                .createdAt(LocalDateTime.now())
                .build();

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
        if (module.isDummy()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "레거시 더미 행입니다. /api/dummy-modules 로 이관 후 수정하세요");
        }

        if (body.containsKey("serialNumber") && body.get("serialNumber") != null) {
            String sn = body.get("serialNumber").toString().trim();
            if (!sn.isBlank() && !sn.equals(module.getSerialNumber())) {
                if (Module.isDeviceSerial(module.getSerialNumber())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "실기기 시리얼(m/r)은 수정할 수 없습니다");
                }
                moduleRepository.findBySerialNumber(sn).ifPresent(other -> {
                    if (!other.getId().equals(id)) {
                        throw new ResponseStatusException(HttpStatus.CONFLICT, "serialNumber already exists");
                    }
                });
                if (dummyModuleRepository.existsBySerialNumber(sn)) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "serialNumber already exists");
                }
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

    @PostMapping("/cleanup")
    public Map<String, Object> cleanup() {
        int removed = moduleMaintenanceService.cleanupStaleModules();
        return Map.of("removed", removed, "retentionDays", moduleMaintenanceService.getStaleRetentionDays());
    }

    static Map<String, Object> toDto(Module module) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", module.getId());
        dto.put("idDisplay", module.getId() == null ? "-" : String.valueOf(module.getId()));
        dto.put("serialNumber", module.getSerialNumber());
        dto.put("organization", module.getOrganization());
        dto.put("lat", module.getLat());
        dto.put("lon", module.getLon());
        dto.put("type", module.getType());
        dto.put("deviceType", module.getDeviceType());
        boolean isR = Module.DEVICE_VISION_CAM.equals(module.getDeviceType());
        dto.put("series", isR ? "R" : "M");
        dto.put("dummy", false);
        dto.put("heightCm", null);
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
