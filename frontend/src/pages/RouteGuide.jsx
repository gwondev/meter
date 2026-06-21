import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Container,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import RouteRoundedIcon from "@mui/icons-material/RouteRounded";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api";
import { moduleTypeLabel } from "../constants/wasteLabels";
import {
  fillLevelFromHeight,
  formatModuleConnectivity,
  isModuleOffline,
  meterColors,
} from "../theme/meterTheme";

/** 적재 위험(낮은 heightCm) 우선, 오프라인은 후순위 */
function routePriority(module) {
  const h = module.heightCm != null ? Number(module.heightCm) : 999;
  const offline = isModuleOffline(module.lastHeartbeat) ? 1 : 0;
  return { offline, h };
}

export default function RouteGuide() {
  const navigate = useNavigate();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch("/modules");
        if (!cancelled) setModules(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setModules([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const route = useMemo(() => {
    return [...modules]
      .filter((m) => m.lat != null && m.lon != null)
      .sort((a, b) => {
        const pa = routePriority(a);
        const pb = routePriority(b);
        if (pa.offline !== pb.offline) return pa.offline - pb.offline;
        return pa.h - pb.h;
      });
  }, [modules]);

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: meterColors.bg, color: meterColors.primary, py: { xs: 2, sm: 3 } }}>
      <Container maxWidth="sm">
        <Stack spacing={2.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1} alignItems="center">
              <RouteRoundedIcon />
              <Typography sx={{ fontWeight: 900, fontSize: { xs: "1.1rem", sm: "1.3rem" } }}>최적 수거 경로</Typography>
            </Stack>
            <Button
              startIcon={<ArrowBackRoundedIcon />}
              onClick={() => navigate("/map")}
              sx={{ color: meterColors.primaryMuted, textTransform: "none", border: `1px solid ${meterColors.border}` }}
            >
              지도로
            </Button>
          </Stack>

          <Typography sx={{ color: meterColors.secondary, fontSize: "0.9rem", lineHeight: 1.6 }}>
            적재량이 많은 모듈을 우선 방문하도록 정렬한 권장 순서입니다. 오프라인 모듈은 후순위로 배치됩니다.
          </Typography>

          {loading && <Typography sx={{ color: meterColors.secondary }}>경로 계산 중…</Typography>}

          {!loading && route.length === 0 && (
            <Typography sx={{ color: meterColors.secondary }}>표시할 모듈이 없습니다.</Typography>
          )}

          <Stack spacing={1.2}>
            {route.map((m, idx) => {
              const offline = isModuleOffline(m.lastHeartbeat);
              const fill = fillLevelFromHeight(m.heightCm);
              return (
                <Paper
                  key={m.id ?? m.serialNumber}
                  sx={{
                    p: 1.5,
                    bgcolor: offline ? "rgba(40,40,40,0.9)" : meterColors.bgElevated,
                    border: `1px solid ${offline ? "rgba(120,120,120,0.35)" : meterColors.border}`,
                    borderRadius: 2,
                    opacity: offline ? 0.7 : 1,
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    <Chip
                      label={idx + 1}
                      size="small"
                      sx={{
                        minWidth: 32,
                        fontWeight: 900,
                        bgcolor: offline ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.12)",
                        color: meterColors.primary,
                      }}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 800 }}>
                        {moduleTypeLabel(m.type)} · {m.serialNumber}
                      </Typography>
                      <Typography sx={{ color: fill.color, fontSize: "0.85rem", mt: 0.3 }}>
                        {fill.label}
                        {m.heightCm != null ? ` (${Number(m.heightCm).toFixed(1)}cm)` : ""}
                      </Typography>
                      <Typography sx={{ color: meterColors.secondary, fontSize: "0.8rem", mt: 0.25 }}>
                        {formatModuleConnectivity(m.lastHeartbeat)} · 투입 {m.totalDisposalCount ?? 0}회
                      </Typography>
                      {offline && (
                        <Chip label="오프라인" size="small" sx={{ mt: 0.75, bgcolor: "rgba(128,128,128,0.25)", color: meterColors.secondary }} />
                      )}
                    </Box>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
