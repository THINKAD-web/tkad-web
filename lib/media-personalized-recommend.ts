import { recommendMedia } from "@/lib/ai-media-recommend";
import type { MediaItem } from "@/lib/media-data";
import { isInstantBookingEligible } from "@/lib/instant-booking-eligibility";
import {
  attachRecommendReason,
  type MediaWithRecommendReason,
} from "@/lib/media-recommend-reasons";
import {
  buildRecommendInputFromPreference,
} from "@/lib/onboarding-recommend";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import type { UserPreferenceDto } from "@/lib/onboarding-types";
import { needsIndustrySteps } from "@/lib/onboarding-types";

type ViewProfile = {
  regions: Map<string, number>;
  types: Map<string, number>;
  prices: number[];
};

function median(nums: number[]): number | undefined {
  if (nums.length === 0) return undefined;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function budgetRangeWon(
  range: UserPreferenceDto["budgetRange"],
): { min: number; max: number } | null {
  switch (range) {
    case "under_500":
      return { min: 0, max: 5_000_000 };
    case "500_3000":
      return { min: 500_000, max: 30_000_000 };
    case "over_3000":
      return { min: 30_000_000, max: Number.POSITIVE_INFINITY };
    default:
      return null;
  }
}

async function loadViewProfile(
  userId: string,
  catalog: readonly MediaItem[],
): Promise<ViewProfile | null> {
  if (!isDatabaseConfigured()) return null;
  const db = getPrisma();
  const byId = new Map(catalog.map((m) => [m.id, m]));

  const regions = new Map<string, number>();
  const types = new Map<string, number>();
  const prices: number[] = [];

  const addMedia = (m: MediaItem | undefined, weight = 1) => {
    if (!m) return;
    const regionKey = m.regionZone?.trim() || m.region;
    regions.set(regionKey, (regions.get(regionKey) ?? 0) + weight);
    types.set(m.type, (types.get(m.type) ?? 0) + weight);
    if (m.price > 0) prices.push(m.price);
  };

  const recentRows = await db.userRecentlyViewedMedia.findMany({
    where: { userId },
    orderBy: { visitedAt: "desc" },
    take: 12,
    select: { mediaId: true, region: true, type: true, price: true },
  });

  for (const r of recentRows) {
    const fromCatalog = byId.get(r.mediaId);
    if (fromCatalog) addMedia(fromCatalog, 2);
    else {
      regions.set(r.region, (regions.get(r.region) ?? 0) + 1);
      types.set(r.type, (types.get(r.type) ?? 0) + 1);
      if (r.price > 0) prices.push(r.price);
    }
  }

  const conversionViews = await db.conversionEvent.findMany({
    where: {
      userId,
      type: "media_view",
      mediaId: { not: null },
    },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: { mediaId: true },
  });

  for (const ev of conversionViews) {
    if (ev.mediaId) addMedia(byId.get(ev.mediaId), 1);
  }

  if (regions.size === 0 && types.size === 0 && prices.length === 0) {
    return null;
  }

  return { regions, types, prices };
}

function scoreForUser(
  m: MediaItem,
  profile: ViewProfile | null,
  budget: { min: number; max: number } | null,
  aiScore: number,
): number {
  let s = aiScore * 10;

  if (profile) {
    const regionKey = m.regionZone?.trim() || m.region;
    s += (profile.regions.get(regionKey) ?? profile.regions.get(m.region) ?? 0) * 8;
    s += (profile.types.get(m.type) ?? 0) * 6;
    const med = median(profile.prices);
    if (med != null && med > 0) {
      const pr = Math.abs(m.price - med) / med;
      if (pr <= 0.25) s += 12;
      else if (pr <= 0.45) s += 5;
    }
  }

  if (budget) {
    if (m.price >= budget.min && m.price <= budget.max) s += 10;
    else if (m.price > budget.max * 1.2) s -= 8;
  }

  s += (m.popularityScore ?? 0) * 0.05;

  const instant = isInstantBookingEligible(m);
  if (instant.eligible) s += 3;

  return s;
}

/**
 * 로그인 사용자 홈 개인화 추천 (최근 조회 + 온보딩 + 인기 점수).
 */
export async function recommendPersonalizedHomeMedia(
  userId: string,
  pref: UserPreferenceDto | null,
  catalog: readonly MediaItem[],
  locale: string,
  limit = 6,
): Promise<MediaWithRecommendReason<MediaItem>[]> {
  const active = catalog.filter(
    (m) => m.catalogSource !== "network" && m.price > 0,
  );
  if (active.length === 0) return [];

  const profile = await loadViewProfile(userId, active);
  const budget = pref?.budgetRange ? budgetRangeWon(pref.budgetRange) : null;

  let aiRank = new Map<string, number>();
  if (pref && needsIndustrySteps(pref.onboardingRole)) {
    const input = buildRecommendInputFromPreference(pref);
    const scored = recommendMedia(input, active, active);
    aiRank = new Map(scored.map((s, i) => [s.item.id, scored.length - i]));
  }

  const ranked = active
    .map((m) => ({
      m,
      s: scoreForUser(m, profile, budget, aiRank.get(m.id) ?? 0),
    }))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.m);

  return attachRecommendReason(ranked, "personalized", locale);
}
