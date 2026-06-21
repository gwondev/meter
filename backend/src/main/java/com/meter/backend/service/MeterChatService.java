package com.meter.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.meter.backend.entity.Module;
import com.meter.backend.repository.ModuleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class MeterChatService {

    private final ModuleRepository moduleRepository;
    private final WebClient geminiWebClient;
    private final ObjectMapper objectMapper;

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    @Value("${gemini.api.models:gemini-2.5-flash,gemini-2.5-flash-lite}")
    private String modelsCsv;

    public Map<String, Object> chat(String userMessage) {
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Gemini API 키가 설정되지 않았습니다.");
        }
        String msg = userMessage == null ? "" : userMessage.trim();
        if (msg.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "message is required");
        }

        String context = buildModuleContext();
        String system = """
                당신은 METER(범용 탈부착형 AIoT 모듈 기반 적재 자원 통합관리 플랫폼) 운영 분석 AI입니다.
                아래 DB 스냅샷을 근거로 한국어로 간결하게 답하세요.
                추측은 '추정'이라고 표시하고, 데이터에 없으면 모른다고 하세요.
                리워드·포인트·상품권은 이 서비스에 없습니다. 언급하지 마세요.

                [모듈 DB 스냅샷]
                """ + context;

        String model = modelsCsv.split(",")[0].trim();
        Map<String, Object> req = new LinkedHashMap<>();
        req.put("systemInstruction", Map.of("parts", List.of(Map.of("text", system))));
        req.put("contents", List.of(Map.of("parts", List.of(Map.of("text", msg)))));
        req.put("generationConfig", Map.of("temperature", 0.3, "maxOutputTokens", 512));

        String url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent";
        try {
            String raw = geminiWebClient.post()
                    .uri(url)
                    .header("x-goog-api-key", geminiApiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(req)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block(Duration.ofSeconds(25));

            String reply = extractText(raw);
            if (reply.isBlank()) {
                reply = "답변을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.";
            }
            return Map.of("reply", reply, "model", model, "moduleCount", moduleRepository.count());
        } catch (WebClientResponseException e) {
            log.warn("chat gemini error status={} body={}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI 챗봇 응답 실패");
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI 챗봇 호출 실패: " + e.getMessage());
        }
    }

    private String buildModuleContext() {
        List<Module> modules = moduleRepository.findAll();
        if (modules.isEmpty()) {
            return "등록된 모듈 없음";
        }
        StringBuilder sb = new StringBuilder();
        int offline = 0;
        int full = 0;
        int totalDisposals = 0;
        Map<String, Integer> byType = new LinkedHashMap<>();
        for (Module m : modules) {
            String type = m.getType() != null ? m.getType() : "UNKNOWN";
            byType.merge(type, 1, Integer::sum);
            if (isOffline(m)) offline++;
            if ("FULL".equalsIgnoreCase(m.getStatus())) full++;
            totalDisposals += m.getTotalDisposalCount();
            sb.append("- serial=").append(m.getSerialNumber())
                    .append(" type=").append(type)
                    .append(" status=").append(m.getStatus())
                    .append(" heightCm=").append(m.getHeightCm())
                    .append(" disposals=").append(m.getTotalDisposalCount())
                    .append(" lastHeartbeat=").append(m.getLastHeartbeat())
                    .append("\n");
        }
        sb.insert(0, "요약: 모듈 " + modules.size() + "개, 오프라인 " + offline + "개, FULL " + full
                + "개, 누적투입 " + totalDisposals + "회, 유형별=" + byType + "\n\n");
        return sb.toString();
    }

    private static boolean isOffline(Module m) {
        LocalDateTime hb = m.getLastHeartbeat();
        if (hb == null) return true;
        return ChronoUnit.HOURS.between(hb, LocalDateTime.now()) >= 24;
    }

    private String extractText(String raw) {
        if (raw == null || raw.isBlank()) return "";
        try {
            JsonNode root = objectMapper.readTree(raw);
            JsonNode parts = root.path("candidates").path(0).path("content").path("parts");
            if (!parts.isArray()) return "";
            StringBuilder out = new StringBuilder();
            for (JsonNode p : parts) {
                if (p.has("text")) out.append(p.get("text").asText());
            }
            return out.toString().trim();
        } catch (Exception e) {
            return "";
        }
    }
}
