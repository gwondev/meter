import { Box, Container, Paper, Stack, Typography } from "@mui/material";
import * as Icons from "@mui/icons-material";
import { meterColors } from "../theme/meterTheme";

const GOALS = [
  {
    title: "사각지대 감시",
    desc: "해안·외곽 등 순회가 어려운 거점을 D모듈·R모듈 데이터로 상시 확인합니다.",
    icon: <Icons.Visibility />,
  },
  {
    title: "최적 수거",
    desc: "적재율이 높은 거점부터 도로망 경로로 이어 불필요한 순회를 줄입니다.",
    icon: <Icons.Route />,
  },
  {
    title: "자원순환 안내",
    desc: "AI 카메라로 품목을 판별하고 가까운 투입 거점 위치를 안내합니다.",
    icon: <Icons.Recycling />,
  },
  {
    title: "통합 관제",
    desc: "지도·챗봇·모듈 현황을 한곳에서 보고 운영 판단을 돕습니다.",
    icon: <Icons.Dashboard />,
  },
];

const TECH = [
  "IoT: C/C++ (PlatformIO), ESP32, MQTT · RPi 카메라",
  "Backend: Spring Boot, MySQL",
  "Frontend: React (Vite)",
  "AI: Gemini API (Vision + Chat)",
  "Infra: Docker, Cloudflare Tunnel",
];

export default function ProjectIntro() {
  return (
    <Box sx={{ bgcolor: meterColors.bg, color: meterColors.primary, py: { xs: 3, sm: 5 } }}>
      <Container maxWidth="md">
        <Stack spacing={4}>
          <Stack spacing={1} textAlign="center" alignItems="center">
            <Box component="img" src="/meter-logo.png" alt="METER" sx={{ width: 56, height: 56, mixBlendMode: "screen" }} />
            <Typography variant="h4" sx={{ fontWeight: 900 }}>METER</Typography>
            <Typography sx={{ color: meterColors.secondary, lineHeight: 1.7, maxWidth: 560 }}>
              사각지대 감시와 최적 수거를 잇는 자원순환 AIoT 플랫폼
            </Typography>
            <Typography sx={{ color: meterColors.secondary, fontSize: "0.85rem" }}>
              의류수거함 · 플라스틱·캔 쓰레기통 · 폐의약품 수거함 · 물탱크 등 확장 가능
            </Typography>
          </Stack>

          <Paper sx={{ p: 2.5, bgcolor: meterColors.bgElevated, border: `1px solid ${meterColors.border}` }}>
            <Typography sx={{ fontWeight: 800, mb: 1 }}>서비스 소개</Typography>
            <Typography sx={{ color: meterColors.primaryMuted, lineHeight: 1.75, fontSize: "0.92rem" }}>
              다양한 거점에 D모듈(초음파)과 R모듈(카메라)을 두고 사각지대를 감시하며,
              지도에서 상태를 확인한 뒤 최적 수거 경로로 이어 줍니다.
              AI로 자원순환 안내(품목·거점)까지 하나의 플랫폼에서 제공합니다.
            </Typography>
          </Paper>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
            {GOALS.map((g) => (
              <Paper key={g.title} sx={{ p: 2, bgcolor: meterColors.bgElevated, border: `1px solid ${meterColors.border}` }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.8 }}>
                  <Box sx={{ color: meterColors.primaryMuted }}>{g.icon}</Box>
                  <Typography sx={{ fontWeight: 800 }}>{g.title}</Typography>
                </Stack>
                <Typography sx={{ color: meterColors.secondary, fontSize: "0.85rem", lineHeight: 1.6 }}>{g.desc}</Typography>
              </Paper>
            ))}
          </Box>

          <Paper sx={{ p: 2, bgcolor: meterColors.bgElevated, border: `1px solid ${meterColors.border}` }}>
            <Typography sx={{ fontWeight: 800, mb: 1 }}>기술 스택</Typography>
            {TECH.map((t) => (
              <Typography key={t} sx={{ color: meterColors.primaryMuted, fontSize: "0.85rem", mb: 0.4 }}>· {t}</Typography>
            ))}
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}
