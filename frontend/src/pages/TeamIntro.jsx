import { Box, Container, Stack, Typography } from "@mui/material";
import { motion } from "framer-motion";
import SectionHeading from "../components/SectionHeading";
import { glassCardSx } from "../components/featureStyles";
import { meterColors } from "../theme/meterTheme";

const MEMBERS = [
  {
    name: "이성권",
    role: "팀장, IoT, 인프라, 보안",
    school: "조선대학교 컴퓨터공학과",
    tasks: ["프로젝트 총괄", "D모듈 d1, d2", "R모듈 r1", "MQTT 펌웨어", "Docker, Cloudflare", "배포"],
    color: meterColors.pointSky,
    leader: true,
  },
  {
    name: "이건영",
    role: "프론트엔드, AI UX",
    school: "조선대학교 컴퓨터공학과",
    tasks: ["React UI", "지도, 관제", "AI 카메라", "AI 챗봇"],
    color: meterColors.pointPurple,
  },
  {
    name: "이수혁",
    role: "하드웨어, 펌웨어, 카메라",
    school: "조선대학교 전자공학과",
    tasks: ["회로, 배선", "R모듈 r2 (ESP32-CAM)", "R모듈 r3 (Pi 5)"],
    color: meterColors.pointGreen,
  },
  {
    name: "최은서",
    role: "백엔드, DB, 분석",
    school: "조선대학교 컴퓨터공학과",
    tasks: ["Spring Boot API", "MySQL, ERD", "데이터 분석", "UI 개선"],
    color: meterColors.pointAmber,
  },
];

export default function TeamIntro() {
  return (
    <Box sx={{ bgcolor: meterColors.bg, color: meterColors.primary, py: { xs: 2.5, sm: 4 } }}>
      <Container maxWidth="lg">
        <Stack spacing={{ xs: 3, sm: 4 }}>
          <SectionHeading eyebrow="TEAM" title="METER 팀" description="Multi-resource Environment Tracking & Efficiency Reporter, 4인 팀" />

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: { xs: 1.2, sm: 2 } }}>
            {MEMBERS.map((m, i) => (
              <Box
                key={m.name}
                component={motion.div}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -4 }}
                sx={{ ...glassCardSx, p: { xs: 1.8, sm: 2.4 }, display: "flex", flexDirection: "column", gap: 1.4 }}
              >
                <Stack direction="row" spacing={1.4} alignItems="center">
                  <Box
                    sx={{
                      width: { xs: 40, sm: 46 },
                      height: { xs: 40, sm: 46 },
                      borderRadius: "14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontWeight: 900,
                      fontSize: { xs: "1rem", sm: "1.15rem" },
                      color: m.color,
                      bgcolor: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.16)",
                    }}
                  >
                    {m.name.slice(1)}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" spacing={0.8} alignItems="center">
                      <Typography sx={{ fontWeight: 900, fontSize: { xs: "1rem", sm: "1.1rem" } }}>{m.name}</Typography>
                      {m.leader && (
                        <Box
                          sx={{
                            fontSize: "0.62rem",
                            fontWeight: 800,
                            px: 0.8,
                            py: 0.1,
                            borderRadius: "6px",
                            color: meterColors.point,
                            border: `1px solid ${meterColors.pointBorder}`,
                            bgcolor: meterColors.pointSoft,
                          }}
                        >
                          팀장
                        </Box>
                      )}
                    </Stack>
                    <Typography sx={{ color: meterColors.secondary, fontSize: "0.7rem" }}>{m.school}</Typography>
                  </Box>
                </Stack>

                <Typography sx={{ color: meterColors.primaryMuted, fontSize: { xs: "0.78rem", sm: "0.85rem" }, fontWeight: 700, wordBreak: "keep-all" }}>
                  {m.role}
                </Typography>

                <Stack direction="row" flexWrap="wrap" gap={0.6}>
                  {m.tasks.map((t) => (
                    <Box
                      key={t}
                      sx={{
                        fontSize: { xs: "0.66rem", sm: "0.72rem" },
                        px: 0.9,
                        py: 0.3,
                        borderRadius: "8px",
                        border: "1px solid rgba(255,255,255,0.14)",
                        bgcolor: "rgba(255,255,255,0.04)",
                        color: meterColors.primaryMuted,
                      }}
                    >
                      {t}
                    </Box>
                  ))}
                </Stack>
              </Box>
            ))}
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
