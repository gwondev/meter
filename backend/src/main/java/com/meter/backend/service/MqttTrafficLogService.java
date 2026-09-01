package com.meter.backend.service;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Map;

@Service
public class MqttTrafficLogService {
    private static final int MAX_LOGS = 200;
    private final Deque<Map<String, Object>> logs = new ArrayDeque<>();

    public synchronized void add(String direction, String topic, String payload) {
        logs.addFirst(Map.of(
                "time", LocalDateTime.now().toString(),
                "direction", direction,
                "topic", topic == null ? "" : topic,
                "payload", summarizePayload(payload)
        ));
        while (logs.size() > MAX_LOGS) {
            logs.removeLast();
        }
    }

    /** base64 이미지 등 큰 필드는 로그에 원문을 넣지 않는다. */
    static String summarizePayload(String payload) {
        if (payload == null) {
            return "";
        }
        String p = payload;
        boolean hasImage = p.contains("imageBase64") || p.contains("\"image\"");
        if (hasImage && p.length() > 400) {
            return "[image payload omitted, bytes=" + p.length() + "]";
        }
        if (p.length() > 800) {
            return p.substring(0, 800) + "…(truncated," + p.length() + ")";
        }
        return p;
    }

    public synchronized List<Map<String, Object>> latest(int limit) {
        int safeLimit = Math.max(1, Math.min(limit, MAX_LOGS));
        List<Map<String, Object>> out = new ArrayList<>(safeLimit);
        int i = 0;
        for (Map<String, Object> row : logs) {
            if (i++ >= safeLimit) {
                break;
            }
            out.add(row);
        }
        return out;
    }
}
