package com.meter.backend.service;

import com.meter.backend.entity.DisposalRecord;
import com.meter.backend.entity.Module;
import com.meter.backend.entity.User;
import com.meter.backend.repository.DisposalRecordRepository;
import com.meter.backend.repository.ModuleRepository;
import com.meter.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ModuleDisposalService {

    private final ModuleRepository moduleRepository;
    private final UserRepository userRepository;
    private final DisposalRecordRepository disposalRecordRepository;

    @Transactional
    public Map<String, Object> completeDisposalCheck(String serialNumber, String nickname) {
        if (nickname == null || nickname.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "userId(nickname) is required");
        }

        Module module = moduleRepository.findBySerialNumber(serialNumber)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Module not found"));
        User user = userRepository.findByNickname(nickname)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        DisposalRecord record = disposalRecordRepository
                .findFirstByUserAndModuleAndStatusOrderByCreatedAtDesc(user, module, "PENDING")
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "No pending disposal found"));

        record.setStatus("SUCCESS");
        record.setVerifiedAt(LocalDateTime.now());
        record.setRewardAmount(0);
        disposalRecordRepository.save(record);

        module.setTotalDisposalCount(module.getTotalDisposalCount() + 1);
        module.setStatus("CHECK");
        module.setLastHeartbeat(LocalDateTime.now());
        moduleRepository.save(module);
        log.info("module status CHECK serial={} user={}", serialNumber, nickname);

        module.setStatus("DEFAULT");
        moduleRepository.save(module);
        log.info("module status DEFAULT serial={} after CHECK", serialNumber);

        return Map.of("ok", true);
    }

    @Transactional
    public void setModuleStatusDefault(String serialNumber) {
        Module module = moduleRepository.findBySerialNumber(serialNumber).orElse(null);
        if (module == null) {
            return;
        }
        module.setStatus("DEFAULT");
        module.setLastHeartbeat(LocalDateTime.now());
        moduleRepository.save(module);
        log.info("module status DEFAULT serial={}", serialNumber);
    }

    @Transactional
    public void setModuleStatusFull(String serialNumber) {
        Module module = moduleRepository.findBySerialNumber(serialNumber).orElse(null);
        if (module == null) {
            return;
        }
        module.setStatus("FULL");
        module.setLastHeartbeat(LocalDateTime.now());
        moduleRepository.save(module);
        log.info("module status FULL serial={}", serialNumber);
    }

    /**
     * IoT가 10초 안에 IR 미감지로 보낸 READY(status 토픽) — PENDING 배출을 실패 처리, 리워드 없음.
     */
    @Transactional
    public void failPendingDisposalTimeout(String serialNumber, String nickname) {
        if (nickname == null || nickname.isBlank()) {
            return;
        }
        Module module = moduleRepository.findBySerialNumber(serialNumber).orElse(null);
        if (module == null) {
            return;
        }
        User user = userRepository.findByNickname(nickname).orElse(null);
        if (user == null) {
            return;
        }
        disposalRecordRepository
                .findFirstByUserAndModuleAndStatusOrderByCreatedAtDesc(user, module, "PENDING")
                .ifPresent(record -> {
                    record.setStatus("FAILED");
                    record.setVerifiedAt(LocalDateTime.now());
                    record.setRewardAmount(0);
                    disposalRecordRepository.save(record);
                });
        module.setStatus("DEFAULT");
        module.setLastHeartbeat(LocalDateTime.now());
        moduleRepository.save(module);
        log.info("module status DEFAULT serial={} after READY timeout", serialNumber);
    }
}
