import { mediaData, type MediaItem } from "@/lib/media-data";
import { getKeywordFilterCatalogMediaItems } from "@/lib/keyword-filter-media-detail";
import { MEDIA_BROWSE_GRID_MIN_ITEMS } from "@/lib/media-precision-filter-config";

/**
 * `/media` 전용: Prisma·DB 없이 `mediaData` + `data/media-items-keyword-filter.json`만 병합.
 */
export function getMediaBrowseMockCatalog(): MediaItem[] {
  const out: MediaItem[] = [];
  const seen = new Set<string>();
  for (const m of mediaData) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    out.push(m);
  }
  try {
    for (const m of getKeywordFilterCatalogMediaItems()) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      out.push(m);
    }
  } catch (err) {
    console.error("[getMediaBrowseMockCatalog] keyword JSON 변환 실패", err);
  }
  return out.length > 0 ? out : [...mediaData];
}

export async function fetchMediaBrowseCatalog(): Promise<MediaItem[]> {
  const catalog = getMediaBrowseMockCatalog();
  if (catalog.length < MEDIA_BROWSE_GRID_MIN_ITEMS) {
    console.warn(
      `[fetchMediaBrowseCatalog] ${catalog.length}건 — ${MEDIA_BROWSE_GRID_MIN_ITEMS}건 이상을 권장합니다.`,
    );
  }
  return catalog;
}
