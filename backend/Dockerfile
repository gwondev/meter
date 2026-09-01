# 1단계: 빌드 환경
FROM eclipse-temurin:21-jdk-noble AS builder
#JDK 버전 21 UBUNTU 이미지 24.04(noble) 사용, JAMMY에서 변경합니다.

WORKDIR /backend
#컨테이너 내 생성되는 작업폴더, app이라고 해도 되나 backend가 더 명확

# Gradle 관련 파일 먼저 복사 (빌드 캐시 활용을 위해)
COPY gradlew .
COPY gradle gradle
COPY build.gradle .
COPY settings.gradle .

# 소스 코드 복사
COPY src src

# gradlew 실행 권한 부여 및 애플리케이션 빌드 (테스트 코드는 생략하여 속도 향상)
RUN chmod +x ./gradlew
RUN ./gradlew bootJar -x test


# 2단계: 실행 환경 (가벼운 JRE 환경 사용)
FROM eclipse-temurin:21-jre-noble
#JDK 대신 실행에만 필요한 JRE 버전 21 UBUNTU 이미지 24.04(noble) 사용

RUN apt-get update \
    && apt-get install -y --no-install-recommends fontconfig libfontconfig1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /backend
#컨테이너 내 생성되는 작업폴더, app이라고 해도 되나 backend가 더 명확

# 1단계(builder)에서 만들어진 jar 파일만 실행 환경으로 복사
COPY --from=builder /backend/build/libs/*.jar backend.jar
#호스트(빌드 단계)의 빌드된 jar파일을 컨테이너의 backend.jar로 복사

# 모듈2 스냅샷 저장 위치 — compose 의 backend_uploads 볼륨이 여기에 마운트된다
RUN mkdir -p /backend/uploads

EXPOSE 8080
#컨테이너가 8080포트를 사용한다고 명시

# last_signal_at 등 LocalDateTime 이 KST 기준으로 기록되도록 고정
ENV TZ=Asia/Seoul
ENV JAVA_TOOL_OPTIONS="-Djava.awt.headless=true -Duser.timezone=Asia/Seoul"
ENTRYPOINT ["java","-jar","backend.jar"]
#기존 CMD이나 ENTRYPOINT가 더 안전하다고 함
