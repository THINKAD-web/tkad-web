import type { MediaItem } from "@/lib/media-data";
import type { AiRecommendInput } from "@/lib/ai-media-recommend";
import type { MatchingInput, MatchedMedia } from "@/lib/matching-engine";
import { matchMediaCatalog, type MatchMediaCatalogOpts } from "@/lib/matching-engine";
import { filterCatalogByPlannerRegions } from "@/lib/planner/planner-regions";
import type { PlannerBusanZoneKey } from "@/lib/planner/busan-zones";
import { mediaMatchesBusanZones } from "@/lib/planner/busan-zones";
import type { PlannerSeoulZoneKey } from "@/lib/planner/seoul-zones";
import { mediaMatchesSeoulZones } from "@/lib/planner/seoul-zones";

/** 이 수 미만이면 전국 보완 + UI 안내 (recommend 전용) */
export const RECOMMEND_REGION_SUPPLEMENT_THRESHOLD = 5;

const NON_SPECIFIC_REGIONS = new Set(["all", "national", ""]);

export type RecommendRegionFilterOpts = {
  seoulZones?: readonly PlannerSeoulZoneKey[];
  busanZones?: readonly PlannerBusanZoneKey[];
};

export type RecommendMatchMeta = {
  regionalCatalogCount: number;
  regionSupplemented: boolean;
};

/** AI recommend 입력 → 플래너 browse 광역 ID (하드 프리필터용) */
export function resolveAiRecommendPlannerRegionIds(
  input: AiRecommendInput,
): string[] | undefined {
  const codes = (input.regionCodes ?? []).filter(
    (c) => c && !NON_SPECIFIC_REGIONS.has(c),
  );

  if (codes.length > 0) {
    if (codes.includes("capital")) {
      const rest = codes.filter((c) => c !== "capital");
      const capitalMacro = ["seoul", "gyeonggi", "incheon"];
      return [...new Set([...capitalMacro, ...rest])];
    }
    return codes;
  }

  const r = input.region?.trim();
  if (r && !NON_SPECIFIC_REGIONS.has(r)) {
    if (r === "capital") return ["seoul", "gyeonggi", "incheon"];
    return [r];
  }

  if (input.busanZones?.length) return ["busan"];
  if (input.seoulZones?.length) return ["seoul"];

  return undefined;
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
  const matchOpts: MatchMediaCatalogOpts | undefined =
    hasExplicitRegion ? { strictRegionalPool: true } : undefined;

  let recommendations = matchMediaCatalog(
    regionalCatalog,
    matchingInput,
    limit,
    matchOpts,
  );

  const regionalCount = regionalCatalog.length;
  let regionSupplemented = false;

  if (
    hasExplicitRegion &&
    regionalCount < RECOMMEND_REGION_SUPPLEMENT_THRESHOLD
  ) {
    regionSupplemented = true;
    const pickedIds = new Set(recommendations.map((r) => r.media.id));
    const slotsLeft = Math.max(0, limit - recommendations.length);
    const supplementLimit = Math.max(slotsLeft, limit);
    const nationwide = matchMediaCatalog(fullCatalog, matchingInput, supplementLimit)
      .filter((r) => !pickedIds.has(r.media.id));
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
