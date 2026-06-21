import { useState } from "react";
import { Box, Button, Container, Stack, Typography } from "@mui/material";
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
                    fontWeight: 900,
                    textTransform: "none",
                    ...(active
                      ? { color: "#0a0a0a", bgcolor: meterColors.primary, "&:hover": { bgcolor: "#e0e0e0" } }
                      : { color: meterColors.primaryMuted, borderColor: meterColors.border }),
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
        {tab === "features" && <ServiceFeatures />}
      </Box>
    </Box>
  );
}
