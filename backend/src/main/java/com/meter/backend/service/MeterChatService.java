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
                당신은 METER(사각지대 감시와 최적 수거를 잇는 자원순환 AIoT 플랫폼) 운영 도우미입니다.
                아래 모듈 현황을 근거로 한국어로 답하세요. 현장 관리자·시민이 바로 이해할 말로 말하세요.

                답변 규칙:
                - 마크다운 금지. 순수 텍스트만. 목록은 "- " 만 사용.
                - 2~3문장으로 결론부터. 서론·되묻기 생략.
                - 적재율은 정수% 로만 말하세요. 예: 71%. fillPercent 같은 영문 필드명은 쓰지 마세요.
                - 시리얼은 m1, r1 처럼 짧게. 예: "m1(적재율 80%, 수거 필요)".
                - 추측은 '추정'이라고 표시. 데이터 없으면 모른다고 하세요.
                - 리워드·포인트·상품권은 없습니다.

                용어:
                - 적재율 0~100: 높을수록 수거 급함. 80 이상=수거 필요, 50 이상=주의.
                - m*=D모듈(초음파), r*=R모듈(카메라).
                - 신호 없음=현재 통신이 끊긴 상태.

                [모듈 현황]
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

            String fillText = fill == null ? "측정없음" : ((int) Math.round(fill)) + "%";
            String series = Module.DEVICE_VISION_CAM.equals(m.getDeviceType()) ? "R" : "D";
            sb.append("- ").append(m.getSerialNumber())
                    .append(" (").append(series).append(")")
                    .append(" 유형=").append(type)
                    .append(" 신호=").append(active ? "정상" : "없음")
                    .append(" 적재율=").append(fillText)
                    .append("\n");
        }
        sb.insert(0, "요약: 전체 " + modules.size() + "개, 신호 없음 " + waiting
                + "개, 수거 필요(80%↑) " + urgent + "개, 유형별=" + byType + "\n\n");
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
