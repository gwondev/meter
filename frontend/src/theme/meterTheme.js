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
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Pretendard", "Segoe UI", system-ui, sans-serif',
  },
};

/** 모듈 lastHeartbeat → 연결 상태 문구 */
export function isModuleOffline(lastHeartbeat) {
  if (!lastHeartbeat) return true;
  const diffMs = Date.now() - new Date(lastHeartbeat).getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return true;
  return diffMs >= 24 * 60 * 60 * 1000;
}

export function formatModuleConnectivity(lastHeartbeat) {
  if (!lastHeartbeat) return "오프라인";
  const diffMs = Date.now() - new Date(lastHeartbeat).getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return "연결 정보 없음";
  if (diffMs >= 24 * 60 * 60 * 1000) return "모듈점검필요";
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "방금 확인됨";
  if (diffMin < 60) return `${diffMin}분 전 확인됨`;
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return `${hours}시간 전 확인됨`;
  return "모듈점검필요";
}

export function fillLevelFromHeight(heightCm) {
  if (heightCm == null || Number.isNaN(Number(heightCm))) {
    return { label: "측정 대기", color: meterColors.secondary, level: "unknown" };
  }
  const h = Number(heightCm);
  if (h <= 10) return { label: "적재 100% (만재)", color: meterColors.fillRed, level: "critical" };
  if (h <= 30) return { label: "주의 (30cm 이하)", color: meterColors.fillOrange, level: "warning" };
  if (h <= 50) return { label: "여유 (50cm 이하)", color: meterColors.fillGreen, level: "ok" };
  return { label: "여유 충분", color: meterColors.primaryMuted, level: "good" };
}
