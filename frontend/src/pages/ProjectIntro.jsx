import React from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Container, Paper, Stack, Button, Avatar } from "@mui/material";
import * as Icons from "@mui/icons-material";
import { meterColors } from "../theme/meterTheme";

export default function ProjectIntro() {
  const navigate = useNavigate();

  const motivation = [
    {
      title: "쓰레기통 적재량 관리",
      subtitle: "플라스틱·캔 모듈",
      color: meterColors.primary,
      desc: "플라스틱쓰레기통·캔쓰레기통에 탈부착형 IoT 모듈을 부착해 적재 높이를 실시간 측정하고 수거 시점을 판단합니다.",
      icon: <Icons.DeleteOutline />,
    },
    {
      title: "폐의약품 안전 수거",
      subtitle: "폐의약품수거함 모듈",
      color: meterColors.warning,
      desc: "폐의약품수거함의 적재 상태를 원격 모니터링해 과적재·방치를 방지하고 안전한 수거를 지원합니다.",
      icon: <Icons.Medication />,
    },
    {
      title: "의류 수거함 운영",
      subtitle: "의류수거함 모듈",
      color: meterColors.primaryMuted,
      desc: "의류수거함 적재량을 IoT로 추적하고 AI 카메라로 배출 안내를 제공해 올바른 투입을 돕습니다.",
      icon: <Icons.Checkroom />,
    },
    {
      title: "통합 관리 플랫폼",
      subtitle: "METER 통합관제",
      color: meterColors.accent,
      desc: "모듈 유형별 데이터를 하나의 대시보드·지도에서 통합해 연결 상태, 적재량, 최적 수거 동선을 관리합니다.",
      icon: <Icons.Dashboard />,
    },
  ];

  const usageSteps = [
    { label: "서비스 접속", desc: "meter.gwon.run 접속 및 로그인", icon: <Icons.Login /> },
    { label: "지도에서 모듈 확인", desc: "연결 상태·적재량·수거 동선 확인", icon: <Icons.Map /> },
    { label: "AI 카메라 배출 안내", desc: "Gemini Vision으로 배출물 인식 및 가이드", icon: <Icons.CameraAlt /> },
    { label: "데이터 분석", desc: "적재량 예측·Gemini 챗봇으로 운영 인사이트", icon: <Icons.Insights /> },
  ];

  const getCardStyle = (borderColor) => ({
    p: 3,
    height: "100%",
    bgcolor: meterColors.bgElevated,
    borderRadius: "16px",
    border: `1px solid ${meterColors.border}`,
    transition: "all 0.3s ease",
    "&:hover": {
      transform: "translateY(-8px)",
      borderColor: meterColors.borderStrong,
      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
    },
  });

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: meterColors.bg, color: meterColors.primary, pb: 8 }}>
      <Box sx={{ pt: 10, pb: 8, textAlign: "center" }}>
        <Container>
          <Stack spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Box
              component="img"
              src="/meter-logo.png"
              alt="METER"
              sx={{ width: 72, height: 72, objectFit: "contain" }}
            />
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.8,
                px: 1.75,
                py: 0.55,
                borderRadius: "100px",
                border: `1px solid ${meterColors.border}`,
                bgcolor: "rgba(255,255,255,0.04)",
              }}
            >
              <Box
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  bgcolor: meterColors.primary,
                  animation: "blink 2s ease-in-out infinite",
                  "@keyframes blink": {
                    "0%,100%": { opacity: 1, transform: "scale(1)" },
                    "50%": { opacity: 0.3, transform: "scale(0.6)" },
                  },
                }}
              />
              <Typography
                sx={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  color: meterColors.primaryMuted,
                  textTransform: "uppercase",
                }}
              >
                Project Introduction
              </Typography>
            </Box>
          </Stack>
          <Typography variant="h2" sx={{ fontWeight: 900, fontSize: { xs: "2.2rem", md: "4rem" }, mb: 1.5 }}>
            METER
          </Typography>
          <Typography variant="h6" sx={{ color: meterColors.secondary, mb: 1, maxWidth: 560, mx: "auto" }}>
            범용 탈부착형 AIoT 모듈 기반 적재 자원 통합관리 플랫폼
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.45)", fontSize: "0.9rem" }}>
            의류수거함 · 플라스틱쓰레기통 · 캔쓰레기통 · 폐의약품수거함
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="md">
        <Typography
          variant="h5"
          sx={{ fontWeight: 800, mb: 3, pl: 2, borderLeft: `4px solid ${meterColors.primary}` }}
        >
          프로젝트 배경
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 2,
            mb: 8,
          }}
        >
          {motivation.map((item) => (
            <Paper key={item.title} sx={{ ...getCardStyle(item.color), width: "100%" }}>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1.8 }}>
                <Avatar sx={{ bgcolor: "rgba(255,255,255,0.08)", color: item.color, border: `1px solid ${meterColors.border}` }}>
                  {item.icon}
                </Avatar>
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>{item.title}</Typography>
                  <Typography variant="caption" sx={{ color: meterColors.primaryMuted, fontWeight: 700 }}>
                    {item.subtitle}
                  </Typography>
                </Box>
              </Stack>
              <Typography sx={{ color: meterColors.secondary, lineHeight: 1.7 }}>{item.desc}</Typography>
            </Paper>
          ))}
        </Box>

        <Typography
          variant="h5"
          sx={{ fontWeight: 800, mb: 4, pl: 2, borderLeft: `4px solid ${meterColors.primary}` }}
        >
          이용 방법
        </Typography>
        <Box
          sx={{
            mb: 7,
            p: { xs: 2.5, sm: 4 },
            bgcolor: meterColors.bgElevated,
            borderRadius: "20px",
            border: `1px solid ${meterColors.border}`,
          }}
        >
          <Stack spacing={2}>
            {usageSteps.map((step) => (
              <Paper
                key={step.label}
                elevation={0}
                sx={{
                  p: { xs: 1.5, sm: 1.8 },
                  borderRadius: 2.2,
                  border: `1px solid ${meterColors.border}`,
                  bgcolor: "rgba(255,255,255,0.02)",
                }}
              >
                <Stack direction="row" spacing={1.4} alignItems="center">
                  <Avatar
                    sx={{
                      bgcolor: "rgba(255,255,255,0.08)",
                      color: meterColors.primary,
                      border: `1px solid ${meterColors.border}`,
                    }}
                  >
                    {step.icon}
                  </Avatar>
                  <Box>
                    <Typography sx={{ fontWeight: 800, mb: 0.2 }}>{step.label}</Typography>
                    <Typography sx={{ color: meterColors.secondary, fontSize: "0.85rem" }}>{step.desc}</Typography>
                  </Box>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Box>

        <Stack direction="row" spacing={1.2} justifyContent="center">
          <Button
            size="small"
            onClick={() => navigate("/map")}
            sx={{ textTransform: "none", color: meterColors.primaryMuted }}
          >
            Map으로
          </Button>
          <Button
            size="small"
            onClick={() => navigate("/intro/team")}
            sx={{ textTransform: "none", color: meterColors.primary }}
          >
            팀 소개
          </Button>
        </Stack>
        <Typography sx={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", textAlign: "center", mt: 1 }}>
          제작: METER Team · 2026
        </Typography>
      </Container>
    </Box>
  );
}
