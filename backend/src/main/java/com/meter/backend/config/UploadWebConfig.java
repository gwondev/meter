package com.meter.backend.config;

import com.meter.backend.service.SnapshotStorageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

/**
 * 모듈2 스냅샷을 {@code /api/uploads/**} 로 정적 서빙한다.
 * 저장 디렉터리는 컨테이너 볼륨이므로 재배포에도 유지된다.
 */
@Configuration
public class UploadWebConfig implements WebMvcConfigurer {

    private final String uploadDir;

    public UploadWebConfig(@Value("${meter.upload.dir:/backend/uploads}") String uploadDir) {
        this.uploadDir = uploadDir;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = Paths.get(uploadDir).toAbsolutePath().normalize().toUri().toString();
        registry.addResourceHandler(SnapshotStorageService.PUBLIC_PREFIX + "**")
                .addResourceLocations(location)
                .setCachePeriod(300);
    }
}
