import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { moduleTypeMatchesHeld, HELD_TYPE_LABELS, moduleTypeLabel } from "../constants/wasteLabels";
import { meterColors, WAITING_COLOR } from "../theme/meterTheme";
import { buildCollectionRoute, ROUTE_FILL_THRESHOLD } from "../utils/collectionRoute";
import {
  Typography,
  Box,
  Stack,
  Button,
  Alert,
  Snackbar,
  IconButton,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { getUser, ensureSession, needsNickname } from "../services/auth";
import { apiFetch } from "../services/api";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import RouteRoundedIcon from "@mui/icons-material/RouteRounded";
import MyLocationRoundedIcon from "@mui/icons-material/MyLocationRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
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

  const waitingCount = useMemo(
    () => modulesForMap.filter((m) => m.signalState !== "ACTIVE").length,
    [modulesForMap]
  );

  const activeCount = modulesForMap.length - waitingCount;

  const toggleRoute = () => {
    if (route) {
      setRoute(null);
      return;
    }
    const result = buildCollectionRoute(visibleModules, userPos);
    if (result.points.length < 2) {
      setToast(result.reason || "경로를 만들 수 없습니다.");
      return;
    }
    setRoute(result);
  };

  const heldTypeSummary = useMemo(() => {
    const key = (heldType || "").trim().toUpperCase();
    if (!key) return "";
    return HELD_TYPE_LABELS[key] || key;
  }, [heldType]);

  if (!user?.oauthId) return null;

  const displayName = user?.nickname?.trim() || "닉네임 설정";

  const sideBtnSx = {
    minWidth: 0,
    px: { xs: 1.1, sm: 1.4 },
    py: 1.2,
    borderRadius: 2.5,
    fontWeight: 800,
    textTransform: "none",
    fontSize: { xs: "0.72rem", sm: "0.82rem" },
    border: `1px solid ${meterColors.borderStrong}`,
    color: meterColors.primary,
    bgcolor: "rgba(0,0,0,0.9)",
    backdropFilter: "blur(10px)",
    boxShadow: "0 8px 28px rgba(0,0,0,0.45)",
    "&:hover": {
      bgcolor: "rgba(24,24,24,0.96)",
      borderColor: meterColors.primary,
    },
  };

  const bottomBtnSx = {
    minWidth: { xs: 118, sm: 140 },
    px: 1.8,
    py: 1.35,
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
            route={route?.points || []}
            centerTrigger={centerTrigger}
            onBoundsChange={handleBoundsChange}
          />
        </Suspense>
      </Box>

      {/* 상단: 좌측 통합 패널 + 우측 메뉴 */}
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
            minWidth: { xs: 168, sm: 196 },
            px: 1.35,
            py: 1.1,
            borderRadius: 2.5,
            bgcolor: "rgba(0,0,0,0.88)",
            border: `1px solid ${meterColors.borderStrong}`,
            boxShadow: "0 10px 32px rgba(0,0,0,0.5)",
            backdropFilter: "blur(12px)",
          }}
        >
          <Stack direction="row" alignItems="baseline" justifyContent="space-between" spacing={1}>
            <Typography
              sx={{
                fontWeight: 900,
                fontSize: { xs: "0.95rem", sm: "1.05rem" },
                letterSpacing: "0.08em",
                lineHeight: 1,
              }}
            >
              METER
            </Typography>
            <Typography
              onClick={() => {
                if (!user?.nickname?.trim()) navigate("/nickname");
              }}
              sx={{
                fontSize: "0.68rem",
                fontWeight: 700,
                color: user?.nickname?.trim() ? meterColors.secondary : meterColors.warning,
                cursor: user?.nickname?.trim() ? "default" : "pointer",
                maxWidth: 88,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {displayName}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1.2} sx={{ mt: 1 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: "0.58rem", color: meterColors.secondary, fontWeight: 700, letterSpacing: "0.04em" }}>
                활성
              </Typography>
              <Typography sx={{ fontSize: "1.05rem", fontWeight: 900, color: meterColors.fillGreen, lineHeight: 1.1 }}>
                {activeCount}
              </Typography>
            </Box>
            <Box sx={{ width: "1px", bgcolor: meterColors.border, alignSelf: "stretch" }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: "0.58rem", color: meterColors.secondary, fontWeight: 700, letterSpacing: "0.04em" }}>
                대기
              </Typography>
              <Typography sx={{ fontSize: "1.05rem", fontWeight: 900, color: WAITING_COLOR, lineHeight: 1.1 }}>
                {waitingCount}
              </Typography>
            </Box>
            {heldTypeSummary && (
              <>
                <Box sx={{ width: "1px", bgcolor: meterColors.border, alignSelf: "stretch" }} />
                <Box sx={{ flex: 1.2, minWidth: 0 }}>
                  <Typography sx={{ fontSize: "0.58rem", color: meterColors.secondary, fontWeight: 700 }}>
                    분류
                  </Typography>
                  <Stack direction="row" alignItems="center" spacing={0.3}>
                    <Typography sx={{ fontSize: "0.72rem", fontWeight: 800, whiteSpace: "nowrap" }} noWrap>
                      {heldTypeSummary}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => {
                        sessionStorage.removeItem(HELD_KEY);
                        setHeldType("");
                      }}
                      sx={{ p: 0.15, color: meterColors.secondary }}
                    >
                      <CloseRoundedIcon sx={{ fontSize: "0.75rem" }} />
                    </IconButton>
                  </Stack>
                </Box>
              </>
            )}
          </Stack>
        </Box>
        <UserMenu />
      </Stack>

      {geoMessage && (
        <Alert
          severity="warning"
          sx={{
            position: "absolute",
            top: 108,
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
            <Typography sx={{ fontSize: "0.74rem", fontWeight: 900 }}>
              최적 수거 경로 · {(route.totalMeters / 1000).toFixed(2)}km
            </Typography>
            <IconButton size="small" onClick={() => setRoute(null)} sx={{ color: meterColors.secondary, p: 0.2 }}>
              <CloseRoundedIcon sx={{ fontSize: "1rem" }} />
            </IconButton>
          </Stack>
          <Typography sx={{ fontSize: "0.62rem", color: meterColors.secondary, mb: 0.8 }} noWrap>
            현재 화면 · 적재율 {ROUTE_FILL_THRESHOLD}% 이상
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

      {/* 하단 한 줄: 내 위치 | AI 카메라·최적경로 | 챗봇 */}
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
        <Button startIcon={<MyLocationRoundedIcon sx={{ fontSize: "1.05rem !important" }} />} onClick={focusMyLocation} sx={sideBtnSx}>
          내 위치
        </Button>

        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          <Button startIcon={<PhotoCameraRoundedIcon />} onClick={() => navigate("/camera")} sx={bottomBtnSx}>
            AI 카메라
          </Button>
          <Button startIcon={<RouteRoundedIcon />} onClick={toggleRoute} sx={route ? bottomBtnActiveSx : bottomBtnSx}>
            {route ? "경로 해제" : "최적경로"}
          </Button>
        </Stack>

        <MeterChatbot docked />
      </Box>

      {(loading || error) && (
        <Typography
          sx={{
            position: "absolute",
            left: 12,
            bottom: 78,
            zIndex: 1190,
            fontSize: "0.7rem",
            color: error ? meterColors.danger : meterColors.secondary,
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
