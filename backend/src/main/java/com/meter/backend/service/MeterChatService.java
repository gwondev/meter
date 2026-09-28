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

    private static final int HISTORY_LIMIT = 6;

    public Map<String, Object> chat(String userMessage) {
        return chat(userMessage, List.of());
    }

    public Map<String, Object> chat(String userMessage, List<?> history) {
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Gemini API 키가 설정되지 않았습니다.");
        }
        String msg = userMessage == null ? "" : userMessage.trim();
        if (msg.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "message is required");
        }

        String context = buildModuleContext();
        String system = """
                당신은 METER 앱의 AI 도우미입니다. METER는 사각지대 감시와 최적 수거를 잇는 자원순환 AIoT 플랫폼입니다.
                사용자는 수거 관리자일 수도, 일반 시민일 수도 있습니다. 친절하고 자연스러운 한국어 존댓말로 답하세요.

                답할 수 있는 주제:
                1) 모듈 현황: 아래 [모듈 현황] 데이터만 근거로 답합니다. 데이터에 없는 모듈이나 수치는 지어내지 마세요.
                2) 수거 판단: 각 모듈의 '상태' 값을 그대로 따릅니다.
                   - 상태=수거필요 인 모듈만 "지금 수거가 필요하다"고 말합니다.
                   - 수거필요 모듈이 하나도 없으면 "지금 당장 수거할 곳은 없다"고 먼저 말하고, 그다음 적재율이 높은 순으로 1~2개만 참고로 알려줍니다.
                   - 상태=신호없음 인 모듈은 적재율을 판단에 쓰지 말고 "신호가 끊겨 확인이 필요하다"고 안내합니다.
                3) 분리배출 방법: 페트병, 캔, 유리병, 종이, 비닐, 스티로폼, 의류, 폐의약품, 폐건전지, 음식물 등
                   한국의 일반적인 분리배출 기준으로 답합니다. 지역마다 다를 수 있는 부분은 "지자체 기준을 확인하라"고 덧붙입니다.
                   METER가 다루는 유형(의류, 플라스틱, 캔, 폐의약품)이면 앱의 AI 카메라나 지도에서 가까운 거점을 찾을 수 있다고 안내해도 좋습니다.
                4) METER 서비스 사용법: 지도에서 모듈 확인, AI 카메라로 품목 판별, 최적 수거 경로 보기.
                그 밖의 주제는 METER와 자원순환에 관한 질문을 도와드릴 수 있다고 짧게 안내합니다.

                답변 형식:
                - 마크다운 금지. 순수 텍스트. 여러 항목이면 줄마다 "- " 로 시작.
                - 핵심을 먼저, 보통 2~4문장. 분리배출 방법처럼 단계가 있으면 짧은 목록으로.
                - 문장을 끝까지 완성하세요. 중간에 끊지 마세요.
                - "궁금한 점이 있으면 언제든 질문해 주세요" 같은 마무리 인사나 반복 안내는 쓰지 마세요.
                - 적재율은 정수%로. fillPercent 같은 영문 필드명은 쓰지 마세요.
                - 모듈은 시리얼로 부르고, 기관명이 있으면 함께 씁니다. 예: "m2(조선대, 적재율 85%)".
                - 리워드, 포인트, 상품권 기능은 없습니다.

                용어:
                - 적재율 0~100%. 80% 이상 수거필요, 50~79% 주의, 49% 이하 여유.
                - m으로 시작=D모듈(함 속 초음파 측정), r로 시작=R모듈(카메라로 구역 감시).

                [모듈 현황]
                """ + context;

        List<Map<String, Object>> contents = new java.util.ArrayList<>();
        int from = Math.max(0, history.size() - HISTORY_LIMIT);
        for (Object h : history.subList(from, history.size())) {
            if (!(h instanceof Map<?, ?> turn)) continue;
            Object text = turn.get("text");
            if (text == null || String.valueOf(text).isBlank()) continue;
            String role = "user".equals(turn.get("role")) ? "user" : "model";
            contents.add(Map.of("role", role, "parts", List.of(Map.of("text", String.valueOf(text)))));
        }
        contents.add(Map.of("role", "user", "parts", List.of(Map.of("text", msg))));

        String model = modelsCsv.split(",")[0].trim();
        Map<String, Object> generationConfig = new LinkedHashMap<>();
        generationConfig.put("temperature", 0.4);
        // 2.5 계열은 thinking 토큰도 출력 한도에 포함돼 답이 잘리므로 끄고 여유를 둔다
        generationConfig.put("maxOutputTokens", 1024);
        generationConfig.put("thinkingConfig", Map.of("thinkingBudget", 0));

        Map<String, Object> req = new LinkedHashMap<>();
        req.put("systemInstruction", Map.of("parts", List.of(Map.of("text", system))));
        req.put("contents", contents);
        req.put("generationConfig", generationConfig);

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
            if (active && fill != null && fill >= 80) urgent++;

            String fillText = fill == null ? "측정없음" : ((int) Math.round(fill)) + "%";
            String series = Module.DEVICE_VISION_CAM.equals(m.getDeviceType()) ? "R" : "D";
            String status;
            if (!active) status = "신호없음";
            else if (fill == null) status = "측정대기";
            else if (fill >= 80) status = "수거필요";
            else if (fill >= 50) status = "주의";
            else status = "여유";
            sb.append("- ").append(m.getSerialNumber())
                    .append(" (").append(series).append("모듈)")
                    .append(" 기관=").append(m.getOrganization() == null || m.getOrganization().isBlank() ? "-" : m.getOrganization())
                    .append(" 유형=").append(type)
                    .append(" 적재율=").append(fillText)
                    .append(" 상태=").append(status)
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
