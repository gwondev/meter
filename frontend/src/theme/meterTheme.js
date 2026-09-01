/** METER 공통 UI 팔레트 — 화이트 & 블랙 */
export const meterColors = {
  bg: "#0a0a0a",
  bgElevated: "#111111",
  bgPaper: "rgba(255,255,255,0.06)",
  primary: "#ffffff",
  primaryMuted: "rgba(255,255,255,0.88)",
  secondary: "rgba(255,255,255,0.55)",
  border: "rgba(255,255,255,0.18)",
  borderStrong: "rgba(255,255,255,0.35)",
  accent: "#f5f5f5",
  danger: "#ff4444",
  warning: "#ff9800",
  success: "#4caf50",
  fillRed: "#ff4444",
  fillOrange: "#ff9800",
  fillGreen: "#66bb6a",
};

export const meterThemeOptions = {
  palette: {
    mode: "dark",
    background: {
      default: meterColors.bg,
      paper: meterColors.bgPaper,
    },
    primary: { main: meterColors.primary },
    secondary: { main: meterColors.secondary },
    text: { primary: meterColors.primary, secondary: meterColors.secondary },
  },
  shape: { borderRadius: 4 }, // 거의 네모 — pill/둥근 카드 대신 사각 테마
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 4, textTransform: "none" },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { borderRadius: 4 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 4 },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 4 },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 4 },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { borderRadius: 4 },
      },
    },
  },
  typography: {
    fontFamily: '"Pretendard", "Segoe UI", system-ui, sans-serif',
  },
};

/** 신호 대기중(회색) 모듈에 쓰는 단일 색 — 지도·목록·라우트에서 공유한다. */
export const WAITING_COLOR = "#6b6b6b";

/** 서버가 내려주는 signalState 를 신뢰하되, 값이 없으면 lastSignalAt 으로 보정한다. */
export function isSignalActive(module) {
  if (!module) return false;
  if (module.dummy) return true;
  if (module.signalState) return module.signalState === "ACTIVE";
  if (!module.lastSignalAt) return false;
  const allowedMs = module.deviceType === "VISION_CAM" ? 12 * 60 * 1000 : 90 * 1000;
  const at = parseServerDateTime(module.lastSignalAt);
  if (!at) return false;
  const diffMs = Date.now() - at.getTime();
  return !Number.isNaN(diffMs) && diffMs >= 0 && diffMs < allowedMs;
}

/** 서버 LocalDateTime(Asia/Seoul, zone 없음) 을 올바르게 파싱한다. */
export function parseServerDateTime(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(raw)) {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  /* zone 없는 ISO → KST(+09:00). 컨테이너 UTC LocalDateTime 이어도
   * Dockerfile 의 user.timezone=Asia/Seoul 로 맞춤. */
  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  const d = new Date(normalized.endsWith("Z") ? normalized : `${normalized}+09:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatSignalAge(lastSignalAt) {
  const at = parseServerDateTime(lastSignalAt);
  if (!at) return "신호 없음";
  const diffMs = Date.now() - at.getTime();
  if (Number.isNaN(diffMs)) return "신호 없음";
  if (diffMs < 0) return "방금";
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}초 전`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}분 전`;
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

/**
 * 모듈 하나의 표시 상태 — 지도 마커 색, 목록 배지, 경로 가중치가 모두 이 값을 쓴다.
 * 신호가 끊긴 모듈은 측정값이 남아 있어도 회색으로 내린다.
 */
export function moduleDisplayState(module) {
  const active = isSignalActive(module);
  if (!active) {
    return {
      active: false,
      label: "신호 대기중",
      color: WAITING_COLOR,
      level: "waiting",
      fillPercent: null,
    };
  }

  const raw = module?.fillPercent;
  if (raw == null || Number.isNaN(Number(raw))) {
    return { active: true, label: "측정 대기", color: meterColors.secondary, level: "unknown", fillPercent: null };
  }

  const fill = Math.round(Number(raw));
  if (fill >= 80) {
    return { active: true, label: `수거 필요 ${fill}%`, color: meterColors.fillRed, level: "critical", fillPercent: fill };
  }
  if (fill >= 50) {
    return { active: true, label: `주의 ${fill}%`, color: meterColors.fillOrange, level: "warning", fillPercent: fill };
  }
  return { active: true, label: `여유 ${fill}%`, color: meterColors.fillGreen, level: "ok", fillPercent: fill };
}

/** 디바이스 계열 표기 — 시리얼 접두어: m* 초음파, r* 카메라. 토픽은 같아도 계열은 시리얼로 갈린다. */
export function deviceTypeLabel(module) {
  if (module?.deviceType === "VISION_CAM") return "카메라 (라즈베리파이)";
  return "초음파 높이 (ESP32)";
}
