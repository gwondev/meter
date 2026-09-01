/** @deprecated 경로는 화면 모듈 전부 방문 — 적재율 필터 없음. UI 호환용. */
export const ROUTE_FILL_THRESHOLD = 0;

const EARTH_RADIUS_M = 6371000;
/** 완전탐색 상한 — 이보다 많으면 NN+2-opt. */
const EXACT_TSP_LIMIT = 8;
const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";
/** 도로가 모듈까지 이만큼 못 오면 직선(도보) 링크로 잇는다. */
const ROAD_SNAP_GAP_M = 18;
/** 화살표 간격(대략). */
const ARROW_EVERY_M = 55;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function clampFill(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
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

/** 방위각(도, 북=0 시계방향). 화살표 회전에 사용. */
export function bearingDegrees(a, b) {
  const φ1 = toRad(a.lat);
  const φ2 = toRad(b.lat);
  const Δλ = toRad(b.lon - a.lon);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function urgencyWeightedCost(from, to) {
  const distance = haversineMeters(from, to);
  const fill = clampFill(to.fillPercent);
  const urgency = 1 + ((100 - fill) / 100) ** 2 * 3;
  return distance * urgency;
}

function tourCost(origin, stops) {
  let total = 0;
  let current = origin;
  for (const stop of stops) {
    total += urgencyWeightedCost(current, stop);
    current = stop;
  }
  return total;
}

function pathLengthMeters(points) {
  let total = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    total += haversineMeters(points[i], points[i + 1]);
  }
  return total;
}

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

function twoOptImprove(origin, stops, maxPasses = 60) {
  if (stops.length < 3) return stops;

  let best = [...stops];
  let bestCost = tourCost(origin, best);

  for (let pass = 0; pass < maxPasses; pass += 1) {
    let improved = false;
    for (let i = 0; i < best.length - 1; i += 1) {
      for (let k = i + 1; k < best.length; k += 1) {
        const candidate = [
          ...best.slice(0, i),
          ...best.slice(i, k + 1).reverse(),
          ...best.slice(k + 1),
        ];
        const cost = tourCost(origin, candidate);
        if (cost < bestCost - 0.5) {
          best = candidate;
          bestCost = cost;
          improved = true;
        }
      }
    }
    if (!improved) break;
  }
  return best;
}

function exactBestOrder(origin, stops) {
  if (stops.length <= 1) return [...stops];

  let best = null;
  let bestCost = Infinity;

  const permute = (arr, start) => {
    if (start === arr.length) {
      const cost = tourCost(origin, arr);
      if (cost < bestCost) {
        bestCost = cost;
        best = [...arr];
      }
      return;
    }
    for (let i = start; i < arr.length; i += 1) {
      [arr[start], arr[i]] = [arr[i], arr[start]];
      permute(arr, start + 1);
      [arr[start], arr[i]] = [arr[i], arr[start]];
    }
  };

  permute([...stops], 0);
  return best || [...stops];
}

/**
 * 화면에 보이는 모듈을 모두 방문하는 최적 순서.
 * 적재율이 높은 거점을 먼저 들르도록 urgency TSP.
 */
export function buildCollectionRoute(visibleModules, userPos, _threshold = ROUTE_FILL_THRESHOLD) {
  const candidates = (visibleModules || [])
    .filter((m) => Number.isFinite(Number(m.lat)) && Number.isFinite(Number(m.lon)))
    .map((m) => ({
      serialNumber: m.serialNumber,
      lat: Number(m.lat),
      lon: Number(m.lon),
      fillPercent: clampFill(m.fillPercent),
      type: m.type,
      deviceType: m.deviceType,
      dummy: Boolean(m.dummy),
      series: m.series,
    }))
    .sort((a, b) => b.fillPercent - a.fillPercent);

  const deduped = [];
  const seenSerial = new Set();
  for (const c of candidates) {
    const key = String(c.serialNumber || "").trim().toLowerCase();
    if (!key || seenSerial.has(key)) continue;
    seenSerial.add(key);
    deduped.push(c);
  }

  if (deduped.length === 0) {
    return emptyRoute("화면에 좌표가 있는 모듈이 없습니다.");
  }

  const hasOrigin = Array.isArray(userPos) && userPos[0] != null && userPos[1] != null;
  let origin;
  let stops;

  if (hasOrigin) {
    origin = {
      lat: Number(userPos[0]),
      lon: Number(userPos[1]),
      isOrigin: true,
      label: "S",
      fillPercent: 100,
    };
    stops = deduped;
  } else {
    origin = { ...deduped[0], isOrigin: true, label: "1" };
    stops = deduped.slice(1);
  }

  const ordered =
    stops.length <= EXACT_TSP_LIMIT
      ? exactBestOrder(origin, stops)
      : twoOptImprove(origin, nearestNeighborOrder(origin, stops));

  const offset = hasOrigin ? 1 : 2;
  const labeledStops = ordered.map((stop, index) => ({
    ...stop,
    label: String(index + offset),
  }));
  const markers = [origin, ...labeledStops];

  if (markers.length < 2) {
    return {
      ...emptyRoute("경로를 그리려면 모듈이 2곳 이상 필요합니다."),
      markers,
      stops: labeledStops,
    };
  }

  return {
    path: markers.map((p) => ({ lat: p.lat, lon: p.lon, kind: "link" })),
    arrows: [],
    markers,
    stops: hasOrigin ? labeledStops : [origin, ...labeledStops],
    totalMeters: Math.round(pathLengthMeters(markers)),
    roadMeters: 0,
    usedRoadNetwork: false,
    reason: "",
  };
}

function emptyRoute(reason) {
  return {
    path: [],
    arrows: [],
    markers: [],
    stops: [],
    totalMeters: 0,
    roadMeters: 0,
    usedRoadNetwork: false,
    reason,
  };
}

function pushPoint(path, point, kind) {
  const next = { lat: Number(point.lat), lon: Number(point.lon), kind };
  if (!Number.isFinite(next.lat) || !Number.isFinite(next.lon)) return;
  const last = path[path.length - 1];
  if (last && haversineMeters(last, next) < 1.2 && last.kind === kind) return;
  path.push(next);
}

async function fetchOsrmLeg(from, to) {
  const coords = `${from.lon},${from.lat};${to.lon},${to.lat}`;
  const url = `${OSRM_BASE}/${coords}?overview=full&geometries=geojson&steps=false`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM ${res.status}`);
  const data = await res.json();
  if (data.code !== "Ok" || !data.routes?.[0]) throw new Error("OSRM no route");
  const route = data.routes[0];
  const path = (route.geometry?.coordinates || []).map(([lon, lat]) => ({ lat, lon }));
  return {
    path,
    meters: Number(route.distance) || pathLengthMeters(path),
  };
}

/**
 * 구간마다 도로망 → 모듈까지 못 닿으면 직선 링크로 이어 자연스럽게 붙인다.
 * kind: "road" | "link"
 */
async function fetchRoadGeometry(waypoints) {
  const clean = (waypoints || []).filter(
    (p) => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon)),
  );
  if (clean.length < 2) return null;

  const path = [];
  let meters = 0;
  let usedRoad = false;

  pushPoint(path, clean[0], "road");

  for (let i = 0; i < clean.length - 1; i += 1) {
    const from = clean[i];
    const to = clean[i + 1];

    /* 현재 폴리라인 끝이 from 과 멀면 from 까지 직선 */
    const tip = path[path.length - 1];
    if (haversineMeters(tip, from) > 2) {
      pushPoint(path, from, "link");
      meters += haversineMeters(tip, from);
    }

    try {
      const leg = await fetchOsrmLeg(from, to);
      if (!leg?.path?.length) throw new Error("empty");

      usedRoad = true;
      const roadStart = leg.path[0];
      const roadEnd = leg.path[leg.path.length - 1];

      if (haversineMeters(from, roadStart) > ROAD_SNAP_GAP_M) {
        pushPoint(path, roadStart, "link");
        meters += haversineMeters(from, roadStart);
      }

      for (const p of leg.path) {
        pushPoint(path, p, "road");
      }
      meters += leg.meters;

      const gapToStop = haversineMeters(roadEnd, to);
      if (gapToStop > 3) {
        /* 도로가 모듈 앞에서 끊김 → 일직선으로 모듈까지 */
        pushPoint(path, to, "link");
        meters += gapToStop;
      } else {
        pushPoint(path, to, "road");
      }
    } catch {
      /* 도로 실패 시 전 구간 직선 */
      pushPoint(path, to, "link");
      meters += haversineMeters(from, to);
    }
  }

  return {
    path,
    arrows: buildArrows(path),
    meters: Math.round(meters),
    usedRoadNetwork: usedRoad,
  };
}

/** 진행 방향 화살표 — 왕복·겹침 구간에서도 방향을 알 수 있게. */
function buildArrows(path) {
  if (!path || path.length < 2) return [];
  const arrows = [];
  let traveled = 0;
  let nextAt = ARROW_EVERY_M / 2;

  for (let i = 0; i < path.length - 1; i += 1) {
    const a = path[i];
    const b = path[i + 1];
    const seg = haversineMeters(a, b);
    if (seg < 1) continue;

    while (nextAt <= traveled + seg) {
      const t = (nextAt - traveled) / seg;
      const lat = a.lat + (b.lat - a.lat) * t;
      const lon = a.lon + (b.lon - a.lon) * t;
      arrows.push({
        lat,
        lon,
        bearing: bearingDegrees(a, b),
        kind: a.kind === "link" || b.kind === "link" ? "link" : "road",
      });
      nextAt += ARROW_EVERY_M;
    }
    traveled += seg;
  }
  return arrows;
}

/**
 * 방문 순서 + 도로망(+모듈 직전 직선 링크) + 방향 화살표.
 */
export async function buildCollectionRouteWithRoads(
  visibleModules,
  userPos,
  threshold = ROUTE_FILL_THRESHOLD,
) {
  const base = buildCollectionRoute(visibleModules, userPos, threshold);
  if (base.markers.length < 2) return base;

  try {
    const road = await fetchRoadGeometry(base.markers);
    if (!road?.path || road.path.length < 2) {
      return {
        ...base,
        reason: "도로 경로를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.",
        path: [],
        arrows: [],
      };
    }
    return {
      ...base,
      path: road.path,
      arrows: road.arrows || [],
      totalMeters: road.meters,
      roadMeters: road.meters,
      usedRoadNetwork: road.usedRoadNetwork,
      reason: "",
    };
  } catch (e) {
    return {
      ...base,
      path: [],
      arrows: [],
      reason: `도로 경로 조회 실패: ${e?.message || "network"}`,
    };
  }
}
