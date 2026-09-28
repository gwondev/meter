import { Box, Button, Container, Stack, Typography } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { keyframes } from "@emotion/react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { meterColors } from "../theme/meterTheme";

const pulseGlow = keyframes`
  0% { opacity: 0.35; transform: scale(1); }
  50% { opacity: 0.65; transform: scale(1.1); }
  100% { opacity: 0.35; transform: scale(1); }
`;

/** 메인 랜딩에서 열리는 기능 소개 페이지 공통 틀 (헤더, 배지, 히어로) */
export default function FeaturePageShell({ badge, badgeIcon, icon, title, description, children }) {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        bgcolor: meterColors.bg,
        color: meterColors.primary,
        position: "relative",
        overflow: "hidden",
        py: { xs: 4, md: 6 },
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
          `,
          backgroundSize: "36px 36px",
          maskImage: "radial-gradient(circle at top, rgba(0,0,0,1) 30%, transparent 85%)",
          opacity: 0.6,
          pointerEvents: "none",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          top: "-10%",
          right: "-10%",
          width: { xs: 300, md: 520 },
          height: { xs: 300, md: 520 },
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.015) 50%, transparent 70%)",
          filter: "blur(40px)",
          animation: `${pulseGlow} 8s ease-in-out infinite alternate`,
          pointerEvents: "none",
        }}
      />

      <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
        <Stack spacing={{ xs: 4, md: 5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
            <Button
              startIcon={<ArrowBackRoundedIcon />}
              onClick={() => navigate("/")}
              sx={{
                color: meterColors.primaryMuted,
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.12)",
                bgcolor: "rgba(255,255,255,0.03)",
                px: 2.2,
                py: 1,
                fontWeight: 700,
                textTransform: "none",
                backdropFilter: "blur(10px)",
                transition: "all 0.2s ease",
                flexShrink: 0,
                "&:hover": {
                  bgcolor: "rgba(255,255,255,0.08)",
                  borderColor: "rgba(255,255,255,0.3)",
                  color: meterColors.primary,
                  transform: "translateX(-2px)",
                },
              }}
            >
              메인으로
            </Button>

            {badge && (
              <Box
                sx={{
                  px: 2,
                  py: 0.8,
                  borderRadius: "20px",
                  border: `1px solid ${meterColors.pointBorder}`,
                  bgcolor: meterColors.pointSoft,
                  color: meterColors.point,
                  fontWeight: 800,
                  fontSize: "0.78rem",
                  letterSpacing: "0.1em",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  whiteSpace: "nowrap",
                }}
              >
                {badgeIcon}
                {badge}
              </Box>
            )}
          </Stack>

          <Stack
            spacing={2}
            component={motion.div}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 54,
                  height: 54,
                  borderRadius: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  background: "linear-gradient(135deg, rgba(255,255,255,0.14), rgba(255,255,255,0.03))",
                  border: "1px solid rgba(255,255,255,0.25)",
                  color: meterColors.primary,
                  boxShadow: "0 0 24px rgba(255,255,255,0.08)",
                }}
              >
                {icon}
              </Box>
              <Typography
                sx={{
                  fontSize: { xs: "1.7rem", sm: "2.5rem" },
                  fontWeight: 900,
                  letterSpacing: "-0.02em",
                  wordBreak: "keep-all",
                  background: "linear-gradient(180deg, #FFFFFF 0%, rgba(255,255,255,0.7) 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {title}
              </Typography>
            </Stack>

            {description && (
              <Typography
                sx={{
                  fontSize: { xs: "0.95rem", md: "1.05rem" },
                  color: "rgba(255,255,255,0.72)",
                  maxWidth: 720,
                  lineHeight: 1.65,
                  wordBreak: "keep-all",
                }}
              >
                {description}
              </Typography>
            )}
          </Stack>

          {children}
        </Stack>
      </Container>
    </Box>
  );
}

export function SectionLabel({ children }) {
  return (
    <Typography sx={{ fontSize: "0.88rem", fontWeight: 800, color: meterColors.secondary, letterSpacing: "0.08em" }}>
      {children}
    </Typography>
  );
}

export function IconTile({ children, size = 44, point = false }) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: "12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        color: point ? meterColors.point : meterColors.primary,
        bgcolor: point ? meterColors.pointSoft : "rgba(255,255,255,0.05)",
        border: `1px solid ${point ? meterColors.pointBorder : "rgba(255,255,255,0.16)"}`,
      }}
    >
      {children}
    </Box>
  );
}
