package com.meter.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

/**
 * 모듈2 스냅샷 이미지 저장 — 디스크에 쓰고 공개 URL 을 돌려준다.
 *
 * <p>모듈당 최근 {@code meter.upload.keep-per-module} 장만 남기고 오래된 파일은 삭제한다.
 * 5분 주기 업로드가 무한정 쌓이지 않게 하기 위함.
 */
@Service
@Slf4j
public class SnapshotStorageService {

    /** 공개 URL 접두어 — Cloudflare 가 /api/* 를 백엔드로 보내므로 터널 설정 변경이 필요 없다. */
    public static final String PUBLIC_PREFIX = "/api/uploads/";

    private static final List<String> ALLOWED_EXTENSIONS = List.of("jpg", "jpeg", "png", "webp");

    private final Path root;
    private final int keepPerModule;

    public SnapshotStorageService(
            @Value("${meter.upload.dir:/backend/uploads}") String uploadDir,
            @Value("${meter.upload.keep-per-module:50}") int keepPerModule
    ) {
        this.root = Paths.get(uploadDir).toAbsolutePath().normalize();
        this.keepPerModule = Math.max(1, keepPerModule);
    }

    /**
     * @return 저장된 이미지의 공개 URL (예: {@code /api/uploads/r1/1738400000000.jpg})
     */
    public String store(String serialNumber, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "image file is required");
        }

        String serial = safeSerial(serialNumber);
        String extension = resolveExtension(file.getOriginalFilename());

        try {
            Path moduleDir = root.resolve(serial);
            Files.createDirectories(moduleDir);

            String filename = System.currentTimeMillis() + "." + extension;
            Path target = moduleDir.resolve(filename);
            try (var in = file.getInputStream()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }

            pruneOldFiles(moduleDir);
            log.info("스냅샷 저장 serial={} file={} bytes={}", serial, filename, file.getSize());
            return PUBLIC_PREFIX + serial + "/" + filename;
        } catch (IOException e) {
            log.error("스냅샷 저장 실패 serial={}", serial, e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "failed to store snapshot");
        }
    }

    /** 디렉터리 traversal 과 예상 밖 문자를 막는다. 시리얼은 영숫자·하이픈·밑줄만 허용. */
    private static String safeSerial(String serialNumber) {
        String serial = serialNumber == null ? "" : serialNumber.trim();
        if (!serial.matches("[A-Za-z0-9_-]{1,50}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid serialNumber");
        }
        return serial;
    }

    private static String resolveExtension(String originalFilename) {
        if (originalFilename != null) {
            int dot = originalFilename.lastIndexOf('.');
            if (dot >= 0 && dot < originalFilename.length() - 1) {
                String ext = originalFilename.substring(dot + 1).toLowerCase(Locale.ROOT);
                if (ALLOWED_EXTENSIONS.contains(ext)) {
                    return ext;
                }
            }
        }
        return "jpg";
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
