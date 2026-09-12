package com.meter.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.nio.file.Path;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Python vision_service 호출 — baseline + 최근 샘플 → fillPercent.
 */
@Service
@Slf4j
public class VisionCompareClient {

    private final WebClient webClient;
    private final ObjectMapper objectMapper;
    private final String baseUrl;
    private final boolean enabled;

    public VisionCompareClient(
            WebClient.Builder webClientBuilder,
            ObjectMapper objectMapper,
            @Value("${meter.vision.url:http://meter-vision:8090}") String baseUrl,
            @Value("${meter.vision.enabled:true}") boolean enabled
    ) {
        this.webClient = webClientBuilder
                .baseUrl(baseUrl)
                .build();
        this.objectMapper = objectMapper;
        this.baseUrl = baseUrl;
        this.enabled = enabled;
    }

    public Double compare(Path baselineAbs, List<Path> sampleAbsPaths) {
        if (!enabled) {
            log.debug("vision disabled");
            return null;
        }
        if (baselineAbs == null || sampleAbsPaths == null || sampleAbsPaths.isEmpty()) {
            return null;
        }

        Map<String, Object> body = new HashMap<>();
        body.put("baselinePath", baselineAbs.toAbsolutePath().toString());
        body.put("samplePaths", sampleAbsPaths.stream()
                .map(p -> p.toAbsolutePath().toString())
                .toList());

        try {
            String raw = webClient.post()
                    .uri("/v1/compare")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block(Duration.ofSeconds(20));
            if (raw == null || raw.isBlank()) {
                return null;
            }
            JsonNode root = objectMapper.readTree(raw);
            if (!root.hasNonNull("fillPercent")) {
                return null;
            }
            double fill = root.path("fillPercent").asDouble();
            log.info("vision compare ok url={} fillPercent={} n={}",
                    baseUrl, fill, root.path("sampleCount").asInt());
            return fill;
        } catch (Exception e) {
            log.warn("vision compare 실패 url={}: {}", baseUrl, e.getMessage());
            return null;
        }
    }
}
