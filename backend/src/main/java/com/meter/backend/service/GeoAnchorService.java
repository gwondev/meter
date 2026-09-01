package com.meter.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicReference;

/**
 * 새 모듈 자동 등록 시 LAT/LON 기준점.
 *
 * <p>지도 화면이 주기적으로 업로드한 «사용자 현재 위치»를 보관한다.
 * MQTT 로 처음 들어온 시리얼은 이 기준점 기준 50m 반경 랜덤 좌표를 받는다.
 * 기준점이 없으면 기본 좌표(광주)를 쓴다.
 */
@Service
@Slf4j
public class GeoAnchorService {

    /** 기준점 없을 때 fallback (광주 일대) */
    private static final double FALLBACK_LAT = 35.1462;
    private static final double FALLBACK_LON = 126.9229;
    private static final double RADIUS_METERS = 50.0;

    private final AtomicReference<double[]> anchor = new AtomicReference<>();

    public void update(double lat, double lon) {
        if (Double.isNaN(lat) || Double.isNaN(lon)) {
            return;
        }
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            return;
        }
        anchor.set(new double[]{lat, lon});
    }

    public Map<String, Object> current() {
        double[] a = anchor.get();
        Map<String, Object> m = new LinkedHashMap<>();
        if (a == null) {
            m.put("lat", FALLBACK_LAT);
            m.put("lon", FALLBACK_LON);
            m.put("source", "fallback");
            return m;
        }
        m.put("lat", a[0]);
        m.put("lon", a[1]);
        m.put("source", "user");
        return m;
    }

    /** 기준점 기준 0~50m 원 안 랜덤 좌표 [lat, lon]. */
    public double[] randomNearAnchor() {
        double[] a = anchor.get();
        double baseLat = a != null ? a[0] : FALLBACK_LAT;
        double baseLon = a != null ? a[1] : FALLBACK_LON;
        return randomWithinMeters(baseLat, baseLon, RADIUS_METERS);
    }

    static double[] randomWithinMeters(double lat, double lon, double radiusMeters) {
        ThreadLocalRandom rng = ThreadLocalRandom.current();
        double distance = Math.sqrt(rng.nextDouble()) * radiusMeters; // 면적 균등
        double bearing = rng.nextDouble() * 2 * Math.PI;

        double latRad = Math.toRadians(lat);
        double lonRad = Math.toRadians(lon);
        double angDist = distance / 6_371_000.0; // 지구 반경(m)

        double newLat = Math.asin(
                Math.sin(latRad) * Math.cos(angDist)
                        + Math.cos(latRad) * Math.sin(angDist) * Math.cos(bearing));
        double newLon = lonRad + Math.atan2(
                Math.sin(bearing) * Math.sin(angDist) * Math.cos(latRad),
                Math.cos(angDist) - Math.sin(latRad) * Math.sin(newLat));

        return new double[]{
                Math.toDegrees(newLat),
                Math.toDegrees(newLon)
        };
    }
}
