import { Box, Container, Stack, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { meterColors } from "../theme/meterTheme";

const MEMBERS = [
  {
    name: "이성권",
    role: "팀장 · IoT · INFRA · Security",
    school: "조선대학교 컴퓨터공학과",
    tasks: ["프로젝트 총괄", "ESP32·MQTT 펌웨어", "Docker·Cloudflare", "보안/인증", "3D 케이스 설계"],
  },
  {
    name: "이건영",
    role: "프론트엔드 · AI UX",
    school: "조선대학교 컴퓨터공학과",
    tasks: ["React UI/UX", "AI Chat Bot", "AI Camera", "Gemini 프롬프트"],
  },
  {
    name: "이수혁",
    role: "IoT · HW · 펌웨어",
    school: "조선대학교 전자공학과",
    tasks: ["회로·배선 설계", "ESP32 펌웨어", "초음파 센서 제어", "MQTT 송신"],
  },
  {
    name: "최은서",
    role: "Backend · DB · API",
    school: "조선대학교 컴퓨터공학과",
    tasks: ["Spring Boot API", "MySQL·ERD", "데이터 시각화", "통합 테스트"],
  },
];

export default function TeamIntro() {
  return (
    <Box sx={{ bgcolor: meterColors.bg, color: meterColors.primary, py: { xs: 3, sm: 5 } }}>
      <Container maxWidth="md">
        <Stack spacing={3} alignItems="center">
          <Stack spacing={1} textAlign="center">
            <Typography variant="h4" sx={{ fontWeight: 900 }}>METER 팀</Typography>
            <Typography sx={{ color: meterColors.secondary, lineHeight: 1.7 }}>
              Multi-resource Environment Tracking &amp; Efficiency Reporter
              <br />
              팀장 이성권 · 4인 팀
            </Typography>
          </Stack>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5, width: "100%" }}>
            {MEMBERS.map((m, i) => (
              <Box
                key={m.name}
                component={motion.div}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: meterColors.bgElevated,
                  border: `1px solid ${meterColors.border}`,
                  gridColumn: i === 0 ? { sm: "1 / -1" } : "auto",
                }}
              >
                <Typography sx={{ fontWeight: 900, fontSize: "1.05rem" }}>{m.name}</Typography>
                <Typography sx={{ color: meterColors.primaryMuted, fontSize: "0.78rem", fontWeight: 700, mt: 0.3 }}>{m.role}</Typography>
                <Typography sx={{ color: meterColors.secondary, fontSize: "0.75rem", mt: 0.2 }}>{m.school}</Typography>
                <Stack direction="row" flexWrap="wrap" gap={0.6} sx={{ mt: 1.2 }}>
                  {m.tasks.map((t) => (
                    <Box
                      key={t}
                      sx={{
                        fontSize: "0.7rem",
                        px: 1,
                        py: 0.3,
                        borderRadius: 999,
                        border: `1px solid ${meterColors.border}`,
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
