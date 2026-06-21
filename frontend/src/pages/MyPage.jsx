import { Box, Button, Container, Paper, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { getUser } from "../services/auth";
import { meterColors } from "../theme/meterTheme";

export default function MyPage() {
  const navigate = useNavigate();
  const user = getUser();

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: meterColors.bg, color: meterColors.primary, py: 4 }}>
      <Container maxWidth="sm">
        <Stack spacing={2.5}>
          <Typography variant="h5" sx={{ fontWeight: 900 }}>마이페이지</Typography>
          <Paper sx={{ p: 2.5, bgcolor: meterColors.bgElevated, border: `1px solid ${meterColors.border}` }}>
            <Stack spacing={1.2}>
              <Row label="별명" value={user?.nickname || "—"} />
              <Row label="이메일" value={user?.email || "—"} />
              <Row label="역할" value={user?.role || "USER"} />
              <Row label="상태" value={user?.status || "ACTIVE"} />
            </Stack>
          </Paper>
          <Button variant="outlined" onClick={() => navigate("/map")} sx={{ color: meterColors.primaryMuted, borderColor: meterColors.border }}>
            지도로 돌아가기
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}

function Row({ label, value }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
      <Typography sx={{ color: meterColors.secondary, fontSize: "0.88rem" }}>{label}</Typography>
      <Typography sx={{ fontWeight: 700, fontSize: "0.88rem", textAlign: "right" }}>{value}</Typography>
    </Stack>
  );
}
