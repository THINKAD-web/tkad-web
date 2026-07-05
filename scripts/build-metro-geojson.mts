/**
 * Nationwide metro GeoJSON — capital (from seoul-metro-v1) + provincial Overpass.
 * Output: public/geo/metro/{city}.json + index.json
 * Usage: npm run build:metro-geo [-- --rebuild-capital] [-- --city=busan]
 */
import { readFile, mkdir, writeFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import {
  METRO_CITY_LINES,
  METRO_CITY_META,
  type MetroCityId,
} from "../lib/public-map/metro-line-colors.ts";
import type {
  MetroFeatureProperties,
  MetroGeoJson,
  MetroIndexManifest,
} from "../lib/public-map/metro-types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const GEO_DIR = join(__dirname, "../public/geo/metro");
const CAPITAL_SRC = join(__dirname, "../public/geo/seoul-metro-v1.json");
const INDEX_PATH = join(GEO_DIR, "index.json");

const OVERPASS_ENDPOINTS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];

const SIMPLIFY_TOLERANCE = 0.00015;
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 3000;

const EXCLUDE_RELATION_NAME =
  /KTX|ITX|무궁화|새마을|누리로|강릉|직통열차|공항철도 직통|셔틀트레인|급행|특급|화물|freight|cargo/i;

const TRANSFER_MERGE_DISTANCE_M = 450;

const CAPITAL_REGIONS = [
  { name: "seoul-core", bbox: "37.4,126.8,37.65,127.2" },
  { name: "west-gyeonggi", bbox: "36.9,126.4,37.5,126.95" },
  { name: "east-gyeonggi", bbox: "37.2,127.0,37.85,127.45" },
  { name: "south-gyeonggi", bbox: "37.0,126.7,37.4,127.3" },
];

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
    geometry?: Array<{ lat: number; lon: number }>;
  }>;
};

type LineResolver = (tags: OsmTags) => string | null;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function bboxString(meta: (typeof METRO_CITY_META)[MetroCityId]): string {
  const { south, west, north, east } = meta.bbox;
  return `${south},${west},${north},${east}`;
}

function resolveCapitalLineId(tags: OsmTags): string | null {
  const name = tags.name ?? tags["name:ko"] ?? tags["name:en"] ?? "";
  if (EXCLUDE_RELATION_NAME.test(name)) return null;
  const hay = [tags.ref, tags.name, tags["name:ko"], tags["name:en"], tags.network]
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
  if (/우이신설|ui.?sinseol|ui-sinseol/i.test(hay)) return "ui-sinseol";
  if (/공항|arex|airport railroad/i.test(hay) && !/직통|express/i.test(hay))
    return "arex";
  if (/신분당|shinbundang/i.test(hay)) return "shinbundang";
  if (/분당|bundang/i.test(hay)) return "bundang";
  if (/경의중앙|gyeongui|jungang/i.test(hay)) return "gyeongui-jungang";
  const num = hay.match(/(?:서울\s*)?([1-9])\s*호선|line\s*([1-9])\b/);
  if (num) return num[1] ?? num[2] ?? null;
  return null;
}

const PROVINCIAL_RESOLVERS: Record<
  Exclude<MetroCityId, "capital">,
  LineResolver
> = {
  busan: (tags) => {
    const hay = [tags.ref, tags.name, tags["name:ko"], tags["name:en"]]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (EXCLUDE_RELATION_NAME.test(hay)) return null;
    if (/동해|donghae/i.test(hay)) return "donghae";
    const m = hay.match(/부산.*([1-4])\s*호선|busan.*line\s*([1-4])/i);
    if (m) return m[1] ?? m[2] ?? null;
    if (/^([1-4])$/.test(tags.ref ?? "")) return tags.ref!;
    return null;
  },
  daegu: (tags) => {
    const hay = [tags.ref, tags.name, tags["name:ko"], tags["name:en"]]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (EXCLUDE_RELATION_NAME.test(hay)) return null;
    const m = hay.match(/대구.*([1-3])\s*호선|daegu.*line\s*([1-3])/i);
    if (m) return m[1] ?? m[2] ?? null;
    if (/^([1-3])$/.test(tags.ref ?? "")) return tags.ref!;
    return null;
  },
  gwangju: (tags) => {
    const hay = [tags.ref, tags.name, tags["name:ko"], tags["name:en"]]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (EXCLUDE_RELATION_NAME.test(hay)) return null;
    if (/광주|gwangju/i.test(hay)) return "1";
    return null;
  },
  daejeon: (tags) => {
    const hay = [tags.ref, tags.name, tags["name:ko"], tags["name:en"]]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (EXCLUDE_RELATION_NAME.test(hay)) return null;
    if (/대전|daejeon/i.test(hay)) return "1";
    return null;
  },
};

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

function dedupeStations(
  stationFeaturesById: Map<number, MetroGeoJson["features"][number]>,
  cityId: MetroCityId,
): MetroGeoJson["features"] {
  const lineOrder = METRO_CITY_LINES[cityId].map((l) => l.id);
  const byName = new Map<string, MetroGeoJson["features"]>();
  for (const feature of stationFeaturesById.values()) {
    const name = feature.properties.nameKo ?? "";
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name)!.push(feature);
  }
  const merged: MetroGeoJson["features"] = [];
  for (const candidates of byName.values()) {
    const n = candidates.length;
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
      const a = (candidates[i]!.geometry as GeoJSON.Point).coordinates as [
        number,
        number,
      ];
      for (let j = i + 1; j < n; j++) {
        const b = (candidates[j]!.geometry as GeoJSON.Point).coordinates as [
          number,
          number,
        ];
        if (haversineMeters(a, b) <= TRANSFER_MERGE_DISTANCE_M) union(i, j);
      }
    }
    const groups = new Map<number, MetroGeoJson["features"]>();
    for (let i = 0; i < n; i++) {
      const root = find(i);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root)!.push(candidates[i]!);
    }
    for (const cluster of groups.values()) {
      if (cluster.length === 1) {
        const only = cluster[0]!;
        merged.push({
          ...only,
          properties: {
            ...only.properties,
            lineIds: [only.properties.lineId],
          },
        });
        continue;
      }
      const lineIdSet = new Set<string>();
      let sumLon = 0;
      let sumLat = 0;
      let anyTransfer = false;
      for (const f of cluster) {
        lineIdSet.add(f.properties.lineId);
        const [lon, lat] = (f.geometry as GeoJSON.Point).coordinates;
        sumLon += lon;
        sumLat += lat;
        if (f.properties.isTransfer) anyTransfer = true;
      }
      const lineIds = [...lineIdSet].sort(
        (a, b) => lineOrder.indexOf(a) - lineOrder.indexOf(b),
      );
      const primary = lineIds[0]!;
      const def = METRO_CITY_LINES[cityId].find((l) => l.id === primary)!;
      const first = cluster[0]!;
      merged.push({
        type: "Feature",
        properties: {
          kind: "station",
          cityId,
          lineId: primary,
          lineNameKo: def.nameKo,
          color: def.color,
          stationId: first.properties.stationId,
          nameKo: first.properties.nameKo,
          isTransfer: anyTransfer || lineIds.length > 1,
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

function buildQuery(bbox: string, includeTrain = false): string {
  const train = includeTrain ? `relation["route"="train"](${bbox});` : "";
  return `
[out:json][timeout:90];
(
  relation["route"="subway"](${bbox});
  relation["route"="light_rail"](${bbox});
  ${train}
);
out geom;
>;
out body qt;
`;
}

async function fetchOverpass(
  label: string,
  bbox: string,
  includeTrain = false,
): Promise<OsmElement[]> {
  const query = buildQuery(bbox, includeTrain);
  let lastErr = "";
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const endpoint = OVERPASS_ENDPOINTS[attempt % OVERPASS_ENDPOINTS.length]!;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          Accept: "application/json",
          "User-Agent": "tkad-web-metro-build/2.0 (contact@tkad.co.kr)",
        },
        body: `data=${encodeURIComponent(query.trim())}`,
        signal: AbortSignal.timeout(95_000),
      });
      if (!res.ok) {
        lastErr = `${label}@${endpoint} HTTP ${res.status}`;
        await sleep(RETRY_BASE_MS * (attempt + 1));
        continue;
      }
      const json = (await res.json()) as { elements?: OsmElement[] };
      return json.elements ?? [];
    } catch (e) {
      lastErr = `${label}@${endpoint}: ${e instanceof Error ? e.message : String(e)}`;
      await sleep(RETRY_BASE_MS * (attempt + 1));
    }
  }
  throw new Error(`Overpass ${label} failed: ${lastErr}`);
}

function elementsFromRegions(
  regions: Array<{ name: string; bbox: string }>,
  includeTrain: boolean,
): Promise<OsmElement[]> {
  return (async () => {
    const byKey = new Map<string, OsmElement>();
    for (const region of regions) {
      console.log(`  Fetching ${region.name} (${region.bbox})…`);
      const elements = await fetchOverpass(region.name, region.bbox, includeTrain);
      for (const el of elements) byKey.set(`${el.type}/${el.id}`, el);
      await sleep(1500);
    }
    return [...byKey.values()];
  })();
}

function buildCityGeo(
  cityId: MetroCityId,
  elements: OsmElement[],
  resolveLine: LineResolver,
): MetroGeoJson {
  const relations = elements.filter((e) => e.type === "relation");
  const stationNodes = elements.filter((e) => e.type === "node");
  const validLineIds = new Set(METRO_CITY_LINES[cityId].map((l) => l.id));

  const features: MetroGeoJson["features"] = [];
  const stationLineCounts = new Map<number, Set<string>>();
  const processed = new Set<number>();

  for (const rel of relations) {
    if (!rel.tags || processed.has(rel.id)) continue;
    processed.add(rel.id);
    const lineId = resolveLine(rel.tags);
    if (!lineId || !validLineIds.has(lineId)) continue;
    const def = METRO_CITY_LINES[cityId].find((l) => l.id === lineId)!;
    const lineStrings = relationToLineStrings(rel);
    if (lineStrings.length === 0) continue;

    const props: MetroFeatureProperties = {
      kind: "line",
      cityId,
      lineId,
      lineNameKo: def.nameKo,
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
      if (!stationLineCounts.has(member.ref))
        stationLineCounts.set(member.ref, new Set());
      stationLineCounts.get(member.ref)!.add(lineId);
    }
  }

  const nodeById = new Map<number, OsmElement>();
  for (const n of stationNodes) nodeById.set(n.id, n);

  const stationFeaturesById = new Map<
    number,
    MetroGeoJson["features"][number]
  >();
  for (const [nodeId, lineSet] of stationLineCounts) {
    const node = nodeById.get(nodeId);
    const nameKo =
      node?.tags?.["name:ko"] ?? node?.tags?.name ?? node?.tags?.["name:en"] ?? "";
    if (!node?.lat || !node.lon || !nameKo) continue;
    const lineIds = [...lineSet];
    const primary = lineIds[0]!;
    const def = METRO_CITY_LINES[cityId].find((l) => l.id === primary)!;
    stationFeaturesById.set(nodeId, {
      type: "Feature",
      properties: {
        kind: "station",
        cityId,
        lineId: primary,
        lineNameKo: def.nameKo,
        color: def.color,
        stationId: String(nodeId),
        nameKo,
        isTransfer: lineIds.length > 1 || node.tags?.transfer === "yes",
      },
      geometry: { type: "Point", coordinates: [node.lon, node.lat] },
    });
  }

  features.push(...dedupeStations(stationFeaturesById, cityId));
  return { type: "FeatureCollection", features };
}

async function patchCapitalFromSource(): Promise<MetroGeoJson> {
  const raw = await readFile(CAPITAL_SRC, "utf8");
  const data = JSON.parse(raw) as MetroGeoJson;
  return {
    type: "FeatureCollection",
    features: data.features.map((f) => ({
      ...f,
      properties: { ...f.properties, cityId: "capital" as const },
    })),
  };
}

async function writeCityJson(cityId: MetroCityId, data: MetroGeoJson) {
  const path = join(GEO_DIR, `${cityId}.json`);
  const json = `${JSON.stringify(data)}\n`;
  await writeFile(path, json, "utf8");
  const lineCount = data.features.filter((f) => f.properties.kind === "line").length;
  const stationCount = data.features.filter(
    (f) => f.properties.kind === "station",
  ).length;
  console.log(
    `  Wrote ${path} — ${lineCount} lines, ${stationCount} stations, ${Math.round(json.length / 1024)}KB`,
  );
  return { path, byteSize: Buffer.byteLength(json, "utf8"), lineCount, stationCount };
}

async function rebuildCapitalViaLegacyScript() {
  return new Promise<void>((resolve, reject) => {
    const child = spawn("npx", ["tsx", "scripts/build-seoul-metro-geojson.mts"], {
      cwd: join(__dirname, ".."),
      stdio: "inherit",
    });
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`capital rebuild exit ${code}`)),
    );
  });
}

async function buildCapital(rebuild: boolean) {
  if (rebuild) {
    console.log("Rebuilding capital via build-seoul-metro-geojson.mts…");
    await rebuildCapitalViaLegacyScript();
  }
  console.log("Patching capital chunk from seoul-metro-v1.json…");
  const data = await patchCapitalFromSource();
  return writeCityJson("capital", data);
}

async function buildProvincial(cityId: Exclude<MetroCityId, "capital">) {
  const meta = METRO_CITY_META[cityId];
  const bbox = bboxString(meta);
  console.log(`Building ${meta.nameKo} (${cityId}) bbox=${bbox}…`);
  const elements = await elementsFromRegions([{ name: cityId, bbox }], false);
  const data = buildCityGeo(cityId, elements, PROVINCIAL_RESOLVERS[cityId]);
  const lineCount = data.features.filter((f) => f.properties.kind === "line").length;
  if (lineCount === 0) {
    throw new Error(`No lines extracted for ${cityId}`);
  }
  return writeCityJson(cityId, data);
}

async function writeIndex(
  stats: Array<{
    cityId: MetroCityId;
    byteSize: number;
    lineCount: number;
    stationCount: number;
  }>,
) {
  let existingManifest: MetroIndexManifest | null = null;
  try {
    existingManifest = JSON.parse(
      await readFile(INDEX_PATH, "utf8"),
    ) as MetroIndexManifest;
  } catch {
    /* fresh write */
  }

  const manifest: MetroIndexManifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    chunks: stats.map(({ cityId, byteSize, lineCount, stationCount }) => {
      const meta = METRO_CITY_META[cityId];
      const prev = existingManifest?.chunks.find((c) => c.id === cityId);
      return {
        id: cityId,
        nameKo: meta.nameKo,
        url: `/geo/metro/${cityId}.json`,
        bbox: meta.bbox,
        ...(prev?.alwaysLoad ? { alwaysLoad: true } : {}),
        byteSize,
        lineCount,
        stationCount,
      };
    }),
  };
  await writeFile(INDEX_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Wrote ${INDEX_PATH} (${manifest.chunks.length} chunks)`);
}

async function readExistingStats(
  cityId: MetroCityId,
): Promise<{ byteSize: number; lineCount: number; stationCount: number } | null> {
  const path = join(GEO_DIR, `${cityId}.json`);
  try {
    const raw = await readFile(path, "utf8");
    const data = JSON.parse(raw) as MetroGeoJson;
    return {
      byteSize: Buffer.byteLength(raw, "utf8"),
      lineCount: data.features.filter((f) => f.properties.kind === "line").length,
      stationCount: data.features.filter((f) => f.properties.kind === "station")
        .length,
    };
  } catch {
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const rebuildCapital = args.includes("--rebuild-capital");
  const cityArg = args.find((a) => a.startsWith("--city="));
  const cityFilter = cityArg?.split("=")[1] as MetroCityId | undefined;

  await mkdir(GEO_DIR, { recursive: true });

  const allCities: MetroCityId[] = [
    "capital",
    "busan",
    "daegu",
    "gwangju",
    "daejeon",
  ];
  const targets = cityFilter ? allCities.filter((c) => c === cityFilter) : allCities;
  if (targets.length === 0) {
    throw new Error(`Unknown city: ${cityFilter}`);
  }

  const stats: Array<{
    cityId: MetroCityId;
    byteSize: number;
    lineCount: number;
    stationCount: number;
  }> = [];

  for (const cityId of allCities) {
    if (!targets.includes(cityId)) {
      const existing = await readExistingStats(cityId);
      if (existing) stats.push({ cityId, ...existing });
      continue;
    }
    if (cityId === "capital") {
      const s = await buildCapital(rebuildCapital);
      stats.push({ cityId, ...s });
    } else {
      const s = await buildProvincial(cityId);
      stats.push({ cityId, ...s });
    }
  }

  // ktx-srt 등 Overpass 빌드 대상 외 청크 — 기존 파일 유지
  if (!stats.some((s) => s.cityId === "ktx-srt")) {
    const ktx = await readExistingStats("ktx-srt");
    if (ktx) stats.push({ cityId: "ktx-srt", ...ktx });
  }

  await writeIndex(stats);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
