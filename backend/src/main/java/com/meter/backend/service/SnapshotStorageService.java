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
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Stream;

/**
 * R모듈 이미지 저장.
 * <ul>
 *   <li>{@code baseline.jpg} — 원본(빈 상태)</li>
 *   <li>{@code samples/} — 비교 큐 최근 N장 (기본 10)</li>
 *   <li>{@code trash/} — 큐에서 밀린 사진 임시 보관 (기본 20) 후 삭제</li>
 * </ul>
 */
@Service
@Slf4j
public class SnapshotStorageService {

    public static final String PUBLIC_PREFIX = "/api/uploads/";
    public static final String BASELINE_NAME = "baseline.jpg";
    public static final String SAMPLES_DIR = "samples";
    public static final String TRASH_DIR = "trash";

    private static final List<String> ALLOWED_EXTENSIONS = List.of("jpg", "jpeg", "png", "webp");

    private final Path root;
    private final int keepPerModule;
    private final int trashKeep;

    public SnapshotStorageService(
            @Value("${meter.upload.dir:/backend/uploads}") String uploadDir,
            @Value("${meter.upload.keep-per-module:10}") int keepPerModule,
            @Value("${meter.upload.trash-keep-per-module:20}") int trashKeep
    ) {
        this.root = Paths.get(uploadDir).toAbsolutePath().normalize();
        this.keepPerModule = Math.max(1, keepPerModule);
        this.trashKeep = Math.max(0, trashKeep);
    }

    public Path getRoot() {
        return root;
    }

    public String storeBaseline(String serialNumber, byte[] bytes, String extensionHint) {
        String serial = safeSerial(serialNumber);
        try {
            Path moduleDir = root.resolve(serial);
            Files.createDirectories(moduleDir);
            Path target = moduleDir.resolve(BASELINE_NAME);
            Files.write(target, bytes == null ? new byte[0] : bytes);
            log.info("원본(baseline) 저장 serial={} bytes={}", serial, bytes == null ? 0 : bytes.length);
            return publicUrl(serial, BASELINE_NAME);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "failed to store baseline");
        }
    }

    public String storeSample(String serialNumber, byte[] bytes, String extensionHint) {
        String serial = safeSerial(serialNumber);
        String extension = normalizeExtension(extensionHint);
        try {
            Path samplesDir = root.resolve(serial).resolve(SAMPLES_DIR);
            Files.createDirectories(samplesDir);
            String filename = System.currentTimeMillis() + "." + extension;
            Path target = samplesDir.resolve(filename);
            Files.write(target, bytes);
            pruneSamplesToTrash(serial);
            log.info("샘플 저장 serial={} file={} bytes={}", serial, filename, bytes.length);
            return publicUrl(serial, SAMPLES_DIR + "/" + filename);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "failed to store sample");
        }
    }

    public String storeBytes(String serialNumber, byte[] bytes, String extensionHint) {
        return storeSample(serialNumber, bytes, extensionHint);
    }

    public boolean hasBaseline(String serialNumber) {
        return Files.isRegularFile(baselineAbsolutePath(serialNumber));
    }

    public Path baselineAbsolutePath(String serialNumber) {
        return root.resolve(safeSerial(serialNumber)).resolve(BASELINE_NAME);
    }

    public List<Path> listSampleAbsolutePaths(String serialNumber) {
        return listFilesNewestFirst(root.resolve(safeSerial(serialNumber)).resolve(SAMPLES_DIR))
                .stream()
                .sorted(Comparator.comparing(p -> p.getFileName().toString()))
                .toList();
    }

    /** 관리자 UI용 전체 스냅샷 메타. */
    public Map<String, Object> describe(String serialNumber) {
        String serial = safeSerial(serialNumber);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("serialNumber", serial);
        boolean hasBase = hasBaseline(serial);
        out.put("baseline", hasBase ? Map.of(
                "name", BASELINE_NAME,
                "url", publicUrl(serial, BASELINE_NAME),
                "bytes", fileSize(baselineAbsolutePath(serial))
        ) : null);

        List<Map<String, Object>> samples = new ArrayList<>();
        for (Path p : listFilesNewestFirst(root.resolve(serial).resolve(SAMPLES_DIR))) {
            samples.add(fileMeta(serial, SAMPLES_DIR + "/" + p.getFileName()));
        }
        out.put("samples", samples);
        out.put("sampleKeep", keepPerModule);

        List<Map<String, Object>> trash = new ArrayList<>();
        for (Path p : listFilesNewestFirst(root.resolve(serial).resolve(TRASH_DIR))) {
            trash.add(fileMeta(serial, TRASH_DIR + "/" + p.getFileName()));
        }
        out.put("trash", trash);
        out.put("trashKeep", trashKeep);
        return out;
    }

    /** 휴지통 → 샘플 큐로 복원 (큐가 가득하면 가장 오래된 샘플이 다시 trash로). */
    public String restoreFromTrash(String serialNumber, String trashFileName) {
        String serial = safeSerial(serialNumber);
        Path src = root.resolve(serial).resolve(TRASH_DIR).resolve(safeFileName(trashFileName));
        if (!Files.isRegularFile(src)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "trash file not found");
        }
        try {
            Path samplesDir = root.resolve(serial).resolve(SAMPLES_DIR);
            Files.createDirectories(samplesDir);
            Path dest = samplesDir.resolve(src.getFileName().toString());
            Files.move(src, dest, StandardCopyOption.REPLACE_EXISTING);
            pruneSamplesToTrash(serial);
            return publicUrl(serial, SAMPLES_DIR + "/" + dest.getFileName());
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "restore failed");
        }
    }

    public void deleteManagedFile(String serialNumber, String relativePath) {
        Path src = resolveSafe(safeSerial(serialNumber), relativePath);
        try {
            Files.deleteIfExists(src);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "delete failed");
        }
    }

    private void pruneSamplesToTrash(String serial) throws IOException {
        Path samplesDir = root.resolve(serial).resolve(SAMPLES_DIR);
        Path trashDir = root.resolve(serial).resolve(TRASH_DIR);
        Files.createDirectories(trashDir);

        List<Path> files = listFilesNewestFirst(samplesDir);
        for (int i = keepPerModule; i < files.size(); i++) {
            Path old = files.get(i);
            Path dest = trashDir.resolve(old.getFileName().toString());
            Files.move(old, dest, StandardCopyOption.REPLACE_EXISTING);
            log.info("샘플→휴지통 serial={} file={}", serial, old.getFileName());
        }
        pruneTrash(serial);
    }

    private void pruneTrash(String serial) throws IOException {
        Path trashDir = root.resolve(serial).resolve(TRASH_DIR);
        List<Path> files = listFilesNewestFirst(trashDir);
        for (int i = trashKeep; i < files.size(); i++) {
            Files.deleteIfExists(files.get(i));
            log.info("휴지통 영구삭제 serial={} file={}", serial, files.get(i).getFileName());
        }
    }

    private List<Path> listFilesNewestFirst(Path dir) {
        if (!Files.isDirectory(dir)) {
            return List.of();
        }
        try (Stream<Path> stream = Files.list(dir)) {
            return stream
                    .filter(Files::isRegularFile)
                    .sorted(Comparator.comparing((Path p) -> p.getFileName().toString()).reversed())
                    .toList();
        } catch (IOException e) {
            return List.of();
        }
    }

    private Map<String, Object> fileMeta(String serial, String relative) {
        Path abs = root.resolve(serial).resolve(relative.replace("/", java.io.File.separator));
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("name", Paths.get(relative).getFileName().toString());
        m.put("path", relative);
        m.put("url", publicUrl(serial, relative.replace('\\', '/')));
        m.put("bytes", fileSize(abs));
        return m;
    }

    private static long fileSize(Path p) {
        try {
            return Files.size(p);
        } catch (IOException e) {
            return 0L;
        }
    }

    private Path resolveSafe(String serial, String relativePath) {
        if (relativePath == null || relativePath.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "path required");
        }
        String rel = relativePath.replace('\\', '/').replaceAll("^/+", "");
        if (rel.contains("..") || rel.startsWith("/")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid path");
        }
        if (!(BASELINE_NAME.equals(rel)
                || rel.startsWith(SAMPLES_DIR + "/")
                || rel.startsWith(TRASH_DIR + "/"))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "path not allowed");
        }
        Path resolved = root.resolve(serial).resolve(rel).normalize();
        if (!resolved.startsWith(root.resolve(serial).normalize())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "path escape");
        }
        return resolved;
    }

    private static String safeFileName(String name) {
        String n = name == null ? "" : name.trim();
        if (!n.matches("[A-Za-z0-9._-]{1,80}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid file name");
        }
        return n;
    }

    private static String publicUrl(String serial, String relative) {
        return PUBLIC_PREFIX + serial + "/" + relative.replace('\\', '/');
    }

    private static String normalizeExtension(String hint) {
        if (hint == null || hint.isBlank()) return "jpg";
        String ext = hint.trim().toLowerCase(Locale.ROOT);
        if (ext.startsWith(".")) ext = ext.substring(1);
        if ("jpeg".equals(ext)) ext = "jpg";
        return ALLOWED_EXTENSIONS.contains(ext) ? ext : "jpg";
    }

    private static String safeSerial(String serialNumber) {
        String serial = serialNumber == null ? "" : serialNumber.trim();
        if (!serial.matches("[A-Za-z0-9_-]{1,50}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid serialNumber");
        }
        return serial;
    }
}
