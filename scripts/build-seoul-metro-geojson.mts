/**
 * Overpass → public/geo/seoul-metro-v1.json (build-time only, no runtime Overpass).
 * Capital region: subway + light_rail + selective train (whitelist-first matching).
 * Usage: npm run build:metro-geo
 */
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SEOUL_METRO_LINE_BY_ID,
  SEOUL_METRO_MVP_LINE_IDS,
  type SeoulMetroLineId,
} from "../lib/public-map/seoul-metro-line-colors.ts";
import type {
  SeoulMetroFeatureProperties,
  SeoulMetroGeoJson,
} from "../lib/public-map/seoul-metro-types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, "../public/geo/seoul-metro-v1.json");
const REPORT_PATH = join(__dirname, "../public/geo/metro-relation-report.json");
const WHITELIST_PATH = join(
  __dirname,
  "../lib/public-map/metro-relation-whitelist.json",
);

/** 수도권 bbox — 인천·경기 외곽 포함 */
const BBOX = { south: 36.9, west: 126.4, north: 37.85, east: 127.45 };

/** Overpass 부하 분산용 영역 분할 */
const QUERY_REGIONS: Array<{ name: string; bbox: string }> = [
  { name: "seoul-core", bbox: "37.4,126.8,37.65,127.2" },
  { name: "west-gyeonggi", bbox: "36.9,126.4,37.5,126.95" },
  { name: "east-gyeonggi", bbox: "37.2,127.0,37.85,127.45" },
  { name: "south-gyeonggi", bbox: "37.0,126.7,37.4,127.3" },
];

const OVERPASS_ENDPOINTS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];

const SIMPLIFY_TOLERANCE = 0.00015;
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 3000;

/** train route 는 화이트리스트만 허용 (KTX·장거리 열차 제외) */
const TRAIN_LINE_IDS = new Set<SeoulMetroLineId>([
  "bundang",
  "gyeongui-jungang",
  "arex",
  "gtx-a",
  "gyeongchun",
  "seohae",
]);

const EXCLUDE_RELATION_NAME =
  /KTX|ITX|무궁화|새마을|누리로|강릉|직통열차|공항철도 직통|셔틀트레인|급행|특급|화물|freight|cargo/i;

type WhitelistEntry = { lineId: SeoulMetroLineId; lineNameKo: string };
type WhitelistMap = Record<string, WhitelistEntry>;

type OsmTags = Record<string, string>;

type OsmElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  tags?: OsmTags;
  members?: Array<{
    type: string;
    ref: number;
    role: string;
    lat?: number;
    lon?: number;
    geometry?: Array<{ lat: number; lon: number }>;
  }>;
  geometry?: Array<{ lat: number; lon: number }>;
};

type UnmatchedRelation = {
  id: number;
  name: string | null;
  ref: string | null;
  route: string | null;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveLineId(tags: OsmTags): SeoulMetroLineId | null {
  const name = tags.name ?? tags["name:ko"] ?? tags["name:en"] ?? "";
  if (EXCLUDE_RELATION_NAME.test(name)) return null;

  const hay = [
    tags.ref,
    tags.name,
    tags["name:ko"],
    tags["name:en"],
    tags.network,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/인천.*1호선|incheon.*line 1/i.test(hay)) return "incheon1";
  if (/인천.*2호선|incheon.*line 2/i.test(hay)) return "incheon2";
  if (/gtx|great train express/i.test(hay)) return "gtx-a";
  if (/경강선|gyeonggang/i.test(hay)) return "gyeonggang";
  if (/김포|gimpo gold/i.test(hay)) return "gimpo-gold";
  if (/용인|에버라인|everline/i.test(hay)) return "everline";
  if (/의정부|uijeongbu/i.test(hay)) return "uijeongbu";
  if (/경춘|gyeongchun/i.test(hay) && !/ktx/i.test(hay)) return "gyeongchun";
  if (/서해선|seohae/i.test(hay)) return "seohae";
  if (/신림선|sillim/i.test(hay)) return "silim";
  if (/공항|arex|airport railroad|인천국제공항철도/i.test(hay) && !/직통|express/i.test(hay))
    return "arex";
  if (/신분당|shinbundang|daxin/i.test(hay)) return "shinbundang";
  if (/수인.?분당|suin.?bundang|분당선|분당|bundang line|bundang/.test(hay))
    return "bundang";
  if (/경의중앙|경의·중앙|경의-중앙|gyeongui|jungang|gyeongwon/i.test(hay))
    return "gyeongui-jungang";

  const numMatch = hay.match(
    /(?:서울\s*|수도권\s*)?([1-9])\s*호선|line\s*([1-9])\b|^[1-9]$/,
  );
  if (numMatch) {
    const n = (numMatch[1] ?? numMatch[2]) as SeoulMetroLineId;
    if (SEOUL_METRO_MVP_LINE_IDS.includes(n)) return n;
  }

  if (/^seoul subway line ([1-9])$/i.test(tags["name:en"] ?? "")) {
    const n = tags["name:en"]!.match(/([1-9])/)![1] as SeoulMetroLineId;
    return n;
  }

  return null;
}

function resolveRelationLine(
  rel: OsmElement,
  whitelist: WhitelistMap,
): { lineId: SeoulMetroLineId; lineNameKo: string } | null {
  if (!rel.tags) return null;

  const wl = whitelist[String(rel.id)];
  if (wl && SEOUL_METRO_MVP_LINE_IDS.includes(wl.lineId)) {
    const def = SEOUL_METRO_LINE_BY_ID[wl.lineId];
    return { lineId: wl.lineId, lineNameKo: def.nameKo };
  }

  const route = rel.tags.route ?? "";
  const lineId = resolveLineId(rel.tags);
  if (!lineId || !SEOUL_METRO_MVP_LINE_IDS.includes(lineId)) return null;

  if (route === "train" && !TRAIN_LINE_IDS.has(lineId)) return null;

  const def = SEOUL_METRO_LINE_BY_ID[lineId];
  return { lineId, lineNameKo: def.nameKo };
}

function simplifyRing(
  coords: Array<[number, number]>,
  tolerance = SIMPLIFY_TOLERANCE,
): Array<[number, number]> {
  if (coords.length <= 2) return coords;

  const sqTol = tolerance * tolerance;

  function perpendicularDistance(
    p: [number, number],
    a: [number, number],
    b: [number, number],
  ): number {
    const [x, y] = p;
    const [x1, y1] = a;
    const [x2, y2] = b;
    const dx = x2 - x1;
    const dy = y2 - y1;
    if (dx === 0 && dy === 0) {
      const ddx = x - x1;
      const ddy = y - y1;
      return ddx * ddx + ddy * ddy;
    }
    const t = Math.max(
      0,
      Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)),
    );
    const px = x1 + t * dx;
    const py = y1 + t * dy;
    const ddx = x - px;
    const ddy = y - py;
    return ddx * ddx + ddy * ddy;
  }

  function dp(
    points: Array<[number, number]>,
    start: number,
    end: number,
    out: Array<[number, number]>,
  ) {
    if (end <= start + 1) return;
    let maxSq = 0;
    let idx = start;
    for (let i = start + 1; i < end; i++) {
      const sq = perpendicularDistance(points[i]!, points[start]!, points[end]!);
      if (sq > maxSq) {
        maxSq = sq;
        idx = i;
      }
    }
    if (maxSq > sqTol) {
      dp(points, start, idx, out);
      out.push(points[idx]!);
      dp(points, idx, end, out);
    }
  }

  const result: Array<[number, number]> = [coords[0]!];
  dp(coords, 0, coords.length - 1, result);
  result.push(coords[coords.length - 1]!);
  return result;
}

function relationToLineStrings(rel: OsmElement): Array<Array<[number, number]>> {
  const lines: Array<Array<[number, number]>> = [];
  if (!rel.members) return lines;

  let current: Array<[number, number]> = [];
  for (const member of rel.members) {
    if (member.role === "stop" || member.role === "stop_entry_only") continue;
    const geom = member.geometry;
    if (!geom || geom.length < 2) continue;
    const seg = geom.map((g) => [g.lon, g.lat] as [number, number]);
    if (current.length === 0) {
      current = [...seg];
      continue;
    }
    const last = current[current.length - 1]!;
    const first = seg[0]!;
    if (last[0] === first[0] && last[1] === first[1]) {
      current.push(...seg.slice(1));
    } else {
      if (current.length >= 2) lines.push(simplifyRing(current));
      current = [...seg];
    }
  }
  if (current.length >= 2) lines.push(simplifyRing(current));
  return lines;
}

/**
 * 같은 이름의 역이 이 거리(m) 이내면 환승역 중복으로 보고 1개로 병합.
 * 실제 대형 환승역(공덕·김포공항·서울역 등)은 노드 간 최대 500m 안팎까지 벌어져 있어
 * 150m 로는 완전히 합쳐지지 않음 — 신촌(실제로 다른 두 역, 약 624m)·양평(수도권/타 지역
 * 동명역, 수십km) 등 진짜 별개인 동명역과는 충분한 여유를 두고 구분되는 값으로 조정.
 */
const TRANSFER_MERGE_DISTANCE_M = 450;

function haversineMeters(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const [lon1, lat1] = a;
  const [lon2, lat2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Union-Find 기반 single-linkage 클러스터링 — 순서에 의존하지 않고 근접한 노드를 전이적으로 병합 */
function clusterByProximity(
  features: SeoulMetroGeoJson["features"],
  thresholdM: number,
): Array<SeoulMetroGeoJson["features"]> {
  const n = features.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  function find(x: number): number {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]!]!;
      x = parent[x]!;
    }
    return x;
  }
  function union(a: number, b: number) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }

  for (let i = 0; i < n; i++) {
    const a = (features[i]!.geometry as GeoJSON.Point).coordinates as [
      number,
      number,
    ];
    for (let j = i + 1; j < n; j++) {
      const b = (features[j]!.geometry as GeoJSON.Point).coordinates as [
        number,
        number,
      ];
      if (haversineMeters(a, b) <= thresholdM) union(i, j);
    }
  }

  const groups = new Map<number, SeoulMetroGeoJson["features"]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(features[i]!);
  }
  return [...groups.values()];
}

/**
 * 환승역이 노선 relation 마다 별도 station 노드로 들어와 라벨이 중복 렌더되는 문제 보정.
 * 같은 이름 + 근접 좌표인 station 만 병합 — 동명이역(다른 도시·실제로 다른 역)은 거리 조건으로 보호.
 */
function dedupeStationFeatures(
  stationFeaturesById: Map<number, SeoulMetroGeoJson["features"][number]>,
): SeoulMetroGeoJson["features"] {
  const byName = new Map<string, SeoulMetroGeoJson["features"]>();
  for (const feature of stationFeaturesById.values()) {
    const name = feature.properties.nameKo ?? "";
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name)!.push(feature);
  }

  const merged: SeoulMetroGeoJson["features"] = [];

  for (const candidates of byName.values()) {
    const clusters = clusterByProximity(candidates, TRANSFER_MERGE_DISTANCE_M);

    for (const cluster of clusters) {
      if (cluster.length === 1) {
        const only = cluster[0]!;
        merged.push({
          ...only,
          properties: { ...only.properties, lineIds: [only.properties.lineId] },
        });
        continue;
      }

      const lineIdSet = new Set<SeoulMetroLineId>();
      let sumLon = 0;
      let sumLat = 0;
      let anyTransferTag = false;
      for (const feature of cluster) {
        lineIdSet.add(feature.properties.lineId);
        const [lon, lat] = (feature.geometry as GeoJSON.Point).coordinates;
        sumLon += lon;
        sumLat += lat;
        if (feature.properties.isTransfer) anyTransferTag = true;
      }

      const lineIds = [...lineIdSet].sort(
        (a, b) =>
          SEOUL_METRO_MVP_LINE_IDS.indexOf(a) - SEOUL_METRO_MVP_LINE_IDS.indexOf(b),
      );
      const primaryLine = lineIds[0]!;
      const def = SEOUL_METRO_LINE_BY_ID[primaryLine];
      const first = cluster[0]!;

      merged.push({
        type: "Feature",
        properties: {
          kind: "station",
          lineId: primaryLine,
          lineNameKo: def.nameKo,
          color: def.color,
          stationId: first.properties.stationId,
          nameKo: first.properties.nameKo,
          isTransfer: anyTransferTag || lineIds.length > 1,
          lineIds,
        },
        geometry: {
          type: "Point",
          coordinates: [sumLon / cluster.length, sumLat / cluster.length],
        },
      });
    }
  }

  return merged;
}

function buildRegionQuery(bbox: string): string {
  return `
[out:json][timeout:90];
(
  relation["route"="subway"](${bbox});
  relation["route"="light_rail"](${bbox});
  relation["route"="train"](${bbox});
);
out geom;
>;
out body qt;
`;
}

async function fetchOverpassRegion(
  regionName: string,
  bbox: string,
): Promise<OsmElement[]> {
  const query = buildRegionQuery(bbox);
  let lastErr = "";

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const endpoint = OVERPASS_ENDPOINTS[attempt % OVERPASS_ENDPOINTS.length]!;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          Accept: "application/json",
          "User-Agent": "tkad-web-metro-build/1.0 (contact@tkad.co.kr)",
        },
        body: `data=${encodeURIComponent(query.trim())}`,
        signal: AbortSignal.timeout(95_000),
      });
      if (!res.ok) {
        lastErr = `${regionName}@${endpoint} HTTP ${res.status}`;
        await sleep(RETRY_BASE_MS * (attempt + 1));
        continue;
      }
      const json = (await res.json()) as { elements?: OsmElement[] };
      return json.elements ?? [];
    } catch (e) {
      lastErr = `${regionName}@${endpoint}: ${e instanceof Error ? e.message : String(e)}`;
      await sleep(RETRY_BASE_MS * (attempt + 1));
    }
  }

  console.warn(`Overpass region ${regionName} failed after retries: ${lastErr}`);
  return [];
}

async function fetchAllRegions(): Promise<OsmElement[]> {
  const byKey = new Map<string, OsmElement>();

  for (const region of QUERY_REGIONS) {
    console.log(`Fetching ${region.name} (${region.bbox})…`);
    const elements = await fetchOverpassRegion(region.name, region.bbox);
    for (const el of elements) {
      byKey.set(`${el.type}/${el.id}`, el);
    }
    await sleep(1500);
  }

  return [...byKey.values()];
}

async function main() {
  const whitelistRaw = await readFile(WHITELIST_PATH, "utf8");
  const whitelist = JSON.parse(whitelistRaw) as WhitelistMap;

  console.log(
    `Capital bbox ${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east} — ${QUERY_REGIONS.length} region queries`,
  );
  const elements = await fetchAllRegions();
  const relations = elements.filter((e) => e.type === "relation");
  const stationNodes = elements.filter((e) => e.type === "node");
  console.log(`Relations: ${relations.length}, nodes: ${stationNodes.length}`);

  const features: SeoulMetroGeoJson["features"] = [];
  const stationLineCounts = new Map<number, Set<SeoulMetroLineId>>();
  const unmatched: UnmatchedRelation[] = [];
  const matchedLineIds = new Set<SeoulMetroLineId>();
  const processedRelationIds = new Set<number>();

  for (const rel of relations) {
    if (rel.type !== "relation" || !rel.tags) continue;
    if (processedRelationIds.has(rel.id)) continue;
    processedRelationIds.add(rel.id);

    const resolved = resolveRelationLine(rel, whitelist);
    if (!resolved) {
      const name = rel.tags.name ?? rel.tags["name:ko"] ?? null;
      if (name && !EXCLUDE_RELATION_NAME.test(name)) {
        unmatched.push({
          id: rel.id,
          name,
          ref: rel.tags.ref ?? null,
          route: rel.tags.route ?? null,
        });
      }
      continue;
    }

    const { lineId, lineNameKo } = resolved;
    matchedLineIds.add(lineId);
    const def = SEOUL_METRO_LINE_BY_ID[lineId];
    const lineStrings = relationToLineStrings(rel);
    if (lineStrings.length === 0) continue;

    const props: SeoulMetroFeatureProperties = {
      kind: "line",
      lineId,
      lineNameKo,
      color: def.color,
    };

    if (lineStrings.length === 1) {
      features.push({
        type: "Feature",
        properties: props,
        geometry: { type: "LineString", coordinates: lineStrings[0]! },
      });
    } else {
      features.push({
        type: "Feature",
        properties: props,
        geometry: { type: "MultiLineString", coordinates: lineStrings },
      });
    }

    for (const member of rel.members ?? []) {
      if (!member.role.startsWith("stop")) continue;
      const ref = member.ref;
      if (!stationLineCounts.has(ref)) stationLineCounts.set(ref, new Set());
      stationLineCounts.get(ref)!.add(lineId);
    }
  }

  const nodeById = new Map<number, OsmElement>();
  for (const n of stationNodes) {
    if (n.type === "node") nodeById.set(n.id, n);
  }

  const stationFeaturesById = new Map<
    number,
    SeoulMetroGeoJson["features"][number]
  >();

  for (const [nodeId, lineSet] of stationLineCounts) {
    const node = nodeById.get(nodeId);
    const nameKo =
      node?.tags?.["name:ko"] ??
      node?.tags?.name ??
      node?.tags?.["name:en"] ??
      "";
    if (!node?.lat || !node.lon || !nameKo) continue;

    const lineIds = [...lineSet];
    const primaryLine = lineIds[0]!;
    const def = SEOUL_METRO_LINE_BY_ID[primaryLine];
    const isTransfer = lineIds.length > 1 || node.tags?.transfer === "yes";

    stationFeaturesById.set(nodeId, {
      type: "Feature",
      properties: {
        kind: "station",
        lineId: primaryLine,
        lineNameKo: def.nameKo,
        color: def.color,
        stationId: String(nodeId),
        nameKo,
        isTransfer,
      },
      geometry: { type: "Point", coordinates: [node.lon, node.lat] },
    });
  }

  features.push(...dedupeStationFeatures(stationFeaturesById));

  const lineCount = features.filter((f) => f.properties.kind === "line").length;
  const stationCount = features.filter(
    (f) => f.properties.kind === "station",
  ).length;

  if (lineCount === 0) {
    throw new Error(
      "No line features extracted — Overpass may have failed or returned empty data",
    );
  }

  const collection: SeoulMetroGeoJson = {
    type: "FeatureCollection",
    features,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    bbox: BBOX,
    matchedLineIds: [...matchedLineIds].sort(),
    unmatchedCount: unmatched.length,
    unmatched: unmatched.sort((a, b) => a.id - b.id),
  };

  await mkdir(dirname(OUT_PATH), { recursive: true });
  const json = JSON.stringify(collection);
  await writeFile(OUT_PATH, `${json}\n`, "utf8");
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const sizeKb = Math.round(json.length / 1024);
  console.log(
    `Wrote ${OUT_PATH} — ${lineCount} line features, ${stationCount} stations, ${sizeKb}KB`,
  );
  console.log(
    `Matched lineIds (${matchedLineIds.size}): ${[...matchedLineIds].sort().join(", ")}`,
  );
  console.log(
    `Unmatched relations: ${unmatched.length} → ${REPORT_PATH}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
