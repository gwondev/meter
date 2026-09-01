/** @deprecated 경로는 화면 모듈 전부 방문 — 적재율 필터 없음. UI 호환용. */
export const ROUTE_FILL_THRESHOLD = 0;

const EARTH_RADIUS_M = 6371000;
/** 완전탐색 상한 — 이보다 많으면 NN+2-opt. */
const EXACT_TSP_LIMIT = 8;
const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

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

/**
 * 적재율 가중 이동 비용.
 * fill 100% → 거리×1, fill 50% → 거리×약 1.75, fill 0% → 거리×4.
 * 만재 거점을 먼저 방문하도록 NN·TSP·2-opt 가 같은 함수를 쓴다.
 */
function urgencyWeightedCost(from, to) {
  const distance = haversineMeters(from, to);
  const fill = clampFill(to.fillPercent);
  const urgency = 1 + ((100 - fill) / 100) ** 2 * 3;
  return distance * urgency;
}

/** 경로(origin → stops…) 전체 긴급도 가중 비용. */
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

/** 최근접 이웃 — 매 단계에서 urgencyWeightedCost 최소 후보 선택. */
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

/** 2-opt — 직선거리 대신 동일 urgency 비용으로 교차·우회를 줄인다. */
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

/** n≤EXACT_TSP_LIMIT 이면 전순열로 최소 urgency 비용 순서를 고른다. */
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
    return {
      path: [],
      markers: [],
      stops: [],
      totalMeters: 0,
      roadMeters: 0,
      usedRoadNetwork: false,
      reason: "화면에 좌표가 있는 모듈이 없습니다.",
    };
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
    /* 위치 없으면 가장 만재 모듈을 출발점으로 */
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
      path: [],
      markers,
      stops: labeledStops,
      totalMeters: 0,
      roadMeters: 0,
      usedRoadNetwork: false,
      reason: "경로를 그리려면 활성 모듈이 2곳 이상 필요합니다.",
    };
  }

  return {
    path: markers.map((p) => ({ lat: p.lat, lon: p.lon })),
    markers,
    stops: hasOrigin ? labeledStops : [origin, ...labeledStops],
    totalMeters: Math.round(pathLengthMeters(markers)),
    roadMeters: 0,
    usedRoadNetwork: false,
    reason: "",
  };
}

function dedupeNearPoints(points, minMeters = 2) {
  if (!points.length) return [];
  const out = [points[0]];
  for (let i = 1; i < points.length; i += 1) {
    if (haversineMeters(out[out.length - 1], points[i]) >= minMeters) {
      out.push(points[i]);
    }
  }
  return out;
}

/**
 * OSRM 도로망 경로. 실패 시 null.
 * waypoints 가 많으면 구간을 나눠 이어 붙인다.
 */
async function fetchOsrmLeg(waypoints) {
  if (waypoints.length < 2) return null;
  const coords = waypoints.map((p) => `${p.lon},${p.lat}`).join(";");
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

async function fetchRoadGeometry(waypoints) {
  const clean = (waypoints || []).filter(
    (p) => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon)),
  );
  if (clean.length < 2) return null;

  /* OSRM URL/처리 한도 — 한 번에 최대 20점, 초과 시 청크 연결 */
  const CHUNK = 20;
  const path = [];
  let meters = 0;

  for (let start = 0; start < clean.length - 1; start += CHUNK - 1) {
    const slice = clean.slice(start, Math.min(start + CHUNK, clean.length));
    if (slice.length < 2) break;
    const leg = await fetchOsrmLeg(slice);
    if (!leg?.path?.length) throw new Error("empty leg");
    const append = start === 0 ? leg.path : leg.path.slice(1);
    path.push(...append);
    meters += leg.meters;
  }

  return {
    path: dedupeNearPoints(path),
    meters: Math.round(meters),
  };
}

/**
 * 방문 순서 산출 후 도로망 폴리라인을 붙인다.
 * 도로 API 실패 시 직선거리는 쓰지 않고 실패 reason 만 남긴다(호출부에서 안내).
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
      };
    }
    return {
      ...base,
      path: road.path,
      totalMeters: road.meters,
      roadMeters: road.meters,
      usedRoadNetwork: true,
      reason: "",
    };
  } catch (e) {
    return {
      ...base,
      path: [],
      reason: `도로 경로 조회 실패: ${e?.message || "network"}`,
    };
  }
}
