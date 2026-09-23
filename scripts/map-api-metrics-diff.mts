/**
 * 지도 API 직렬화 변경 전후 CPM·월노출 diff + gzip 크기 (read-only).
 * Usage: npx tsx scripts/map-api-metrics-diff.mts [--base-url URL]
 */
import { gzipSync } from "node:zlib";
import { mapMediaItemToHomeCatalog } from "../lib/media-catalog-map.ts";
import { fetchPublicMediaMapCatalog } from "../lib/public-media-map-catalog.ts";
import { resolveMapDisplayMode, resolveServiceRegionLabel } from "../lib/media-map/map-display-mode.ts";
import { serializeMapApiItemFromMediaItem } from "../lib/media-map/serialize-map-api-item.ts";
import { resolveMediaDisplayPrice } from "../lib/media-price-format.ts";
import {
  mediaDisplayCpmSourceFromItem,
  resolveCpmWonForDisplay,
  resolveCpmWonForDisplayFromMediaItem,
  resolveMonthlyImpressions,
} from "../lib/media-metrics.ts";
import { getPrimaryMediaImageUrl, type MediaItem } from "../lib/media-data.ts";
import { isInstantBookingEligible } from "../lib/instant-booking-eligibility.ts";
import type { MapDisplayMode } from "../lib/media-map/map-display-mode.ts";

function legacyToMapItem(
  m: MediaItem,
  mapDisplayMode: MapDisplayMode,
  serviceRegionLabel: string | undefined,
) {
  const display = resolveMediaDisplayPrice(m);
  return {
    id: m.id,
    name: m.name,
    location: m.location,
    region: m.region,
    city: m.city ?? null,
    district: m.district ?? null,
    type: m.type,
    subCategory: m.subCategory ?? null,
    price: display.priceWon,
    pricePeriod: display.period,
    catalogPrice: m.price,
    catalogPricePeriod: m.pricePeriod,
    createdAt: m.createdAt ?? null,
    lat: m.lat,
    lng: m.lng,
    image: getPrimaryMediaImageUrl(m),
    availability: m.availability ?? null,
    visibilityScore: m.visibilityScore ?? 0,
    dailyFootTraffic: m.dailyFootTraffic ?? null,
    impressions: m.impressions ?? null,
    cpm: m.cpm ?? null,
    isVerified: m.isVerified === true,
    isInstantBooking: isInstantBookingEligible({
      instantBookingEnabled: m.instantBookingEnabled ?? false,
      availability: m.availability,
      catalogSource: m.catalogSource,
    }).eligible,
    mapDisplayMode,
    serviceRegionLabel: serviceRegionLabel ?? null,
  };
}

const KOREA_BOUNDS = {
  swLat: 33.0,
  swLng: 124.5,
  neLat: 38.8,
  neLng: 132.0,
};

function gzipKb(json: string): number {
  return Math.round((gzipSync(Buffer.from(json, "utf8")).length / 1024) * 10) / 10;
}

async function fetchGzipKb(baseUrl: string): Promise<number | null> {
  const params = new URLSearchParams({
    swLat: String(KOREA_BOUNDS.swLat),
    swLng: String(KOREA_BOUNDS.swLng),
    neLat: String(KOREA_BOUNDS.neLat),
    neLng: String(KOREA_BOUNDS.neLng),
    zoom: "8",
  });
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/media/map?${params}`, {
      headers: { "Accept-Encoding": "identity" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const text = await res.text();
    return gzipKb(text);
  } catch {
    return null;
  }
}

async function main() {
  const baseUrlArg = process.argv.find((a) => a.startsWith("--base-url="));
  const previewUrl = baseUrlArg?.split("=")[1];

  const { catalog } = await fetchPublicMediaMapCatalog();
  const diffs: {
    id: string;
    name: string;
    listCpm: number | null;
    oldCpm: number | null;
    newCpm: number | null;
    listMonthly: number;
    oldMonthly: number;
    newMonthly: number;
  }[] = [];

  for (const m of catalog) {
    const mode = resolveMapDisplayMode(m);
    const label = resolveServiceRegionLabel(m);
    const oldItem = legacyToMapItem(m, mode, label);
    const newItem = serializeMapApiItemFromMediaItem(m, mode, label);

    const homeCatalog = mapMediaItemToHomeCatalog(m);
    const listCpm = resolveCpmWonForDisplay(homeCatalog);
    const oldCpm = resolveCpmWonForDisplay(oldItem);
    const newCpm = resolveCpmWonForDisplay(newItem);
    const listMonthly = resolveMonthlyImpressions(
      mediaDisplayCpmSourceFromItem(m),
    );
    const oldMonthly = resolveMonthlyImpressions(oldItem);
    const newMonthly = resolveMonthlyImpressions(newItem);

    if (
      oldCpm !== listCpm ||
      newCpm !== listCpm ||
      oldMonthly !== listMonthly ||
      newMonthly !== listMonthly
    ) {
      diffs.push({
        id: m.id,
        name: m.name.slice(0, 40),
        listCpm,
        oldCpm,
        newCpm,
        oldMonthly,
        newMonthly,
        listMonthly,
      });
    }
  }

  const legacyPayload = catalog.map((m) =>
    legacyToMapItem(m, resolveMapDisplayMode(m), resolveServiceRegionLabel(m)),
  );
  const newPayload = catalog.map((m) =>
    serializeMapApiItemFromMediaItem(
      m,
      resolveMapDisplayMode(m),
      resolveServiceRegionLabel(m),
    ),
  );

  const legacyGzip = gzipKb(JSON.stringify({ ok: true, data: { items: legacyPayload } }));
  const newGzip = gzipKb(JSON.stringify({ ok: true, data: { items: newPayload } }));

  console.log("## Payload gzip (full catalog, simulated JSON body)");
  console.log(`| Variant | gzip (KB) | items |`);
  console.log(`| --- | ---: | ---: |`);
  console.log(`| legacy toMapItem | ${legacyGzip} | ${catalog.length} |`);
  console.log(`| SSOT serialize | ${newGzip} | ${catalog.length} |`);
  console.log(`| Δ | +${Math.round((newGzip - legacyGzip) * 10) / 10} | |`);

  if (previewUrl) {
    const liveGzip = await fetchGzipKb(previewUrl);
    if (liveGzip != null) {
      console.log(`\nLive ${previewUrl}/api/media/map (Korea bounds): **~${liveGzip} KB** gzip (response re-compressed locally if identity fetch).`);
    }
  }

  const fixed = diffs.filter(
    (d) =>
      (d.oldCpm !== d.listCpm || d.oldMonthly !== d.listMonthly) &&
      d.newCpm === d.listCpm &&
      d.newMonthly === d.listMonthly,
  );
  const regressions = diffs.filter(
    (d) => d.newCpm !== d.listCpm || d.newMonthly !== d.listMonthly,
  );

  console.log("\n## CPM / monthly reach vs list SSOT");
  console.log(
    `Catalog ${catalog.length} · fixed by SSOT (old≠list, new=list): **${fixed.length}** · PR regressions (new≠list): **${regressions.length}**`,
  );
  const show = fixed.length > 0 ? fixed : diffs;
  if (show.length === 0) {
    console.log("_No old≠list deltas in catalog snapshot (engine v1 edge cases may still exist in production subset)._");
  } else {
    console.log("| media_id | name | list CPM | old map CPM | new map CPM | list monthly | old monthly | new monthly |");
    console.log("| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |");
    for (const d of show.slice(0, 40)) {
      console.log(
        `| ${d.id} | ${d.name.replace(/\|/g, "/")} | ${d.listCpm ?? "—"} | ${d.oldCpm ?? "—"} | ${d.newCpm ?? "—"} | ${d.listMonthly} | ${d.oldMonthly} | ${d.newMonthly} |`,
      );
    }
    if (diffs.length > 40) {
      console.log(`| … | +${diffs.length - 40} more | | | | |`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
