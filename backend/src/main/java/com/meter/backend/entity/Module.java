package com.meter.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "modules")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Module {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "serial_number", unique = true, nullable = false, length = 50)
    private String serialNumber;

    @Column(name = "organization", length = 50)
    private String organization;

    @Column(name = "lat")
    private Double lat;

    @Column(name = "lon")
    private Double lon;

    @Column(name = "type", length = 16)
    private String type; // CLOTHING, PLASTIC, CAN, MEDICINE

    @Builder.Default
    @Column(name = "status", nullable = false, length = 10)
    private String status = "DEFAULT"; // DEFAULT, FULL (적재량 위험), OFFLINE(프론트 표시용)

    @Column(name = "height_cm")
    private Double heightCm;

    @Builder.Default
    @Column(name = "total_disposal_count", nullable = false)
    private int totalDisposalCount = 0;

    @Builder.Default
    @Column(name = "last_heartbeat", nullable = false)
    private LocalDateTime lastHeartbeat = LocalDateTime.now();
}