import type { MediaItem } from "@/lib/media-data";
import type { AiRecommendInput } from "@/lib/ai-media-recommend";
import type { MatchingInput, MatchedMedia } from "@/lib/matching-engine";
import { matchMediaCatalog, type MatchMediaCatalogOpts } from "@/lib/matching-engine";
import { matchesPlannerCategory, mediaMatchesPlannerMobileIntent } from "@/lib/planner-logic";
import { filterCatalogByPlannerRegions } from "@/lib/planner/planner-regions";
import type { PlannerBusanZoneKey } from "@/lib/planner/busan-zones";
import { mediaMatchesBusanZones } from "@/lib/planner/busan-zones";
import type { PlannerSeoulZoneKey } from "@/lib/planner/seoul-zones";
import { mediaMatchesSeoulZones } from "@/lib/planner/seoul-zones";

/** 이 수 미만이면 전국 보완 + UI 안내 (recommend 전용) */
export const RECOMMEND_REGION_SUPPLEMENT_THRESHOLD = 5;

/** browse ID 또는 한글 라벨 — 하드필터·전국 스코어링 트리거에서 제외 */
const NON_SPECIFIC_REGION_CODES = new Set([
  "all",
  "national",
  "nationwide",
  "",
  "전국",
  "전체",
]);

const MOBILE_MEDIA_HINT_RE =
  /버스|bus\b|택시|taxi|래핑|랩핑|vehicle\s*wrap|truck|mobility|이동형/i;

export function isNonSpecificRegionCode(code: string): boolean {
  const trimmed = code.trim();
  if (!trimmed) return true;
  if (NON_SPECIFIC_REGION_CODES.has(trimmed)) return true;
  if (NON_SPECIFIC_REGION_CODES.has(trimmed.toLowerCase())) return true;
  return false;
}

export type RecommendRegionFilterOpts = {
  seoulZones?: readonly PlannerSeoulZoneKey[];
  busanZones?: readonly PlannerBusanZoneKey[];
};

export type RecommendMatchMeta = {
  regionalCatalogCount: number;
  regionSupplemented: boolean;
};

/**
 * AI recommend → 플래너 browse 광역 ID (하드 프리필터).
 * regionCodes / seoulZones / busanZones 등 구조화·파싱 필드만 사용.
 * `input.region` 한글 자유 텍스트는 browse ID로 변환하지 않음.
 */
export function resolveAiRecommendPlannerRegionIds(
  input: AiRecommendInput,
): string[] | undefined {
  const codes = (input.regionCodes ?? []).filter(
    (c) => c.trim().length > 0 && !isNonSpecificRegionCode(c),
  );

  if (codes.length > 0) {
    if (codes.includes("capital")) {
      const rest = codes.filter((c) => c !== "capital");
      const capitalMacro = ["seoul", "gyeonggi", "incheon"];
      return [...new Set([...capitalMacro, ...rest])];
    }
    return codes;
  }

  if (input.busanZones?.length) return ["busan"];
  if (input.seoulZones?.length) return ["seoul"];

  return undefined;
}

/** 택시·버스·래핑 등 mobile 의도 시 network 매체 후보 유지 */
export function shouldRetainNetworkMobileCandidates(
  input: AiRecommendInput,
): boolean {
  if (input.plannerCategories?.includes("mobile")) return true;
  if (input.type === "mobile") return true;
  if (
    input.placementHints?.some((h) => {
      const tag = h.trim().toLowerCase();
      return tag === "bus" || tag === "subway";
    })
  ) {
    return true;
  }
  const src = input.freetextSource?.trim() ?? "";
  return MOBILE_MEDIA_HINT_RE.test(src);
}

/** excludeNetwork 요청 시 mobile network 후보는 조건부 포함 */
export function filterRecommendCandidateCatalog(
  catalog: readonly MediaItem[],
  input: AiRecommendInput | undefined,
  excludeNetwork: boolean,
): MediaItem[] {
  if (!excludeNetwork) return [...catalog];
  const retainMobileNet =
    input != null && shouldRetainNetworkMobileCandidates(input);
  return catalog.filter((m) => {
    const isNetwork =
      m.catalogSource === "network" || m.type === "network";
    if (!isNetwork) return true;
    return retainMobileNet && mediaMatchesPlannerMobileIntent(m);
  });
}

export function filterRecommendCatalogByRegions(
  catalog: readonly MediaItem[],
  plannerRegionIds: string[] | undefined,
  zones?: RecommendRegionFilterOpts,
): MediaItem[] {
  if (!plannerRegionIds?.length) return [...catalog];

  let filtered = filterCatalogByPlannerRegions(catalog, plannerRegionIds);
  const macroSet = new Set(plannerRegionIds);

  if (zones?.seoulZones?.length && macroSet.has("seoul")) {
    filtered = filtered.filter((m) =>
      mediaMatchesSeoulZones(m, zones.seoulZones!),
    );
  }
  if (zones?.busanZones?.length && macroSet.has("busan")) {
    filtered = filtered.filter((m) =>
      mediaMatchesBusanZones(m, zones.busanZones!),
    );
  }

  return filtered;
}

export function matchRecommendWithRegionalPolicy(
  fullCatalog: readonly MediaItem[],
  regionalCatalog: readonly MediaItem[],
  matchingInput: MatchingInput,
  limit: number,
  hasExplicitRegion: boolean,
): { recommendations: MatchedMedia[]; meta: RecommendMatchMeta } {
  const regionalCount = regionalCatalog.length;

  if (!hasExplicitRegion) {
    const recommendations = matchMediaCatalog(
      fullCatalog,
      matchingInput,
      limit,
    );
    return {
      recommendations,
      meta: {
        regionalCatalogCount: fullCatalog.length,
        regionSupplemented: false,
      },
    };
  }

  if (regionalCount === 0) {
    const recommendations = matchMediaCatalog(
      fullCatalog,
      matchingInput,
      limit,
    );
    return {
      recommendations,
      meta: { regionalCatalogCount: 0, regionSupplemented: false },
    };
  }

  const matchOpts: MatchMediaCatalogOpts = { strictRegionalPool: true };

  let recommendations = matchMediaCatalog(
    regionalCatalog,
    matchingInput,
    limit,
    matchOpts,
  );

  let regionSupplemented = false;

  if (regionalCount < RECOMMEND_REGION_SUPPLEMENT_THRESHOLD) {
    regionSupplemented = true;
    const pickedIds = new Set(recommendations.map((r) => r.media.id));
    const slotsLeft = Math.max(0, limit - recommendations.length);
    const supplementLimit = Math.max(slotsLeft, limit);
    const nationwide = matchMediaCatalog(
      fullCatalog,
      matchingInput,
      supplementLimit,
    ).filter((r) => !pickedIds.has(r.media.id));
    recommendations = [...recommendations, ...nationwide].slice(0, limit);
  }

  return {
    recommendations,
    meta: { regionalCatalogCount: regionalCount, regionSupplemented },
  };
}

export function runRecommendMatchFromCatalog(
  fullCatalog: readonly MediaItem[],
  matchingInput: MatchingInput,
  limit: number,
  aiInput: AiRecommendInput,
): { recommendations: MatchedMedia[]; meta: RecommendMatchMeta } {
  const plannerRegionIds = resolveAiRecommendPlannerRegionIds(aiInput);
  const regionalCatalog = filterRecommendCatalogByRegions(
    fullCatalog,
    plannerRegionIds,
    {
      seoulZones: aiInput.seoulZones ?? undefined,
      busanZones: aiInput.busanZones ?? undefined,
    },
  );

  return matchRecommendWithRegionalPolicy(
    fullCatalog,
    regionalCatalog,
    matchingInput,
    limit,
    Boolean(plannerRegionIds?.length),
  );
}
