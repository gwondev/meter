package com.meter.backend.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class StartupDiagnostics {

    private final Environment environment;

    @Value("${google.client.id:}")
    private String googleClientId;

    public StartupDiagnostics(Environment environment) {
        this.environment = environment;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onReady() {
        log.info("METER backend ready on port {}", environment.getProperty("server.port", "8080"));
        log.info("DB url={}", environment.getProperty("spring.datasource.url"));
        log.info("DB username={}", environment.getProperty("spring.datasource.username"));
        log.info("google.client.id present={}", googleClientId != null && !googleClientId.isBlank());
        log.info("gemini.api.key present={}",
                environment.getProperty("gemini.api.key") != null
                        && !environment.getProperty("gemini.api.key").isBlank());
    }
}
