import { resolveRegionSubMapView, type HotspotRegionMapView } from "@/lib/media-hotspot-regions";

/** 지역 칩 선택 시 지도 `programmaticView` 로 이동할 대표 좌표 (카카오 level — 작을수록 확대) */
export const MEDIA_REGION_MAP_VIEW: Record<
  string,
  { lat: number; lng: number; zoom: number }
> = {
  강남: { lat: 37.4979, lng: 127.0276, zoom: 5 },
  홍대: { lat: 37.5563, lng: 126.9236, zoom: 5 },
  성수: { lat: 37.5443, lng: 127.0557, zoom: 5 },
  도심: { lat: 37.5665, lng: 126.978, zoom: 6 },
  부산: { lat: 35.1796, lng: 129.0756, zoom: 4 },
  대구: { lat: 35.8714, lng: 128.6014, zoom: 4 },
};

export function resolveRegionMapView(
  regionChip: string,
): { lat: number; lng: number; zoom: number } | null {
  const key = regionChip.trim();
  if (!key) return null;
  return MEDIA_REGION_MAP_VIEW[key] ?? null;
}

export const BROWSE_REGION_MAP_VIEW: Record<
  string,
  { lat: number; lng: number; zoom: number }
> = {
  seoul_gangnam: { lat: 37.4979, lng: 127.0276, zoom: 5 },
  seoul_hongdae: { lat: 37.5563, lng: 126.9236, zoom: 5 },
  seoul_seongsu: { lat: 37.5443, lng: 127.0557, zoom: 5 },
  seoul_cbd: { lat: 37.5665, lng: 126.978, zoom: 6 },
  busan: { lat: 35.1796, lng: 129.0756, zoom: 4 },
  daegu: { lat: 35.8714, lng: 128.6014, zoom: 4 },
  seoul: { lat: 37.5665, lng: 126.978, zoom: 6 },
};

export function resolveBrowseRegionMapView(
  regionMain: string,
  regionSub: string,
): HotspotRegionMapView | null {
  const sub = regionSub.trim();
  if (sub) {
    const fromHotspot = resolveRegionSubMapView(regionMain, sub);
    if (fromHotspot) return fromHotspot;
    if (BROWSE_REGION_MAP_VIEW[sub]) return BROWSE_REGION_MAP_VIEW[sub];
  }
  const main = regionMain.trim();
  if (main && BROWSE_REGION_MAP_VIEW[main]) return BROWSE_REGION_MAP_VIEW[main];
  return resolveRegionSubMapView(main, "");
}
