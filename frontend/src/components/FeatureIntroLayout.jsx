import { Box, Typography, Container, Stack, Button, Chip } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { meterColors } from "../theme/meterTheme";

/**
 * 메인 랜딩에서 열리는 METER 기능 소개 페이지 공통 레이아웃
 */
export default function FeatureIntroLayout({
  icon,
  badge,
  title,
  subtitle,
  description,
  bullets = [],
  highlights = [],
}) {
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
          opacity: 0.2,
          pointerEvents: "none",
        }}
      />

      <Container maxWidth="sm" sx={{ position: "relative", zIndex: 1, py: 4 }}>
        <Stack
          spacing={3}
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
            sx={{ width: 40, height: 40, objectFit: "contain", mixBlendMode: "screen", opacity: 0.9 }}
          />

          {badge && (
            <Chip
              label={badge}
              size="small"
              sx={{
                bgcolor: "rgba(255,255,255,0.06)",
                color: meterColors.primaryMuted,
                border: `1px solid ${meterColors.border}`,
                fontWeight: 700,
                letterSpacing: "0.06em",
              }}
            />
          )}

          <Box sx={{ color: meterColors.primary }}>{icon}</Box>

          <Stack spacing={0.75}>
            <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: "-0.02em", wordBreak: "keep-all" }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography sx={{ color: meterColors.primaryMuted, fontWeight: 600, fontSize: "0.95rem" }}>
                {subtitle}
              </Typography>
            )}
          </Stack>

          {description && (
            <Typography sx={{ color: meterColors.secondary, lineHeight: 1.75, wordBreak: "keep-all", maxWidth: 420 }}>
              {description}
            </Typography>
          )}

          {highlights.length > 0 && (
            <Stack direction="row" flexWrap="wrap" justifyContent="center" gap={1} sx={{ maxWidth: 440 }}>
              {highlights.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  sx={{
                    bgcolor: "rgba(255,255,255,0.04)",
                    border: `1px solid ${meterColors.border}`,
                    color: meterColors.primaryMuted,
                  }}
                />
              ))}
            </Stack>
          )}

          {bullets.length > 0 && (
            <Stack spacing={1.2} sx={{ width: "100%", maxWidth: 440, textAlign: "left" }}>
              {bullets.map((text, i) => (
                <motion.div
                  key={text}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.12 + i * 0.08, duration: 0.4 }}
                >
                  <Box
                    sx={{
                      pl: 1.5,
                      borderLeft: `3px solid ${meterColors.borderStrong}`,
                      py: 0.35,
                    }}
                  >
                    <Typography sx={{ color: meterColors.primaryMuted, fontSize: "0.92rem", lineHeight: 1.65 }}>
                      {text}
                    </Typography>
                  </Box>
                </motion.div>
              ))}
            </Stack>
          )}

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
            메인으로
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
