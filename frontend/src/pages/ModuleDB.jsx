import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Container,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import StorageRoundedIcon from "@mui/icons-material/StorageRounded";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api";
import { moduleTypeLabel } from "../constants/wasteLabels";
import {
  fillLevelFromHeight,
  formatModuleConnectivity,
  isModuleOffline,
  meterColors,
} from "../theme/meterTheme";

const TYPE_ORDER = ["CLOTHING", "PLASTIC", "CAN", "MEDICINE"];

export default function ModuleDB() {
  const navigate = useNavigate();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await apiFetch("/modules");
        if (!cancelled) setModules(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setError("모듈 데이터를 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = useMemo(() => {
    const map = new Map(TYPE_ORDER.map((t) => [t, []]));
    modules.forEach((m) => {
      const key = String(m.type || "PLASTIC").toUpperCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(m);
    });
    return TYPE_ORDER.map((type) => ({ type, items: map.get(type) || [] }));
  }, [modules]);

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: meterColors.bg, color: meterColors.primary, py: { xs: 2, sm: 3 } }}>
      <Container maxWidth="lg">
        <Stack spacing={2.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
            <Stack direction="row" spacing={1} alignItems="center">
              <StorageRoundedIcon />
              <Typography sx={{ fontWeight: 900, fontSize: { xs: "1.1rem", sm: "1.35rem" } }}>모듈 DB 조회</Typography>
            </Stack>
            <Button
              startIcon={<ArrowBackRoundedIcon />}
              onClick={() => navigate("/map")}
              sx={{ color: meterColors.primaryMuted, textTransform: "none", border: `1px solid ${meterColors.border}` }}
            >
              지도로
            </Button>
          </Stack>

          <Typography sx={{ color: meterColors.secondary, fontSize: "0.9rem" }}>
            모듈 유형별 적재·연결·투입 데이터를 누구나 열람할 수 있습니다.
          </Typography>

          {loading && <Typography sx={{ color: meterColors.secondary }}>불러오는 중…</Typography>}
          {error && <Typography sx={{ color: meterColors.danger }}>{error}</Typography>}

          {grouped.map(({ type, items }) => (
            <Paper
              key={type}
              sx={{
                p: { xs: 1.5, sm: 2 },
                bgcolor: meterColors.bgElevated,
                border: `1px solid ${meterColors.border}`,
                borderRadius: 2,
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                <Typography sx={{ fontWeight: 800 }}>{moduleTypeLabel(type)}</Typography>
                <Chip label={`${items.length}개`} size="small" sx={{ bgcolor: "rgba(255,255,255,0.06)", color: meterColors.primaryMuted }} />
              </Stack>

              {items.length === 0 ? (
                <Typography sx={{ color: meterColors.secondary, fontSize: "0.88rem" }}>등록된 모듈 없음</Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: meterColors.secondary, borderColor: meterColors.border }}>시리얼</TableCell>
                        <TableCell sx={{ color: meterColors.secondary, borderColor: meterColors.border }}>연결</TableCell>
                        <TableCell sx={{ color: meterColors.secondary, borderColor: meterColors.border }}>적재</TableCell>
                        <TableCell sx={{ color: meterColors.secondary, borderColor: meterColors.border }}>투입</TableCell>
                        <TableCell sx={{ color: meterColors.secondary, borderColor: meterColors.border }}>상태</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {items.map((m) => {
                        const offline = isModuleOffline(m.lastHeartbeat);
                        const fill = fillLevelFromHeight(m.heightCm);
                        const conn = formatModuleConnectivity(m.lastHeartbeat);
                        return (
                          <TableRow key={m.id ?? m.serialNumber} sx={{ opacity: offline ? 0.55 : 1 }}>
                            <TableCell sx={{ color: meterColors.primary, borderColor: meterColors.border, fontWeight: 700 }}>
                              {m.serialNumber}
                            </TableCell>
                            <TableCell sx={{ color: offline ? meterColors.secondary : meterColors.primaryMuted, borderColor: meterColors.border }}>
                              {conn}
                            </TableCell>
                            <TableCell sx={{ color: fill.color, borderColor: meterColors.border }}>
                              {m.heightCm != null ? `${Number(m.heightCm).toFixed(1)}cm` : "—"} · {fill.label}
                            </TableCell>
                            <TableCell sx={{ color: meterColors.primaryMuted, borderColor: meterColors.border }}>
                              {m.totalDisposalCount ?? 0}회
                            </TableCell>
                            <TableCell sx={{ color: meterColors.primaryMuted, borderColor: meterColors.border }}>
                              {m.status ?? "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          ))}
        </Stack>
      </Container>
    </Box>
  );
}
