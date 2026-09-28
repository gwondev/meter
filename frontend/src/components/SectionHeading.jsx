import { Stack, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { meterColors } from "../theme/meterTheme";

/** 서비스 개요 탭 상단 제목 — 작은 영문 라벨 + 큰 제목 + 한 줄 설명 */
export default function SectionHeading({ eyebrow, title, description }) {
  return (
    <Stack
      spacing={0.8}
      component={motion.div}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {eyebrow && (
        <Typography sx={{ fontSize: "0.7rem", letterSpacing: "0.2em", fontWeight: 800, color: meterColors.point }}>
          {eyebrow}
        </Typography>
      )}
      <Typography
        sx={{
          fontSize: { xs: "1.6rem", sm: "2.2rem" },
          fontWeight: 900,
          letterSpacing: "-0.02em",
          lineHeight: 1.15,
          background: "linear-gradient(180deg, #FFFFFF 0%, rgba(255,255,255,0.7) 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        {title}
      </Typography>
      {description && (
        <Typography sx={{ fontSize: { xs: "0.86rem", sm: "0.95rem" }, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, wordBreak: "keep-all" }}>
          {description}
        </Typography>
      )}
    </Stack>
  );
}
