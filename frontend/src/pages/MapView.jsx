import { useCallback, useEffect, useRef, useState } from "react";
import { Box } from "@mui/material";
import { moduleTypeLabel } from "../constants/wasteLabels";
import {
  formatSignalAge,
  meterColors,
  moduleDisplayState,
} from "../theme/meterTheme";

const KAKAO_APP_KEY = import.meta.env.VITE_KAKAO_API || import.meta.env.KAKAO_API || "";
const KAKAO_SDK_URL = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&autoload=false`;

const TYPE_SYMBOLS = {
  CLOTHING: "👕",
  PLASTIC: "♻️",
  CAN: "🥫",
  MEDICINE: "💊",
  PET: "♻️",
  GENERAL: "🗑️",
  HAZARD: "☣️",
};

/**
 * 카카오 지도 렌더러.
 *
 * @param route         [{lat, lon, serialNumber}] 순서대로 이은 수거 경로. 비면 경로를 지운다.
 * @param onBoundsChange 화면에 보이는 모듈 시리얼 목록을 부모에 알린다 (최적경로 계산 범위).
 */
export default function MapView({ userPos, modules, route = [], centerTrigger = 0, onBoundsChange }) {
  const fallback = [35.1462, 126.9229];
  const center = userPos && userPos[0] != null && userPos[1] != null ? userPos : fallback;
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const overlaysRef = useRef([]);
  const routeShapesRef = useRef([]);
  const userOverlayRef = useRef(null);
  const infoRef = useRef(null);
  const centeredOnceRef = useRef(false);
  const latestCenterTriggerRef = useRef(centerTrigger);
  const modulesRef = useRef(modules);
  const boundsCallbackRef = useRef(onBoundsChange);
  const [sdkReady, setSdkReady] = useState(false);
  const [debugMessage, setDebugMessage] = useState("");

  modulesRef.current = modules;
  boundsCallbackRef.current = onBoundsChange;

  useEffect(() => {
    if (!KAKAO_APP_KEY) return undefined;

    const markReady = () => {
      if (!window.kakao?.maps) return;
      window.kakao.maps.load(() => {
        setSdkReady(true);
        setDebugMessage("");
      });
    };
    const markError = (reason) => {
      setDebugMessage(
        `[KAKAO MAP ERROR] ${reason}\nkeyLoaded=${Boolean(KAKAO_APP_KEY)} host=${window.location.host}\n` +
          "카카오 콘솔 JavaScript SDK 도메인에 meter.gwon.run 등록 필요"
      );
    };

    if (window.kakao?.maps) {
      markReady();
      return undefined;
    }

    const existing = document.querySelector("script[data-kakao-map='true']");
    if (existing) {
      existing.addEventListener("load", markReady);
      existing.addEventListener("error", () => markError("sdk script load failed(existing)"));
      return () => existing.removeEventListener("load", markReady);
    }

    const script = document.createElement("script");
    script.src = KAKAO_SDK_URL;
    script.async = true;
    script.dataset.kakaoMap = "true";
    script.addEventListener("load", markReady);
    script.addEventListener("error", () => markError("sdk script load failed"));
    document.head.appendChild(script);
    const timer = window.setTimeout(() => {
      if (!window.kakao?.maps) markError("sdk load timeout");
    }, 5000);
    return () => {
      script.removeEventListener("load", markReady);
      window.clearTimeout(timer);
    };
  }, []);

  /** 현재 지도 영역 안의 모듈만 골라 부모에게 넘긴다. */
  const reportVisibleModules = useCallback(() => {
    const map = mapRef.current;
    const notify = boundsCallbackRef.current;
    if (!map || !notify || !window.kakao?.maps) return;

    const bounds = map.getBounds();
    const visible = (modulesRef.current || []).filter((m) => {
      if (m.lat == null || m.lon == null) return false;
      return bounds.contain(new window.kakao.maps.LatLng(m.lat, m.lon));
    });
    notify(visible);
  }, []);

  useEffect(() => {
    if (!KAKAO_APP_KEY || !sdkReady || !containerRef.current || !window.kakao?.maps) return;
    if (mapRef.current) return;

    try {
      const map = new window.kakao.maps.Map(containerRef.current, {
        center: new window.kakao.maps.LatLng(center[0], center[1]),
        level: 3,
      });
      mapRef.current = map;
      infoRef.current = new window.kakao.maps.InfoWindow({ zIndex: 3 });
      window.kakao.maps.event.addListener(map, "idle", reportVisibleModules);
      reportVisibleModules();
    } catch (e) {
      setDebugMessage(`[KAKAO MAP ERROR] map init failed: ${e?.message || String(e)}`);
    }
  }, [center, reportVisibleModules, sdkReady]);

  useEffect(() => {
    if (!sdkReady || !mapRef.current || !window.kakao?.maps) return;
    if (!userPos || userPos[0] == null || userPos[1] == null) return;

    const hasNewTrigger = latestCenterTriggerRef.current !== centerTrigger;
    if (!centeredOnceRef.current || hasNewTrigger) {
      mapRef.current.panTo(new window.kakao.maps.LatLng(userPos[0], userPos[1]));
      centeredOnceRef.current = true;
      latestCenterTriggerRef.current = centerTrigger;
    }
  }, [centerTrigger, sdkReady, userPos]);

  useEffect(() => {
    if (!sdkReady || !mapRef.current || !window.kakao?.maps) return;

    markersRef.current.forEach((m) => m.setMap(null));
    overlaysRef.current.forEach((o) => o.setMap(null));
    markersRef.current = [];
    overlaysRef.current = [];

    const map = mapRef.current;
    const infoWindow = infoRef.current;

    modules.forEach((m) => {
      if (m.lat == null || m.lon == null) return;

      const serial = (m.serialNumber && String(m.serialNumber).trim()) || "—";
      const typeKey = String(m.type || "GENERAL").toUpperCase();
      const typeTitle = moduleTypeLabel(m.type);
      const typeSymbol = TYPE_SYMBOLS[typeKey] || "📍";
      const state = moduleDisplayState(m);
      const waiting = !state.active;
      const position = new window.kakao.maps.LatLng(m.lat, m.lon);

      const marker = new window.kakao.maps.Marker({
        map,
        position,
        title: `${typeTitle} (${serial})`,
        opacity: waiting ? 0.45 : 1,
      });
      markersRef.current.push(marker);

      const badge = document.createElement("div");
      badge.style.padding = "3px 9px";
      badge.style.borderRadius = "999px";
      badge.style.border = `1px solid ${waiting ? "rgba(140,140,140,0.5)" : state.color}`;
      badge.style.background = waiting ? "rgba(48,48,48,0.9)" : "rgba(0,0,0,0.86)";
      badge.style.color = waiting ? "rgba(190,190,190,0.85)" : state.color;
      badge.style.fontWeight = "800";
      badge.style.fontSize = "11px";
      badge.style.whiteSpace = "nowrap";
      badge.style.boxShadow = waiting ? "none" : "0 4px 12px rgba(0,0,0,0.35)";
      badge.style.filter = waiting ? "grayscale(1)" : "none";
      badge.textContent = waiting ? `${typeSymbol} 신호 대기중` : `${typeSymbol} ${state.label}`;

      const labelOverlay = new window.kakao.maps.CustomOverlay({
        position,
        content: badge,
        yAnchor: 2.6,
      });
      labelOverlay.setMap(map);
      overlaysRef.current.push(labelOverlay);

      window.kakao.maps.event.addListener(marker, "click", () => {
        const info = document.createElement("div");
        info.style.minWidth = "210px";
        info.style.maxWidth = "270px";
        info.style.padding = "12px 14px";
        info.style.background = waiting ? "#1a1a1a" : "#111";
        info.style.border = `1px solid ${waiting ? "rgba(120,120,120,0.4)" : meterColors.borderStrong}`;
        info.style.borderRadius = "12px";
        info.style.color = meterColors.primaryMuted;
        info.style.fontSize = "12px";
        info.style.lineHeight = "1.6";
        info.style.boxShadow = "0 12px 32px rgba(0,0,0,0.45)";

        const appendLine = (text, style = {}) => {
          const line = document.createElement("div");
          Object.assign(line.style, style);
          line.textContent = text;
          info.appendChild(line);
        };

        /* 팝업: 상태 · 측정높이 · 마지막신호만 */
        appendLine(state.label, {
          fontWeight: "800",
          color: state.color,
          fontSize: "14px",
          marginBottom: "6px",
        });
        if (m.heightCm != null) {
          appendLine(`측정 높이 ${Number(m.heightCm).toFixed(1)}cm`, { opacity: "0.75" });
        }
        appendLine(`마지막 신호 ${formatSignalAge(m.lastSignalAt)}`, { opacity: "0.65" });

        if (m.lastImageUrl) {
          const img = document.createElement("img");
          img.src = m.lastImageUrl;
          img.alt = `${serial} 스냅샷`;
          img.style.marginTop = "8px";
          img.style.width = "100%";
          img.style.borderRadius = "4px";
          img.style.border = `1px solid ${meterColors.border}`;
          img.style.filter = waiting ? "grayscale(1)" : "none";
          info.appendChild(img);
        }

        infoWindow.setContent(info);
        infoWindow.open(map, marker);
      });
    });

    reportVisibleModules();

    return () => {
      markersRef.current.forEach((mk) => mk.setMap(null));
      overlaysRef.current.forEach((o) => o.setMap(null));
      markersRef.current = [];
      overlaysRef.current = [];
    };
  }, [modules, reportVisibleModules, sdkReady]);

  /* 최적 수거 경로 — 지도 위에 직접 폴리라인과 순번 배지를 얹는다. */
  useEffect(() => {
    if (!sdkReady || !mapRef.current || !window.kakao?.maps) return;

    routeShapesRef.current.forEach((shape) => shape.setMap(null));
    routeShapesRef.current = [];

    if (!route || route.length < 2) return undefined;

    const map = mapRef.current;
    const path = route
      .filter((p) => p.lat != null && p.lon != null)
      .map((p) => new window.kakao.maps.LatLng(p.lat, p.lon));
    if (path.length < 2) return undefined;

    const glow = new window.kakao.maps.Polyline({
      path,
      strokeWeight: 11,
      strokeColor: "#ffffff",
      strokeOpacity: 0.2,
      strokeStyle: "solid",
    });
    glow.setMap(map);
    routeShapesRef.current.push(glow);

    const line = new window.kakao.maps.Polyline({
      path,
      strokeWeight: 5,
      strokeColor: "#ffffff",
      strokeOpacity: 0.95,
      strokeStyle: "solid",
    });
    line.setMap(map);
    routeShapesRef.current.push(line);

    route.forEach((point, index) => {
      if (point.lat == null || point.lon == null) return;

      const pin = document.createElement("div");
      pin.style.display = "flex";
      pin.style.alignItems = "center";
      pin.style.justifyContent = "center";
      pin.style.width = "26px";
      pin.style.height = "26px";
      pin.style.borderRadius = "50%";
      pin.style.fontSize = "12px";
      pin.style.fontWeight = "900";
      pin.style.boxShadow = "0 4px 14px rgba(0,0,0,0.55)";

      const isStart = point.isOrigin === true;
      pin.style.background = isStart ? "#0a0a0a" : "#ffffff";
      pin.style.color = isStart ? "#ffffff" : "#0a0a0a";
      pin.style.border = `2px solid ${isStart ? "#ffffff" : "#0a0a0a"}`;
      pin.textContent = point.label ?? String(index + 1);

      const overlay = new window.kakao.maps.CustomOverlay({
        position: new window.kakao.maps.LatLng(point.lat, point.lon),
        content: pin,
        yAnchor: 0.5,
        zIndex: 6,
      });
      overlay.setMap(map);
      routeShapesRef.current.push(overlay);
    });

    /* 경로 전체가 한 화면에 들어오도록 맞춘다. */
    const bounds = new window.kakao.maps.LatLngBounds();
    path.forEach((p) => bounds.extend(p));
    map.setBounds(bounds, 60, 60, 60, 60);

    return () => {
      routeShapesRef.current.forEach((shape) => shape.setMap(null));
      routeShapesRef.current = [];
    };
  }, [route, sdkReady]);

  useEffect(() => {
    if (!sdkReady || !mapRef.current || !window.kakao?.maps) return;

    if (userOverlayRef.current) {
      userOverlayRef.current.setMap(null);
      userOverlayRef.current = null;
    }
    if (!userPos || userPos[0] == null || userPos[1] == null) return;

    if (!document.getElementById("meter-user-pulse-style")) {
      const style = document.createElement("style");
      style.id = "meter-user-pulse-style";
      style.textContent = `
        @keyframes meterUserPulse {
          0% { transform: scale(0.72); opacity: 0.95; }
          70% { transform: scale(1.55); opacity: 0.22; }
          100% { transform: scale(1.85); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    const dotWrap = document.createElement("div");
    dotWrap.style.position = "relative";
    dotWrap.style.width = "64px";
    dotWrap.style.height = "30px";
    dotWrap.style.transform = "translate(-11px, -11px)";

    const pulseWrap = document.createElement("div");
    pulseWrap.style.position = "absolute";
    pulseWrap.style.left = "11px";
    pulseWrap.style.top = "11px";
    pulseWrap.style.width = "0";
    pulseWrap.style.height = "0";

    const pulse = document.createElement("div");
    pulse.style.position = "absolute";
    pulse.style.left = "50%";
    pulse.style.top = "50%";
    pulse.style.width = "22px";
    pulse.style.height = "22px";
    pulse.style.borderRadius = "50%";
    pulse.style.background = "rgba(255,255,255,0.35)";
    pulse.style.transform = "translate(-50%, -50%)";
    pulse.style.animation = "meterUserPulse 1.1s ease-out infinite";

    const core = document.createElement("div");
    core.style.position = "absolute";
    core.style.left = "50%";
    core.style.top = "50%";
    core.style.width = "10px";
    core.style.height = "10px";
    core.style.borderRadius = "50%";
    core.style.background = "#ffffff";
    core.style.border = "2px solid rgba(0,0,0,0.85)";
    core.style.boxShadow = "0 0 10px rgba(255,255,255,0.5)";
    core.style.transform = "translate(-50%, -50%)";

    pulseWrap.appendChild(pulse);
    pulseWrap.appendChild(core);
    dotWrap.appendChild(pulseWrap);

    const userText = document.createElement("div");
    userText.textContent = "내위치";
    userText.style.position = "absolute";
    userText.style.left = "24px";
    userText.style.top = "4px";
    userText.style.padding = "2px 7px";
    userText.style.borderRadius = "999px";
    userText.style.background = "rgba(0,0,0,0.85)";
    userText.style.border = `1px solid ${meterColors.borderStrong}`;
    userText.style.color = meterColors.primary;
    userText.style.fontSize = "10px";
    userText.style.fontWeight = "700";
    userText.style.whiteSpace = "nowrap";
    dotWrap.appendChild(userText);

    const overlay = new window.kakao.maps.CustomOverlay({
      position: new window.kakao.maps.LatLng(userPos[0], userPos[1]),
      content: dotWrap,
      yAnchor: 0.5,
      zIndex: 7,
    });
    overlay.setMap(mapRef.current);
    userOverlayRef.current = overlay;

    return () => {
      if (userOverlayRef.current) {
        userOverlayRef.current.setMap(null);
        userOverlayRef.current = null;
      }
    };
  }, [userPos, sdkReady]);

  if (!KAKAO_APP_KEY) {
    return (
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          minHeight: 280,
          display: "grid",
          placeItems: "center",
          color: "rgba(255,255,255,0.75)",
          bgcolor: "#111",
          px: 2,
          textAlign: "center",
        }}
      >
        카카오 지도 키가 없습니다. VITE_KAKAO_API 또는 KAKAO_API_METER를 설정해 주세요.
      </Box>
    );
  }

  if (!sdkReady || debugMessage) {
    return (
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          minHeight: 280,
          display: "grid",
          placeItems: "center",
          color: "rgba(255,255,255,0.75)",
          bgcolor: "#111",
          px: 2,
          textAlign: "center",
          whiteSpace: "pre-line",
        }}
      >
        {debugMessage || "카카오 지도 로딩 중..."}
      </Box>
    );
  }

  return (
    <Box sx={{ position: "absolute", inset: 0, minHeight: 280 }}>
      <Box ref={containerRef} sx={{ height: "100%", width: "100%", bgcolor: "#0a0a0a" }} />
    </Box>
  );
}
