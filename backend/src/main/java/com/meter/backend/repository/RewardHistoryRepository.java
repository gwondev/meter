package com.meter.backend.repository;

import com.meter.backend.entity.DisposalRecord;
import com.meter.backend.entity.RewardHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface RewardHistoryRepository extends JpaRepository<RewardHistory, Long> {
    Optional<RewardHistory> findByDisposalRecord(DisposalRecord disposalRecord);
}