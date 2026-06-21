import React, { useState } from "react";
import { Box, Button, Container, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import TeamIntro from "./TeamIntro";
import ProjectIntro from "./ProjectIntro";
import RecyclingGuide from "./RecyclingGuide";
import { meterColors } from "../theme/meterTheme";

const tabItems = [
  { key: "project", label: "프로젝트 소개" },
  { key: "team", label: "팀 소개" },
  { key: "guide", label: "분리수거 안내" },
];

export default function OverviewPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("project");

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: meterColors.bg, color: meterColors.primary, py: { xs: 2.2, sm: 3 } }}>
      <Container maxWidth="lg">
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography sx={{ fontWeight: 900, fontSize: { xs: "1.1rem", sm: "1.35rem" } }}>서비스개요</Typography>
            <Button size="small" onClick={() => navigate("/map")} sx={{ color: meterColors.primaryMuted, textTransform: "none" }}>
              지도로
            </Button>
          </Stack>

          <Stack direction="row" spacing={1.2}>
            {tabItems.map((item) => {
              const active = item.key === tab;
              return (
                <Button
                  key={item.key}
                  onClick={() => setTab(item.key)}
                  variant={active ? "contained" : "outlined"}
                  sx={{
                    flex: 1,
                    minHeight: { xs: 48, sm: 56 },
                    borderRadius: 999,
                    fontSize: { xs: "0.92rem", sm: "1.02rem" },
                    fontWeight: 900,
                    textTransform: "none",
                    letterSpacing: "-0.01em",
                    ...(active
                      ? {
                          color: "#0a0a0a",
                          border: `1px solid ${meterColors.borderStrong}`,
                          bgcolor: meterColors.primary,
                          "&:hover": { bgcolor: "#e8e8e8" },
                        }
                      : {
                          color: meterColors.primaryMuted,
                          borderColor: meterColors.border,
                          bgcolor: meterColors.bgElevated,
                          "&:hover": {
                            borderColor: meterColors.borderStrong,
                            bgcolor: "rgba(255,255,255,0.06)",
                          },
                        }),
                  }}
                >
                  {item.label}
                </Button>
              );
            })}
          </Stack>
        </Stack>
      </Container>

      <Box sx={{ mt: 1.8 }}>
        {tab === "team" && <TeamIntro />}
        {tab === "project" && <ProjectIntro />}
        {tab === "guide" && <RecyclingGuide />}
      </Box>
    </Box>
  );
}
