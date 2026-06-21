import { Box, Typography, Container, Stack, Button } from "@mui/material";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { keyframes } from "@emotion/react";
import { meterColors } from "../../theme/meterTheme";

const scan = keyframes`
  0% { transform: translateX(-100%); opacity: 0; }
  15% { opacity: 0.4; }
  85% { opacity: 0.4; }
  100% { transform: translateX(100%); opacity: 0; }
`;

const bullets = [
  "의류·플라스틱·캔·폐의약품 모듈의 적재량을 실시간 모니터링합니다.",
  "지도에서 모듈 연결 상태와 최적 수거 동선을 한 화면에서 확인합니다.",
  "5분 하트비트·1분 높이 측정 데이터로 수거·운영 판단을 지원합니다.",
];

const OperationsHub = () => {
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
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "32px 32px",
          opacity: 0.35,
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
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
          <Box sx={{ position: "relative", width: 92, height: 92, borderRadius: "22px", overflow: "hidden" }}>
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
                animation: `${scan} 3.5s ease-in-out infinite`,
              }}
            />
            <Box
              sx={{
                width: "100%",
                height: "100%",
                borderRadius: "22px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: meterColors.primary,
                background: "linear-gradient(145deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02))",
                border: `1px solid ${meterColors.border}`,
              }}
            >
              <motion.div
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              >
                <DashboardRoundedIcon sx={{ fontSize: 46 }} />
              </motion.div>
            </Box>
          </Box>

          <Stack spacing={0.75}>
            <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: "-0.02em" }}>
              통합 관제 대시보드
            </Typography>
            <Typography sx={{ color: meterColors.primaryMuted, fontWeight: 600, fontSize: "0.95rem" }}>
              실시간 적재량 · 연결 상태 · 수거 동선
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
            분산된 AIoT 모듈 전체를 묶어 운영·수거 판단을 빠르게 내릴 수 있습니다.
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

export default OperationsHub;
