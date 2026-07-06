/**
 * 활성 매체 regionSub 집계 → 균형 잡힌 핫플 칩 JSON
 * Usage: npm run build:hotspot-regions
 */
import { config } from "dotenv";
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import {
  getBrowseRegionMain,
  getBrowseRegionSub,
} from "../lib/media-browse-regions.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
config({ path: join(root, ".env"), override: false });
config({ path: join(root, ".env.local"), override: true });

const TOTAL = 10;
const SEOUL_CAP = 6;
const EXCLUDE_SUBS = new Set(["national"]);

const KOREA = { minLat: 33, maxLat: 39.5, minLng: 124, maxLng: 132.5 };

/** 짧은 칩 라벨 (없으면 taxonomy 라벨 `/` 앞부분) */
const SHORT_LABELS: Record<string, { ko: string; en: string }> = {
  seoul_gangnam: { ko: "강남", en: "Gangnam" },
  seoul_cbd: { ko: "광화문", en: "Downtown" },
  seoul_hongdae: { ko: "홍대", en: "Hongdae" },
  seoul_seongsu: { ko: "성수", en: "Seongsu" },
  seoul_itaewon: { ko: "이태원", en: "Itaewon" },
  seoul_yeongdeungpo: { ko: "여의도", en: "Yeouido" },
  seoul_jamsil: { ko: "잠실", en: "Jamsil" },
  seoul_jongno: { ko: "종로", en: "Jongno" },
  busan_downtown: { ko: "부산", en: "Busan" },
  busan_haeundae: { ko: "해운대", en: "Haeundae" },
  busan_seomyeon: { ko: "서면", en: "Seomyeon" },
  incheon_airport: { ko: "인천공항", en: "Incheon Airport" },
  daegu_downtown: { ko: "대구", en: "Daegu" },
  gwangju_downtown: { ko: "광주", en: "Gwangju" },
};

/** 상권 중심 폴백 — 이상치 제거 후 표본 부족 시 */
const REGION_ANCHORS: Record<string, { lat: number; lng: number }> = {
  seoul_gangnam: { lat: 37.498, lng: 127.028 },
  seoul_cbd: { lat: 37.572, lng: 126.976 },
  seoul_itaewon: { lat: 37.534, lng: 126.994 },
  seoul_hongdae: { lat: 37.556, lng: 126.924 },
  seoul_seongsu: { lat: 37.544, lng: 127.056 },
  seoul_yeongdeungpo: { lat: 37.521, lng: 126.924 },
  busan_downtown: { lat: 35.179, lng: 129.075 },
  incheon_airport: { lat: 37.460, lng: 126.440 },
  gwangju_downtown: { lat: 35.160, lng: 126.852 },
  daegu_downtown: { lat: 35.871, lng: 128.602 },
};

const URBAN_SEOUL_SUBS = new Set([
  "seoul_gangnam",
  "seoul_hongdae",
  "seoul_seongsu",
  "seoul_cbd",
  "seoul_itaewon",
  "seoul_yeongdeungpo",
  "seoul_jamsil",
  "seoul_jongno",
  "seoul_sinchon",
  "seoul_coex",
]);

type RegionProfile = "urban_seoul" | "airport" | "metro";

function regionProfile(regionMain: string, regionSub: string): RegionProfile {
  if (regionSub === "incheon_airport") return "airport";
  if (regionMain === "seoul" && URBAN_SEOUL_SUBS.has(regionSub)) return "urban_seoul";
  return "metro";
}

function zoomForRegion(regionMain: string, regionSub: string): number {
  const profile = regionProfile(regionMain, regionSub);
  if (profile === "airport") return 5;
  if (profile === "urban_seoul") return 3;
  if (regionMain === "busan" || regionMain === "daegu") return 4;
  return 5;
}

function fitBoundsMaxZoomForRegion(
  regionMain: string,
  regionSub: string,
): number {
  const profile = regionProfile(regionMain, regionSub);
  if (profile === "urban_seoul") return 16;
  if (profile === "airport") return 13;
  if (regionMain === "busan" || regionMain === "daegu") return 14;
  return 14;
}

type Coord = { lat: number; lng: number };

type CountRow = {
  region_sub: string;
  region_main: string;
  cnt: number;
};

function inKorea(c: Coord): boolean {
  return (
    c.lat >= KOREA.minLat &&
    c.lat <= KOREA.maxLat &&
    c.lng >= KOREA.minLng &&
    c.lng <= KOREA.maxLng
  );
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

function percentile(nums: number[], p: number): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (idx - lo);
}

/** median 기준 거리로 잘못 태깅된 매체 제거 */
function filterOutliers(
  coords: Coord[],
  profile: RegionProfile,
): Coord[] {
  if (coords.length < 4) return coords;
  const medLat = median(coords.map((c) => c.lat));
  const medLng = median(coords.map((c) => c.lng));

  const maxDLat =
    profile === "urban_seoul" ? 0.045 : profile === "airport" ? 0.12 : 0.14;
  const maxDLng =
    profile === "urban_seoul" ? 0.06 : profile === "airport" ? 0.18 : 0.22;

  const filtered = coords.filter(
    (c) =>
      Math.abs(c.lat - medLat) <= maxDLat &&
      Math.abs(c.lng - medLng) <= maxDLng,
  );
  return filtered.length >= 3 ? filtered : coords;
}

function boundsFromCoords(
  coords: Coord[],
  profile: RegionProfile,
): { swLat: number; swLng: number; neLat: number; neLng: number } | null {
  if (coords.length < 2) return null;

  const loP = profile === "urban_seoul" ? 0.3 : profile === "airport" ? 0.1 : 0.15;
  const hiP = profile === "urban_seoul" ? 0.7 : profile === "airport" ? 0.9 : 0.85;

  let swLat = percentile(
    coords.map((c) => c.lat),
    loP,
  );
  let swLng = percentile(
    coords.map((c) => c.lng),
    loP,
  );
  let neLat = percentile(
    coords.map((c) => c.lat),
    hiP,
  );
  let neLng = percentile(
    coords.map((c) => c.lng),
    hiP,
  );

  const padLat = profile === "urban_seoul" ? 0.004 : 0.008;
  const padLng = profile === "urban_seoul" ? 0.005 : 0.01;
  swLat -= padLat;
  swLng -= padLng;
  neLat += padLat;
  neLng += padLng;

  const maxLatSpan =
    profile === "urban_seoul" ? 0.038 : profile === "airport" ? 0.22 : 0.28;
  const maxLngSpan =
    profile === "urban_seoul" ? 0.052 : profile === "airport" ? 0.32 : 0.38;

  const centerLat = (swLat + neLat) / 2;
  const centerLng = (swLng + neLng) / 2;
  let latSpan = neLat - swLat;
  let lngSpan = neLng - swLng;

  if (latSpan > maxLatSpan) {
    swLat = centerLat - maxLatSpan / 2;
    neLat = centerLat + maxLatSpan / 2;
    latSpan = maxLatSpan;
  }
  if (lngSpan > maxLngSpan) {
    swLng = centerLng - maxLngSpan / 2;
    neLng = centerLng + maxLngSpan / 2;
    lngSpan = maxLngSpan;
  }

  if (latSpan <= 0.001 || lngSpan <= 0.001) return null;
  return {
    swLat: round5(swLat),
    swLng: round5(swLng),
    neLat: round5(neLat),
    neLng: round5(neLng),
  };
}

function round5(n: number): number {
  return Math.round(n * 100000) / 100000;
}

function computeRegionView(
  regionMain: string,
  regionSub: string,
  coords: Coord[],
): {
  lat: number;
  lng: number;
  zoom: number;
  bounds?: { swLat: number; swLng: number; neLat: number; neLng: number };
  fitBoundsMaxZoom: number;
} {
  const profile = regionProfile(regionMain, regionSub);
  const anchor = REGION_ANCHORS[regionSub];
  const korea = coords.filter(inKorea);
  const filtered = filterOutliers(korea, profile);

  const centerLat = filtered.length > 0 ? median(filtered.map((c) => c.lat)) : anchor?.lat;
  const centerLng = filtered.length > 0 ? median(filtered.map((c) => c.lng)) : anchor?.lng;

  const lat = round5(centerLat ?? anchor?.lat ?? 37.5665);
  const lng = round5(centerLng ?? anchor?.lng ?? 126.978);
  const zoom = zoomForRegion(regionMain, regionSub);
  const fitBoundsMaxZoom = fitBoundsMaxZoomForRegion(regionMain, regionSub);

  const bounds = boundsFromCoords(filtered, profile);
  if (!bounds) {
    return { lat, lng, zoom, fitBoundsMaxZoom };
  }

  return { lat, lng, zoom, bounds, fitBoundsMaxZoom };
}

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  const { rows: countRows } = await pool.query<CountRow>(`
    SELECT region_sub, region_main, COUNT(*)::int AS cnt
    FROM media
    WHERE is_active = true
      AND region_sub IS NOT NULL
      AND region_sub != ''
      AND latitude IS NOT NULL
      AND longitude IS NOT NULL
      AND latitude BETWEEN ${KOREA.minLat} AND ${KOREA.maxLat}
      AND longitude BETWEEN ${KOREA.minLng} AND ${KOREA.maxLng}
    GROUP BY region_sub, region_main
    ORDER BY cnt DESC
  `);

  const eligible = countRows.filter((r) => !EXCLUDE_SUBS.has(r.region_sub));
  const seoul = eligible
    .filter((r) => r.region_main === "seoul")
    .sort((a, b) => b.cnt - a.cnt);
  const nonSeoul = eligible
    .filter((r) => r.region_main !== "seoul")
    .sort((a, b) => b.cnt - a.cnt);

  const nonSeoulTake = Math.max(3, TOTAL - SEOUL_CAP);
  const picked = [
    ...seoul.slice(0, SEOUL_CAP),
    ...nonSeoul.slice(0, nonSeoulTake),
  ].sort((a, b) => b.cnt - a.cnt);

  const hotspots = [];
  for (const r of picked) {
    const { rows: coordRows } = await pool.query<{ latitude: number; longitude: number }>(
      `
        SELECT latitude, longitude
        FROM media
        WHERE is_active = true
          AND region_sub = $1
          AND region_main = $2
          AND latitude IS NOT NULL
          AND longitude IS NOT NULL
      `,
      [r.region_sub, r.region_main],
    );

    const coords = coordRows.map((row) => ({
      lat: row.latitude,
      lng: row.longitude,
    }));

    const view = computeRegionView(r.region_main, r.region_sub, coords);
    const sub = getBrowseRegionSub(r.region_main, r.region_sub);
    const main = getBrowseRegionMain(r.region_main);
    const short = SHORT_LABELS[r.region_sub];
    const labelKo =
      short?.ko ?? sub?.label.split("/")[0]?.trim() ?? r.region_sub;
    const labelEn =
      short?.en ??
      sub?.labelEn?.split("/")[0]?.trim() ??
      main?.labelEn ??
      r.region_sub;

    const koreaN = coords.filter(inKorea).length;
    const filteredN = filterOutliers(
      coords.filter(inKorea),
      regionProfile(r.region_main, r.region_sub),
    ).length;

    hotspots.push({
      regionMain: r.region_main,
      regionSub: r.region_sub,
      labelKo,
      labelEn,
      mediaCount: r.cnt,
      lat: view.lat,
      lng: view.lng,
      zoom: view.zoom,
      ...(view.bounds
        ? { bounds: view.bounds, fitBoundsMaxZoom: view.fitBoundsMaxZoom }
        : { fitBoundsMaxZoom: view.fitBoundsMaxZoom }),
      _debug: { raw: coords.length, korea: koreaN, filtered: filteredN },
    });
  }

  await pool.end();

  const out = {
    generatedAt: new Date().toISOString(),
    total: hotspots.length,
    seoulCap: SEOUL_CAP,
    hotspots: hotspots.map(({ _debug: _, ...h }) => h),
  };

  const outPath = join(root, "data/media-hotspot-regions.json");
  await writeFile(outPath, `${JSON.stringify(out, null, 2)}\n`, "utf8");
  console.log(`Wrote ${hotspots.length} hotspots → ${outPath}`);
  for (const h of hotspots) {
    const b = h.bounds;
    const span = b
      ? `span ${(b.neLat - b.swLat).toFixed(3)}°×${(b.neLng - b.swLng).toFixed(3)}°`
      : "flyTo only";
    console.log(
      `  ${h.labelKo} (${h.regionSub}): ${h.mediaCount} @ ${h.lat},${h.lng} [${span}] raw=${h._debug.raw} filtered=${h._debug.filtered}`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
