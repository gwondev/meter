import { Box, Stack, Typography } from "@mui/material";
import { meterColors } from "../../theme/meterTheme";
import { WireArea } from "./wireframes";

/** 추상 DFD 노드 */
function DfdNode({ label, hint, sx = {} }) {
  return (
    <Box
      sx={{
        border: `1.5px dashed ${meterColors.border}`,
        borderRadius: 2,
        px: 1.5,
        py: 1.2,
        textAlign: "center",
        bgcolor: "rgba(255,255,255,0.02)",
        ...sx,
      }}
    >
      <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: meterColors.primaryMuted }}>{label}</Typography>
      {hint && (
        <Typography sx={{ fontSize: "0.65rem", color: meterColors.secondary, mt: 0.4, lineHeight: 1.4 }}>{hint}</Typography>
      )}
    </Box>
  );
}

function DfdArrow({ label = "→" }) {
  return (
    <Typography sx={{ fontSize: "0.72rem", color: meterColors.secondary, textAlign: "center", py: 0.3, flexShrink: 0 }}>
      {label}
    </Typography>
  );
}

/** 전체 시스템 DFD — UI TEST 하단 */
export default function SystemDfd() {
  return (
    <Box
      sx={{
        borderTop: `1px solid ${meterColors.border}`,
        bgcolor: meterColors.bgElevated,
        px: { xs: 2, sm: 3 },
        py: 3,
      }}
    >
      <Stack spacing={2.5} sx={{ maxWidth: 900, mx: "auto" }}>
        <Stack spacing={0.8}>
          <Typography sx={{ fontWeight: 900, fontSize: "1.05rem" }}>전체 시스템 DFD (추상)</Typography>
          <Typography sx={{ fontSize: "0.82rem", color: meterColors.secondary, lineHeight: 1.65 }}>
            핵심 흐름은{" "}
            <Box component="span" sx={{ color: meterColors.primaryMuted }}>
              보드에서 fillPercent(0~100) 산출 → MQTT meter/&#123;serial&#125;/status → 서버 저장 → 웹 지도
            </Box>
            입니다. 상세는 docs/DEVICE_SPEC.txt.
          </Typography>
        </Stack>

        <Box>
          <Typography sx={{ fontSize: "0.7rem", fontWeight: 800, color: meterColors.secondary, letterSpacing: "0.08em", mb: 1 }}>
            ① D모듈 · 초음파 (구현 완료)
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} alignItems="center" spacing={{ xs: 0.5, sm: 1 }}>
            <DfdNode label="HC-SR04P" hint="빈 거리" sx={{ flex: 1, width: "100%" }} />
            <DfdArrow />
            <DfdNode label="ESP32 D모듈" hint="fill% 산출" sx={{ flex: 1, width: "100%" }} />
            <DfdArrow label="MQTT 30초" />
            <DfdNode label="Mosquitto" hint="Broker" sx={{ flex: 1, width: "100%" }} />
            <DfdArrow />
            <DfdNode label="Spring Boot" hint="status 구독" sx={{ flex: 1, width: "100%" }} />
            <DfdArrow />
            <DfdNode label="MySQL" hint="fillPercent" sx={{ flex: 1, width: "100%" }} />
          </Stack>
        </Box>

        <Box>
          <Typography sx={{ fontSize: "0.7rem", fontWeight: 800, color: meterColors.secondary, letterSpacing: "0.08em", mb: 1 }}>
            ①′ R모듈 · 카메라 (인수 예정)
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} alignItems="center" spacing={{ xs: 0.5, sm: 1 }}>
            <DfdNode label="CSI 카메라" hint="1분 촬영" sx={{ flex: 1, width: "100%" }} />
            <DfdArrow />
            <DfdNode label="RPi5 R모듈" hint="원본 비교 → fill%" sx={{ flex: 1, width: "100%" }} />
            <DfdArrow label="MQTT 5분" />
            <DfdNode label="Mosquitto" hint="fill%+JPEG" sx={{ flex: 1, width: "100%" }} />
            <DfdArrow />
            <DfdNode label="Spring Boot" hint="스냅샷 20장" sx={{ flex: 1, width: "100%" }} />
          </Stack>
        </Box>

        <Box>
          <Typography sx={{ fontSize: "0.7rem", fontWeight: 800, color: meterColors.secondary, letterSpacing: "0.08em", mb: 1 }}>
            ② Web · 사용자 서비스
          </Typography>
          <Stack spacing={1}>
            <Stack direction={{ xs: "column", sm: "row" }} alignItems="center" spacing={1}>
              <DfdNode label="사용자" hint="시민 · 관리자" sx={{ minWidth: 100 }} />
              <DfdArrow />
              <DfdNode label="React 웹" hint="Vite · MUI" sx={{ flex: 1, width: "100%" }} />
              <DfdArrow label="REST" />
              <DfdNode label="Spring Boot API" hint="인증 · 모듈 · AI" sx={{ flex: 1, width: "100%" }} />
            </Stack>
            <Stack direction="row" flexWrap="wrap" gap={1} justifyContent="center">
              <DfdNode label="Google OAuth" hint="로그인" sx={{ minWidth: 120 }} />
              <DfdNode label="Kakao Map" hint="지도 UI" sx={{ minWidth: 120 }} />
              <DfdNode label="Gemini API" hint="AI 카메라 · 챗봇" sx={{ minWidth: 120 }} />
            </Stack>
            <Typography sx={{ fontSize: "0.68rem", color: meterColors.secondary, textAlign: "center" }}>
              GET /modules → fillPercent · lastSignalAt · lastImageUrl → 지도 · 최적경로
            </Typography>
          </Stack>
        </Box>

        <Box>
          <Typography sx={{ fontSize: "0.7rem", fontWeight: 800, color: meterColors.secondary, letterSpacing: "0.08em", mb: 1 }}>
            ③ AI · 거점 안내
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} alignItems="center" spacing={1}>
            <DfdNode label="카메라 촬영" hint="이미지 업로드" sx={{ flex: 1, width: "100%" }} />
            <DfdArrow />
            <DfdNode label="Gemini Vision" hint="4종 유형 분류" sx={{ flex: 1, width: "100%" }} />
            <DfdArrow />
            <DfdNode label="지도 필터" hint="해당 모듈만 표시" sx={{ flex: 1, width: "100%" }} />
          </Stack>
        </Box>

        <Box>
          <Typography sx={{ fontSize: "0.7rem", fontWeight: 800, color: meterColors.secondary, letterSpacing: "0.08em", mb: 1 }}>
            ④ 보조 · 프로토타입
          </Typography>
          <WireArea
            label="READY → CHECK 투입 검증 (레거시)"
            hint="현재 지도 dispose는 검증 없이 카운트만 +1"
            height={56}
          />
        </Box>

        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            border: `1px solid ${meterColors.border}`,
            bgcolor: "rgba(0,0,0,0.25)",
            overflowX: "auto",
          }}
        >
          <Typography sx={{ fontSize: "0.68rem", color: meterColors.secondary, mb: 1, fontWeight: 700 }}>
            데이터 흐름 요약
          </Typography>
          <Box
            component="pre"
            sx={{
              m: 0,
              fontSize: "0.68rem",
              color: meterColors.primaryMuted,
              lineHeight: 1.55,
              fontFamily: "ui-monospace, monospace",
              whiteSpace: "pre-wrap",
            }}
          >
{`① D/R 보드 → fillPercent(0~100) 자체 산출
② MQTT meter/{serial}/status → Mosquitto
③ Spring Boot → Module.fillPercent (+ R lastImageUrl)
④ React → 지도 · 신호상태 · 최적경로 · R 최신 이미지
⑤ AI → 품목 분류 · 챗봇

※ 디바이스 HTTP / 토큰 없음
※ 운영 핵심 지표 = fillPercent + 신호 + 수거 경로`}
          </Box>
        </Box>
      </Stack>
    </Box>
  );
}
