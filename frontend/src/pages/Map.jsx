import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { moduleTypeMatchesHeld, HELD_TYPE_LABELS } from "../constants/wasteLabels";
import { meterColors } from "../theme/meterTheme";
import {
  Typography,
  Box,
  Stack,
  Button,
  Alert,
  Snackbar,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { getUser } from "../services/auth";
import { apiFetch } from "../services/api";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import StorageRoundedIcon from "@mui/icons-material/StorageRounded";
import RouteRoundedIcon from "@mui/icons-material/RouteRounded";
import UserMenu from "../components/UserMenu";
import MeterChatbot from "../components/MeterChatbot";

const MapView = lazy(() => import("./MapView.jsx"));
const HELD_KEY = "meter.finalWasteType";

const Map = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userPos, setUserPos] = useState(null);
  const [geoMessage, setGeoMessage] = useState("");
  const [heldType, setHeldType] = useState(() => sessionStorage.getItem(HELD_KEY) || "");
  const [centerTrigger, setCenterTrigger] = useState(1);
  const [toast, setToast] = useState("");
  const isLocalNoEnv = import.meta.env.DEV && !String(import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();

  useEffect(() => {
    if (!user?.oauthId) {
      navigate("/");
      return;
    }
    if (!navigator.geolocation) {
      setGeoMessage("위치 정보를 지원하지 않습니다.");
      return;
    }
    const pull = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserPos([pos.coords.latitude, pos.coords.longitude]);
          setGeoMessage("");
        },
        () => setGeoMessage("위치 권한이 필요합니다.")
      );
    };
    pull();
    const t = setInterval(pull, 5000);
    return () => clearInterval(t);
  }, [navigate, user?.oauthId]);

  useEffect(() => {
    if (location.state?.focusMyLocation) {
      setCenterTrigger((p) => p + 1);
      navigate("/map", { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  useEffect(() => {
    const sync = () => setHeldType(sessionStorage.getItem(HELD_KEY) || "");
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  useEffect(() => {
    if (!user?.oauthId) return;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        try {
          await apiFetch("/modules/seed", { method: "POST", body: "{}" });
        } catch {
          /* seeded */
        }
        const data = await apiFetch("/modules");
        setModules(Array.isArray(data) ? data : []);
      } catch {
        setError("모듈 목록을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };
    load();
    const t = setInterval(async () => {
      try {
        const data = await apiFetch("/modules");
        setModules(Array.isArray(data) ? data : []);
      } catch {
        /* ignore poll errors */
      }
    }, 5000);
    return () => clearInterval(t);
  }, [user?.oauthId]);

  const handleDispose = async (serialNumber) => {
    try {
      await apiFetch(`/modules/${serialNumber}/dispose`, { method: "POST", body: "{}" });
      const data = await apiFetch("/modules");
      setModules(Array.isArray(data) ? data : []);
      setToast(`투입 기록 · ${serialNumber}`);
    } catch {
      alert("투입 기록에 실패했습니다.");
    }
  };

  const focusMyLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos([pos.coords.latitude, pos.coords.longitude]);
        setCenterTrigger((p) => p + 1);
      },
      () => setGeoMessage("현재 위치를 가져오지 못했습니다.")
    );
  };

  if (!user?.oauthId) return null;

  const showAdmin = user?.role === "ADMIN";
  const displayName = user?.nickname || "사용자";

  const modulesForMap = useMemo(() => {
    if (isLocalNoEnv) return modules;
    const h = (heldType || "").trim().toUpperCase();
    if (!h) return modules;
    return modules.filter((m) => moduleTypeMatchesHeld(m.type, h));
  }, [modules, heldType, isLocalNoEnv]);

  const heldTypeSummary = useMemo(() => {
    const key = (heldType || "").trim().toUpperCase();
    if (!key) return "";
    return HELD_TYPE_LABELS[key] || key;
  }, [heldType]);

  const btnSx = {
    flex: 1,
    minWidth: 0,
    borderRadius: 999,
    fontWeight: 800,
    textTransform: "none",
    fontSize: "0.78rem",
    minHeight: 40,
    borderColor: meterColors.border,
    color: meterColors.primaryMuted,
    bgcolor: "rgba(14,14,14,0.88)",
    backdropFilter: "blur(8px)",
    "&:hover": { borderColor: meterColors.borderStrong, bgcolor: "rgba(24,24,24,0.94)" },
  };

  return (
    <Box
      sx={{
        position: "relative",
        height: "100dvh",
        width: "100%",
        bgcolor: "#0a0a0a",
        color: meterColors.primary,
        overflow: "hidden",
      }}
    >
      <Box sx={{ position: "absolute", inset: 0 }}>
        <Suspense
          fallback={
            <Box sx={{ height: "100%", display: "grid", placeItems: "center", color: meterColors.secondary }}>
              지도 로딩…
            </Box>
          }
        >
          <MapView userPos={userPos} modules={modulesForMap} onDispose={handleDispose} centerTrigger={centerTrigger} />
        </Suspense>
      </Box>

      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1300,
          px: { xs: 1, sm: 1.5 },
          py: 1,
          bgcolor: "linear-gradient(180deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.45) 70%, transparent 100%)",
          pointerEvents: "none",
          "& > *": { pointerEvents: "auto" },
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Box component="img" src="/meter-logo.png" alt="METER" sx={{ width: 28, height: 28, mixBlendMode: "screen" }} />
          <Typography sx={{ fontWeight: 900, fontSize: { xs: "0.95rem", md: "1.1rem" }, textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}>
            METER · {displayName}
          </Typography>
        </Stack>
        <UserMenu />
      </Stack>

      {!isLocalNoEnv && heldType && modules.length > modulesForMap.length && (
        <Alert
          severity="info"
          sx={{
            position: "absolute",
            top: 52,
            left: { xs: 8, sm: 12 },
            right: { xs: 8, sm: "auto" },
            maxWidth: 360,
            zIndex: 1300,
            py: 0.3,
            fontSize: "0.78rem",
            bgcolor: "rgba(14,14,14,0.9)",
            backdropFilter: "blur(6px)",
          }}
        >
          {heldTypeSummary} 유형 모듈만 표시 중
        </Alert>
      )}
      {geoMessage && (
        <Alert
          severity="warning"
          sx={{
            position: "absolute",
            top: heldType && modules.length > modulesForMap.length ? 96 : 52,
            left: { xs: 8, sm: 12 },
            right: { xs: 8, sm: "auto" },
            maxWidth: 360,
            zIndex: 1300,
            py: 0.3,
            fontSize: "0.78rem",
            bgcolor: "rgba(14,14,14,0.9)",
            backdropFilter: "blur(6px)",
          }}
          onClose={() => setGeoMessage("")}
        >
          {geoMessage}
        </Alert>
      )}

      {heldTypeSummary && (
        <Box
          sx={{
            position: "absolute",
            left: { xs: 8, sm: 12 },
            top: 52,
            zIndex: 1250,
            px: 1.2,
            py: 0.6,
            borderRadius: 1.5,
            bgcolor: "rgba(0,0,0,0.78)",
            border: `1px solid ${meterColors.border}`,
            backdropFilter: "blur(6px)",
          }}
        >
          <Typography sx={{ fontSize: "0.72rem", fontWeight: 800 }}>분류: {heldTypeSummary}</Typography>
          <Button
            size="small"
            onClick={() => {
              sessionStorage.removeItem(HELD_KEY);
              setHeldType("");
            }}
            sx={{ fontSize: "0.65rem", p: 0, minWidth: 0, color: meterColors.secondary }}
          >
            초기화
          </Button>
        </Box>
      )}

      <Button
        size="small"
        onClick={focusMyLocation}
        sx={{
          position: "absolute",
          left: { xs: 8, sm: 12 },
          bottom: { xs: 78, sm: 82 },
          zIndex: 1250,
          fontSize: "0.65rem",
          bgcolor: "rgba(0,0,0,0.85)",
          color: meterColors.primaryMuted,
          border: `1px solid ${meterColors.border}`,
          backdropFilter: "blur(6px)",
        }}
      >
        내 위치
      </Button>

      <Box
        sx={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1200,
          px: { xs: 1, sm: 1.5 },
          py: 1,
          bgcolor: "linear-gradient(0deg, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.55) 75%, transparent 100%)",
        }}
      >
        <Stack direction="row" flexWrap="wrap" gap={0.8}>
          <Button variant="outlined" startIcon={<InfoRoundedIcon />} onClick={() => navigate("/map/overview")} sx={btnSx}>
            서비스개요
          </Button>
          <Button
            variant="outlined"
            startIcon={<PhotoCameraRoundedIcon />}
            onClick={() => navigate("/camera")}
            sx={{ ...btnSx, color: meterColors.primary, borderColor: meterColors.borderStrong }}
          >
            AI 카메라
          </Button>
          <Button variant="outlined" startIcon={<RouteRoundedIcon />} onClick={() => navigate("/map/route")} sx={btnSx}>
            최적경로
          </Button>
          <Button variant="outlined" startIcon={<StorageRoundedIcon />} onClick={() => navigate("/db")} sx={btnSx}>
            DB 조회
          </Button>
          {showAdmin && (
            <Button variant="outlined" startIcon={<AdminPanelSettingsRoundedIcon />} onClick={() => navigate("/manage")} sx={btnSx}>
              관리자
            </Button>
          )}
        </Stack>
        {(loading || error) && (
          <Typography sx={{ fontSize: "0.72rem", color: error ? meterColors.danger : meterColors.secondary, mt: 0.5, px: 0.5 }}>
            {error || "모듈 갱신 중…"}
          </Typography>
        )}
      </Box>

      <MeterChatbot />

      <Snackbar open={Boolean(toast)} autoHideDuration={2500} onClose={() => setToast("")} message={toast} />
    </Box>
  );
};

export default Map;
