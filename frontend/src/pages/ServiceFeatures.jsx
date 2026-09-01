import { Box, Container, Paper, Stack, Typography } from "@mui/material";
import * as Icons from "@mui/icons-material";
import { meterColors } from "../theme/meterTheme";

const FEATURES = [
  {
    title: "사각지대 감시",
    desc: "D모듈·R모듈이 적재율을 산출해 MQTT로 전송합니다.",
    icon: <Icons.Sensors />,
  },
  {
    title: "통합 관제 대시보드",
    desc: "지도에서 모듈 위치·적재·신호를 실시간 확인합니다.",
    icon: <Icons.Dashboard />,
  },
  {
    title: "AI 챗봇 분석",
    desc: "현재 모듈 현황을 바탕으로 자연어로 물어봅니다.",
    icon: <Icons.SmartToy />,
  },
  {
    title: "AI 자원순환 안내",
    desc: "촬영으로 품목을 판별하고 인근 거점을 안내합니다.",
    icon: <Icons.PhotoCamera />,
  },
  {
    title: "최적 수거 경로",
    desc: "화면 안 모듈을 만재 우선으로 잇는 도로망 경로를 제안합니다.",
    icon: <Icons.Route />,
  },
  {
    title: "모듈 DB 조회",
    desc: "유형별 모듈 데이터를 투명하게 열람합니다.",
    icon: <Icons.Storage />,
  },
];

const TARGETS = [
  "지자체·공공기관·민간 운영사 등 시설 관리자",
  "시민 — 시설 위치 조회 및 AI 카메라·챗봇 이용",
];

export default function ServiceFeatures() {
  return (
    <Box sx={{ bgcolor: meterColors.bg, color: meterColors.primary, py: { xs: 3, sm: 5 } }}>
      <Container maxWidth="md">
        <Stack spacing={4} alignItems="center">
          <Stack spacing={1} textAlign="center">
            <Typography variant="h4" sx={{ fontWeight: 900 }}>핵심 기능</Typography>
            <Typography sx={{ color: meterColors.secondary, maxWidth: 520, mx: "auto", fontSize: "0.9rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              감시하고, 최적 경로로 수거하며, 카메라까지 이어지는 하나의 AIoT 플랫폼입니다.
            </Typography>
          </Stack>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5, width: "100%" }}>
            {FEATURES.map((f) => (
              <Paper key={f.title} sx={{ p: 2, bgcolor: meterColors.bgElevated, border: `1px solid ${meterColors.border}`, borderRadius: 2 }}>
                <Stack direction="row" spacing={1.2} alignItems="flex-start">
                  <Box sx={{ color: meterColors.primaryMuted, mt: 0.3 }}>{f.icon}</Box>
                  <Box>
                    <Typography sx={{ fontWeight: 800, mb: 0.4 }}>{f.title}</Typography>
                    <Typography sx={{ color: meterColors.secondary, fontSize: "0.85rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.desc}</Typography>
                  </Box>
                </Stack>
              </Paper>
            ))}
          </Box>

          <Paper sx={{ p: 2.5, width: "100%", bgcolor: meterColors.bgElevated, border: `1px solid ${meterColors.border}` }}>
            <Typography sx={{ fontWeight: 800, mb: 1.2 }}>타겟 사용자</Typography>
            {TARGETS.map((t) => (
              <Typography key={t} sx={{ color: meterColors.primaryMuted, fontSize: "0.88rem", mb: 0.6 }}>· {t}</Typography>
            ))}
          </Paper>

          <Typography sx={{ fontSize: "0.75rem", color: meterColors.secondary }}>
            호남권 ICT이노베이션스퀘어 빌드업캠프 2026 · METER Team
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}
