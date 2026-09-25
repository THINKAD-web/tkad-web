import type { MapMapItem } from "@/components/media-map/media-map-types";
import type { MapBounds } from "@/components/public-map/map-types";
import { mediaItemIntersectsMapBounds } from "@/lib/media-detail-map-markers";
import {
  resolveItemMapDisplayMode,
  type MapDisplayMode,
} from "@/lib/media-map/map-display-mode";

export type MapListSection = {
  id: "viewport" | "national";
  titleKo: string;
  titleEn: string;
  items: MapMapItem[];
};

function isNationalListMode(mode: MapDisplayMode): boolean {
  return mode === "service_region" || mode === "location_unknown";
}

/**
 * 목록 패널 — 뷰포트 핀 매체와 이동형·비좌표(전국) 매체를 분리 표시.
 * 서버가 이미 bounds 로 핀을 걸러도, 이동형은 항상 섞여 들어온다(감사서 §7).
 */
export function buildMapListSections(
  items: MapMapItem[],
  bounds: MapBounds | null,
  isKo: boolean,
): MapListSection[] {
  const national: MapMapItem[] = [];
  const viewport: MapMapItem[] = [];

  for (const item of items) {
    const mode = resolveItemMapDisplayMode(item);
    if (isNationalListMode(mode)) {
      national.push(item);
      continue;
    }
    if (mode === "pin") {
      if (!bounds || mediaItemIntersectsMapBounds(item, bounds)) {
        viewport.push(item);
      }
      continue;
    }
    viewport.push(item);
  }

  const sections: MapListSection[] = [];
  if (viewport.length > 0) {
    sections.push({
      id: "viewport",
      titleKo: bounds ? "이 지도 영역" : "매체",
      titleEn: bounds ? "In this map area" : "Media",
      items: viewport,
    });
  }
  if (national.length > 0) {
    sections.push({
      id: "national",
      titleKo: "이동형·전국 매체",
      titleEn: "Mobile & nationwide",
      items: national,
    });
  }
  if (sections.length === 0 && items.length > 0) {
    sections.push({
      id: "viewport",
      titleKo: isKo ? "매체" : "Media",
      titleEn: "Media",
      items,
    });
  }
  return sections;
}
