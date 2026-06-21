package com.meter.backend.controller;

import com.meter.backend.entity.DisposalRecord;
import com.meter.backend.entity.Module;
import com.meter.backend.entity.User;
import com.meter.backend.repository.DisposalRecordRepository;
import com.meter.backend.repository.ModuleRepository;
import com.meter.backend.repository.RewardHistoryRepository;
import com.meter.backend.repository.UserRepository;
import com.meter.backend.mqtt.MeterMqttTopics;
import com.meter.backend.service.ModuleDisposalService;
import com.meter.backend.service.MqttPublisherService;
import com.meter.backend.service.TableIdCompactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/modules")
@RequiredArgsConstructor
public class ModuleController {
    private final ModuleRepository moduleRepository;
    private final UserRepository userRepository;
    private final DisposalRecordRepository disposalRecordRepository;
    private final RewardHistoryRepository rewardHistoryRepository;
    private final MqttPublisherService mqttPublisherService;
    private final ModuleDisposalService moduleDisposalService;
    private final TableIdCompactionService tableIdCompactionService;

    private static final Set<String> ALLOWED_MODULE_STATUS = Set.of("DEFAULT", "READY", "CHECK", "FULL");

    @GetMapping
    public List<Module> getAllModules() {
        return moduleRepository.findAll();
    }

    @PostMapping
    public Module createModule(@RequestBody Map<String, Object> body) {
        String serialNumber = body.get("serialNumber") == null ? null : body.get("serialNumber").toString().trim();
        if (serialNumber == null || serialNumber.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "serialNumber is required");
        }
        if (moduleRepository.findBySerialNumber(serialNumber).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "serialNumber already exists");
        }

        Module module = Module.builder()
                .serialNumber(serialNumber)
                .organization(stringOrDefault(body.get("organization"), "CHOSUN_IT"))
                .lat(doubleOrDefault(body.get("lat"), 35.1469))
                .lon(doubleOrDefault(body.get("lon"), 126.9228))
                .type(stringOrDefault(body.get("type"), "GENERAL"))
                .status("DEFAULT")
                .totalDisposalCount(Math.max(0, intOrDefault(body.get("totalDisposalCount"), 0)))
                .lastHeartbeat(LocalDateTime.now())
                .build();
        return moduleRepository.save(module);
    }

    @PostMapping("/seed")
    public Map<String, Object> seedModules() {
        if (moduleRepository.count() > 0) {
            return Map.of("seeded", false, "reason", "already exists");
        }

        Module m1 = Module.builder()
                .serialNumber("m1")
                .organization("CHOSUN_IT")
                .lat(35.1462000)
                .lon(126.9229000)
                .type("CAN")
                .status("FULL")
                .heightCm(5.0)
                .totalDisposalCount(0)
                .lastHeartbeat(null)
                .build();
        moduleRepository.save(m1);

        Module m2 = Module.builder()
                .serialNumber("m2")
                .organization("CHOSUN_IT")
                .lat(35.1474000)
                .lon(126.9242000)
                .type("PLASTIC")
                .status("FULL")
                .heightCm(5.0)
                .totalDisposalCount(0)
                .lastHeartbeat(null)
                .build();
        moduleRepository.save(m2);

        Module m3 = Module.builder()
                .serialNumber("m3")
                .organization("CHOSUN_IT")
                .lat(35.1458000)
                .lon(126.9235000)
                .type("CLOTHING")
                .status("FULL")
                .heightCm(5.0)
                .totalDisposalCount(0)
                .lastHeartbeat(null)
                .build();
        moduleRepository.save(m3);

        Module m4 = Module.builder()
                .serialNumber("m4")
                .organization("CHOSUN_IT")
                .lat(35.1469000)
                .lon(126.9218000)
                .type("MEDICINE")
                .status("FULL")
                .heightCm(5.0)
                .totalDisposalCount(0)
                .lastHeartbeat(null)
                .build();
        moduleRepository.save(m4);

        return Map.of("seeded", true, "serialNumbers", List.of(m1.getSerialNumber(), m2.getSerialNumber(), m3.getSerialNumber(), m4.getSerialNumber()));
    }

    @PostMapping("/{serialNumber}/ready")
    public Map<String, Object> ready(
            @PathVariable String serialNumber,
            @RequestBody Map<String, String> body
    ) {
        Module module = moduleRepository.findBySerialNumber(serialNumber)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Module not found"));

        // oauthId 우선 — localStorage 닉네임이 회원 삭제·ID 재정렬로 어긋나도 발행이 막히지 않게.
        String oauthId = body.get("oauthId");
        String nickname = body.get("userId");
        User user = null;
        if (oauthId != null && !oauthId.isBlank()) {
            user = userRepository.findByOauthId(oauthId.trim()).orElse(null);
        }
        if (user == null && nickname != null && !nickname.isBlank()) {
            user = userRepository.findByNickname(nickname.trim()).orElse(null);
        }
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
        }
        // 디바이스가 status 로 되돌려줄 식별자는 DB 의 현재 닉네임으로 고정 (CHECK 매칭 일관성).
        nickname = user.getNickname();
        if (nickname == null || nickname.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "닉네임 설정이 필요합니다.");
        }

        module.setStatus("READY");
        module.setLastHeartbeat(LocalDateTime.now());
        moduleRepository.save(module);

        /* 새 READY 전에 같은 모듈·유저의 미완료 PENDING 을 정리 — 이중 CHECK·중복 리워드 방지 */
        disposalRecordRepository.findAllByUserAndModuleAndStatus(user, module, "PENDING").forEach((old) -> {
            old.setStatus("FAILED");
            old.setVerifiedAt(LocalDateTime.now());
            old.setRewardAmount(0);
            disposalRecordRepository.save(old);
        });

        DisposalRecord record = DisposalRecord.builder()
                .user(user)
                .module(module)
                .predictedType(body.get("predictedType"))
                .selectedType(body.get("selectedType"))
                .imageUrl(body.get("imageUrl"))
                .rewardAmount(0)
                .status("PENDING")
                .createdAt(LocalDateTime.now())
                .build();
        disposalRecordRepository.save(record);

        String topic = MeterMqttTopics.cmd(serialNumber);
        long issuedAt = System.currentTimeMillis();
        String payload = String.format(Locale.US, "{\"userId\":\"%s\",\"issuedAt\":%d}",
                escapeJson(nickname), issuedAt);
        mqttPublisherService.publish(topic, payload, true);

        return Map.of("ok", true, "moduleStatus", module.getStatus(), "recordId", record.getId());
    }

    @PostMapping("/{serialNumber}/check")
    public Map<String, Object> check(
            @PathVariable String serialNumber,
            @RequestBody Map<String, String> body
    ) {
        String nickname = body.get("userId");
        return moduleDisposalService.completeDisposalCheck(serialNumber, nickname);
    }

    /** METER: 지도에서 버리기 — 투입 카운트만 증가 (리워드·MQTT 검증 없음) */
    @PostMapping("/{serialNumber}/dispose")
    @Transactional
    public Map<String, Object> dispose(@PathVariable String serialNumber) {
        Module module = moduleRepository.findBySerialNumber(serialNumber)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Module not found"));
        module.setTotalDisposalCount(module.getTotalDisposalCount() + 1);
        module.setLastHeartbeat(LocalDateTime.now());
        moduleRepository.save(module);
        return Map.of(
                "ok", true,
                "totalDisposalCount", module.getTotalDisposalCount(),
                "serialNumber", module.getSerialNumber()
        );
    }

    private String stringOrDefault(Object raw, String fallback) {
        if (raw == null) return fallback;
        String value = raw.toString().trim();
        return value.isBlank() ? fallback : value;
    }

    private static String escapeJson(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private Double doubleOrDefault(Object raw, double fallback) {
        if (raw == null) return fallback;
        try {
            return Double.parseDouble(raw.toString());
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    private Integer intOrDefault(Object raw, int fallback) {
        if (raw == null) return fallback;
        try {
            return Integer.parseInt(raw.toString().trim());
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    @PutMapping("/{id}")
    @Transactional
    public Module updateModule(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Module module = moduleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Module not found"));

        if (body.containsKey("serialNumber")) {
            String sn = body.get("serialNumber").toString().trim();
            if (!sn.isBlank()) {
                moduleRepository.findBySerialNumber(sn).ifPresent(other -> {
                    if (!other.getId().equals(id)) {
                        throw new ResponseStatusException(HttpStatus.CONFLICT, "serialNumber already exists");
                    }
                });
                module.setSerialNumber(sn);
            }
        }
        if (body.containsKey("organization") && body.get("organization") != null) {
            module.setOrganization(body.get("organization").toString().trim());
        }
        if (body.containsKey("lat")) {
            module.setLat(doubleOrDefault(body.get("lat"), module.getLat() != null ? module.getLat() : 35.1469));
        }
        if (body.containsKey("lon")) {
            module.setLon(doubleOrDefault(body.get("lon"), module.getLon() != null ? module.getLon() : 126.9228));
        }
        if (body.containsKey("type") && body.get("type") != null) {
            module.setType(body.get("type").toString().trim().toUpperCase());
        }
        if (body.containsKey("status") && body.get("status") != null) {
            String st = body.get("status").toString().trim().toUpperCase();
            if (!ALLOWED_MODULE_STATUS.contains(st)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "status must be one of: DEFAULT, READY, CHECK, FULL");
            }
            module.setStatus(st);
        }
        if (body.containsKey("totalDisposalCount")) {
            module.setTotalDisposalCount(
                    Math.max(
                            0,
                            intOrDefault(
                                    body.get("totalDisposalCount"),
                                    module.getTotalDisposalCount()
                            )
                    )
            );
        }
        module.setLastHeartbeat(LocalDateTime.now());
        return moduleRepository.save(module);
    }

    @DeleteMapping("/{id}")
    @Transactional
    public void deleteModule(@PathVariable Long id) {
        Module module = moduleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Module not found"));

        List<DisposalRecord> records = disposalRecordRepository.findByModule_Id(module.getId());
        for (DisposalRecord dr : records) {
            rewardHistoryRepository.findByDisposalRecord(dr).ifPresent(rewardHistoryRepository::delete);
            disposalRecordRepository.delete(dr);
        }
        moduleRepository.delete(module);
        moduleRepository.flush();
        tableIdCompactionService.compactAllAfterDelete();
    }
}