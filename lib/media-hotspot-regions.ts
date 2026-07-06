import hotspotData from "@/data/media-hotspot-regions.json";
import type { MapBounds } from "@/components/public-map/map-types";
import { getBrowseRegionMain } from "@/lib/media-browse-regions";

export type MediaHotspotRegion = {
  regionMain: string;
  regionSub: string;
  labelKo: string;
  labelEn: string;
  mediaCount: number;
  lat: number;
  lng: number;
  /** Kakao map level — 작을수록 확대 (flyTo 폴백) */
  zoom: number;
  /** 매체 분포 bounding box — 있으면 fitBounds 우선 */
  bounds?: MapBounds;
  /** fitBounds 시 Leaflet maxZoom */
  fitBoundsMaxZoom?: number;
};

export type MediaHotspotRegionsFile = {
  generatedAt: string;
  total: number;
  seoulCap: number;
  hotspots: MediaHotspotRegion[];
};

const FILE = hotspotData as MediaHotspotRegionsFile;

/** 빌드·DB 집계 기반 핫플 regionSub 목록 (균형: 서울 cap + 지방 보장) */
export function listMediaHotspotRegions(): MediaHotspotRegion[] {
  return FILE.hotspots;
}

export function getMediaHotspotRegion(
  regionSub: string,
): MediaHotspotRegion | undefined {
  return FILE.hotspots.find((h) => h.regionSub === regionSub);
}

export function hotspotRegionLabel(
  hotspot: MediaHotspotRegion,
  isKo: boolean,
): string {
  return isKo ? hotspot.labelKo : hotspot.labelEn;
}

export type HotspotRegionMapView = {
  lat: number;
  lng: number;
  zoom: number;
  fitBounds?: MapBounds;
  fitBoundsMaxZoom?: number;
};

export function resolveHotspotRegionMapView(
  regionSub: string,
): HotspotRegionMapView | null {
  const hit = getMediaHotspotRegion(regionSub);
  if (!hit) return null;
  return {
    lat: hit.lat,
    lng: hit.lng,
    zoom: hit.zoom,
    fitBounds: hit.bounds,
    fitBoundsMaxZoom: hit.fitBoundsMaxZoom ?? 16,
  };
}

/** hotspot에 없는 regionSub — taxonomy main 기준 대략 좌표 */
export function resolveRegionSubMapView(
  regionMain: string,
  regionSub: string,
): HotspotRegionMapView | null {
  const fromHotspot = resolveHotspotRegionMapView(regionSub);
  if (fromHotspot) return fromHotspot;

  const main = getBrowseRegionMain(regionMain);
  if (!main) return null;

  const defaults: Record<string, { lat: number; lng: number; zoom: number }> =
    {
      seoul: { lat: 37.5665, lng: 126.978, zoom: 6 },
      busan: { lat: 35.1796, lng: 129.0756, zoom: 4 },
      daegu: { lat: 35.8714, lng: 128.6014, zoom: 4 },
      incheon: { lat: 37.4563, lng: 126.7052, zoom: 5 },
      gyeonggi: { lat: 37.2636, lng: 127.0286, zoom: 6 },
      gwangju: { lat: 35.1595, lng: 126.8526, zoom: 5 },
      daejeon: { lat: 36.3504, lng: 127.3845, zoom: 5 },
      jeju: { lat: 33.4996, lng: 126.5312, zoom: 5 },
    };

  return defaults[main.id] ?? null;
}
