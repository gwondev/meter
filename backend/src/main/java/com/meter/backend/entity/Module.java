package com.meter.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * METER 수거 거점 모듈.
 *
 * <p>두 계열이 하나의 테이블을 공유한다 — 최적 수거 경로가 계열 구분 없이 단일 노드 목록을 다뤄야 하기 때문.
 * <ul>
 *   <li>{@code m*} — 초음파 높이 센서 노드 (ESP32). {@code heightCm} 를 보낸다.</li>
 *   <li>{@code r*} — 영상 판정 노드 (라즈베리파이). {@code fillPercent} 와 사진을 보낸다.</li>
 * </ul>
 *
 * <p>{@code lastSignalAt} 이 null 이면 아직 신호를 한 번도 받지 못한 «신호 대기중» 상태다.
 */
@Entity
@Table(name = "modules")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Module {

    /** 높이 센서 계열 (m1, m2 …) */
    public static final String DEVICE_HEIGHT_SENSOR = "HEIGHT_SENSOR";
    /** 영상 판정 계열 (r1, r2 …) */
    public static final String DEVICE_VISION_CAM = "VISION_CAM";
    /** 관리자 더미 (지도·경로 테스트용, 자동 삭제 안 함) */
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

    /** 디바이스 계열 — 시리얼 접두어로 결정. 더미는 {@link #DEVICE_DUMMY}. */
    @Column(name = "device_type", length = 16)
    private String deviceType;

    /**
     * 관리자 테스트용 더미 모듈 - 무신호 자동 정리 대상에서 제외.
     * 실기기(m/r 접두어)와 시리얼 충돌을 피하려고 별도 플래그로 관리한다.
     */
    @Column(name = "dummy", nullable = false)
    @Builder.Default
    private boolean dummy = false;

    /** 모듈1 원본 측정값 — 센서에서 내용물 표면까지의 빈 거리(cm). 작을수록 가득 찬 상태. */
    @Column(name = "height_cm")
    private Double heightCm;

    /** 모듈1 용기 총 깊이(cm). heightCm 를 fillPercent 로 환산할 때 쓴다. */
    @Column(name = "depth_cm")
    private Double depthCm;

    /** 수거 우선도 0~100 (100 = 즉시 수거). 두 계열의 공통 지표이며 최적 경로 정렬 기준. */
    @Column(name = "fill_percent")
    private Double fillPercent;

    /** 모듈2 최신 스냅샷 이미지 경로 (예: /api/uploads/r1/1738400000.jpg) */
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
     * <p>모듈1 발행 주기 30초 → 여유 90초. 모듈2 는 5분 간격 → 12분.
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
