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
                아래 DB 스냅샷을 근거로 한국어로 답하세요.

                답변 규칙:
                - 마크다운 문법을 절대 쓰지 마세요. **굵게**, *기울임*, #제목, `코드`, 표 모두 금지입니다.
                - 순수 텍스트로만 답하세요. 목록이 필요하면 문장 앞에 "- " 만 붙이세요.
                - 3문장 이내로 결론부터 말하세요. 서론과 되묻기는 생략합니다.
                - 수치를 인용할 때는 모듈 시리얼과 값만 짧게 적으세요.
                - 추측은 '추정'이라고 표시하고, 데이터에 없으면 모른다고 하세요.
                - 리워드·포인트·상품권은 이 서비스에 없습니다. 언급하지 마세요.

                용어:
                - fillPercent 는 수거 우선도 0~100 입니다. 100 이면 즉시 수거 대상입니다.
                - m 으로 시작하는 모듈은 초음파 높이 센서, r 로 시작하는 모듈은 카메라 영상 판정 노드입니다.
                - 신호대기중은 현재 신호가 끊긴 상태를 뜻합니다.

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

            String reply = stripMarkdown(extractText(raw));
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
        int waiting = 0;
        int urgent = 0;
        Map<String, Integer> byType = new LinkedHashMap<>();
        for (Module m : modules) {
            String type = m.getType() != null ? m.getType() : "UNKNOWN";
            byType.merge(type, 1, Integer::sum);

            boolean active = m.isSignalActive();
            if (!active) waiting++;
            Double fill = m.getFillPercent();
            if (fill != null && fill >= 80) urgent++;

            sb.append("- serial=").append(m.getSerialNumber())
                    .append(" device=").append(m.getDeviceType())
                    .append(" type=").append(type)
                    .append(" signal=").append(active ? "ACTIVE" : "WAITING")
                    .append(" fillPercent=").append(fill)
                    .append(" series=").append(
                            Module.DEVICE_VISION_CAM.equals(m.getDeviceType()) ? "R" : "M");
                    .append(" lastSignalAt=").append(m.getLastSignalAt())
                    .append("\n");
        }
        sb.insert(0, "요약: 모듈 " + modules.size() + "개, 신호대기중 " + waiting
                + "개, 수거우선(80% 이상) " + urgent + "개, 유형별=" + byType + "\n\n");
        return sb.toString();
    }

    /** 모델이 규칙을 어기고 마크다운을 섞어 보내는 경우가 있어 서버에서 한 번 더 걷어낸다. */
    static String stripMarkdown(String text) {
        if (text == null || text.isBlank()) {
            return "";
        }
        return text
                .replaceAll("(?m)^\\s{0,3}#{1,6}\\s*", "")
                .replaceAll("\\*\\*\\*(.+?)\\*\\*\\*", "$1")
                .replaceAll("\\*\\*(.+?)\\*\\*", "$1")
                .replaceAll("(?<![\\w*])\\*(?!\\s)(.+?)(?<!\\s)\\*(?![\\w*])", "$1")
                .replaceAll("__(.+?)__", "$1")
                .replaceAll("`{1,3}", "")
                .replaceAll("(?m)^\\s*[*+]\\s+", "- ")
                .replaceAll("\n{3,}", "\n\n")
                .trim();
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
