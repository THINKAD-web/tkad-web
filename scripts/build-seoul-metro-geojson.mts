/**
 * Overpass → public/geo/seoul-metro-v1.json (build-time only, no runtime Overpass).
 * Usage: npx tsx scripts/build-seoul-metro-geojson.mts
 */
import { mkdir, writeFile } from "node:fs/promises";
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

const BBOX = { south: 36.95, west: 126.55, north: 37.85, east: 127.25 };

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

function resolveLineId(tags: OsmTags): SeoulMetroLineId | null {
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

  if (/공항|arex|airport railroad|인천국제공항철도|airport railway/.test(hay)) return "arex";
  if (/신분당|shinbundang|daxin/.test(hay)) return "shinbundang";
  if (/수인분당|suin.bundang|분당선|분당|bundang line|bundang/.test(hay))
    return "bundang";
  if (/경의중앙|경의·중앙|경의-중앙|gyeongui|jungang|gyeongwon/.test(hay))
    return "gyeongui-jungang";

  const numMatch = hay.match(/(?:서울\s*)?([1-9])\s*호선|line\s*([1-9])\b|^[1-9]$/);
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

function simplifyRing(
  coords: Array<[number, number]>,
  tolerance = 0.00012,
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

async function fetchOverpass(query: string): Promise<OsmElement[]> {
  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ];
  let lastErr = "";
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          Accept: "application/json",
          "User-Agent": "tkad-web-metro-build/1.0 (contact@tkad.co.kr)",
        },
        body: `data=${encodeURIComponent(query.trim())}`,
      });
      if (!res.ok) {
        lastErr = `${url} HTTP ${res.status}`;
        continue;
      }
      const json = (await res.json()) as { elements?: OsmElement[] };
      return json.elements ?? [];
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
  }
  throw new Error(`Overpass failed: ${lastErr}`);
}

async function main() {
  const bbox = `${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east}`;

  const relationQuery = `
[out:json][timeout:180];
(
  relation["route"="subway"](${bbox});
  relation["route"="light_rail"](${bbox});
);
out geom;
>;
out body qt;
`;

  console.log("Fetching subway relations + stop nodes from Overpass…");
  const elements = await fetchOverpass(relationQuery);
  const relations = elements.filter((e) => e.type === "relation");
  const stationNodes = elements.filter((e) => e.type === "node");
  console.log(`Relations: ${relations.length}, nodes: ${stationNodes.length}`);

  const features: SeoulMetroGeoJson["features"] = [];
  const stationLineCounts = new Map<number, Set<SeoulMetroLineId>>();

  for (const rel of relations) {
    if (rel.type !== "relation" || !rel.tags) continue;
    const lineId = resolveLineId(rel.tags);
    if (!lineId || !SEOUL_METRO_MVP_LINE_IDS.includes(lineId)) continue;

    const def = SEOUL_METRO_LINE_BY_ID[lineId];
    const lineStrings = relationToLineStrings(rel);
    if (lineStrings.length === 0) continue;

    const props: SeoulMetroFeatureProperties = {
      kind: "line",
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
      const ref = member.ref;
      if (!stationLineCounts.has(ref)) stationLineCounts.set(ref, new Set());
      stationLineCounts.get(ref)!.add(lineId);
    }
  }

  const nodeById = new Map<number, OsmElement>();
  for (const n of stationNodes) {
    if (n.type === "node") nodeById.set(n.id, n);
  }

  const stationFeaturesById = new Map<number, SeoulMetroGeoJson["features"][number]>();

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

  features.push(...stationFeaturesById.values());

  const lineCount = features.filter((f) => f.properties.kind === "line").length;
  const stationCount = features.filter((f) => f.properties.kind === "station").length;

  if (lineCount === 0) {
    throw new Error("No line features extracted — Overpass may have failed or returned empty data");
  }

  const collection: SeoulMetroGeoJson = {
    type: "FeatureCollection",
    features,
  };

  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, `${JSON.stringify(collection)}\n`, "utf8");

  console.log(
    `Wrote ${OUT_PATH} — ${lineCount} line features, ${stationCount} stations`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
