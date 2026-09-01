package com.meter.backend.service;

import com.meter.backend.entity.Module;
import com.meter.backend.repository.DummyModuleRepository;
import com.meter.backend.repository.ModuleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;

/**
 * 모듈 신호 수신 지점 — 여기를 통과한 신호만 DB 에 기록된다.
 *
 * <p>이미 등록된 시리얼 → 활성(lastSignalAt)만 갱신.
 * 새 시리얼 → 자동 등록 + 사용자 현재 위치 기준 50m 반경 랜덤 LAT/LON.
 * 등록 직후(커밋 후) 유저/모듈 ID 를 1부터 재정렬한다.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ModuleSignalService {

    private final ModuleRepository moduleRepository;
    private final DummyModuleRepository dummyModuleRepository;
    private final GeoAnchorService geoAnchorService;
    private final TableIdCompactionService tableIdCompactionService;

    @Value("${meter.module.default-depth-cm:60}")
    private double defaultDepthCm;

    @Transactional
    public void applyFillPercent(String serialNumber, double fillPercent, String imageUrl) {
        Module module = findOrCreate(serialNumber);
        module.setFillPercent(clampPercent(fillPercent));
        module.setHeightCm(null); /* 보드에서 이미 % 환산 — 원본 높이는 보관하지 않음 */
        if (imageUrl != null && !imageUrl.isBlank()) {
            module.setLastImageUrl(imageUrl);
        }
        module.setLastSignalAt(LocalDateTime.now());
        moduleRepository.save(module);
        log.info("signal FILL serial={} deviceType={} fillPercent={}",
                serialNumber, module.getDeviceType(), module.getFillPercent());
    }

    /** fillPercent 없이 사진·생존만 온 경우 — 기존 적재율은 유지. */
    @Transactional
    public void applyImageOrTouch(String serialNumber, String imageUrl) {
        Module module = findOrCreate(serialNumber);
        if (imageUrl != null && !imageUrl.isBlank()) {
            module.setLastImageUrl(imageUrl);
        }
        module.setLastSignalAt(LocalDateTime.now());
        moduleRepository.save(module);
        log.info("signal IMAGE/TOUCH serial={} hasImage={}", serialNumber, imageUrl != null);
    }

    /** 구형 펌웨어 heightCm 호환. */
    @Transactional
    public void applyHeightLegacy(String serialNumber, double heightCm) {
        Module module = findOrCreate(serialNumber);
        module.setHeightCm(heightCm);
        module.setFillPercent(toFillPercent(heightCm, module.getDepthCm()));
        module.setLastSignalAt(LocalDateTime.now());
        moduleRepository.save(module);
        log.info("signal HEIGHT(legacy) serial={} heightCm={} fillPercent={}",
                serialNumber, heightCm, module.getFillPercent());
    }

    @Transactional
    public Module applyVisionReport(String serialNumber, double fillPercent, String imageUrl) {
        applyFillPercent(serialNumber, fillPercent, imageUrl);
        return moduleRepository.findBySerialNumber(serialNumber.trim()).orElseThrow();
    }

    @Deprecated
    @Transactional
    public void applyHeight(String serialNumber, double heightCm) {
        applyHeightLegacy(serialNumber, heightCm);
    }

    @Transactional
    public void touch(String serialNumber) {
        Module module = findOrCreate(serialNumber);
        module.setLastSignalAt(LocalDateTime.now());
        moduleRepository.save(module);
    }

    private Module findOrCreate(String serialNumber) {
        String serial = serialNumber.trim();
        if (dummyModuleRepository.existsBySerialNumber(serial)) {
            throw new IllegalStateException("serial reserved by dummy_modules: " + serial);
        }
        return moduleRepository.findBySerialNumber(serial).orElseGet(() -> {
            double[] pos = geoAnchorService.randomNearAnchor();
            Module created = Module.builder()
                    .serialNumber(serial)
                    .deviceType(Module.deviceTypeFromSerial(serial))
                    .dummy(false)
                    .type("GENERAL")
                    .lat(round6(pos[0]))
                    .lon(round6(pos[1]))
                    .createdAt(LocalDateTime.now())
                    .build();
            Module saved = moduleRepository.save(created);
            scheduleIdCompactionAfterCommit();
            log.info("모듈 자동 등록 serial={} deviceType={} lat={} lon={}",
                    serial, saved.getDeviceType(), saved.getLat(), saved.getLon());
            return saved;
        });
    }

    /** 커밋 후 ID 를 1부터 연속으로 재정렬 — 트랜잭션 중 ALTER 충돌을 피한다. */
    private void scheduleIdCompactionAfterCommit() {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            tableIdCompactionService.compactAllAfterDelete();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                try {
                    tableIdCompactionService.compactAllAfterDelete();
                } catch (Exception e) {
                    log.warn("ID compaction after module create failed: {}", e.getMessage());
                }
            }
        });
    }

    private static double round6(double v) {
        return Math.round(v * 1_000_000d) / 1_000_000d;
    }

    private Double toFillPercent(double heightCm, Double depthCm) {
        double depth = (depthCm != null && depthCm > 0) ? depthCm : defaultDepthCm;
        if (depth <= 0) {
            return null;
        }
        return clampPercent((depth - heightCm) / depth * 100.0);
    }

    private static double clampPercent(double value) {
        if (Double.isNaN(value)) {
            return 0.0;
        }
        return Math.max(0.0, Math.min(100.0, value));
    }
}
