package com.meter.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * METER 수거 거점 모듈.
 *
 * <ul>
 *   <li>{@code m*} — D모듈 (초음파). 보드가 {@code fillPercent} 0~100 을 MQTT로 보낸다.</li>
 *   <li>{@code r*} — R모듈 (카메라). 동일하게 {@code fillPercent} + 선택 {@code imageBase64} (MQTT만).</li>
 * </ul>
 *
 * <p>더미는 {@code dummy_modules} — 계열만 M(높이형)/R(카메라형). 제품명 D모듈과 혼동 주의.
 */
@Entity
@Table(name = "modules")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Module {

    /** D모듈 — 초음파 높이 (시리얼 m*) */
    public static final String DEVICE_HEIGHT_SENSOR = "HEIGHT_SENSOR";
    /** R모듈 — 카메라 (시리얼 r*) */
    public static final String DEVICE_VISION_CAM = "VISION_CAM";

    /** @deprecated 더미는 deviceType=M/R + dummy 플래그. 레거시 값만 잔존. */
    @Deprecated
    public static final String DEVICE_DUMMY = "DUMMY";

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

    /** 수거 자원 분류 — CLOTHING, PLASTIC, CAN, MEDICINE, GENERAL */
    @Column(name = "type", length = 16)
    private String type;

    /** 디바이스 계열 — 시리얼 접두어로 결정 (HEIGHT_SENSOR / VISION_CAM). */
    @Column(name = "device_type", length = 16)
    private String deviceType;

    /**
     * 레거시 플래그. 신규 더미는 {@code dummy_modules} 테이블.
     */
    @Column(name = "dummy", nullable = false)
    @Builder.Default
    private boolean dummy = false;

    /** 구형 펌웨어 원본 높이(cm). 신규 펌웨어는 null — 웹에 표시하지 않음. */
    @Column(name = "height_cm")
    private Double heightCm;

    /** 구형 heightCm 환산용 깊이. 보드가 fillPercent 를 보내면 불필요. */
    @Column(name = "depth_cm")
    private Double depthCm;

    /** 적재율 0~100 (100 = 즉시 수거). M·R·더미 공통. */
    @Column(name = "fill_percent")
    private Double fillPercent;

    /** R모듈 최신 스냅샷 경로 (예: /api/uploads/r1/1738400000.jpg) */
    @Column(name = "last_image_url", length = 255)
    private String lastImageUrl;

    /** 마지막 신호 수신 시각. null = 아직 신호 없음(신호 대기중). */
    @Column(name = "last_signal_at")
    private LocalDateTime lastSignalAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    /** 시리얼 접두어로 디바이스 계열을 판별한다. r* → 영상, m* → 초음파. */
    public static String deviceTypeFromSerial(String serialNumber) {
        if (serialNumber != null && serialNumber.trim().toLowerCase().startsWith("r")) {
            return DEVICE_VISION_CAM;
        }
        return DEVICE_HEIGHT_SENSOR;
    }

    /** 실기기 시리얼(m/r 접두어) 여부 - 웹에서 시리얼 수정 잠금에 쓴다. */
    public static boolean isDeviceSerial(String serialNumber) {
        if (serialNumber == null) return false;
        String s = serialNumber.trim().toLowerCase();
        return s.startsWith("m") || s.startsWith("r");
    }

    /**
     * 지금 신호가 들어오고 있는지 — false 면 프론트에서 회색 «신호 대기중» 으로 표시한다.
     *
     * <p>D모듈 발행 주기 30초 → 여유 90초. R모듈은 5분 간격 → 12분.
     * 더미는 항상 활성으로 취급한다(테스트 배치용).
     */
    @Transient
    public boolean isSignalActive() {
        if (dummy || DEVICE_DUMMY.equals(deviceType)) {
            return true;
        }
        if (lastSignalAt == null) {
            return false;
        }
        long allowedSeconds = DEVICE_VISION_CAM.equals(deviceType) ? 12 * 60 : 90;
        return lastSignalAt.isAfter(LocalDateTime.now().minusSeconds(allowedSeconds));
    }
}
