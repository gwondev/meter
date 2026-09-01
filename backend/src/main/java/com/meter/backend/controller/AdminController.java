package com.meter.backend.controller;

import com.meter.backend.entity.DisposalRecord;
import com.meter.backend.entity.RewardHistory;
import com.meter.backend.entity.User;
import com.meter.backend.repository.DisposalRecordRepository;
import com.meter.backend.repository.DummyModuleRepository;
import com.meter.backend.repository.ModuleRepository;
import com.meter.backend.repository.RewardHistoryRepository;
import com.meter.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {
    private final UserRepository userRepository;
    private final ModuleRepository moduleRepository;
    private final DummyModuleRepository dummyModuleRepository;
    private final DisposalRecordRepository disposalRecordRepository;
    private final RewardHistoryRepository rewardHistoryRepository;

    @GetMapping("/overview")
    public Map<String, Object> overview() {
        List<User> users = userRepository.findAll();
        List<DisposalRecord> records = disposalRecordRepository.findAll();
        List<RewardHistory> rewards = rewardHistoryRepository.findAll();

        return Map.of(
                "users", users.stream().map(this::toUserDto).toList(),
                "modules", ModuleController.mergedModuleDtos(dummyModuleRepository, moduleRepository),
                "disposalRecords", records.stream().map(this::toRecordDto).toList(),
                "rewardHistories", rewards.stream().map(this::toRewardDto).toList()
        );
    }

    private Map<String, Object> toUserDto(User user) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", user.getId());
        dto.put("oauthId", user.getOauthId());
        dto.put("nickname", user.getNickname());
        dto.put("role", user.getRole());
        dto.put("status", user.getStatus());
        dto.put("nowRewards", user.getNowRewards());
        dto.put("totalRewards", user.getTotalRewards());
        dto.put("cameraDailyCount", user.getCameraDailyCount());
        dto.put("cameraDailyDate", user.getCameraDailyDate());
        dto.put("createdAt", user.getCreatedAt());
        dto.put("lastLoginAt", user.getLastLoginAt());
        return dto;
    }

    private Map<String, Object> toRecordDto(DisposalRecord record) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", record.getId());
        dto.put("userId", record.getUser() == null ? null : record.getUser().getId());
        dto.put("moduleId", record.getModule() == null ? null : record.getModule().getId());
        dto.put("predictedType", record.getPredictedType());
        dto.put("selectedType", record.getSelectedType());
        dto.put("rewardAmount", record.getRewardAmount());
        dto.put("status", record.getStatus());
        dto.put("createdAt", record.getCreatedAt());
        dto.put("verifiedAt", record.getVerifiedAt());
        return dto;
    }

    private Map<String, Object> toRewardDto(RewardHistory reward) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", reward.getId());
        dto.put("userId", reward.getUser() == null ? null : reward.getUser().getId());
        dto.put("disposalRecordId", reward.getDisposalRecord() == null ? null : reward.getDisposalRecord().getId());
        dto.put("points", reward.getPoints());
        dto.put("reason", reward.getReason());
        dto.put("createdAt", reward.getCreatedAt());
        return dto;
    }
}
