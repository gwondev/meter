import { Box, Button, Container, Stack, Typography, Paper } from "@mui/material";
import { useNavigate } from "react-router-dom";
import ArrowBackIosNewRoundedIcon from "@mui/icons-material/ArrowBackIosNewRounded";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import TouchAppRoundedIcon from "@mui/icons-material/TouchAppRounded";
import StorageRoundedIcon from "@mui/icons-material/StorageRounded";
import RouteRoundedIcon from "@mui/icons-material/RouteRounded";
import { meterColors } from "../theme/meterTheme";

const steps = [
  {
    n: 1,
    title: "촬영",
    icon: <PhotoCameraRoundedIcon sx={{ fontSize: 32, color: meterColors.primary }} />,
    body: "지도 아래 「쓰레기촬영」에서 자원 사진을 올립니다.",
  },
  {
    n: 2,
    title: "유형 확인",
    icon: <CategoryRoundedIcon sx={{ fontSize: 32, color: meterColors.primary }} />,
    body: "AI가 판별한 유형을 확인하고 필요 시 수정합니다.",
  },
  {
    n: 3,
    title: "모듈 선택",
    icon: <TouchAppRoundedIcon sx={{ fontSize: 32, color: meterColors.primary }} />,
    body: "지도에서 해당 유형 METER 모듈 마커를 누릅니다.",
  },
  {
    n: 4,
    title: "DB · 경로",
    icon: <StorageRoundedIcon sx={{ fontSize: 32, color: meterColors.primary }} />,
    body: "모듈 DB에서 적재 현황을 보거나 최적 수거 경로를 확인합니다.",
  },
];

const MapGuide = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: meterColors.bg, color: meterColors.primary, py: { xs: 2.5, md: 4 } }}>
      <Container maxWidth="sm" sx={{ px: { xs: 1.5, sm: 2, md: 3 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2.5 }} flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: "-0.03em" }}>
              이용 방법
            </Typography>
            <Typography sx={{ color: meterColors.secondary, mt: 0.75, fontSize: "0.9rem" }}>
              촬영 → 분류 → 모듈 투입 순입니다.
            </Typography>
          </Box>
          <Button
            startIcon={<ArrowBackIosNewRoundedIcon sx={{ fontSize: 16 }} />}
            onClick={() => navigate("/map")}
            variant="outlined"
            sx={{ color: meterColors.primaryMuted, borderColor: meterColors.border, fontWeight: 700, flexShrink: 0 }}
          >
            지도로
          </Button>
        </Stack>

        <Stack spacing={1.75}>
          {steps.map((s) => (
            <Paper
              key={s.n}
              elevation={0}
              sx={{
                p: { xs: 1.75, sm: 2.25 },
                borderRadius: 2.5,
                border: `1px solid ${meterColors.border}`,
                bgcolor: meterColors.bgPaper,
                display: "flex",
                gap: 1.5,
                alignItems: "flex-start",
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 1.5,
                  bgcolor: "rgba(255,255,255,0.06)",
                  border: `1px solid ${meterColors.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontWeight: 900,
                  color: meterColors.primary,
                  fontSize: "1rem",
                }}
              >
                {s.n}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }} flexWrap="wrap">
                  {s.icon}
                  <Typography sx={{ fontWeight: 800, fontSize: "1rem" }}>{s.title}</Typography>
                </Stack>
                <Typography sx={{ color: meterColors.primaryMuted, lineHeight: 1.55, fontSize: "0.88rem", wordBreak: "keep-all" }}>
                  {s.body}
                </Typography>
              </Box>
            </Paper>
          ))}
        </Stack>

        <Box sx={{ mt: 3, display: "flex", justifyContent: "center" }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} justifyContent="center" sx={{ width: "100%", maxWidth: 520 }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate("/map")}
              sx={{
                px: 3.5,
                py: 1.25,
                borderRadius: 999,
                fontWeight: 800,
                bgcolor: meterColors.primary,
                color: "#000000",
                textTransform: "none",
                "&:hover": { bgcolor: "#e0e0e0" },
              }}
            >
              지도로
            </Button>
            <Button
              variant="outlined"
              startIcon={<RouteRoundedIcon />}
              onClick={() => navigate("/map")}
              sx={{
                px: 3.2,
                py: 1.15,
                borderRadius: 999,
                fontWeight: 800,
                color: meterColors.primaryMuted,
                borderColor: meterColors.border,
                textTransform: "none",
              }}
            >
              최적경로 (지도에서)
            </Button>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
};

export default MapGuide;
