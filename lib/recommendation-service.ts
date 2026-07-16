import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import { matchMediaCatalog } from "@/lib/matching-engine";
import type { MatchingInput, MatchedMedia } from "@/lib/matching-engine";
import type { AiRecommendInput } from "@/lib/ai-media-recommend";
import { filterCatalogByPlannerRegions } from "@/lib/planner/planner-regions";
import {
  filterRecommendCatalogByRegions,
  filterRecommendCandidateCatalog,
  matchRecommendWithRegionalPolicy,
  resolveAiRecommendPlannerRegionIds,
  type RecommendMatchMeta,
} from "@/lib/recommend/recommend-region-filter";
import {
  getCachedRecommendations,
  recommendationCacheKey,
  setCachedRecommendations,
} from "@/lib/recommendation-cache";
import { enrichWithClaude } from "@/lib/recommendation-claude";
import { isPlannerClaudeEnabled } from "@/lib/planner/planner-claude-config";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

function resolveUseClaude(opts: RunRecommendationOpts): boolean {
  if (opts.useClaude === true) return true;
  if (opts.useClaude === false) return false;
  if (opts.source === "planner") return isPlannerClaudeEnabled();
  return true;
}

export type RunRecommendationOpts = {
  input: MatchingInput;
  source: "recommend" | "planner";
  limit?: number;
  useClaude?: boolean;
  /** v1 AI 자유입력: 네트워크 매체(MediaNetwork) 후보 제외 */
  excludeNetwork?: boolean;
  isKo?: boolean;
  userId?: string | null;
  sessionId?: string | null;
  skipCache?: boolean;
  /** 플래너 browse 광역 ID — 설정 시 `matchesPlannerRegion` 하드 프리필터 */
  plannerRegionIds?: string[];
  /** `/recommend` AI 입력 — 광역·상권 필터·보완 정책 (source=recommend) */
  aiRecommendInput?: AiRecommendInput;
};

export type RunRecommendationResult = {
  recommendations: MatchedMedia[];
  cached: boolean;
  logId?: string;
  claudeUsed: boolean;
  regionMeta?: RecommendMatchMeta;
};

export async function runRecommendation(
  opts: RunRecommendationOpts,
): Promise<RunRecommendationResult> {
  const limit = opts.limit ?? 10;
  const useClaude = resolveUseClaude(opts);
  // 네트워크 제외 시 캐시 키를 분리해 일반(네트워크 포함) 결과와 섞이지 않게 한다.
  const cacheSource = opts.excludeNetwork ? `${opts.source}:nonet` : opts.source;
  const key = recommendationCacheKey(opts.input, cacheSource, limit, {
    useClaude,
  });

  if (!opts.skipCache) {
    const cached = getCachedRecommendations(key);
    if (cached) {
      return { recommendations: cached, cached: true, claudeUsed: useClaude };
    }
  }

  const fullCatalog = await fetchPublicMediaCatalog();
  let catalog = filterRecommendCandidateCatalog(
    fullCatalog,
    opts.aiRecommendInput,
    Boolean(opts.excludeNetwork),
  );

  let regionMeta: RecommendMatchMeta | undefined;
  let recommendations: MatchedMedia[];

  if (opts.source === "recommend" && opts.aiRecommendInput) {
    const plannerRegionIds =
      opts.plannerRegionIds ??
      resolveAiRecommendPlannerRegionIds(opts.aiRecommendInput);
    const regionalCatalog = filterRecommendCatalogByRegions(
      catalog,
      plannerRegionIds,
      {
        seoulZones: opts.aiRecommendInput.seoulZones ?? undefined,
        busanZones: opts.aiRecommendInput.busanZones ?? undefined,
        gyeonggiZones: opts.aiRecommendInput.gyeonggiZones ?? undefined,
        incheonZones: opts.aiRecommendInput.incheonZones ?? undefined,
      },
    );
    const hasExplicitSubZone = Boolean(
      opts.aiRecommendInput.seoulZones?.length ||
        opts.aiRecommendInput.busanZones?.length ||
        opts.aiRecommendInput.gyeonggiZones?.length ||
        opts.aiRecommendInput.incheonZones?.length,
    );
    const matched = matchRecommendWithRegionalPolicy(
      catalog,
      regionalCatalog,
      opts.input,
      limit,
      Boolean(plannerRegionIds?.length),
      hasExplicitSubZone,
    );
    regionMeta = matched.meta;
    recommendations = matched.recommendations;
  } else {
    if (opts.plannerRegionIds && opts.plannerRegionIds.length > 0) {
      catalog = filterCatalogByPlannerRegions(catalog, opts.plannerRegionIds);
    }
    recommendations = matchMediaCatalog(catalog, opts.input, limit);
  }

  if (useClaude) {
    recommendations = await enrichWithClaude(
      opts.input,
      recommendations,
      opts.isKo ?? true,
      {
        source: opts.source,
        userId: opts.userId ?? null,
        cached: false,
      },
    );
  }

  setCachedRecommendations(key, recommendations);

  let logId: string | undefined;
  if (isDatabaseConfigured()) {
    try {
      const db = getPrisma();
      const row = await db.recommendationLog.create({
        data: {
          userId: opts.userId ?? null,
          sessionId: opts.sessionId ?? null,
          source: opts.source,
          input: {
            ...(opts.input as object),
            _meta: { claudeUsed: useClaude, cached: false },
          } as object,
          recommendations: recommendations.map((r) => ({
            mediaId: r.media.id,
            score: r.score,
            breakdown: r.breakdown,
            role: r.role,
            budgetAllocation: r.budgetAllocation,
          })),
        },
      });
      logId = row.id;
    } catch (e) {
      console.warn("[runRecommendation] log persist failed", e);
    }
  }

  return { recommendations, cached: false, logId, claudeUsed: useClaude, regionMeta };
}

export async function markRecommendationSelection(
  logId: string,
  selectedMediaIds: string[],
): Promise<void> {
  if (!isDatabaseConfigured() || !logId) return;
  try {
    const db = getPrisma();
    await db.recommendationLog.update({
      where: { id: logId },
      data: { selectedMediaIds },
    });
  } catch {
    /* ignore */
  }
}

export async function markRecommendationConverted(
  logId: string,
): Promise<void> {
  if (!isDatabaseConfigured() || !logId) return;
  try {
    const db = getPrisma();
    await db.recommendationLog.update({
      where: { id: logId },
      data: { convertedToInquiry: true },
    });
  } catch {
    /* ignore */
  }
}
