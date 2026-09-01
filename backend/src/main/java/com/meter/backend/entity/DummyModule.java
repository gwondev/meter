package com.meter.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 관리자 테스트용 더미 모듈 — {@code modules} 와 별도 테이블·별도 AUTO_INCREMENT.
 *
 * <p>임시 데이터이지만 계열은 M 또는 R 이다 → UI 표기 D(M) / D(R).
 */
@Entity
@Table(name = "dummy_modules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DummyModule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
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
    private String type;

    /** HEIGHT_SENSOR(M) 또는 VISION_CAM(R) */
    @Column(name = "device_type", length = 16, nullable = false)
    @Builder.Default
    private String deviceType = Module.DEVICE_HEIGHT_SENSOR;

    @Column(name = "fill_percent")
    private Double fillPercent;

    @Column(name = "depth_cm")
    private Double depthCm;

    @Column(name = "last_signal_at")
    private LocalDateTime lastSignalAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
