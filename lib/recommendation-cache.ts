import { createHash } from "node:crypto";
import type { MatchingInput } from "@/lib/matching-engine";
import type { MatchedMedia } from "@/lib/matching-engine";

const TTL_MS = 5 * 60 * 1000;

type CacheEntry = {
  expiresAt: number;
  data: MatchedMedia[];
  catalogVersion: string;
};

const store = new Map<string, CacheEntry>();

let catalogVersionToken = "v0";

export function bumpRecommendationCatalogVersion(): void {
  catalogVersionToken = `v${Date.now()}`;
  store.clear();
}

export function recommendationCacheKey(
  input: MatchingInput,
  source: string,
  limit: number,
): string {
  const normalized = {
    source,
    limit,
    catalogVersion: catalogVersionToken,
    monthlyBudgetWon: Math.round(input.monthlyBudgetWon),
    regions: [...input.regions].sort(),
    industry: input.industry,
    targets: [...input.targets].sort(),
    durationMonths: input.durationMonths,
    goal: input.goal,
    categories: [...(input.categories ?? [])].sort(),
    seed: input.seed ?? 0,
  };
  return createHash("sha256")
    .update(JSON.stringify(normalized))
    .digest("hex");
}

export function getCachedRecommendations(
  key: string,
): MatchedMedia[] | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    store.delete(key);
    return null;
  }
  return hit.data;
}

export function setCachedRecommendations(
  key: string,
  data: MatchedMedia[],
): void {
  if (store.size > 500) {
    const oldest = store.keys().next().value;
    if (oldest) store.delete(oldest);
  }
  store.set(key, {
    expiresAt: Date.now() + TTL_MS,
    data,
    catalogVersion: catalogVersionToken,
  });
}
