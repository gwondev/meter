package com.meter.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "disposal_records")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DisposalRecord {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "module_id", nullable = false)
    private Module module;

    @Column(name = "image_url", length = 255)
    private String imageUrl;

    @Column(name = "predicted_type", length = 255)
    private String predictedType;

    @Column(name = "selected_type", length = 255)
    private String selectedType;

    @Column(name = "reward_amount", nullable = false)
    private int rewardAmount;
    
    @Builder.Default
    @Column(name = "status", nullable = false, length = 255)
    private String status = "PENDING"; // PENDING, SUCCESS, FAILED

    @Builder.Default
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;
}