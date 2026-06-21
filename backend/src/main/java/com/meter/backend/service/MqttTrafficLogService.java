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
                "payload", payload == null ? "" : payload
        ));
        while (logs.size() > MAX_LOGS) {
            logs.removeLast();
        }
    }

    public synchronized List<Map<String, Object>> latest(int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 100));
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
