import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import MapRoundedIcon from "@mui/icons-material/MapRounded";
import NavigationRoundedIcon from "@mui/icons-material/NavigationRounded";
import SmartToyRoundedIcon from "@mui/icons-material/SmartToyRounded";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import SignalCellularConnectedNoInternet0BarRoundedIcon from "@mui/icons-material/SignalCellularConnectedNoInternet0BarRounded";
import { Box, Stack, Typography } from "@mui/material";
import { motion } from "framer-motion";
import FeaturePageShell, { IconTile } from "../../components/FeaturePageShell";
import { glassCardSx } from "../../components/featureStyles";
import { meterColors, WAITING_COLOR } from "../../theme/meterTheme";

const PANELS = [
  {
    title: "실시간 지도 관제",
    body: "모듈 위치, 적재율, 신호 상태, R모듈 최신 사진을 지도에서 한눈에 확인합니다.",
    icon: <MapRoundedIcon />,
  },
  {
    title: "최적 수거 경로",
    body: "화면 안의 모듈 방문 순서를 계산하고, 만재 모듈을 우선하는 도로망 경로를 그립니다.",
    icon: <NavigationRoundedIcon />,
  },
  {
    title: "대화형 AI 챗봇",
    body: "모듈 DB의 적재율과 신호 상태를 바탕으로 자연어 질문에 답합니다.",
    icon: <SmartToyRoundedIcon />,
  },
  {
    title: "관리자, MQTT 진단",
    body: "모듈, 사용자, 더미 데이터, R모듈 사진, MQTT 수신 상태를 한곳에서 관리합니다.",
    icon: <AdminPanelSettingsRoundedIcon />,
  },
];

export default function OperationsHub() {
  return (
    <FeaturePageShell
      badge="Web 통합 관제"
      badgeIcon={<DashboardRoundedIcon sx={{ fontSize: 16 }} />}
      icon={<DashboardRoundedIcon sx={{ fontSize: 30 }} />}
      title="통합 관제 플랫폼"
      description="지도, 모듈 적재 현황, R모듈 사진, 관리자 설정, MQTT 진단을 웹 한곳에서 운영합니다."
    >
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2.5 }}>
        {PANELS.map((panel, index) => (
          <Box
            key={panel.title}
            component={motion.div}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 + 0.2 }}
            whileHover={{ y: -4 }}
            sx={{
              ...glassCardSx,
              p: 3,
              minHeight: 160,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography
                sx={{
                  fontSize: "0.75rem",
                  letterSpacing: "0.14em",
                  fontWeight: 900,
                  color: index === 0 ? meterColors.point : meterColors.secondary,
                }}
              >
                PANEL 0{index + 1}
              </Typography>
              <IconTile size={40} point={index === 0}>
                {panel.icon}
              </IconTile>
            </Stack>
            <Box sx={{ mt: 2 }}>
              <Typography sx={{ fontWeight: 800, fontSize: "1.1rem" }}>{panel.title}</Typography>
              <Typography sx={{ mt: 0.8, color: "rgba(255,255,255,0.65)", fontSize: "0.88rem", lineHeight: 1.6, wordBreak: "keep-all" }}>
                {panel.body}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      <Box
        component={motion.div}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        sx={{
          p: 2.5,
          borderRadius: "16px",
          border: "1px solid rgba(255,255,255,0.1)",
          borderLeft: `4px solid ${WAITING_COLOR}`,
          bgcolor: "rgba(255,255,255,0.03)",
          display: "flex",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Box sx={{ p: 1, borderRadius: "10px", bgcolor: "rgba(255,255,255,0.06)", color: meterColors.primaryMuted, display: "flex" }}>
          <SignalCellularConnectedNoInternet0BarRoundedIcon />
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: "0.95rem" }}>무신호 모듈 처리</Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem", mt: 0.3, lineHeight: 1.5, wordBreak: "keep-all" }}>
            신호가 끊긴 모듈은 회색 대기 상태로 내려, 마지막 측정값이 살아있는 것처럼 보이지 않게 합니다.
          </Typography>
        </Box>
      </Box>
    </FeaturePageShell>
  );
}
