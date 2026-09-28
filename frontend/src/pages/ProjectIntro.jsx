import { Box, Container, Stack, Typography } from "@mui/material";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import RouteRoundedIcon from "@mui/icons-material/RouteRounded";
import RecyclingRoundedIcon from "@mui/icons-material/RecyclingRounded";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import SpeedRoundedIcon from "@mui/icons-material/SpeedRounded";
import VideocamRoundedIcon from "@mui/icons-material/VideocamRounded";
import PowerRoundedIcon from "@mui/icons-material/PowerRounded";
import { motion } from "framer-motion";
import SectionHeading from "../components/SectionHeading";
import { IconTile, SectionLabel } from "../components/FeaturePageShell";
import { glassCardSx } from "../components/featureStyles";
import { meterColors } from "../theme/meterTheme";

const GOALS = [
  {
    title: "사각지대 감시",
    desc: "해안, 외곽 등 순회가 어려운 거점을 D, R모듈로 상시 확인",
    icon: <VisibilityRoundedIcon />,
    color: meterColors.pointPurple,
  },
  {
    title: "최적 수거",
    desc: "적재율 높은 거점부터 도로망 경로로 연결",
    icon: <RouteRoundedIcon />,
    color: meterColors.pointGreen,
  },
  {
    title: "자원순환 안내",
    desc: "AI 카메라로 품목 판별, 가까운 투입 거점 안내",
    icon: <RecyclingRoundedIcon />,
    color: meterColors.pointSky,
  },
  {
    title: "통합 관제",
    desc: "지도, 챗봇, 모듈 현황을 한곳에서",
    icon: <DashboardRoundedIcon />,
    color: meterColors.pointAmber,
  },
];

const KIT = [
  { tag: "D", name: "초음파 적재 모듈", desc: "함 속 적재율 산출, 30초 전송", icon: <SpeedRoundedIcon />, color: meterColors.pointPurple },
  { tag: "R", name: "카메라 구역 모듈", desc: "구역 사진 전송, 서버가 비교", icon: <VideocamRoundedIcon />, color: meterColors.pointSky },
  { tag: "P", name: "POWER TANK", desc: "보조배터리 + 태양광 전원", icon: <PowerRoundedIcon />, color: meterColors.pointAmber },
];

const TECH = [
  { label: "IoT", items: ["ESP32", "PlatformIO", "MQTT", "Raspberry Pi 5"] },
  { label: "Backend", items: ["Spring Boot", "MySQL", "FastAPI vision"] },
  { label: "Frontend", items: ["React", "Vite", "MUI", "Kakao Map"] },
  { label: "AI", items: ["Gemini Vision", "Gemini Chat"] },
  { label: "Infra", items: ["Docker", "Cloudflare Tunnel"] },
];

const chipSx = {
  fontSize: "0.72rem",
  px: 1,
  py: 0.3,
  borderRadius: "8px",
  border: "1px solid rgba(255,255,255,0.14)",
  bgcolor: "rgba(255,255,255,0.04)",
  color: meterColors.primaryMuted,
  whiteSpace: "nowrap",
};

export default function ProjectIntro() {
  return (
    <Box sx={{ bgcolor: meterColors.bg, color: meterColors.primary, py: { xs: 2.5, sm: 4 } }}>
      <Container maxWidth="lg">
        <Stack spacing={{ xs: 3, sm: 4 }}>
          <SectionHeading
            eyebrow="PROJECT"
            title="METER"
            description="사각지대 감시와 최적 수거를 잇는 자원순환 AIoT 플랫폼. 의류수거함, 쓰레기통, 폐의약품 수거함 등 다양한 거점으로 확장합니다."
          />

          <Stack spacing={1.5}>
            <SectionLabel>개발 목표</SectionLabel>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: { xs: 1.2, sm: 2 } }}>
              {GOALS.map((g, i) => (
                <Box
                  key={g.title}
                  component={motion.div}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  whileHover={{ y: -4 }}
                  sx={{ ...glassCardSx, p: { xs: 1.8, sm: 2.4 } }}
                >
                  <Stack spacing={1.2}>
                    <IconTile size={38} color={g.color}>
                      {g.icon}
                    </IconTile>
                    <Typography sx={{ fontWeight: 800, fontSize: { xs: "0.95rem", sm: "1.05rem" } }}>{g.title}</Typography>
                    <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: { xs: "0.76rem", sm: "0.84rem" }, lineHeight: 1.5, wordBreak: "keep-all" }}>
                      {g.desc}
                    </Typography>
                  </Stack>
                </Box>
              ))}
            </Box>
          </Stack>

          <Stack spacing={1.5}>
            <SectionLabel>하드웨어 키트</SectionLabel>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: { xs: 1.2, sm: 2 } }}>
              {KIT.map((k, i) => (
                <Box
                  key={k.tag}
                  component={motion.div}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  sx={{ ...glassCardSx, p: { xs: 1.6, sm: 2.2 } }}
                >
                  <Stack direction="row" spacing={1.6} alignItems="center">
                    <IconTile size={42} color={k.color}>
                      {k.icon}
                    </IconTile>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 800, fontSize: "0.98rem" }}>{k.name}</Typography>
                      <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8rem", wordBreak: "keep-all" }}>{k.desc}</Typography>
                    </Box>
                  </Stack>
                </Box>
              ))}
            </Box>
          </Stack>

          <Stack spacing={1.5}>
            <SectionLabel>기술 스택</SectionLabel>
            <Box sx={{ ...glassCardSx, p: { xs: 1.8, sm: 2.4 }, "&:hover": {} }}>
              <Stack spacing={1.2}>
                {TECH.map((t) => (
                  <Stack key={t.label} direction="row" spacing={1.5} alignItems="center">
                    <Typography sx={{ width: 72, flexShrink: 0, fontSize: "0.78rem", fontWeight: 800, color: meterColors.secondary, letterSpacing: "0.04em" }}>
                      {t.label}
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={0.7}>
                      {t.items.map((it) => (
                        <Box key={it} sx={chipSx}>
                          {it}
                        </Box>
                      ))}
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            </Box>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
