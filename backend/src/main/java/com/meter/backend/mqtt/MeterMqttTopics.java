package com.meter.backend.mqtt;

/**
 * METER MQTT 토픽 규약.
 *
 * <p>모듈 → 서버 단방향이며 토픽은 {@code meter/{serialNumber}/status} 하나뿐이다.
 * serialNumber 는 DB {@code modules.serial_number} 와 동일하다 (m1, m2 … / r1, r2 …).
 */
public final class MeterMqttTopics {

    private MeterMqttTopics() {}

    /** 모듈 → 백엔드 측정값 발행 토픽. */
    public static String status(String serialNumber) {
        return "meter/" + serialNumber + "/status";
    }

    /** 백엔드 구독용 와일드카드. */
    public static String statusWildcard() {
        return "meter/+/status";
    }
}
