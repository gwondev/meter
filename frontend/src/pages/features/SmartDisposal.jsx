import { Box, Stack, Typography } from "@mui/material";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import CheckroomRoundedIcon from "@mui/icons-material/CheckroomRounded";
import LocalDrinkRoundedIcon from "@mui/icons-material/LocalDrinkRounded";
import DeleteSweepRoundedIcon from "@mui/icons-material/DeleteSweepRounded";
import MedicalServicesRoundedIcon from "@mui/icons-material/MedicalServicesRounded";
import { keyframes } from "@emotion/react";
import { motion } from "framer-motion";
import FeaturePageShell, { IconTile, SectionLabel } from "../../components/FeaturePageShell";
import { glassCardSx } from "../../components/featureStyles";
import { meterColors } from "../../theme/meterTheme";

const scanLine = keyframes`
  0% { top: 0%; opacity: 0; }
  50% { opacity: 1; }
  100% { top: 100%; opacity: 0; }
`;

const categories = [
  { title: "의류", en: "CLOTHING", desc: "헌옷, 의류 수거함", icon: <CheckroomRoundedIcon sx={{ fontSize: 26 }} /> },
  { title: "플라스틱", en: "PLASTIC", desc: "페트병, 플라스틱 용기", icon: <LocalDrinkRoundedIcon sx={{ fontSize: 26 }} /> },
  { title: "캔", en: "CAN", desc: "음료캔, 통조림", icon: <DeleteSweepRoundedIcon sx={{ fontSize: 26 }} /> },
  { title: "폐의약품", en: "MEDICINE", desc: "약국, 전용 수거함", icon: <MedicalServicesRoundedIcon sx={{ fontSize: 26 }} /> },
];

const steps = [
  {
    step: "STEP 01",
    title: "촬영",
    desc: "버릴 물건을 카메라로 촬영합니다.",
    icon: <PhotoCameraRoundedIcon sx={{ fontSize: 22 }} />,
  },
  {
    step: "STEP 02",
    title: "AI 유형 판별",
    desc: "Gemini Vision이 4종 유형 중 하나로 분류합니다.",
    icon: <AutoAwesomeRoundedIcon sx={{ fontSize: 22 }} />,
    point: true,
  },
  {
    step: "STEP 03",
    title: "거점 안내",
    desc: "지도에서 해당 유형의 모듈만 걸러 투입 거점을 보여줍니다.",
    icon: <LocationOnRoundedIcon sx={{ fontSize: 22 }} />,
  },
];

export default function SmartDisposal() {
  return (
    <FeaturePageShell
      badge="AI 자원순환 안내"
      badgeIcon={<AutoAwesomeRoundedIcon sx={{ fontSize: 16 }} />}
      icon={<PhotoCameraRoundedIcon sx={{ fontSize: 28 }} />}
      title="AI 카메라 자원 분류"
      description="촬영한 품목의 유형을 판별하고, 지도와 연동해 맞는 투입 거점을 안내합니다."
    >
      <Stack spacing={2}>
        <SectionLabel>지원 유형 (4종)</SectionLabel>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: 2 }}>
          {categories.map((cat, idx) => (
            <Box
              key={cat.en}
              component={motion.div}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ y: -6, scale: 1.02 }}
              sx={{ ...glassCardSx, p: 2.5 }}
            >
              <Box
                sx={{
                  position: "absolute",
                  left: 0,
                  width: "100%",
                  height: "2px",
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)",
                  animation: `${scanLine} 3s ease-in-out infinite`,
                  animationDelay: `${idx * 0.4}s`,
                  pointerEvents: "none",
                }}
              />
              <Stack spacing={1.8}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <IconTile>{cat.icon}</IconTile>
                  <Typography sx={{ fontSize: "0.68rem", fontWeight: 900, color: meterColors.secondary, letterSpacing: "0.15em" }}>
                    {cat.en}
                  </Typography>
                </Stack>
                <Stack spacing={0.3}>
                  <Typography sx={{ fontSize: "1.15rem", fontWeight: 900 }}>{cat.title}</Typography>
                  <Typography sx={{ fontSize: "0.78rem", color: meterColors.secondary }}>{cat.desc}</Typography>
                </Stack>
              </Stack>
            </Box>
          ))}
        </Box>
      </Stack>

      <Stack spacing={2}>
        <SectionLabel>이용 방법</SectionLabel>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 2 }}>
          {steps.map((s, idx) => (
            <Box
              key={s.step}
              component={motion.div}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + idx * 0.1 }}
              whileHover={{ y: -4 }}
              sx={glassCardSx}
            >
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography
                    sx={{
                      fontSize: "0.75rem",
                      fontWeight: 900,
                      letterSpacing: "0.15em",
                      color: s.point ? meterColors.point : meterColors.secondary,
                    }}
                  >
                    {s.step}
                  </Typography>
                  <IconTile size={36} point={s.point}>
                    {s.icon}
                  </IconTile>
                </Stack>
                <Stack spacing={0.5}>
                  <Typography sx={{ fontSize: "1.1rem", fontWeight: 800 }}>{s.title}</Typography>
                  <Typography sx={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.5, wordBreak: "keep-all" }}>
                    {s.desc}
                  </Typography>
                </Stack>
              </Stack>
            </Box>
          ))}
        </Box>
      </Stack>
    </FeaturePageShell>
  );
}
