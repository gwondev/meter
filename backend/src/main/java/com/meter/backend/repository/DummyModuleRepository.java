package com.meter.backend.repository;

import com.meter.backend.entity.DummyModule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DummyModuleRepository extends JpaRepository<DummyModule, Long> {

    Optional<DummyModule> findBySerialNumber(String serialNumber);

    boolean existsBySerialNumber(String serialNumber);
}
