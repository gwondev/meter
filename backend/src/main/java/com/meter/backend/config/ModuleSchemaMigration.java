package com.meter.backend.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * {@code modules} 테이블 레거시 컬럼 정리.
 *
 * <p>Hibernate {@code ddl-auto: update} 는 컬럼을 추가만 하고 지우지 않는다.
 * 기존 스키마의 {@code status}, {@code total_disposal_count}, {@code last_heartbeat} 는
 * NOT NULL 로 남아 있어서, 이 컬럼을 더 이상 채우지 않는 새 엔티티로는 INSERT 가 실패한다.
 * 그래서 기동 시 한 번 값을 옮기고 컬럼을 떨어뜨린다. 이미 정리된 DB 에서는 아무 일도 하지 않는다.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ModuleSchemaMigration {

    private static final String TABLE = "modules";
    private static final List<String> LEGACY_COLUMNS = List.of("status", "total_disposal_count", "last_heartbeat");

    private final JdbcTemplate jdbcTemplate;

    @EventListener(ApplicationReadyEvent.class)
    public void migrate() {
        if (!hasColumn("last_signal_at")) {
            log.warn("modules.last_signal_at 없음 — 스키마 생성 전이라 마이그레이션을 건너뜁니다.");
            return;
        }

        backfillLastSignalAt();
        LEGACY_COLUMNS.forEach(this::dropColumnIfPresent);
        ensureDummyColumn();
    }

    /** 더미 모듈 플래그 — 없으면 추가하고 기존 행은 false. */
    private void ensureDummyColumn() {
        if (hasColumn("dummy")) {
            return;
        }
        try {
            jdbcTemplate.execute(
                    "ALTER TABLE " + TABLE + " ADD COLUMN dummy TINYINT(1) NOT NULL DEFAULT 0");
            log.info("modules.dummy 컬럼 추가");
        } catch (Exception e) {
            log.warn("modules.dummy 컬럼 추가 실패: {}", e.getMessage());
        }
    }

    /** 기존 last_heartbeat 값을 새 컬럼으로 옮긴다. 이미 값이 있으면 건드리지 않는다. */
    private void backfillLastSignalAt() {
        if (!hasColumn("last_heartbeat")) {
            return;
        }
        try {
            int moved = jdbcTemplate.update(
                    "UPDATE " + TABLE + " SET last_signal_at = last_heartbeat "
                            + "WHERE last_signal_at IS NULL AND last_heartbeat IS NOT NULL");
            if (moved > 0) {
                log.info("modules.last_heartbeat → last_signal_at {}건 이관", moved);
            }
        } catch (Exception e) {
            log.warn("last_signal_at 백필 실패 — 무시하고 계속합니다: {}", e.getMessage());
        }
    }

    private void dropColumnIfPresent(String column) {
        if (!hasColumn(column)) {
            return;
        }
        try {
            jdbcTemplate.execute("ALTER TABLE " + TABLE + " DROP COLUMN " + column);
            log.info("modules.{} 컬럼 제거 (레거시)", column);
        } catch (Exception e) {
            log.error("modules.{} 컬럼 제거 실패 — 수동으로 DROP 해야 INSERT 가 동작합니다: {}", column, e.getMessage());
        }
    }

    private boolean hasColumn(String column) {
        try {
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM information_schema.columns "
                            + "WHERE table_name = ? AND column_name = ? AND table_schema = DATABASE()",
                    Integer.class, TABLE, column);
            return count != null && count > 0;
        } catch (Exception e) {
            /* H2 등에서 DATABASE() 나 대소문자 규칙이 달라 실패할 수 있다 — 없는 것으로 본다. */
            log.debug("컬럼 존재 확인 실패 column={} reason={}", column, e.getMessage());
            return false;
        }
    }
}
