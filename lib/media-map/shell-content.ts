import {
  hotspotRegionLabel,
  listMediaHotspotRegions,
  type MediaHotspotRegion,
} from "@/lib/media-hotspot-regions";

export type MediaMapShellStats = {
  hotspotRegionCount: number;
  hotspotMediaTotal: number;
  generatedAt: string;
};

export function getMediaMapShellStats(): MediaMapShellStats {
  const hotspots = listMediaHotspotRegions();
  const hotspotMediaTotal = hotspots.reduce(
    (sum, h) => sum + (h.mediaCount ?? 0),
    0,
  );
  return {
    hotspotRegionCount: hotspots.length,
    hotspotMediaTotal,
    generatedAt: new Date().toISOString().slice(0, 10),
  };
}

/** SEO·크롤용 — 강남·성수·홍대·광화문 등 대표 핫스팟 우선, 나머지는 mediaCount 순 */
const FEATURED_REGION_SUBS = [
  "seoul_gangnam",
  "seoul_seongsu",
  "seoul_hongdae",
  "seoul_cbd",
] as const;

export function listMediaMapShellHotspotLinks(): MediaHotspotRegion[] {
  const hotspots = listMediaHotspotRegions();
  if (hotspots.length === 0) return [];

  const bySub = new Map(hotspots.map((h) => [h.regionSub, h]));
  const featured: MediaHotspotRegion[] = [];
  for (const sub of FEATURED_REGION_SUBS) {
    const hit = bySub.get(sub);
    if (hit) featured.push(hit);
  }

  const featuredSet = new Set(featured.map((h) => h.regionSub));
  const rest = hotspots
    .filter((h) => !featuredSet.has(h.regionSub))
    .sort((a, b) => b.mediaCount - a.mediaCount);

  return [...featured, ...rest];
}

export function mediaMapHotspotMapHref(h: MediaHotspotRegion): string {
  const params = new URLSearchParams({
    regionMain: h.regionMain,
    regionSub: h.regionSub,
  });
  return `/media/map?${params.toString()}`;
}

export function mediaMapRegionLandingHref(h: MediaHotspotRegion): string {
  return `/media/region/${encodeURIComponent(h.regionMain)}`;
}

export { hotspotRegionLabel };
