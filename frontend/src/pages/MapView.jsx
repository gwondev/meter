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

/** M=부착모듈, R=카메라. 더미는 D(M)/D(R). */
function seriesMeta(module) {
  const isR =
    module?.deviceType === "VISION_CAM" ||
    String(module?.series || "").toUpperCase().includes("R");
  if (module?.dummy) {
    return { key: isR ? "D(R)" : "D(M)", icon: isR ? "📷" : "📟", isR };
  }
  return { key: isR ? "R" : "M", icon: isR ? "📷" : "📟", isR };
}

/**
 * 카카오 지도 렌더러.
 *
 * @param route  { path:[{lat,lon}], markers:[{lat,lon,label,isOrigin}] } 도로망 경로 + 방문 배지. 없으면 경로 숨김.
 * @param onBoundsChange 화면에 보이는 모듈 시리얼 목록을 부모에 알린다 (최적경로 계산 범위).
 */
export default function MapView({ userPos, modules, route = null, centerTrigger = 0, onBoundsChange }) {
  const fallback = [35.1462, 126.9229];
  const center = userPos && userPos[0] != null && userPos[1] != null ? userPos : fallback;
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const overlaysRef = useRef([]);
  const routeShapesRef = useRef([]);
  const userOverlayRef = useRef(null);
  const popupOverlayRef = useRef(null);
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
      window.kakao.maps.event.addListener(map, "idle", reportVisibleModules);
      window.kakao.maps.event.addListener(map, "click", () => {
        if (popupOverlayRef.current) {
          popupOverlayRef.current.setMap(null);
          popupOverlayRef.current = null;
        }
      });
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
    if (popupOverlayRef.current) {
      popupOverlayRef.current.setMap(null);
      popupOverlayRef.current = null;
    }

    const map = mapRef.current;

    modules.forEach((m) => {
      if (m.lat == null || m.lon == null) return;

      const serial = (m.serialNumber && String(m.serialNumber).trim()) || "—";
      const typeKey = String(m.type || "GENERAL").toUpperCase();
      const typeTitle = moduleTypeLabel(m.type);
      const wasteSymbol = TYPE_SYMBOLS[typeKey] || "📍";
      const series = seriesMeta(m);
      const state = moduleDisplayState(m);
      const waiting = !state.active;
      const position = new window.kakao.maps.LatLng(m.lat, m.lon);

      /* 기본 파란 핀 대신 계열 아이콘 커스텀 마커 */
      const pin = document.createElement("button");
      pin.type = "button";
      pin.style.cssText = [
        "display:flex",
        "align-items:center",
        "justify-content:center",
        "width:34px",
        "height:34px",
        "border-radius:10px",
        "border:2px solid " + (waiting ? "rgba(140,140,140,0.7)" : series.isR ? "#64b5f6" : "#7cff72"),
        "background:" + (waiting ? "rgba(40,40,40,0.92)" : "#111"),
        "color:#fff",
        "font-size:18px",
        "line-height:1",
        "cursor:pointer",
        "box-shadow:0 4px 14px rgba(0,0,0,0.45)",
        "padding:0",
        "filter:" + (waiting ? "grayscale(1)" : "none"),
      ].join(";");
      pin.textContent = series.icon;
      pin.title = `${series.key} · ${typeTitle} (${serial})`;

      const openPopup = () => {
        if (popupOverlayRef.current) {
          popupOverlayRef.current.setMap(null);
          popupOverlayRef.current = null;
        }

        const info = document.createElement("div");
        info.style.cssText = [
          "min-width:180px",
          "max-width:240px",
          "padding:10px 12px",
          "background:" + (waiting ? "#1a1a1a" : "#0d0d0d"),
          "border:1px solid " + (waiting ? "rgba(120,120,120,0.45)" : "rgba(255,255,255,0.22)"),
          "border-radius:4px",
          "color:" + meterColors.primaryMuted,
          "font-size:12px",
          "line-height:1.55",
          "box-shadow:0 10px 28px rgba(0,0,0,0.5)",
          "pointer-events:auto",
        ].join(";");

        const title = document.createElement("div");
        title.style.cssText = `font-weight:800;color:${state.color};font-size:14px;margin-bottom:4px;`;
        title.textContent = state.label;
        info.appendChild(title);

        const meta = document.createElement("div");
        meta.style.opacity = "0.75";
        meta.style.marginBottom = "2px";
        meta.textContent = `${series.key} · ${serial}`;
        info.appendChild(meta);

        const age = document.createElement("div");
        age.style.opacity = "0.65";
        age.textContent = `마지막 신호 ${formatSignalAge(m.lastSignalAt)}`;
        info.appendChild(age);

        if (m.lastImageUrl) {
          const img = document.createElement("img");
          img.src = m.lastImageUrl;
          img.alt = `${serial} 스냅샷`;
          img.style.cssText =
            "margin-top:8px;width:100%;border-radius:4px;border:1px solid rgba(255,255,255,0.15);" +
            (waiting ? "filter:grayscale(1);" : "");
          info.appendChild(img);
        }

        const wrap = document.createElement("div");
        wrap.style.cssText = "position:relative;transform:translateY(-6px);";
        wrap.appendChild(info);
        const tip = document.createElement("div");
        tip.style.cssText =
          "width:0;height:0;margin:0 auto;border-left:7px solid transparent;border-right:7px solid transparent;border-top:8px solid #0d0d0d;";
        wrap.appendChild(tip);

        const popup = new window.kakao.maps.CustomOverlay({
          position,
          content: wrap,
          yAnchor: 1.35,
          zIndex: 10,
          clickable: true,
        });
        popup.setMap(map);
        popupOverlayRef.current = popup;
      };

      pin.addEventListener("click", (e) => {
        e.stopPropagation();
        openPopup();
      });

      const markerOverlay = new window.kakao.maps.CustomOverlay({
        position,
        content: pin,
        yAnchor: 0.5,
        zIndex: 4,
        clickable: true,
      });
      markerOverlay.setMap(map);
      markersRef.current.push(markerOverlay);

      const badge = document.createElement("div");
      badge.style.cssText = [
        "padding:3px 9px",
        "border-radius:4px",
        "border:1px solid " + (waiting ? "rgba(140,140,140,0.5)" : state.color),
        "background:" + (waiting ? "rgba(48,48,48,0.9)" : "rgba(0,0,0,0.86)"),
        "color:" + (waiting ? "rgba(190,190,190,0.85)" : state.color),
        "font-weight:800",
        "font-size:11px",
        "white-space:nowrap",
        "box-shadow:" + (waiting ? "none" : "0 4px 12px rgba(0,0,0,0.35)"),
        "filter:" + (waiting ? "grayscale(1)" : "none"),
        "pointer-events:none",
      ].join(";");
      badge.textContent = waiting
        ? `${series.icon} 신호 대기중`
        : `${series.icon} ${wasteSymbol} ${state.label}`;

      const labelOverlay = new window.kakao.maps.CustomOverlay({
        position,
        content: badge,
        yAnchor: 2.35,
        zIndex: 3,
      });
      labelOverlay.setMap(map);
      overlaysRef.current.push(labelOverlay);
    });

    reportVisibleModules();

    return () => {
      markersRef.current.forEach((mk) => mk.setMap(null));
      overlaysRef.current.forEach((o) => o.setMap(null));
      markersRef.current = [];
      overlaysRef.current = [];
      if (popupOverlayRef.current) {
        popupOverlayRef.current.setMap(null);
        popupOverlayRef.current = null;
      }
    };
  }, [modules, reportVisibleModules, sdkReady]);

  /* 최적 수거 경로 — 도로(실선) + 모듈 직전 링크(점선) + 방향 화살표. */
  useEffect(() => {
    if (!sdkReady || !mapRef.current || !window.kakao?.maps) return;

    routeShapesRef.current.forEach((shape) => shape.setMap(null));
    routeShapesRef.current = [];

    const pathPts = Array.isArray(route?.path) ? route.path : [];
    const markers = Array.isArray(route?.markers) ? route.markers : [];
    const arrows = Array.isArray(route?.arrows) ? route.arrows : [];
    if (pathPts.length < 2 && markers.length < 2) return undefined;

    const map = mapRef.current;

    const toLatLng = (p) => new window.kakao.maps.LatLng(Number(p.lat), Number(p.lon));

    /** kind 가 같은 연속 구간을 묶어 그린다 (road=실선, link=점선). */
    const drawKindSegments = (kind, strokeStyle, weight, color, opacity) => {
      let bucket = [];
      const flush = () => {
        if (bucket.length < 2) {
          bucket = [];
          return;
        }
        const outline = new window.kakao.maps.Polyline({
          path: bucket.map(toLatLng),
          strokeWeight: weight + 4,
          strokeColor: "#ffffff",
          strokeOpacity: 0.95,
          strokeStyle: "solid",
        });
        outline.setMap(map);
        routeShapesRef.current.push(outline);

        const line = new window.kakao.maps.Polyline({
          path: bucket.map(toLatLng),
          strokeWeight: weight,
          strokeColor: color,
          strokeOpacity: opacity,
          strokeStyle,
        });
        line.setMap(map);
        routeShapesRef.current.push(line);
        bucket = [];
      };

      pathPts.forEach((p, idx) => {
        if (p.lat == null || p.lon == null) return;
        const k = p.kind === "link" ? "link" : "road";
        if (k !== kind) {
          flush();
          return;
        }
        /* 이전 점이 다른 kind 였어도 이어지도록 경계점 포함 */
        if (bucket.length === 0 && idx > 0) {
          const prev = pathPts[idx - 1];
          if (prev?.lat != null && prev?.lon != null) bucket.push(prev);
        }
        bucket.push(p);
      });
      flush();
    };

    if (pathPts.length >= 2) {
      drawKindSegments("road", "solid", 5, "#0a0a0a", 1);
      drawKindSegments("link", "shortdash", 4, "#111111", 0.95);
    }

    /* 진행 방향 화살표 — 왕복·겹침 시에도 방향을 읽게 함 */
    arrows.forEach((a) => {
      if (a.lat == null || a.lon == null) return;
      const el = document.createElement("div");
      el.style.cssText = [
        "width:0",
        "height:0",
        "border-left:5px solid transparent",
        "border-right:5px solid transparent",
        "border-bottom:11px solid #0a0a0a",
        `transform:rotate(${Number(a.bearing) || 0}deg)`,
        "filter:drop-shadow(0 0 1px #fff) drop-shadow(0 0 1px #fff)",
        "pointer-events:none",
      ].join(";");
      const overlay = new window.kakao.maps.CustomOverlay({
        position: toLatLng(a),
        content: el,
        yAnchor: 0.5,
        xAnchor: 0.5,
        zIndex: 5,
      });
      overlay.setMap(map);
      routeShapesRef.current.push(overlay);
    });

    markers.forEach((point, index) => {
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
        position: toLatLng(point),
        content: pin,
        yAnchor: 0.5,
        zIndex: 6,
      });
      overlay.setMap(map);
      routeShapesRef.current.push(overlay);
    });

    const bounds = new window.kakao.maps.LatLngBounds();
    const boundPts =
      pathPts.length >= 2
        ? pathPts
        : markers.filter((p) => p.lat != null && p.lon != null);
    boundPts.forEach((p) => bounds.extend(toLatLng(p)));
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
