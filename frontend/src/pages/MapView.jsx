import { useEffect, useRef, useState } from "react";
import { Box } from "@mui/material";
import { moduleTypeLabel } from "../constants/wasteLabels";
import { formatModuleConnectivity, fillLevelFromHeight, isModuleOffline, meterColors } from "../theme/meterTheme";

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

export default function MapView({ userPos, modules, onDispose, centerTrigger = 0 }) {
  const fallback = [35.1462, 126.9229];
  const center = userPos && userPos[0] != null && userPos[1] != null ? userPos : fallback;
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const overlaysRef = useRef([]);
  const userOverlayRef = useRef(null);
  const infoRef = useRef(null);
  const centeredOnceRef = useRef(false);
  const latestCenterTriggerRef = useRef(centerTrigger);
  const [sdkReady, setSdkReady] = useState(false);
  const [debugMessage, setDebugMessage] = useState("");

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
    } catch (e) {
      setDebugMessage(`[KAKAO MAP ERROR] map init failed: ${e?.message || String(e)}`);
    }
  }, [center, sdkReady]);

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
      const isFull = String(m.status || "").toUpperCase() === "FULL";
      const typeKey = String(m.type || "PLASTIC").toUpperCase();
      const typeTitle = moduleTypeLabel(m.type);
      const typeSymbol = TYPE_SYMBOLS[typeKey] || "📍";
      const connectivity = formatModuleConnectivity(m.lastHeartbeat);
      const offline = isModuleOffline(m.lastHeartbeat);
      const needsCheck = connectivity === "모듈점검필요";
      const fill = fillLevelFromHeight(m.heightCm);
      const grayed = offline || isFull || fill.level === "critical";
      const position = new window.kakao.maps.LatLng(m.lat, m.lon);

      const marker = new window.kakao.maps.Marker({
        map,
        position,
        title: `${typeTitle} (${serial})`,
      });
      markersRef.current.push(marker);

      const badge = document.createElement("div");
      badge.style.padding = "3px 8px";
      badge.style.borderRadius = "999px";
      badge.style.border = `1px solid ${grayed ? "rgba(140,140,140,0.55)" : needsCheck ? meterColors.danger : meterColors.borderStrong}`;
      badge.style.background = grayed ? "rgba(60,60,60,0.9)" : "rgba(0,0,0,0.85)";
      badge.style.color = grayed ? "rgba(200,200,200,0.85)" : needsCheck ? meterColors.danger : meterColors.primary;
      badge.style.fontWeight = "800";
      badge.style.fontSize = "11px";
      badge.style.whiteSpace = "nowrap";
      badge.style.boxShadow = grayed ? "none" : "0 4px 12px rgba(0,0,0,0.35)";
      badge.style.opacity = grayed ? "0.72" : "1";
      badge.style.filter = grayed ? "grayscale(0.75)" : "none";
      badge.textContent = `${typeSymbol} ${typeTitle}${offline ? " · 오프라인" : ""}`;

      const labelOverlay = new window.kakao.maps.CustomOverlay({
        position,
        content: badge,
        yAnchor: 2.6,
      });
      labelOverlay.setMap(map);
      overlaysRef.current.push(labelOverlay);

      window.kakao.maps.event.addListener(marker, "click", () => {
        const info = document.createElement("div");
        info.style.minWidth = "200px";
        info.style.maxWidth = "260px";
        info.style.padding = "12px 14px";
        info.style.background = grayed ? "#1a1a1a" : "#111";
        info.style.border = `1px solid ${grayed ? "rgba(120,120,120,0.4)" : meterColors.borderStrong}`;
        info.style.borderRadius = "12px";
        info.style.color = meterColors.primaryMuted;
        info.style.fontSize = "12px";
        info.style.lineHeight = "1.5";
        info.style.boxShadow = "0 12px 32px rgba(0,0,0,0.45)";

        const title = document.createElement("div");
        title.style.fontWeight = "800";
        title.style.color = meterColors.primary;
        title.style.marginBottom = "6px";
        title.style.fontSize = "14px";
        title.textContent = `${typeSymbol} ${typeTitle}`;

        const serialLine = document.createElement("div");
        serialLine.style.opacity = "0.75";
        serialLine.style.marginBottom = "4px";
        serialLine.textContent = `모듈 ${serial}`;

        const connLine = document.createElement("div");
        connLine.style.fontWeight = "700";
        connLine.style.color = offline ? meterColors.secondary : needsCheck ? meterColors.danger : meterColors.primaryMuted;
        connLine.style.marginBottom = "4px";
        connLine.textContent = connectivity;

        const fillLine = document.createElement("div");
        fillLine.style.fontWeight = "600";
        fillLine.style.color = fill.color;
        fillLine.style.marginBottom = "4px";
        fillLine.textContent = m.heightCm != null ? `적재 높이 ${Number(m.heightCm).toFixed(1)}cm · ${fill.label}` : fill.label;

        const total = document.createElement("div");
        total.style.opacity = "0.65";
        total.style.marginBottom = "8px";
        total.textContent = `누적 투입 ${m.totalDisposalCount ?? 0}회`;

        info.appendChild(title);
        info.appendChild(serialLine);
        info.appendChild(connLine);
        info.appendChild(fillLine);
        info.appendChild(total);

        const action = document.createElement("button");
        action.type = "button";
        action.style.marginTop = "4px";
        action.style.width = "100%";
        action.style.border = "none";
        action.style.borderRadius = "8px";
        action.style.padding = "10px 12px";
        action.style.fontWeight = "800";
        action.style.cursor = needsCheck || isFull || offline ? "not-allowed" : "pointer";
        action.style.background = needsCheck || isFull || offline ? "rgba(255,255,255,0.12)" : meterColors.primary;
        action.style.color = needsCheck || isFull || offline ? "rgba(255,255,255,0.5)" : "#0a0a0a";
        action.disabled = needsCheck || isFull || offline;
        action.textContent = offline ? "오프라인" : needsCheck ? "점검 필요" : isFull ? "만재 (FULL)" : "버리기";
        action.addEventListener("click", () => {
          if (!action.disabled) onDispose(m.serialNumber);
        });
        info.appendChild(action);

        infoWindow.setContent(info);
        infoWindow.open(map, marker);
      });
    });

    return () => {
      markersRef.current.forEach((mk) => mk.setMap(null));
      overlaysRef.current.forEach((o) => o.setMap(null));
      markersRef.current = [];
      overlaysRef.current = [];
    };
  }, [modules, onDispose, sdkReady]);

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
