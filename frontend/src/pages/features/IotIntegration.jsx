import { Box, Typography, Container, Stack, Button } from "@mui/material";
import DeviceHubRoundedIcon from "@mui/icons-material/DeviceHubRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { keyframes } from "@emotion/react";
import { meterColors } from "../../theme/meterTheme";

const ping = keyframes`
  0% { transform: scale(1); opacity: 0.5; }
  70% { transform: scale(1.15); opacity: 0; }
  100% { transform: scale(1.15); opacity: 0; }
`;

const bullets = [
  "ESP32 + 초음파 센서로 적재 높이를 1분 주기로 측정합니다.",
  "MQTT 토픽 meter/{serial}/status 로 5분 하트비트·적재량을 전송합니다.",
  "LED 임계값 10/30/50cm — 현장에서 적재 상태를 즉시 확인할 수 있습니다.",
];

const IotIntegration = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        bgcolor: meterColors.bg,
        color: meterColors.primary,
        display: "flex",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          bottom: "-25%",
          left: "-10%",
          width: 280,
          height: 280,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)",
          filter: "blur(36px)",
          pointerEvents: "none",
        }}
      />

      <Container maxWidth="sm" sx={{ position: "relative", zIndex: 1, py: 4 }}>
        <Stack
          spacing={3.5}
          alignItems="center"
          textAlign="center"
          component={motion.div}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <Box sx={{ position: "relative", width: 96, height: 96 }}>
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                borderRadius: "24px",
                border: `2px solid ${meterColors.borderStrong}`,
                animation: `${ping} 2.4s cubic-bezier(0,0,0.2,1) infinite`,
              }}
            />
            <motion.div
              animate={{ rotate: [0, 8, -8, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              style={{
                width: "100%",
                height: "100%",
                borderRadius: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(145deg, rgba(255,255,255,0.1), rgba(255,255,255,0.03))",
                border: `1px solid ${meterColors.border}`,
              }}
            >
              <DeviceHubRoundedIcon sx={{ fontSize: 48, color: meterColors.primary }} />
            </motion.div>
          </Box>

          <Stack spacing={0.75}>
            <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: "-0.02em" }}>
              IoT 모듈 연동
            </Typography>
            <Typography sx={{ color: meterColors.primaryMuted, fontWeight: 600, fontSize: "0.95rem" }}>
              ESP32 · 초음파 · MQTT
            </Typography>
          </Stack>

          <Typography
            sx={{
              color: meterColors.secondary,
              lineHeight: 1.75,
              wordBreak: "keep-all",
              maxWidth: 400,
            }}
          >
            탈부착형 AIoT 모듈이 현장 하드웨어와 METER 백엔드를 실시간으로 연결합니다.
          </Typography>

          <Stack spacing={1.2} sx={{ width: "100%", maxWidth: 420, textAlign: "left" }}>
            {bullets.map((text, i) => (
              <motion.div
                key={text}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.12 + i * 0.1, duration: 0.4 }}
              >
                <Box
                  sx={{
                    display: "flex",
                    gap: 1.25,
                    alignItems: "flex-start",
                    pl: 1,
                    borderLeft: `3px solid ${meterColors.borderStrong}`,
                    py: 0.25,
                  }}
                >
                  <Typography sx={{ color: meterColors.primaryMuted, fontSize: "0.92rem", lineHeight: 1.65 }}>
                    {text}
                  </Typography>
                </Box>
              </motion.div>
            ))}
          </Stack>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              startIcon={<ArrowBackRoundedIcon />}
              onClick={() => navigate("/")}
              sx={{
                mt: 1,
                color: meterColors.primary,
                border: `1px solid ${meterColors.border}`,
                borderRadius: 999,
                px: 4,
                py: 1.2,
                "&:hover": { borderColor: meterColors.borderStrong, bgcolor: "rgba(255,255,255,0.06)" },
              }}
            >
              돌아가기
            </Button>
          </motion.div>
        </Stack>
      </Container>
    </Box>
  );
};

export default IotIntegration;
