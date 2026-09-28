import { Box, Container, Stack, Typography } from "@mui/material";
import SensorsRoundedIcon from "@mui/icons-material/SensorsRounded";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import SmartToyRoundedIcon from "@mui/icons-material/SmartToyRounded";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import RouteRoundedIcon from "@mui/icons-material/RouteRounded";
import StorageRoundedIcon from "@mui/icons-material/StorageRounded";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import PeopleRoundedIcon from "@mui/icons-material/PeopleRounded";
import { motion } from "framer-motion";
import SectionHeading from "../components/SectionHeading";
import { IconTile, SectionLabel } from "../components/FeaturePageShell";
import { glassCardSx } from "../components/featureStyles";
import { meterColors } from "../theme/meterTheme";

const FEATURES = [
  { title: "사각지대 감시", desc: "D, R모듈 적재율을 MQTT로 수집", icon: <SensorsRoundedIcon />, color: meterColors.pointPurple },
  { title: "통합 관제 지도", desc: "모듈 위치, 적재, 신호를 실시간 확인", icon: <DashboardRoundedIcon />, color: meterColors.pointAmber },
  { title: "AI 챗봇", desc: "모듈 현황을 자연어로 질의", icon: <SmartToyRoundedIcon />, color: meterColors.pointPurple },
  { title: "AI 자원순환 안내", desc: "촬영으로 품목 판별, 거점 안내", icon: <PhotoCameraRoundedIcon />, color: meterColors.pointSky },
  { title: "최적 수거 경로", desc: "만재 우선, 도로망 경로 제안", icon: <RouteRoundedIcon />, color: meterColors.pointGreen },
  { title: "모듈 DB 조회", desc: "유형별 모듈 데이터 열람", icon: <StorageRoundedIcon />, color: meterColors.pointSky },
];

const TARGETS = [
  { title: "시설 관리자", desc: "지자체, 공공기관, 민간 운영사", icon: <ApartmentRoundedIcon /> },
  { title: "시민", desc: "거점 위치 조회, AI 카메라, 챗봇 이용", icon: <PeopleRoundedIcon /> },
];

export default function ServiceFeatures() {
  return (
    <Box sx={{ bgcolor: meterColors.bg, color: meterColors.primary, py: { xs: 2.5, sm: 4 } }}>
      <Container maxWidth="lg">
        <Stack spacing={{ xs: 3, sm: 4 }}>
          <SectionHeading eyebrow="FEATURES" title="핵심 기능" description="감시하고, 최적 경로로 수거하고, 카메라로 안내까지 잇는 하나의 AIoT 플랫폼" />

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(3, 1fr)" }, gap: { xs: 1.2, sm: 2 } }}>
            {FEATURES.map((f, i) => (
              <Box
                key={f.title}
                component={motion.div}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ y: -4 }}
                sx={{ ...glassCardSx, p: { xs: 1.8, sm: 2.4 } }}
              >
                <Stack spacing={1.2}>
                  <IconTile size={38} color={f.color}>
                    {f.icon}
                  </IconTile>
                  <Typography sx={{ fontWeight: 800, fontSize: { xs: "0.92rem", sm: "1.05rem" } }}>{f.title}</Typography>
                  <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: { xs: "0.76rem", sm: "0.84rem" }, lineHeight: 1.5, wordBreak: "keep-all" }}>
                    {f.desc}
                  </Typography>
                </Stack>
              </Box>
            ))}
          </Box>

          <Stack spacing={1.5}>
            <SectionLabel>대상 사용자</SectionLabel>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: { xs: 1.2, sm: 2 } }}>
              {TARGETS.map((t, i) => (
                <Box
                  key={t.title}
                  component={motion.div}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.08 }}
                  sx={{ ...glassCardSx, p: { xs: 1.6, sm: 2.2 } }}
                >
                  <Stack direction="row" spacing={1.6} alignItems="center">
                    <IconTile size={42}>{t.icon}</IconTile>
                    <Box>
                      <Typography sx={{ fontWeight: 800, fontSize: "0.98rem" }}>{t.title}</Typography>
                      <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8rem", wordBreak: "keep-all" }}>{t.desc}</Typography>
                    </Box>
                  </Stack>
                </Box>
              ))}
            </Box>
          </Stack>

          <Typography sx={{ fontSize: "0.72rem", color: meterColors.secondary, textAlign: "center" }}>
            호남권 ICT이노베이션스퀘어 빌드업캠프 2026, METER Team
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}
