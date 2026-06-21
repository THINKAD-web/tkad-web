import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import { matchMediaCatalog } from "@/lib/matching-engine";
import type { MatchingInput, MatchedMedia } from "@/lib/matching-engine";
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
};

export type RunRecommendationResult = {
  recommendations: MatchedMedia[];
  cached: boolean;
  logId?: string;
  claudeUsed: boolean;
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
  // v1: AI 자유입력 모드는 네트워크 매체를 후보 풀에서 명시적으로 제외한다.
  // (MediaNetwork 에 캠페인 목적 분류(targetCategory) 필드가 없어 의도적으로 스코프에서 뺀 결정)
  const catalog = opts.excludeNetwork
    ? fullCatalog.filter(
        (m) => m.catalogSource !== "network" && m.type !== "network",
      )
    : fullCatalog;
  let recommendations = matchMediaCatalog(catalog, opts.input, limit);

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

  return { recommendations, cached: false, logId, claudeUsed: useClaude };
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
