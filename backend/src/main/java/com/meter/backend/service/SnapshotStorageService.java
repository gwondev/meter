package com.meter.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

/**
 * R모듈 스냅샷 저장 — MQTT로 받은 바이트를 디스크에 쓰고 공개 URL을 돌려준다.
 *
 * <p>모듈당 최근 {@code meter.upload.keep-per-module} 장만 남긴다 (기본 20).
 */
@Service
@Slf4j
public class SnapshotStorageService {

    /** 공개 URL 접두어 — Cloudflare 가 /api/* 를 백엔드로 보낸다. */
    public static final String PUBLIC_PREFIX = "/api/uploads/";

    private static final List<String> ALLOWED_EXTENSIONS = List.of("jpg", "jpeg", "png", "webp");

    private final Path root;
    private final int keepPerModule;

    public SnapshotStorageService(
            @Value("${meter.upload.dir:/backend/uploads}") String uploadDir,
            @Value("${meter.upload.keep-per-module:20}") int keepPerModule
    ) {
        this.root = Paths.get(uploadDir).toAbsolutePath().normalize();
        this.keepPerModule = Math.max(1, keepPerModule);
    }

    /**
     * MQTT 등에서 받은 바이트 배열 저장.
     *
     * @return 공개 URL (예: {@code /api/uploads/r1/1738400000000.jpg})
     */
    public String storeBytes(String serialNumber, byte[] bytes, String extensionHint) {
        if (bytes == null || bytes.length == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "image bytes empty");
        }

        String serial = safeSerial(serialNumber);
        String extension = normalizeExtension(extensionHint);

        try {
            Path moduleDir = root.resolve(serial);
            Files.createDirectories(moduleDir);

            String filename = System.currentTimeMillis() + "." + extension;
            Path target = moduleDir.resolve(filename);
            Files.write(target, bytes);

            pruneOldFiles(moduleDir);
            log.info("스냅샷 저장 serial={} file={} bytes={}", serial, filename, bytes.length);
            return PUBLIC_PREFIX + serial + "/" + filename;
        } catch (IOException e) {
            log.error("스냅샷 저장 실패 serial={}", serial, e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "failed to store snapshot");
        }
    }

    private static String normalizeExtension(String hint) {
        if (hint == null || hint.isBlank()) {
            return "jpg";
        }
        String ext = hint.trim().toLowerCase(Locale.ROOT);
        if (ext.startsWith(".")) {
            ext = ext.substring(1);
        }
        if ("jpeg".equals(ext)) {
            ext = "jpg";
        }
        return ALLOWED_EXTENSIONS.contains(ext) ? ext : "jpg";
    }

    /** 디렉터리 traversal 과 예상 밖 문자를 막는다. 시리얼은 영숫자·하이픈·밑줄만 허용. */
    private static String safeSerial(String serialNumber) {
        String serial = serialNumber == null ? "" : serialNumber.trim();
        if (!serial.matches("[A-Za-z0-9_-]{1,50}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid serialNumber");
        }
        return serial;
    }

    private void pruneOldFiles(Path moduleDir) throws IOException {
        try (var stream = Files.list(moduleDir)) {
            List<Path> files = stream
                    .filter(Files::isRegularFile)
                    .sorted(Comparator.comparing((Path p) -> p.getFileName().toString()).reversed())
                    .toList();

            for (int i = keepPerModule; i < files.size(); i++) {
                Files.deleteIfExists(files.get(i));
            }
        }
    }
}
