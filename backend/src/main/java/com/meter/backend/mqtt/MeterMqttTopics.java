package com.meter.backend.mqtt;

/**
 * ESP32 토픽: {@code meter/{serialNumber}/…} — serialNumber는 DB modules.serial_number (예: m1, m2).
 */
public final class MeterMqttTopics {

    private MeterMqttTopics() {}

    /** 백엔드 → 모듈 (레거시 호환용, METER는 주로 status 단방향) */
    public static String cmd(String serialNumber) {
        return "meter/" + serialNumber + "/cmd";
    }

    /** 모듈 → 백엔드: HEARTBEAT / HEIGHT / FULL 등 */
    public static String status(String serialNumber) {
        return "meter/" + serialNumber + "/status";
    }

    public static String events(String serialNumber) {
        return "meter/" + serialNumber + "/events";
    }
}
