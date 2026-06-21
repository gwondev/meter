import { Box, Container, Paper, Stack, Typography } from "@mui/material";
import * as Icons from "@mui/icons-material";
import { meterColors } from "../theme/meterTheme";

const GOALS = [
  {
    title: "관리 사각지대 해소",
    desc: "의류수거함·폐의약품·쓰레기통 등 적재 자원의 상태를 데이터로 모니터링합니다.",
    icon: <Icons.Visibility />,
  },
  {
    title: "운영 효율 향상",
    desc: "정기 순회 대신 실시간 적재량 기반으로 필요한 시설만 우선 관리합니다.",
    icon: <Icons.Speed />,
  },
  {
    title: "최적 동선 지원",
    desc: "적재량이 높은 거점을 우선 파악하고 수거·점검 경로를 제안합니다.",
    icon: <Icons.Route />,
  },
  {
    title: "시민 접근성 강화",
    desc: "지도·AI 카메라로 시설 위치와 올바른 투입 거점을 안내합니다.",
    icon: <Icons.People />,
  },
];

const TECH = [
  "IoT: C/C++ (PlatformIO), ESP32, MQTT",
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
              범용 탈부착형 AIoT 모듈 기반 적재 자원 통합관리 플랫폼
            </Typography>
            <Typography sx={{ color: meterColors.secondary, fontSize: "0.85rem" }}>
              의류수거함 · 플라스틱·캔 쓰레기통 · 폐의약품 수거함 · 물탱크 등 확장 가능
            </Typography>
          </Stack>

          <Paper sx={{ p: 2.5, bgcolor: meterColors.bgElevated, border: `1px solid ${meterColors.border}` }}>
            <Typography sx={{ fontWeight: 800, mb: 1 }}>서비스 소개</Typography>
            <Typography sx={{ color: meterColors.primaryMuted, lineHeight: 1.75, fontSize: "0.92rem" }}>
              다양한 용기에 부착 가능한 범용 IoT 모듈과 통합 관제 플랫폼을 제공합니다.
              WiFi·LTE 하이브리드 통신으로 데이터를 수집하고, AI 분석으로 적재량 변화·수거 시기를 예측합니다.
              생성형 AI 챗봇과 AI 카메라로 운영 인사이트와 시민 참여형 자원순환 서비스를 지원합니다.
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
