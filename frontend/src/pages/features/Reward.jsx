import { Box, Typography, Container, Stack, Button } from "@mui/material";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { keyframes } from "@emotion/react";
import { meterColors } from "../../theme/meterTheme";

const shine = keyframes`
  0% { background-position: -100% 0; }
  100% { background-position: 200% 0; }
`;

const bullets = [
  "적재량 추이를 분석해 수거 시점과 빈도를 예측합니다.",
  "지도 기반 최적 수거 동선을 제안해 운영 효율을 높입니다.",
  "Gemini 챗봇으로 모듈 상태·적재량·운영 인사이트를 질의합니다.",
];

const Reward = () => {
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
          top: "40%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 65%)",
          filter: "blur(50px)",
          pointerEvents: "none",
        }}
      />

      <Container maxWidth="sm" sx={{ position: "relative", zIndex: 1, py: 4 }}>
        <Stack
          spacing={3.5}
          alignItems="center"
          textAlign="center"
          component={motion.div}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            animate={{ rotateY: [0, 12, -12, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            style={{ perspective: 400 }}
          >
            <Box
              sx={{
                width: 88,
                height: 88,
                borderRadius: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: meterColors.primary,
                background: "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))",
                border: `1px solid ${meterColors.border}`,
                backgroundSize: "200% 100%",
                animation: `${shine} 4s linear infinite`,
              }}
            >
              <InsightsRoundedIcon sx={{ fontSize: 44 }} />
            </Box>
          </motion.div>

          <Stack spacing={0.75}>
            <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: "-0.02em" }}>
              데이터 분석 &amp; 인사이트
            </Typography>
            <Typography sx={{ color: meterColors.primaryMuted, fontWeight: 600, fontSize: "0.95rem" }}>
              적재량 예측 · 수거 동선 · AI 챗봇
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
            METER가 수집한 IoT 데이터를 분석해 수거·운영 의사결정을 지원합니다.
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

export default Reward;
