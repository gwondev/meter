import { Box, Chip, Stack, Typography } from "@mui/material";
import SensorsRoundedIcon from "@mui/icons-material/SensorsRounded";
import VideocamRoundedIcon from "@mui/icons-material/VideocamRounded";
import SpeedRoundedIcon from "@mui/icons-material/SpeedRounded";
import RadarRoundedIcon from "@mui/icons-material/RadarRounded";
import PowerRoundedIcon from "@mui/icons-material/PowerRounded";
import { keyframes } from "@emotion/react";
import { motion } from "framer-motion";
import FeaturePageShell, { IconTile } from "../../components/FeaturePageShell";
import { meterColors } from "../../theme/meterTheme";

const scanBeam = keyframes`
  0% { transform: translateY(-100%); opacity: 0; }
  50% { opacity: 0.8; }
  100% { transform: translateY(600%); opacity: 0; }
`;

const modules = [
  {
    tag: "D-MODULE",
    name: "초음파 적재 모듈",
    role: "함 내부 적재율을 보드에서 직접 산출",
    desc: "적재함 상부의 초음파 센서가 빈 거리를 재고, 보드가 fillPercent(0~100%)를 계산해 MQTT로 보냅니다.",
    icon: <SpeedRoundedIcon sx={{ fontSize: 30 }} />,
    badge: "ULTRASONIC",
    color: meterColors.pointPurple,
    metrics: [
      { label: "센서", val: "HC-SR04P", sub: "초음파 거리" },
      { label: "전송 주기", val: "30s", sub: "MQTT status" },
      { label: "산출", val: "보드", sub: "fillPercent" },
    ],
  },
  {
    tag: "R-MODULE",
    name: "카메라 구역 감시 모듈",
    role: "지정 구역 사진을 보내고 서버가 비교",
    desc: "R모듈은 JPEG만 전송합니다. 서버 vision이 원본(기준) 사진과 최근 샘플을 비교해 구역의 적재율을 산출합니다.",
    icon: <VideocamRoundedIcon sx={{ fontSize: 30 }} />,
    badge: "VISION CAM",
    color: meterColors.pointSky,
    metrics: [
      { label: "판정", val: "absdiff", sub: "원본 대비 변화" },
      { label: "샘플", val: "최대 10장", sub: "중앙값" },
      { label: "기종", val: "R2, R3", sub: "ESP32-CAM, Pi 5" },
    ],
  },
];

export default function IotIntegration() {
  return (
    <FeaturePageShell
      badge="SENSING HARDWARE"
      badgeIcon={<RadarRoundedIcon sx={{ fontSize: 16 }} />}
      icon={<SensorsRoundedIcon sx={{ fontSize: 30 }} />}
      iconColor={meterColors.pointPurple}
      title="사각지대 IoT 감시"
      description={
        <>
          초음파 기반{" "}
          <Box component="span" sx={{ color: meterColors.primary, fontWeight: 800 }}>
            D모듈
          </Box>
          은 함 속 적재량을, 카메라 기반{" "}
          <Box component="span" sx={{ color: meterColors.point, fontWeight: 800 }}>
            R모듈
          </Box>
          은 지정 구역의 변화를 감시해 같은 fillPercent 지표로 모읍니다.
        </>
      }
    >
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3.5 }}>
        {modules.map((m, idx) => (
          <Box
            key={m.tag}
            component={motion.div}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.15 }}
            whileHover={{ y: -6 }}
            sx={{
              p: { xs: 3, sm: 4 },
              borderRadius: "24px",
              border: "1px solid rgba(255,255,255,0.14)",
              background: "linear-gradient(160deg, rgba(28,28,28,0.9) 0%, rgba(6,6,6,0.95) 100%)",
              backdropFilter: "blur(16px)",
              position: "relative",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "0 20px 40px rgba(0,0,0,0.6), inset 0 0 20px rgba(255,255,255,0.03)",
              transition: "border-color 0.3s ease",
              "&:hover": { borderColor: "rgba(255,255,255,0.4)" },
            }}
          >
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "60px",
                background: "linear-gradient(180deg, rgba(255,255,255,0.08), transparent)",
                animation: `${scanBeam} 4s ease-in-out infinite`,
                animationDelay: `${idx * 1.2}s`,
                pointerEvents: "none",
              }}
            />

            <Stack spacing={3}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <IconTile size={54} color={m.color}>
                    {m.icon}
                  </IconTile>
                  <Stack spacing={0.3}>
                    <Typography sx={{ fontSize: "0.78rem", fontWeight: 900, color: meterColors.secondary, letterSpacing: "0.18em" }}>
                      {m.tag}
                    </Typography>
                    <Typography sx={{ fontSize: { xs: "1.15rem", sm: "1.35rem" }, fontWeight: 900, wordBreak: "keep-all" }}>
                      {m.name}
                    </Typography>
                  </Stack>
                </Stack>
                <Chip
                  label={m.badge}
                  size="small"
                  sx={{
                    bgcolor: "rgba(255,255,255,0.06)",
                    color: meterColors.primaryMuted,
                    border: "1px solid rgba(255,255,255,0.2)",
                    fontWeight: 800,
                    fontSize: "0.7rem",
                  }}
                />
              </Stack>

              <Typography sx={{ fontSize: "1rem", color: meterColors.point, fontWeight: 800, letterSpacing: "-0.01em", wordBreak: "keep-all" }}>
                {m.role}
              </Typography>

              <Typography sx={{ fontSize: "0.92rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.7, wordBreak: "keep-all" }}>
                {m.desc}
              </Typography>
            </Stack>

            <Box
              sx={{
                mt: 4,
                p: 2.2,
                borderRadius: "16px",
                bgcolor: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 2,
              }}
            >
              {m.metrics.map((metric) => (
                <Stack key={metric.label} spacing={0.3} sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>{metric.label}</Typography>
                  <Typography sx={{ fontSize: { xs: "0.95rem", sm: "1.1rem" }, fontWeight: 900, wordBreak: "keep-all" }}>
                    {metric.val}
                  </Typography>
                  <Typography sx={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", wordBreak: "keep-all" }}>{metric.sub}</Typography>
                </Stack>
              ))}
            </Box>
          </Box>
        ))}
      </Box>

      <Box
        component={motion.div}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        sx={{
          p: 3,
          borderRadius: "20px",
          border: "1px dashed rgba(255,255,255,0.3)",
          background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.01) 100%)",
          backdropFilter: "blur(14px)",
        }}
      >
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2.5} alignItems={{ xs: "flex-start", sm: "center" }}>
          <IconTile size={48} color={meterColors.pointAmber}>
            <PowerRoundedIcon sx={{ fontSize: 26 }} />
          </IconTile>
          <Stack spacing={0.5}>
            <Typography sx={{ fontSize: "1.1rem", fontWeight: 900, letterSpacing: "0.02em" }}>POWER TANK (전원 공급 장치)</Typography>
            <Typography sx={{ fontSize: "0.92rem", color: "rgba(255,255,255,0.75)", lineHeight: 1.6, wordBreak: "keep-all" }}>
              30000mAh 보조배터리와 상면 태양광 패널로 D, R모듈에 전원을 공급합니다. 서버와 통신하지 않는 전원 전용 장치입니다.
            </Typography>
          </Stack>
        </Stack>
      </Box>
    </FeaturePageShell>
  );
}
