package com.meter.backend.repository;

import com.meter.backend.entity.Module;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ModuleRepository extends JpaRepository<Module, Long> {

    Optional<Module> findBySerialNumber(String serialNumber);

    /**
     * 신호가 끊긴 지 오래된 모듈 — 자동 정리 대상.
     *
     * <p>한 번도 신호가 없던 모듈은 등록 시각을 기준으로 판단한다.
     * createdAt 까지 비어 있으면(수동 등록 잔여 데이터) 정리하지 않는다.
     */
    @Query("""
            SELECT m FROM Module m
            WHERE (m.lastSignalAt IS NOT NULL AND m.lastSignalAt < :threshold)
               OR (m.lastSignalAt IS NULL AND m.createdAt IS NOT NULL AND m.createdAt < :threshold)
            """)
    List<Module> findStale(@Param("threshold") LocalDateTime threshold);
}
