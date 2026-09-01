package com.meter.backend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * IoT 디바이스(모듈2 라즈베리파이 등) 전용 정적 토큰 검증 — {@code /api/device/**}.
 *
 * <p>브라우저 세션이 없는 머신 대 머신 경로이므로 Google OAuth 대신 사전 공유 토큰을 사용한다.
 * 토큰이 비어 있으면 통과시키지 않고 차단한다(fail-closed) — 설정 누락이 곧 무인증 개방이 되지 않도록.
 */
@Slf4j
public class DeviceTokenFilter extends OncePerRequestFilter {

    /** 디바이스가 토큰을 실어 보내는 헤더. Authorization: Bearer 도 함께 허용한다. */
    public static final String HEADER = "X-METER-DEVICE-TOKEN";

    private static final String PROTECTED_PREFIX = "/api/device/";
    private static final String BEARER = "Bearer ";

    private final byte[] expected;

    public DeviceTokenFilter(String token) {
        this.expected = token == null ? new byte[0] : token.trim().getBytes(StandardCharsets.UTF_8);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith(PROTECTED_PREFIX);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        if (expected.length == 0) {
            log.error("meter.device.token 미설정 — device API 차단 path={}", request.getRequestURI());
            reject(response, HttpStatus.SERVICE_UNAVAILABLE, "device token is not configured");
            return;
        }

        if (!MessageDigest.isEqual(expected, presented(request))) {
            log.warn("device token 불일치 path={} remoteAddr={}", request.getRequestURI(), request.getRemoteAddr());
            reject(response, HttpStatus.UNAUTHORIZED, "invalid device token");
            return;
        }

        chain.doFilter(request, response);
    }

    private static byte[] presented(HttpServletRequest request) {
        String value = request.getHeader(HEADER);
        if (value == null || value.isBlank()) {
            String authorization = request.getHeader(HttpHeaders.AUTHORIZATION);
            if (authorization != null && authorization.regionMatches(true, 0, BEARER, 0, BEARER.length())) {
                value = authorization.substring(BEARER.length());
            }
        }
        return value == null ? new byte[0] : value.trim().getBytes(StandardCharsets.UTF_8);
    }

    private static void reject(HttpServletResponse response, HttpStatus status, String detail) throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.getWriter().write(
                "{\"title\":\"" + status.getReasonPhrase() + "\",\"status\":" + status.value()
                        + ",\"detail\":\"" + detail + "\"}");
    }
}
