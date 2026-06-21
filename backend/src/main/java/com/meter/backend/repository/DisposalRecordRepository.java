package com.meter.backend.repository;

import com.meter.backend.entity.DisposalRecord;
import com.meter.backend.entity.Module;
import com.meter.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface DisposalRecordRepository extends JpaRepository<DisposalRecord, Long> {
    List<DisposalRecord> findByUser_IdOrderByCreatedAtDesc(Long userId);

    List<DisposalRecord> findByModule_Id(Long moduleId);

    Optional<DisposalRecord> findFirstByUserAndModuleAndStatusOrderByCreatedAtDesc(User user, Module module, String status);

    List<DisposalRecord> findAllByUserAndModuleAndStatus(User user, Module module, String status);
}