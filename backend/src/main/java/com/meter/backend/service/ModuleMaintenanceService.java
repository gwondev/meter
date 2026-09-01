package com.meter.backend.service;

import com.meter.backend.entity.Module;
import com.meter.backend.repository.ModuleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 신호가 장기간 끊긴 모듈 자동 정리.
 *
 * <p>회색 «신호 대기중» 상태가 {@code meter.module.stale-retention-days} 를 넘기면 삭제한다.
 * 관리자 화면에서 수동 삭제도 가능하므로 이 작업은 방치된 항목만 걷어내는 용도다.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ModuleMaintenanceService {

    private final ModuleRepository moduleRepository;

    @Value("${meter.module.stale-retention-days:10}")
    private long staleRetentionDays;

    /** 매시 정각 실행 — 정리 주기가 일 단위이므로 시간당 1회로 충분하다. */
    @Scheduled(cron = "0 0 * * * *")
    public void scheduledCleanup() {
        int removed = cleanupStaleModules();
        if (removed > 0) {
            log.info("무신호 모듈 자동 정리 {}건 (기준 {}일)", removed, staleRetentionDays);
        }
    }

    @Transactional
    public int cleanupStaleModules() {
        LocalDateTime threshold = LocalDateTime.now().minusDays(staleRetentionDays);
        List<Module> stale = moduleRepository.findStale(threshold);
        if (stale.isEmpty()) {
            return 0;
        }
        stale.forEach(m -> log.info("모듈 삭제 serial={} lastSignalAt={}", m.getSerialNumber(), m.getLastSignalAt()));
        moduleRepository.deleteAll(stale);
        return stale.size();
    }

    public long getStaleRetentionDays() {
        return staleRetentionDays;
    }
}
