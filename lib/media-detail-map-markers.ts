import type { MediaItem } from "@/lib/media-data";
import type { MapMarker } from "@/components/public-map/map-types";

/** 복수 설치 핀 id (`mediaId-install-0`) → 매체 id */
export function resolveMediaIdFromMapPinId(pinId: string): string {
  const m = /^(.+)-install-\d+$/.exec(pinId);
  return m?.[1] ?? pinId;
}

/** 목록(mediaId) vs 지도 핀(mediaId-install-N) 선택·호버 매칭 */
export function mapPinMatchesActiveId(
  pinId: string,
  activeId: string | null,
): boolean {
  if (!activeId) return false;
  if (pinId === activeId) return true;
  const pinMediaId = resolveMediaIdFromMapPinId(pinId);
  const activeMediaId = resolveMediaIdFromMapPinId(activeId);
  return activeId === activeMediaId && pinMediaId === activeMediaId;
}

export type MapPinActiveSets = {
  selected: Set<string>;
  hovered: Set<string>;
};

/** 현재 지도에 있는 핀 id 중 activeId에 매칭되는 핀 집합 */
export function pinsMatchingActiveId(
  pinIds: Iterable<string>,
  activeId: string | null,
): Set<string> {
  const out = new Set<string>();
  if (!activeId) return out;
  for (const pinId of pinIds) {
    if (mapPinMatchesActiveId(pinId, activeId)) out.add(pinId);
  }
  return out;
}

/**
 * selected/hovered 변경 시 setIcon이 필요한 핀 id (이전 active ∪ 다음 active).
 * 이전 active가 빠지면 affected에 포함되어 선택/호버 스타일이 꺼진다.
 */
export function affectedPinIdsForActiveStateChange(
  pinIds: Iterable<string>,
  prev: MapPinActiveSets,
  nextSelectedId: string | null,
  nextHoveredId: string | null,
): { affected: Set<string>; next: MapPinActiveSets } {
  const ids = [...pinIds];
  const nextSelected = pinsMatchingActiveId(ids, nextSelectedId);
  const nextHovered = pinsMatchingActiveId(ids, nextHoveredId);
  const affected = new Set<string>();
  for (const id of prev.selected) affected.add(id);
  for (const id of prev.hovered) affected.add(id);
  for (const id of nextSelected) affected.add(id);
  for (const id of nextHovered) affected.add(id);
  return {
    affected,
    next: { selected: nextSelected, hovered: nextHovered },
  };
}

type MapPoint = { label: string; lat: number; lng: number };

function mapPointsForMediaItem(
  media: Pick<MediaItem, "lat" | "lng" | "installLocations">,
): MapPoint[] {
  const installs = media.installLocations;
  if (installs && installs.length > 0) {
    return installs.map((p) => ({
      label: p.label,
      lat: p.lat,
      lng: p.lng,
    }));
  }
  return [{ label: "", lat: media.lat, lng: media.lng }];
}

/** 지도 핀 표시 가능 여부 (대표 좌표 또는 설치 지점) */
export function mediaItemHasMapCoordinates(
  media: Pick<MediaItem, "lat" | "lng" | "installLocations">,
): boolean {
  if (
    (media.installLocations ?? []).some(
      (p) =>
        Number.isFinite(p.lat) &&
        Number.isFinite(p.lng) &&
        Math.abs(p.lat) <= 90 &&
        Math.abs(p.lng) <= 180,
    )
  ) {
    return true;
  }
  return (
    Number.isFinite(media.lat) &&
    Number.isFinite(media.lng) &&
    Math.abs(media.lat) <= 90 &&
    Math.abs(media.lng) <= 180 &&
    !(media.lat === 0 && media.lng === 0)
  );
}

/** bounds 필터 — 설치 지점 중 하나라도 영역 안이면 포함 */
export function mediaItemIntersectsMapBounds(
  media: Pick<MediaItem, "lat" | "lng" | "installLocations">,
  bounds: { swLat: number; neLat: number; swLng: number; neLng: number },
): boolean {
  return mapPointsForMediaItem(media).some(
    ({ lat, lng }) =>
      lat >= bounds.swLat &&
      lat <= bounds.neLat &&
      lng >= bounds.swLng &&
      lng <= bounds.neLng,
  );
}

function buildMapMarker(
  mediaId: string,
  baseName: string,
  point: MapPoint,
  index: number,
  pointCount: number,
  price: number,
  type: string,
  visibilityScore?: number,
): MapMarker {
  const label = point.label.trim();
  const marker: MapMarker = {
    id: pointCount > 1 ? `${mediaId}-install-${index}` : mediaId,
    name: label ? `${baseName} · ${label}` : baseName,
    lat: point.lat,
    lng: point.lng,
    price,
    type,
  };
  if (visibilityScore !== undefined) {
    marker.visibilityScore = visibilityScore;
  }
  return marker;
}

/** 공개 매체 상세·지도 — `installLocations` 또는 대표 좌표 → 카카오 핀 */
export function mapMarkersForMediaDetail(
  media: MediaItem,
  isKo: boolean,
): MapMarker[] {
  const baseName = isKo ? media.name : media.nameEn || media.name;
  const points = mapPointsForMediaItem(media);
  const price = Number(media.price ?? 0);
  return points.map((p, i) =>
    buildMapMarker(media.id, baseName, p, i, points.length, price, media.type),
  );
}

/** `/media/map` API 항목 → 카카오 핀 */
export function mapMarkersForMapCatalogItem(item: {
  id: string;
  name: string;
  lat: number;
  lng: number;
  price: number;
  type: string;
  visibilityScore?: number;
  installLocations?: Array<{ label: string; lat: number; lng: number }>;
}): MapMarker[] {
  const points = mapPointsForMediaItem({
    lat: item.lat,
    lng: item.lng,
    installLocations: item.installLocations?.map((p) => ({
      label: p.label,
      location: undefined,
      lat: p.lat,
      lng: p.lng,
    })),
  });
  return points.map((p, i) =>
    buildMapMarker(
      item.id,
      item.name,
      p,
      i,
      points.length,
      item.price,
      item.type,
      item.visibilityScore,
    ),
  );
}

export function mapCenterForMediaDetail(
  media: MediaItem,
  markers: MapMarker[],
): { lat: number; lng: number } {
  if (markers.length === 0) {
    return { lat: media.lat, lng: media.lng };
  }
  if (markers.length === 1) {
    return { lat: markers[0]!.lat, lng: markers[0]!.lng };
  }
  const sum = markers.reduce(
    (a, m) => ({ lat: a.lat + m.lat, lng: a.lng + m.lng }),
    { lat: 0, lng: 0 },
  );
  return {
    lat: sum.lat / markers.length,
    lng: sum.lng / markers.length,
  };
}
