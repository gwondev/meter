package com.meter.backend.controller;

import com.meter.backend.service.GeoAnchorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

/**
 * 지도 화면이 올리는 사용자 현재 위치 — 새 모듈 자동 배치 기준점.
 */
@RestController
@RequestMapping("/api/geo")
@RequiredArgsConstructor
public class GeoController {

    private final GeoAnchorService geoAnchorService;

    @PostMapping("/anchor")
    public Map<String, Object> setAnchor(@RequestBody Map<String, Object> body) {
        Double lat = toDouble(body.get("lat"));
        Double lon = toDouble(body.get("lon"));
        if (lat == null || lon == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "lat/lon required");
        }
        geoAnchorService.update(lat, lon);
        return geoAnchorService.current();
    }

    @GetMapping("/anchor")
    public Map<String, Object> getAnchor() {
        return geoAnchorService.current();
    }

    private static Double toDouble(Object raw) {
        if (raw == null) return null;
        try {
            return Double.parseDouble(raw.toString().trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
