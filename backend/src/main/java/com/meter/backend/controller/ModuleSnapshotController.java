package com.meter.backend.controller;

import com.meter.backend.entity.Module;
import com.meter.backend.repository.ModuleRepository;
import com.meter.backend.service.ModuleSignalService;
import com.meter.backend.service.SnapshotStorageService;
import com.meter.backend.service.VisionCompareClient;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * R모듈 사진 관리 (관리자 웹).
 * 원본 / 비교 큐(10) / 휴지통(20).
 */
@RestController
@RequestMapping("/api/modules/{serial}/snapshots")
@RequiredArgsConstructor
public class ModuleSnapshotController {

    private final SnapshotStorageService snapshotStorageService;
    private final ModuleRepository moduleRepository;
    private final ModuleSignalService moduleSignalService;
    private final VisionCompareClient visionCompareClient;

    @GetMapping
    public Map<String, Object> list(@PathVariable String serial) {
        requireRModule(serial);
        return snapshotStorageService.describe(serial);
    }

    @PostMapping("/promote-baseline")
    public Map<String, Object> promoteBaseline(
            @PathVariable String serial,
            @RequestBody Map<String, Object> body
    ) {
        requireRModule(serial);
        String path = string(body.get("path"));
        String url = snapshotStorageService.promoteToBaseline(serial, path);
        Double fill = recomputeFill(serial);
        if (fill != null) {
            moduleSignalService.applyFillPercent(serial, fill, url);
        } else {
            moduleSignalService.applyFillPercent(serial, 0.0, url);
        }
        Map<String, Object> out = new LinkedHashMap<>(snapshotStorageService.describe(serial));
        out.put("baselineUrl", url);
        out.put("fillPercent", fill != null ? fill : 0.0);
        return out;
    }

    @PostMapping("/restore")
    public Map<String, Object> restore(
            @PathVariable String serial,
            @RequestBody Map<String, Object> body
    ) {
        requireRModule(serial);
        String name = string(body.get("name"));
        if (name.isBlank()) name = string(body.get("path"));
        if (name.contains("/")) {
            name = name.substring(name.lastIndexOf('/') + 1);
        }
        snapshotStorageService.restoreFromTrash(serial, name);
        Double fill = recomputeFill(serial);
        if (fill != null) {
            String last = latestSampleUrl(serial);
            moduleSignalService.applyFillPercent(serial, fill, last);
        }
        return snapshotStorageService.describe(serial);
    }

    @DeleteMapping
    public Map<String, Object> delete(
            @PathVariable String serial,
            @RequestParam String path
    ) {
        requireRModule(serial);
        snapshotStorageService.deleteManagedFile(serial, path);
        return snapshotStorageService.describe(serial);
    }

    @PostMapping("/recompute")
    public Map<String, Object> recompute(@PathVariable String serial) {
        requireRModule(serial);
        Double fill = recomputeFill(serial);
        String last = latestSampleUrl(serial);
        if (fill != null) {
            moduleSignalService.applyFillPercent(serial, fill, last);
        }
        Map<String, Object> out = new LinkedHashMap<>(snapshotStorageService.describe(serial));
        out.put("fillPercent", fill);
        return out;
    }

    private Double recomputeFill(String serial) {
        if (!snapshotStorageService.hasBaseline(serial)) {
            return null;
        }
        Path baseline = snapshotStorageService.baselineAbsolutePath(serial);
        List<Path> samples = snapshotStorageService.listSampleAbsolutePaths(serial);
        if (samples.isEmpty()) {
            return 0.0;
        }
        return visionCompareClient.compare(baseline, samples);
    }

    private String latestSampleUrl(String serial) {
        List<Path> samples = snapshotStorageService.listSampleAbsolutePaths(serial);
        if (samples.isEmpty()) {
            return snapshotStorageService.hasBaseline(serial)
                    ? SnapshotStorageService.PUBLIC_PREFIX + serial + "/" + SnapshotStorageService.BASELINE_NAME
                    : null;
        }
        Path last = samples.get(samples.size() - 1);
        return SnapshotStorageService.PUBLIC_PREFIX + serial + "/"
                + SnapshotStorageService.SAMPLES_DIR + "/" + last.getFileName();
    }

    private void requireRModule(String serial) {
        if (!Module.DEVICE_VISION_CAM.equals(Module.deviceTypeFromSerial(serial))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "R모듈(serial r*)만 지원");
        }
        moduleRepository.findBySerialNumber(serial.trim()).ifPresent(m -> {
            if (!Module.DEVICE_VISION_CAM.equals(m.getDeviceType())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "R모듈만 지원");
            }
        });
    }

    private static String string(Object raw) {
        return raw == null ? "" : raw.toString().trim();
    }
}
