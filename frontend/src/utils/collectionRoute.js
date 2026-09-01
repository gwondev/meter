import { isSignalActive } from "../theme/meterTheme";

/** 수거 대상으로 볼 최소 적재율 — 이 값 미만은 경로에서 제외한다. */
export const ROUTE_FILL_THRESHOLD = 50;

const EARTH_RADIUS_M = 6371000;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

export function haversineMeters(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

function pathLength(points) {
  let total = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    total += haversineMeters(points[i], points[i + 1]);
  }
  return total;
}

/**
 * 적재율을 거리에 반영한 비용 — 가득 찬 거점을 먼저 들르도록 유도한다.
 * 100% 는 거리를 그대로, 50% 는 약 1.5배로 본다.
 */
function urgencyWeightedCost(from, to) {
  const distance = haversineMeters(from, to);
  const fill = Math.max(0, Math.min(100, Number(to.fillPercent ?? 0)));
  const penalty = 1 + (100 - fill) / 100;
  return distance * penalty;
}

/** 최근접 이웃으로 초기 순회를 만든다. */
function nearestNeighborOrder(origin, stops) {
  const remaining = [...stops];
  const ordered = [];
  let current = origin;

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestCost = Infinity;
    remaining.forEach((candidate, index) => {
      const cost = urgencyWeightedCost(current, candidate);
      if (cost < bestCost) {
        bestCost = cost;
        bestIndex = index;
      }
    });
    const [next] = remaining.splice(bestIndex, 1);
    ordered.push(next);
    current = next;
  }
  return ordered;
}

/** 2-opt 로 교차 구간을 펴서 총 이동거리를 줄인다. */
function twoOptImprove(origin, stops, maxPasses = 40) {
  if (stops.length < 4) return stops;

  let best = [...stops];
  let bestLength = pathLength([origin, ...best]);

  for (let pass = 0; pass < maxPasses; pass += 1) {
    let improved = false;

    for (let i = 0; i < best.length - 1; i += 1) {
      for (let k = i + 1; k < best.length; k += 1) {
        const candidate = [
          ...best.slice(0, i),
          ...best.slice(i, k + 1).reverse(),
          ...best.slice(k + 1),
        ];
        const candidateLength = pathLength([origin, ...candidate]);
        if (candidateLength < bestLength - 0.5) {
          best = candidate;
          bestLength = candidateLength;
          improved = true;
        }
      }
    }
    if (!improved) break;
  }
  return best;
}

/**
 * 화면에 보이는 모듈로 최적 수거 경로를 만든다.
 *
 * <p>신호가 끊긴 회색 모듈과 적재율이 기준 미달인 모듈은 제외한다.
 * 출발점은 사용자 현재 위치이며, 없으면 가장 급한 모듈에서 시작한다.
 *
 * @returns {{ points: Array, stops: Array, totalMeters: number, reason: string }}
 */
export function buildCollectionRoute(visibleModules, userPos, threshold = ROUTE_FILL_THRESHOLD) {
  const candidates = (visibleModules || [])
    .filter((m) => m.lat != null && m.lon != null)
    .filter((m) => isSignalActive(m))
    .filter((m) => Number(m.fillPercent ?? 0) >= threshold)
    .map((m) => ({
      serialNumber: m.serialNumber,
      lat: Number(m.lat),
      lon: Number(m.lon),
      fillPercent: Number(m.fillPercent ?? 0),
      type: m.type,
      deviceType: m.deviceType,
    }));

  if (candidates.length === 0) {
    return {
      points: [],
      stops: [],
      totalMeters: 0,
      reason: `화면 안에 적재율 ${threshold}% 이상인 활성 모듈이 없습니다.`,
    };
  }

  const hasOrigin = Array.isArray(userPos) && userPos[0] != null && userPos[1] != null;
  let origin;
  let stops;

  if (hasOrigin) {
    origin = { lat: Number(userPos[0]), lon: Number(userPos[1]), isOrigin: true, label: "S" };
    stops = candidates;
  } else {
    const sorted = [...candidates].sort((a, b) => b.fillPercent - a.fillPercent);
    origin = { ...sorted[0], isOrigin: true, label: "1" };
    stops = sorted.slice(1);
  }

  const ordered = twoOptImprove(origin, nearestNeighborOrder(origin, stops));
  const offset = hasOrigin ? 1 : 2;
  const labeledStops = ordered.map((stop, index) => ({ ...stop, label: String(index + offset) }));
  const points = [origin, ...labeledStops];

  if (points.length < 2) {
    return {
      points: [],
      stops: labeledStops,
      totalMeters: 0,
      reason: "경로를 그리려면 활성 모듈이 2곳 이상 필요합니다.",
    };
  }

  return {
    points,
    stops: hasOrigin ? labeledStops : [origin, ...labeledStops],
    totalMeters: Math.round(pathLength(points)),
    reason: "",
  };
}
