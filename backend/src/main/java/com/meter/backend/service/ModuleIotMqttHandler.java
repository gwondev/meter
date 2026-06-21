package com.meter.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.meter.backend.entity.Module;
import com.meter.backend.repository.ModuleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class ModuleIotMqttHandler {

    private final ModuleDisposalService moduleDisposalService;
    private final ModuleRepository moduleRepository;
    private final ObjectMapper objectMapper;
    /** 동일 모듈에 CHECK MQTT 가 연속으로 오면 중복 처리 방지 (ms) — 레거시 호환 */
    private final ConcurrentHashMap<String, Long> lastCheckHandledMs = new ConcurrentHashMap<>();

    @Transactional
    public void handleStatusPayload(String serialNumber, String payload) {
        try {
            JsonNode root = objectMapper.readTree(payload);
            String status = root.path("status").asText("").trim().toUpperCase();
            if (status.isEmpty()) {
                log.warn("MQTT status empty serial={} payload={}", serialNumber, payload);
                return;
            }
            switch (status) {
                case "HEARTBEAT" -> touchHeartbeat(serialNumber);
                case "HEIGHT" -> handleHeight(serialNumber, root);
                case "DEFAULT" -> moduleDisposalService.setModuleStatusDefault(serialNumber);
                case "READY" -> handleReadyTimeout(serialNumber, root);
                case "CHECK" -> handleCheck(serialNumber, root);
                case "FULL" -> moduleDisposalService.setModuleStatusFull(serialNumber);
                default -> log.warn("MQTT unknown status serial={} status={}", serialNumber, status);
            }
        } catch (Exception e) {
            log.error("MQTT status parse/handle failed serial={} payload={}", serialNumber, payload, e);
        }
    }

    protected void touchHeartbeat(String serialNumber) {
        Module module = moduleRepository.findBySerialNumber(serialNumber).orElse(null);
        if (module == null) {
            return;
        }
        module.setLastHeartbeat(LocalDateTime.now());
        moduleRepository.save(module);
        log.debug("MQTT HEARTBEAT serial={}", serialNumber);
    }

    protected void handleHeight(String serialNumber, JsonNode root) {
        Module module = moduleRepository.findBySerialNumber(serialNumber).orElse(null);
        if (module == null) {
            return;
        }
        double heightCm = root.path("heightCm").asDouble(-1);
        if (heightCm < 0 && root.has("height_cm")) {
            heightCm = root.path("height_cm").asDouble(-1);
        }
        module.setLastHeartbeat(LocalDateTime.now());
        if (heightCm >= 0) {
            module.setHeightCm(heightCm);
            if (heightCm <= 10.0) {
                module.setStatus("FULL");
            } else if ("FULL".equalsIgnoreCase(module.getStatus())) {
                module.setStatus("DEFAULT");
            }
        }
        moduleRepository.save(module);
        log.info("MQTT HEIGHT serial={} heightCm={} status={}", serialNumber, heightCm, module.getStatus());
    }

    private void handleReadyTimeout(String serialNumber, JsonNode root) {
        String nickname = nicknameFrom(root);
        if (nickname == null || nickname.isBlank()) {
            log.warn("MQTT READY timeout without nickname serial={}", serialNumber);
            return;
        }
        moduleDisposalService.failPendingDisposalTimeout(serialNumber, nickname);
    }

    private void handleCheck(String serialNumber, JsonNode root) {
        String nickname = nicknameFrom(root);
        if (nickname == null || nickname.isBlank()) {
            log.warn("MQTT CHECK without userId serial={}", serialNumber);
            return;
        }
        long now = System.currentTimeMillis();
        String dedupeKey = serialNumber.trim().toLowerCase() + "|" + nickname.trim().toLowerCase();
        Long lastMs = lastCheckHandledMs.get(dedupeKey);
        if (lastMs != null && now - lastMs < 2500L) {
            log.info("MQTT CHECK deduped serial={} user={}", serialNumber, nickname);
            return;
        }
        try {
            moduleDisposalService.completeDisposalCheck(serialNumber, nickname);
            lastCheckHandledMs.put(dedupeKey, now);
        } catch (Exception e) {
            log.warn("MQTT CHECK not applied serial={} reason={}", serialNumber, e.getMessage());
        }
    }

    public void handleEventsPayload(String serialNumber, String payload) {
        try {
            JsonNode root = objectMapper.readTree(payload);
            String ev = root.path("status").asText("").trim();
            if (ev.isEmpty()) {
                ev = root.path("event").asText("").trim();
            }
            if ("FULL".equalsIgnoreCase(ev)) {
                moduleDisposalService.setModuleStatusFull(serialNumber);
            } else if ("HEIGHT".equalsIgnoreCase(ev)) {
                handleHeight(serialNumber, root);
            } else {
                log.warn("MQTT unknown event serial={} payload={}", serialNumber, payload);
            }
        } catch (Exception e) {
            log.error("MQTT events parse/handle failed serial={} payload={}", serialNumber, payload, e);
        }
    }

    private static String nicknameFrom(JsonNode root) {
        String n = textOrNull(root, "userId");
        if (n == null) {
            n = textOrNull(root, "userid");
        }
        if (n == null) {
            n = textOrNull(root, "nickname");
        }
        return n;
    }

    private static String textOrNull(JsonNode root, String field) {
        if (!root.has(field)) {
            return null;
        }
        String t = root.get(field).asText("");
        return t.isBlank() ? null : t.trim();
    }
}
