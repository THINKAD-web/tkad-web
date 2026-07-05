/**
 * KTX·SRT 정차역 → public/geo/metro/ktx-srt.json (역 점만, 노선 선 없음)
 * Usage: npm run build:ktx-srt-geo
 */
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  KTX_SRT_STATIONS,
  railOperatorColor,
  railOperatorLabel,
  type RailOperator,
} from "../lib/public-map/ktx-srt-stations.ts";
import type {
  MetroFeatureProperties,
  MetroGeoJson,
  MetroIndexManifest,
} from "../lib/public-map/metro-types.ts";
import { METRO_CITY_META } from "../lib/public-map/metro-line-colors.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, "../public/geo/metro/ktx-srt.json");
const INDEX_PATH = join(__dirname, "../public/geo/metro/index.json");

function buildKtxSrtGeoJson(): MetroGeoJson {
  const features: MetroGeoJson["features"] = KTX_SRT_STATIONS.map((st) => {
    const operator = st.operator as RailOperator;
    const lineNameKo = railOperatorLabel(operator);
    const props: MetroFeatureProperties = {
      kind: "station",
      cityId: "ktx-srt",
      lineId: operator,
      lineNameKo,
      color: railOperatorColor(operator),
      stationId: st.id,
      nameKo: st.nameKo,
      railOperator: operator,
    };
    return {
      type: "Feature" as const,
      properties: props,
      geometry: {
        type: "Point" as const,
        coordinates: [st.lng, st.lat],
      },
    };
  });
  return { type: "FeatureCollection", features };
}

async function upsertIndex(byteSize: number, stationCount: number) {
  let manifest: MetroIndexManifest;
  try {
    const raw = await readFile(INDEX_PATH, "utf8");
    manifest = JSON.parse(raw) as MetroIndexManifest;
  } catch {
    manifest = { version: 1, generatedAt: new Date().toISOString(), chunks: [] };
  }

  const meta = METRO_CITY_META["ktx-srt"];
  const chunk = {
    id: "ktx-srt" as const,
    nameKo: meta.nameKo,
    url: "/geo/metro/ktx-srt.json",
    bbox: meta.bbox,
    alwaysLoad: true,
    byteSize,
    lineCount: 0,
    stationCount,
  };

  const idx = manifest.chunks.findIndex((c) => c.id === "ktx-srt");
  if (idx >= 0) manifest.chunks[idx] = chunk;
  else manifest.chunks.push(chunk);

  manifest.generatedAt = new Date().toISOString();
  await writeFile(INDEX_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

async function main() {
  const data = buildKtxSrtGeoJson();
  await mkdir(dirname(OUT_PATH), { recursive: true });
  const json = `${JSON.stringify(data)}\n`;
  await writeFile(OUT_PATH, json, "utf8");
  const byteSize = Buffer.byteLength(json, "utf8");
  await upsertIndex(byteSize, data.features.length);
  console.log(
    `Wrote ${OUT_PATH} — ${data.features.length} stations, ${Math.round(byteSize / 1024)}KB`,
  );
  console.log(`Updated ${INDEX_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
