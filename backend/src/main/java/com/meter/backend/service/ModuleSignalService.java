package com.meter.backend.service;

import com.meter.backend.entity.Module;
import com.meter.backend.repository.ModuleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * 모듈 신호 수신 지점 — 여기를 통과한 신호만 DB 에 기록된다.
 *
 * <p>등록되지 않은 시리얼의 신호가 들어오면 모듈을 자동 생성한다(위치는 미지정).
 * 즉 «신호가 감지되면 그때부터 데이터가 쌓이기 시작» 하며, 더미 시드는 사용하지 않는다.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ModuleSignalService {

    private final ModuleRepository moduleRepository;

    /** depthCm 미지정 모듈의 기본 용기 깊이 — heightCm → fillPercent 환산에 쓴다. */
    @Value("${meter.module.default-depth-cm:60}")
    private double defaultDepthCm;

    /** 모듈1(m*) 높이 신호. heightCm 는 센서에서 내용물 표면까지의 빈 거리. */
    @Transactional
    public void applyHeight(String serialNumber, double heightCm) {
        Module module = findOrCreate(serialNumber);
        module.setHeightCm(heightCm);
        module.setFillPercent(toFillPercent(heightCm, module.getDepthCm()));
        module.setLastSignalAt(LocalDateTime.now());
        moduleRepository.save(module);
        log.info("signal HEIGHT serial={} heightCm={} fillPercent={}",
                serialNumber, heightCm, module.getFillPercent());
    }

    /** 모듈2(r*) 영상 판정 신호. fillPercent 는 0(수거 불필요)~100(즉시 수거). */
    @Transactional
    public Module applyVisionReport(String serialNumber, double fillPercent, String imageUrl) {
        Module module = findOrCreate(serialNumber);
        module.setFillPercent(clampPercent(fillPercent));
        if (imageUrl != null && !imageUrl.isBlank()) {
            module.setLastImageUrl(imageUrl);
        }
        module.setLastSignalAt(LocalDateTime.now());
        Module saved = moduleRepository.save(module);
        log.info("signal VISION serial={} fillPercent={} image={}", serialNumber, fillPercent, imageUrl);
        return saved;
    }

    /** 페이로드에 측정값이 없는 생존 신호 — 수신 시각만 갱신한다. */
    @Transactional
    public void touch(String serialNumber) {
        Module module = findOrCreate(serialNumber);
        module.setLastSignalAt(LocalDateTime.now());
        moduleRepository.save(module);
    }

    private Module findOrCreate(String serialNumber) {
        String serial = serialNumber.trim();
        return moduleRepository.findBySerialNumber(serial).orElseGet(() -> {
            Module created = Module.builder()
                    .serialNumber(serial)
                    .deviceType(Module.deviceTypeFromSerial(serial))
                    .type("GENERAL")
                    .createdAt(LocalDateTime.now())
                    .build();
            log.info("모듈 자동 등록 serial={} deviceType={}", serial, created.getDeviceType());
            return moduleRepository.save(created);
        });
    }

    /** 빈 거리가 작을수록 가득 찬 상태이므로 (깊이 - 빈거리) / 깊이 로 환산한다. */
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
