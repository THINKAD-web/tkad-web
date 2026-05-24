import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import { matchMediaCatalog } from "@/lib/matching-engine";
import type { MatchingInput, MatchedMedia } from "@/lib/matching-engine";
import {
  getCachedRecommendations,
  recommendationCacheKey,
  setCachedRecommendations,
} from "@/lib/recommendation-cache";
import { enrichWithClaude } from "@/lib/recommendation-claude";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export type RunRecommendationOpts = {
  input: MatchingInput;
  source: "recommend" | "planner";
  limit?: number;
  useClaude?: boolean;
  isKo?: boolean;
  userId?: string | null;
  sessionId?: string | null;
  skipCache?: boolean;
};

export type RunRecommendationResult = {
  recommendations: MatchedMedia[];
  cached: boolean;
  logId?: string;
};

export async function runRecommendation(
  opts: RunRecommendationOpts,
): Promise<RunRecommendationResult> {
  const limit = opts.limit ?? 10;
  const key = recommendationCacheKey(opts.input, opts.source, limit);

  if (!opts.skipCache) {
    const cached = getCachedRecommendations(key);
    if (cached) {
      return { recommendations: cached, cached: true };
    }
  }

  const catalog = await fetchPublicMediaCatalog();
  let recommendations = matchMediaCatalog(catalog, opts.input, limit);

  if (opts.useClaude !== false) {
    recommendations = await enrichWithClaude(
      opts.input,
      recommendations,
      opts.isKo ?? true,
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
          input: opts.input as object,
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

  return { recommendations, cached: false, logId };
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
