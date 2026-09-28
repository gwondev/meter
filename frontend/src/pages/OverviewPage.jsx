import { useState } from "react";
import { Box, Button, Container, Stack, Typography } from "@mui/material";
import MapRoundedIcon from "@mui/icons-material/MapRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import TeamIntro from "./TeamIntro";
import ProjectIntro from "./ProjectIntro";
import ServiceFeatures from "./ServiceFeatures";
import { meterColors } from "../theme/meterTheme";

const tabItems = [
  { key: "project", label: "프로젝트 소개" },
  { key: "team", label: "팀 소개" },
  { key: "features", label: "핵심 기능" },
];

export default function OverviewPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("project");

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: meterColors.bg, color: meterColors.primary, position: "relative" }}>
      <Box
        sx={{
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          bgcolor: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 2.5 } }}>
          <Stack spacing={2.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack spacing={0.3}>
                <Typography
                  sx={{
                    fontSize: "0.7rem",
                    letterSpacing: "0.2em",
                    color: meterColors.point,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    display: "flex",
                    alignItems: "center",
                    gap: 0.8,
                  }}
                >
                  <InfoRoundedIcon sx={{ fontSize: 14 }} /> METER SYSTEM OVERVIEW
                </Typography>
                <Typography sx={{ fontWeight: 900, fontSize: { xs: "1.3rem", sm: "1.6rem" }, letterSpacing: "-0.03em" }}>
                  서비스 개요
                </Typography>
              </Stack>
              <Button
                size="small"
                startIcon={<MapRoundedIcon />}
                onClick={() => navigate("/map")}
                sx={{
                  color: meterColors.primary,
                  textTransform: "none",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.15)",
                  bgcolor: "rgba(255,255,255,0.03)",
                  px: 2,
                  py: 0.8,
                  fontWeight: 700,
                  transition: "all 0.2s ease",
                  "&:hover": { borderColor: "rgba(255,255,255,0.45)", bgcolor: "rgba(255,255,255,0.08)" },
                }}
              >
                지도로
              </Button>
            </Stack>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 1,
                p: 0.8,
                borderRadius: "14px",
                border: "1px solid rgba(255,255,255,0.08)",
                bgcolor: "rgba(255,255,255,0.02)",
              }}
            >
              {tabItems.map((item) => {
                const active = item.key === tab;
                return (
                  <Button
                    key={item.key}
                    component={motion.button}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setTab(item.key)}
                    sx={{
                      minHeight: { xs: 44, sm: 48 },
                      borderRadius: "10px",
                      fontWeight: 800,
                      fontSize: { xs: "0.85rem", sm: "0.95rem" },
                      textTransform: "none",
                      transition: "all 0.2s ease",
                      color: active ? "#000000" : "rgba(255,255,255,0.6)",
                      bgcolor: active ? "#FFFFFF" : "transparent",
                      boxShadow: active ? "0 4px 20px rgba(255,255,255,0.18)" : "none",
                      "&:hover": {
                        bgcolor: active ? "#FFFFFF" : "rgba(255,255,255,0.05)",
                        color: active ? "#000000" : "#FFFFFF",
                      },
                    }}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </Box>
          </Stack>
        </Container>
      </Box>

      <Box sx={{ pb: 6, pt: 2 }}>
        {tab === "team" && <TeamIntro />}
        {tab === "project" && <ProjectIntro />}
        {tab === "features" && <ServiceFeatures />}
      </Box>
    </Box>
  );
}
