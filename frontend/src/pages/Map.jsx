import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { moduleTypeMatchesHeld, HELD_TYPE_LABELS, moduleTypeLabel } from "../constants/wasteLabels";
import { meterColors } from "../theme/meterTheme";
import { buildCollectionRouteWithRoads, ROUTE_FILL_THRESHOLD } from "../utils/collectionRoute";
import {
  Typography,
  Box,
  Stack,
  Button,
  Alert,
  Snackbar,
  IconButton,
  Chip,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { getUser, ensureSession, needsNickname } from "../services/auth";
import { apiFetch } from "../services/api";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import RouteRoundedIcon from "@mui/icons-material/RouteRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import MyLocationRoundedIcon from "@mui/icons-material/MyLocationRounded";
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
  const [visibleModules, setVisibleModules] = useState([]);
  const [route, setRoute] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const isLocalNoEnv = import.meta.env.DEV && !String(import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();

  useEffect(() => {
    if (!user?.oauthId) return undefined;

    const checkNickname = async () => {
      const result = await ensureSession();
      if (result.status === "needs_nickname" || needsNickname(result.user ?? user)) {
        navigate("/nickname", { replace: true });
      }
    };

    checkNickname();
    window.addEventListener("focus", checkNickname);
    return () => window.removeEventListener("focus", checkNickname);
  }, [navigate, user?.oauthId, user?.nickname]);

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
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          setUserPos([lat, lon]);
          setGeoMessage("");
          apiFetch("/geo/anchor", {
            method: "POST",
            body: JSON.stringify({ lat, lon }),
          }).catch(() => {});
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

    const fetchModules = async () => {
      const data = await apiFetch("/modules");
      setModules(Array.isArray(data) ? data : []);
    };

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        await fetchModules();
      } catch {
        setError("모듈 목록을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };
    load();

    const t = setInterval(() => {
      fetchModules().catch(() => {});
    }, 5000);
    return () => clearInterval(t);
  }, [user?.oauthId]);

  const focusMyLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos([pos.coords.latitude, pos.coords.longitude]);
        setCenterTrigger((p) => p + 1);
      },
      () => setGeoMessage("현재 위치를 가져오지 못했습니다.")
    );
  };

  const handleBoundsChange = useCallback((visible) => {
    setVisibleModules(visible);
  }, []);

  const modulesForMap = useMemo(() => {
    if (isLocalNoEnv) return modules;
    const h = (heldType || "").trim().toUpperCase();
    if (!h) return modules;
    return modules.filter((m) => moduleTypeMatchesHeld(m.type, h));
  }, [modules, heldType, isLocalNoEnv]);

  const toggleRoute = async () => {
    if (route) {
      setRoute(null);
      return;
    }
    if (routeLoading) return;
    setRouteLoading(true);
    try {
      const result = await buildCollectionRouteWithRoads(visibleModules, userPos);
      if (!result.path || result.path.length < 2) {
        setToast(result.reason || "경로를 만들 수 없습니다.");
        return;
      }
      setRoute(result);
    } catch (e) {
      setToast(e?.message || "경로 계산에 실패했습니다.");
    } finally {
      setRouteLoading(false);
    }
  };

  const heldTypeSummary = useMemo(() => {
    const key = (heldType || "").trim().toUpperCase();
    if (!key) return "";
    return HELD_TYPE_LABELS[key] || key;
  }, [heldType]);

  if (!user?.oauthId) return null;

  const displayName = user?.nickname?.trim() || "닉네임 설정";
  const hasNickname = Boolean(user?.nickname?.trim());

  const bottomBtnSx = {
    minWidth: { xs: 108, sm: 136 },
    px: { xs: 1.4, sm: 2 },
    py: 1.25,
    borderRadius: 2.5,
    fontWeight: 800,
    textTransform: "none",
    fontSize: { xs: "0.78rem", sm: "0.88rem" },
    border: `1px solid ${meterColors.borderStrong}`,
    color: meterColors.primary,
    bgcolor: "rgba(0,0,0,0.9)",
    backdropFilter: "blur(10px)",
    boxShadow: "0 8px 28px rgba(0,0,0,0.45)",
    "& .MuiButton-startIcon": { mr: 0.5 },
    "&:hover": {
      bgcolor: "rgba(24,24,24,0.96)",
      borderColor: meterColors.primary,
      transform: "translateY(-2px)",
    },
  };

  const bottomBtnActiveSx = {
    ...bottomBtnSx,
    color: "#0a0a0a",
    bgcolor: meterColors.primary,
    borderColor: meterColors.primary,
    "&:hover": { bgcolor: "#e8e8e8", borderColor: "#e8e8e8" },
  };

  const sideBtnSx = {
    ...bottomBtnSx,
    minWidth: { xs: 88, sm: 110 },
    px: { xs: 1.2, sm: 1.6 },
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
          <MapView
            userPos={userPos}
            modules={modulesForMap}
            route={route}
            centerTrigger={centerTrigger}
            onBoundsChange={handleBoundsChange}
          />
        </Suspense>
      </Box>

      {/* 상단: 왼쪽 통합 패널 + 오른쪽 메뉴 */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1300,
          px: { xs: 1, sm: 1.5 },
          py: 1,
          pointerEvents: "none",
          "& > *": { pointerEvents: "auto" },
        }}
      >
        <Box
          sx={{
            px: 1.35,
            py: 0.95,
            borderRadius: 1,
            bgcolor: "rgba(8,8,8,0.92)",
            border: `1px solid ${meterColors.borderStrong}`,
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            backdropFilter: "blur(12px)",
          }}
        >
          <Stack direction="row" alignItems="baseline" spacing={1}>
            <Typography
              sx={{
                fontWeight: 900,
                fontSize: { xs: "0.95rem", sm: "1.05rem" },
                letterSpacing: "0.14em",
                lineHeight: 1,
              }}
            >
              METER
            </Typography>
            <Typography
              onClick={() => {
                if (!hasNickname) navigate("/nickname");
              }}
              sx={{
                fontSize: { xs: "0.74rem", sm: "0.8rem" },
                fontWeight: 700,
                color: hasNickname ? meterColors.secondary : meterColors.warning,
                cursor: hasNickname ? "default" : "pointer",
                lineHeight: 1,
                whiteSpace: "nowrap",
                maxWidth: 120,
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {displayName}
            </Typography>
          </Stack>
        </Box>
        <UserMenu />
      </Stack>

      {heldTypeSummary && (
        <Chip
          size="small"
          label={`분류 ${heldTypeSummary}`}
          onDelete={() => {
            sessionStorage.removeItem(HELD_KEY);
            setHeldType("");
          }}
          sx={{
            position: "absolute",
            top: 52,
            left: { xs: 8, sm: 12 },
            zIndex: 1250,
            height: 24,
            fontSize: "0.68rem",
            fontWeight: 800,
            borderRadius: 1,
            bgcolor: "rgba(0,0,0,0.86)",
            color: meterColors.primary,
            border: `1px solid ${meterColors.border}`,
          }}
        />
      )}

      {geoMessage && (
        <Alert
          severity="warning"
          sx={{
            position: "absolute",
            top: 92,
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

      {route && (
        <Box
          sx={{
            position: "absolute",
            right: { xs: 8, sm: 12 },
            top: 58,
            zIndex: 1260,
            width: { xs: 190, sm: 220 },
            maxHeight: "42dvh",
            overflowY: "auto",
            p: 1.2,
            borderRadius: 2.5,
            bgcolor: "rgba(0,0,0,0.9)",
            border: `1px solid ${meterColors.borderStrong}`,
            backdropFilter: "blur(10px)",
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.6 }}>
            <Typography sx={{ fontSize: "0.74rem", fontWeight: 900, whiteSpace: "nowrap" }}>
              경로 · {(route.totalMeters / 1000).toFixed(2)}km
              {route.usedRoadNetwork ? " · 도로" : ""}
            </Typography>
            <IconButton size="small" onClick={() => setRoute(null)} sx={{ color: meterColors.secondary, p: 0.2 }}>
              <CloseRoundedIcon sx={{ fontSize: "1rem" }} />
            </IconButton>
          </Stack>
          <Typography sx={{ fontSize: "0.62rem", color: meterColors.secondary, mb: 0.8, whiteSpace: "nowrap" }}>
            화면 · 적재율 {ROUTE_FILL_THRESHOLD}%↑
          </Typography>
          <Stack spacing={0.5}>
            {route.stops.map((stop) => (
              <Stack key={stop.serialNumber} direction="row" spacing={0.8} alignItems="center">
                <Box
                  sx={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    bgcolor: meterColors.primary,
                    color: "#0a0a0a",
                    fontSize: "0.6rem",
                    fontWeight: 900,
                    flexShrink: 0,
                  }}
                >
                  {stop.label}
                </Box>
                <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, flex: 1, minWidth: 0 }} noWrap>
                  {stop.serialNumber} · {moduleTypeLabel(stop.type)}
                </Typography>
                <Typography sx={{ fontSize: "0.66rem", color: meterColors.fillOrange, fontWeight: 800 }}>
                  {Math.round(stop.fillPercent)}%
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
      )}

      {/* 하단: 내 위치 · AI카메라/최적경로 · 챗봇 — 같은 높이 */}
      <Box
        sx={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1200,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 1,
          px: { xs: 1, sm: 1.5 },
          pb: { xs: 1.4, sm: 1.8 },
          pt: 4,
          pointerEvents: "none",
          background: "linear-gradient(0deg, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.35) 55%, transparent 100%)",
          "& > *": { pointerEvents: "auto" },
        }}
      >
        <Button startIcon={<MyLocationRoundedIcon sx={{ fontSize: "1rem !important" }} />} onClick={focusMyLocation} sx={sideBtnSx}>
          내 위치
        </Button>

        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          <Button startIcon={<PhotoCameraRoundedIcon />} onClick={() => navigate("/camera")} sx={bottomBtnSx}>
            AI 카메라
          </Button>
          <Button
            startIcon={<RouteRoundedIcon />}
            onClick={toggleRoute}
            disabled={routeLoading}
            sx={route ? bottomBtnActiveSx : bottomBtnSx}
          >
            {routeLoading ? "경로 계산중" : route ? "경로 해제" : "최적경로"}
          </Button>
        </Stack>

        <MeterChatbot embed />
      </Box>

      {(loading || error) && (
        <Typography
          sx={{
            position: "absolute",
            left: 12,
            bottom: 72,
            zIndex: 1190,
            fontSize: "0.7rem",
            color: error ? meterColors.danger : meterColors.secondary,
            whiteSpace: "nowrap",
          }}
        >
          {error || "모듈 갱신 중…"}
        </Typography>
      )}

      <Snackbar open={Boolean(toast)} autoHideDuration={3000} onClose={() => setToast("")} message={toast} />
    </Box>
  );
};

export default Map;
