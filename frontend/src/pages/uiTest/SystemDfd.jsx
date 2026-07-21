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
            신청서 기준 핵심 흐름은 <Box component="span" sx={{ color: meterColors.primaryMuted }}>초음파 적재 높이(heightCm) 측정 → MQTT → 서버 저장 → 웹 지도 표시</Box>
            입니다. IR·READY·CHECK 기반 투입 검증은 TRESS 프로토타입에서 이어받은 보조 경로이며, 현재 지도 「버리기」는 검증 없이 투입 횟수만 증가합니다.
          </Typography>
        </Stack>

        {/* IoT 핵심 흐름 */}
        <Box>
          <Typography sx={{ fontSize: "0.7rem", fontWeight: 800, color: meterColors.secondary, letterSpacing: "0.08em", mb: 1 }}>
            ① IoT · 적재량 (신청서 메인)
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} alignItems="center" spacing={{ xs: 0.5, sm: 1 }}>
            <DfdNode label="HC-SR04 센서" hint="초음파 거리" sx={{ flex: 1, width: "100%" }} />
            <DfdArrow />
            <DfdNode label="ESP32 모듈" hint="펌웨어 · LED" sx={{ flex: 1, width: "100%" }} />
            <DfdArrow label="MQTT" />
            <DfdNode label="Mosquitto" hint="Broker" sx={{ flex: 1, width: "100%" }} />
            <DfdArrow />
            <DfdNode label="Spring Boot" hint="HEIGHT 처리" sx={{ flex: 1, width: "100%" }} />
            <DfdArrow />
            <DfdNode label="MySQL" hint="Module.heightCm" sx={{ flex: 1, width: "100%" }} />
          </Stack>
          <Typography sx={{ fontSize: "0.68rem", color: meterColors.secondary, mt: 0.8, textAlign: "center" }}>
            HEARTBEAT(5분) · HEIGHT(1분) · heightCm ≤ 10cm → FULL
          </Typography>
        </Box>

        {/* Web 흐름 */}
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
              GET /modules → heightCm · lastHeartbeat → 지도 마커 · 적재 상태 · 최적경로
            </Typography>
          </Stack>
        </Box>

        {/* AI 흐름 */}
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

        {/* 보조 경로 */}
        <Box>
          <Typography sx={{ fontSize: "0.7rem", fontWeight: 800, color: meterColors.secondary, letterSpacing: "0.08em", mb: 1 }}>
            ④ 보조 · 프로토타입 (신청서 비포함)
          </Typography>
          <WireArea
            label="READY → CHECK 투입 검증 (레거시)"
            hint="IR 감지 · PENDING 기록 · /input 폴링 — 현재 지도 dispose는 검증 없이 카운트만 +1"
            height={56}
          />
        </Box>

        {/* Mermaid — 제안서용 */}
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
            데이터 흐름 요약 (신청서 p.13 기준 + 구현)
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
{`① 초음파 센서 → 적재 높이(cm) 측정
② ESP32 AIoT 모듈 → 데이터 수집
③ WiFi · MQTT → Mosquitto Broker
④ Spring Boot → 처리 · 저장
⑤ MySQL → Module.heightCm, lastHeartbeat
⑥ AI 분석 → 수거 우선순위 · 최적경로 · 챗봇
⑦ React 웹 → 지도 · DB · 대시보드
⑧ 사용자 · 관리자 서비스 제공

※ 투입 검증(IR/READY/CHECK)은 신청서 핵심 흐름이 아님
※ 운영 핵심 지표 = 적재 높이 + 연결 상태 + 수거 경로`}
          </Box>
        </Box>
      </Stack>
    </Box>
  );
}
