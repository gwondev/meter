package com.meter.backend.controller;

import com.meter.backend.entity.DisposalRecord;
import com.meter.backend.entity.User;
import com.meter.backend.repository.DisposalRecordRepository;
import com.meter.backend.repository.UserRepository;
import com.meter.backend.service.TableIdCompactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final DisposalRecordRepository disposalRecordRepository;
    private final TableIdCompactionService tableIdCompactionService;

    @GetMapping
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    /**
     * @deprecated METER에는 리워드 시스템이 없습니다.
     */
    @PostMapping("/claim-map-entry-reward")
    @Transactional
    public Map<String, Object> claimMapEntryReward(@RequestBody Map<String, String> body) {
        return Map.of("ok", true, "deprecated", true);
    }

    @PutMapping("/{id}")
    @Transactional
    public User updateUser(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (body.containsKey("nickname")) {
            Object v = body.get("nickname");
            if (v == null) {
                user.setNickname(null);
            } else if (v instanceof String s) {
                if (s.isBlank()) {
                    user.setNickname(null);
                } else {
                    String trimmed = s.trim();
                    userRepository.findByNickname(trimmed).ifPresent(other -> {
                        if (!other.getId().equals(id)) {
                            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 닉네임입니다.");
                        }
                    });
                    user.setNickname(trimmed);
                }
            }
        }

        if (body.containsKey("role")) {
            Object v = body.get("role");
            if (v instanceof String s) {
                String r = s.trim().toUpperCase();
                if (!"USER".equals(r) && !"ADMIN".equals(r)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "role은 USER 또는 ADMIN 만 가능합니다.");
                }
                user.setRole(r);
            }
        }

        if (body.containsKey("status")) {
            Object v = body.get("status");
            if (v instanceof String s && !s.isBlank()) {
                user.setStatus(s.trim());
            }
        }

        return userRepository.save(user);
    }

    @DeleteMapping("/{id}")
    @Transactional
    public void deleteUser(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        List<DisposalRecord> records = disposalRecordRepository.findByUser_IdOrderByCreatedAtDesc(user.getId());
        for (DisposalRecord dr : records) {
            disposalRecordRepository.delete(dr);
        }
        userRepository.delete(user);
        userRepository.flush();
        tableIdCompactionService.compactAllAfterDelete();
    }

    /** @deprecated METER에는 리워드 교환 기능이 없습니다. */
    @PostMapping("/exchange")
    @Transactional
    public Map<String, Object> exchangeRewardByOauth(@RequestBody Map<String, Object> body) {
        throw new ResponseStatusException(HttpStatus.GONE, "리워드 기능은 METER에서 제공하지 않습니다.");
    }

    /** @deprecated */
    @PostMapping("/{id}/exchange")
    @Transactional
    public Map<String, Object> exchangeReward(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body
    ) {
        throw new ResponseStatusException(HttpStatus.GONE, "리워드 기능은 METER에서 제공하지 않습니다.");
    }
}
