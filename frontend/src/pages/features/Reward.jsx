import { Box, Stack, Typography } from "@mui/material";
import RouteRoundedIcon from "@mui/icons-material/RouteRounded";
import SpeedRoundedIcon from "@mui/icons-material/SpeedRounded";
import AltRouteRoundedIcon from "@mui/icons-material/AltRouteRounded";
import ChatRoundedIcon from "@mui/icons-material/ChatRounded";
import { motion } from "framer-motion";
import FeaturePageShell, { IconTile, SectionLabel } from "../../components/FeaturePageShell";
import { glassCardSx } from "../../components/featureStyles";
import { meterColors } from "../../theme/meterTheme";

const fillLevels = [
  { title: "여유", range: "0 – 49%", desc: "수거 불필요", color: meterColors.fillGreen },
  { title: "주의", range: "50 – 79%", desc: "상태 모니터링", color: meterColors.fillOrange },
  { title: "수거 필요", range: "80 – 100%", desc: "경로에 우선 배치", color: meterColors.fillRed },
];

const coreSystems = [
  {
    title: "만재 우선 방문",
    desc: "fillPercent가 높은 모듈일수록 가중치를 높여 먼저 방문하도록 순서를 정합니다.",
    icon: <SpeedRoundedIcon sx={{ fontSize: 24 }} />,
    color: meterColors.pointSky,
  },
  {
    title: "도로망 기반 경로",
    desc: "화면 안의 모듈을 도로망(OSRM) 기준으로 연결해 불필요한 순회를 줄입니다.",
    icon: <AltRouteRoundedIcon sx={{ fontSize: 24 }} />,
    color: meterColors.pointGreen,
  },
  {
    title: "자연어 운영 질의",
    desc: "적재율, 신호 상태, 모듈 현황을 AI 챗봇에 자연어로 물어볼 수 있습니다.",
    icon: <ChatRoundedIcon sx={{ fontSize: 24 }} />,
    color: meterColors.pointPurple,
  },
];

export default function Reward() {
  return (
    <FeaturePageShell
      badge="최적 수거 경로"
      badgeIcon={<RouteRoundedIcon sx={{ fontSize: 16 }} />}
      icon={<RouteRoundedIcon sx={{ fontSize: 28 }} />}
      iconColor={meterColors.pointGreen}
      title="데이터 분석 & 수거 동선"
      description={
        <>
          공통 지표인{" "}
          <Box component="span" sx={{ color: meterColors.point, fontWeight: 800 }}>
            fillPercent
          </Box>
          로 만재 모듈을 먼저 수거하고, 도로망 경로로 불필요한 순회를 줄입니다.
        </>
      }
    >
      <Stack spacing={2}>
        <SectionLabel>적재 단계 기준 (FILLPERCENT)</SectionLabel>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 2 }}>
          {fillLevels.map((lvl, idx) => (
            <Box
              key={lvl.title}
              component={motion.div}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ y: -3 }}
              sx={{ ...glassCardSx, p: 3 }}
            >
              <Stack spacing={1.5}>
                <Box sx={{ width: 36, height: 5, borderRadius: "3px", bgcolor: lvl.color, boxShadow: `0 0 10px ${lvl.color}88` }} />
                <Typography sx={{ fontSize: "1.2rem", fontWeight: 900 }}>{lvl.title}</Typography>
                <Typography sx={{ fontSize: "1.1rem", fontWeight: 900, color: meterColors.primaryMuted }}>{lvl.range}</Typography>
                <Typography sx={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)" }}>{lvl.desc}</Typography>
              </Stack>
            </Box>
          ))}
        </Box>
      </Stack>

      <Stack spacing={2}>
        <SectionLabel>핵심 운영 로직</SectionLabel>
        <Stack spacing={2}>
          {coreSystems.map((sys, idx) => (
            <Box
              key={sys.title}
              component={motion.div}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + idx * 0.1 }}
              whileHover={{ x: 4 }}
              sx={{ ...glassCardSx, p: 2.5 }}
            >
              <Stack direction="row" spacing={2.5} alignItems="center">
                <IconTile size={46} color={sys.color}>
                  {sys.icon}
                </IconTile>
                <Stack spacing={0.4}>
                  <Typography sx={{ fontSize: "1.1rem", fontWeight: 800 }}>{sys.title}</Typography>
                  <Typography sx={{ fontSize: "0.88rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.5, wordBreak: "keep-all" }}>
                    {sys.desc}
                  </Typography>
                </Stack>
              </Stack>
            </Box>
          ))}
        </Stack>
      </Stack>
    </FeaturePageShell>
  );
}
