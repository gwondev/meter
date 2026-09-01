package com.meter.backend.controller;

import com.meter.backend.entity.DummyModule;
import com.meter.backend.entity.Module;
import com.meter.backend.repository.DummyModuleRepository;
import com.meter.backend.repository.ModuleRepository;
import com.meter.backend.service.GeoAnchorService;
import com.meter.backend.service.TableIdCompactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * 더미 모듈 CRUD — {@code dummy_modules} 전용 ID.
 * 계열은 M(HEIGHT_SENSOR) 또는 R(VISION_CAM) — UI 표기 D(M)/D(R).
 */
@RestController
@RequestMapping("/api/dummy-modules")
@RequiredArgsConstructor
public class DummyModuleController {

    private static final Set<String> ALLOWED_TYPES =
            Set.of("CLOTHING", "PLASTIC", "CAN", "MEDICINE", "GENERAL");

    private final DummyModuleRepository dummyModuleRepository;
    private final ModuleRepository moduleRepository;
    private final GeoAnchorService geoAnchorService;
    private final TableIdCompactionService tableIdCompactionService;

    @PostMapping
    public Map<String, Object> create(@RequestBody Map<String, Object> body) {
        String serialNumber = body.get("serialNumber") == null ? null : body.get("serialNumber").toString().trim();
        if (serialNumber == null || serialNumber.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "serialNumber is required");
        }
        assertSerialFree(serialNumber, null);
        String deviceType = resolveDeviceType(body.get("deviceType"), body.get("series"));

        DummyModule module = DummyModule.builder()
                .serialNumber(serialNumber)
                .organization(stringOrDefault(body.get("organization"), "CHOSUN_IT"))
                .lat(doubleOrNull(body.get("lat")))
                .lon(doubleOrNull(body.get("lon")))
                .type(stringOrDefault(body.get("type"), "GENERAL").toUpperCase())
                .deviceType(deviceType)
                .depthCm(doubleOrNull(body.get("depthCm")))
                .fillPercent(doubleOrNull(body.get("fillPercent")))
                .lastSignalAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .build();

        if (module.getLat() == null || module.getLon() == null) {
            double[] pos = geoAnchorService.randomNearAnchor();
            if (module.getLat() == null) module.setLat(Math.round(pos[0] * 1_000_000d) / 1_000_000d);
            if (module.getLon() == null) module.setLon(Math.round(pos[1] * 1_000_000d) / 1_000_000d);
        }
        if (module.getFillPercent() == null) {
            module.setFillPercent(55.0);
        }

        DummyModule saved = dummyModuleRepository.save(module);
        dummyModuleRepository.flush();
        tableIdCompactionService.compactDummyModules();
        return toDto(dummyModuleRepository.findBySerialNumber(serialNumber).orElse(saved));
    }

    @PutMapping("/{id}")
    @Transactional
    public Map<String, Object> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        DummyModule module = dummyModuleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dummy module not found"));

        if (body.containsKey("serialNumber") && body.get("serialNumber") != null) {
            String sn = body.get("serialNumber").toString().trim();
            if (!sn.isBlank() && !sn.equals(module.getSerialNumber())) {
                assertSerialFree(sn, id);
                module.setSerialNumber(sn);
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
        if (body.containsKey("deviceType") || body.containsKey("series")) {
            module.setDeviceType(resolveDeviceType(body.get("deviceType"), body.get("series")));
        }
        if (body.containsKey("depthCm")) {
            module.setDepthCm(doubleOrNull(body.get("depthCm")));
        }
        if (body.containsKey("fillPercent")) {
            module.setFillPercent(doubleOrNull(body.get("fillPercent")));
        }
        module.setLastSignalAt(LocalDateTime.now());
        return toDto(dummyModuleRepository.save(module));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public void delete(@PathVariable Long id) {
        if (!dummyModuleRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Dummy module not found");
        }
        dummyModuleRepository.deleteById(id);
        dummyModuleRepository.flush();
        tableIdCompactionService.compactDummyModules();
    }

    private void assertSerialFree(String serialNumber, Long selfId) {
        dummyModuleRepository.findBySerialNumber(serialNumber).ifPresent(other -> {
            if (selfId == null || !other.getId().equals(selfId)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "serialNumber already exists");
            }
        });
        if (moduleRepository.findBySerialNumber(serialNumber).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "serialNumber already exists on modules");
        }
        if (Module.isDeviceSerial(serialNumber)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "더미 시리얼은 m/r 접두어를 쓸 수 없습니다 (실기기 전용). 예: dm1, dr1");
        }
    }

    /** body.deviceType 또는 series=M|R */
    static String resolveDeviceType(Object deviceTypeRaw, Object seriesRaw) {
        if (deviceTypeRaw != null) {
            String dt = deviceTypeRaw.toString().trim().toUpperCase();
            if (Module.DEVICE_VISION_CAM.equals(dt) || "R".equals(dt) || "CAMERA".equals(dt)) {
                return Module.DEVICE_VISION_CAM;
            }
            if (Module.DEVICE_HEIGHT_SENSOR.equals(dt) || "M".equals(dt) || "MODULE".equals(dt)) {
                return Module.DEVICE_HEIGHT_SENSOR;
            }
        }
        if (seriesRaw != null) {
            String s = seriesRaw.toString().trim().toUpperCase();
            if (s.startsWith("R") || s.contains("(R)")) {
                return Module.DEVICE_VISION_CAM;
            }
        }
        return Module.DEVICE_HEIGHT_SENSOR;
    }

    static Map<String, Object> toDto(DummyModule module) {
        String deviceType = module.getDeviceType() == null
                ? Module.DEVICE_HEIGHT_SENSOR
                : module.getDeviceType();
        boolean isR = Module.DEVICE_VISION_CAM.equals(deviceType);
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", module.getId());
        dto.put("idDisplay", module.getId() == null ? "-" : String.valueOf(module.getId()));
        dto.put("serialNumber", module.getSerialNumber());
        dto.put("organization", module.getOrganization());
        dto.put("lat", module.getLat());
        dto.put("lon", module.getLon());
        dto.put("type", module.getType());
        dto.put("deviceType", deviceType);
        dto.put("series", isR ? "D(R)" : "D(M)");
        dto.put("dummy", true);
        dto.put("heightCm", null);
        dto.put("depthCm", module.getDepthCm());
        dto.put("fillPercent", module.getFillPercent());
        dto.put("lastImageUrl", null);
        dto.put("lastSignalAt", module.getLastSignalAt());
        dto.put("createdAt", module.getCreatedAt());
        dto.put("signalState", "ACTIVE");
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
