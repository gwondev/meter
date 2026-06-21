import { Box, Typography, Container, Stack, Button } from "@mui/material";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { keyframes } from "@emotion/react";
import { meterColors } from "../../theme/meterTheme";

const glow = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.2); }
  50% { box-shadow: 0 0 28px 6px rgba(255,255,255,0.08); }
`;

const bullets = [
  "AI 카메라로 배출물 종류를 인식하고 올바른 투입 방법을 안내합니다.",
  "의류수거함·플라스틱·캔·폐의약품 등 모듈 유형에 맞는 배출 가이드를 제공합니다.",
  "지도와 연동해 가까운 수거 모듈 위치와 적재 상태를 함께 확인합니다.",
];

const SmartDisposal = () => {
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
          top: "-20%",
          right: "-15%",
          width: 320,
          height: 320,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)",
          filter: "blur(40px)",
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
          <Box
            component="img"
            src="/meter-logo.png"
            alt="METER"
            sx={{ width: 48, height: 48, objectFit: "contain", opacity: 0.9 }}
          />

          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
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
                background: "linear-gradient(145deg, rgba(255,255,255,0.1), rgba(255,255,255,0.03))",
                border: `1px solid ${meterColors.border}`,
                animation: `${glow} 3s ease-in-out infinite`,
              }}
            >
              <PhotoCameraRoundedIcon sx={{ fontSize: 44 }} />
            </Box>
          </motion.div>

          <Stack spacing={0.75}>
            <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: "-0.02em" }}>
              AI 카메라 배출 안내
            </Typography>
            <Typography sx={{ color: meterColors.primaryMuted, fontWeight: 600, fontSize: "0.95rem" }}>
              Gemini Vision · 모듈별 가이드
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
            METER 플랫폼의 AI 카메라가 촬영부터 올바른 배출까지 한 흐름으로 안내합니다.
          </Typography>

          <Stack spacing={1.2} sx={{ width: "100%", maxWidth: 420, textAlign: "left" }}>
            {bullets.map((text, i) => (
              <motion.div
                key={text}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.1, duration: 0.4 }}
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

export default SmartDisposal;
