import { MEDIA_BROWSE_REGIONS } from "@/lib/media-browse-regions";
import { LEGACY_REGION_TO_BROWSE } from "@/lib/media-map/legacy-region-browse";

export type TextQueryRegionResolution = {
  regionMain: string;
  regionSub: string;
  /** true면 substring `q` 대신 region 필터만 사용 */
  consumeQuery: boolean;
};

function norm(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * 지도 검색창 `q` 가 지역명·코드와 정확히 일치하면 regionMain/regionSub 로 승격.
 * (부분 문자열이 아닌 전체 질의 일치만 — "부산역" 등은 일반 텍스트 검색 유지)
 */
export function resolveTextQueryToRegionFilter(
  query: string,
): TextQueryRegionResolution | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const legacy = LEGACY_REGION_TO_BROWSE[trimmed];
  if (legacy) {
    return { ...legacy, consumeQuery: true };
  }

  const lower = norm(trimmed);

  for (const main of MEDIA_BROWSE_REGIONS) {
    if (
      lower === main.id ||
      trimmed === main.label ||
      (main.labelEn && lower === main.labelEn.toLowerCase())
    ) {
      return { regionMain: main.id, regionSub: "", consumeQuery: true };
    }

    for (const sub of main.sub) {
      if (
        lower === sub.id ||
        trimmed === sub.label ||
        (sub.labelEn && lower === sub.labelEn.toLowerCase())
      ) {
        return {
          regionMain: main.id,
          regionSub: sub.id,
          consumeQuery: true,
        };
      }
      for (const alias of sub.aliases ?? []) {
        if (trimmed === alias || lower === alias.toLowerCase()) {
          return {
            regionMain: main.id,
            regionSub: sub.id,
            consumeQuery: true,
          };
        }
      }
    }
  }

  return null;
}
