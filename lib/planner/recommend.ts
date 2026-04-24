import type { MediaItem } from "@/lib/media-data";
import type {
  PlannerAgeKey,
  PlannerCampaignGoal,
  PlannerCategory,
} from "@/lib/planner/types";
import { catalogPriceFieldToPriceMan } from "@/lib/media-price-format";

export type RecommendReasonKey =
  | "matchRegion"
  | "highVisibility"
  | "budgetEfficient"
  | "ageMatch"
  | "goalFit";

export type RecommendReason = { key: RecommendReasonKey; weight: number };

export type ScoredMedia = {
  media: MediaItem;
  score: number;
  /** 점수 기여도 상위 2–3개. UI 노출용. */
  reasons: RecommendReason[];
};

export type RecommendationContext = {
  goal: PlannerCampaignGoal | null;
  regions: string[];
  categories: PlannerCategory[];
  ageKey: PlannerAgeKey;
  /** 만원 단위 예산 */
  budgetMan: number;
  months: number;
};

/**
 * w1 지역 · w2 연령 · w3 예산효율 · w4 목표유형 · w5 가시성
 * 5개 가중치 합 = 1.0. 목표(goal)에 따라 분포 변동.
 */
const WEIGHTS_BY_GOAL: Record<
  PlannerCampaignGoal,
  [number, number, number, number, number]
> = {
  brand: [0.15, 0.15, 0.15, 0.15, 0.4],
  launch: [0.25, 0.2, 0.15, 0.2, 0.2],
  event: [0.4, 0.1, 0.15, 0.25, 0.1],
  sales: [0.15, 0.15, 0.35, 0.2, 0.15],
  local: [0.45, 0.15, 0.1, 0.2, 0.1],
};

const DEFAULT_WEIGHTS: [number, number, number, number, number] = [
  0.25, 0.15, 0.2, 0.2, 0.2,
];

/** 목표별 매체 유형 선호도 (0–1) */
const GOAL_TYPE_AFFINITY: Record<
  PlannerCampaignGoal,
  Partial<Record<string, number>>
> = {
  brand: { digital: 1, static: 0.8, mobile: 0.7, network: 0.7 },
  launch: { digital: 1, static: 0.9, mobile: 0.7, network: 0.8 },
  event: { digital: 0.8, static: 0.9, mobile: 1, network: 0.9 },
  sales: { digital: 1, static: 0.7, mobile: 0.8, network: 0.8 },
  local: { digital: 0.7, static: 1, mobile: 0.9, network: 0.85 },
};

function regionScore(media: MediaItem, regions: string[]): number {
  if (regions.length === 0) return 0.5;
  if (regions.includes(media.region)) return 1;
  if (regions.includes("national") && media.region !== "national") return 0.4;
  return 0.1;
}

function ageScore(ageKey: PlannerAgeKey, targetAge?: string | null): number {
  if (ageKey === "ageAll" || !targetAge) return 0.7;
  const lower = targetAge.replace(/\s+/g, "");
  const matches: Record<PlannerAgeKey, RegExp[]> = {
    ageAll: [],
    age20s: [/20대/, /\b20-29\b/, /\b2\d\b/, /young/i],
    age30s: [/30대/, /\b30-39\b/, /\b3\d\b/],
    age40s: [/40대/, /\b40-49\b/, /\b4\d\b/],
    age50plus: [/50대/, /60대/, /\b50\+/, /senior/i, /\b5\d\b/, /\b6\d\b/],
  };
  const patterns = matches[ageKey] ?? [];
  return patterns.some((p) => p.test(lower)) ? 1 : 0.3;
}

/**
 * 예산 효율: 일유동인구 / (월단가 만원).
 * 전체 최고값으로 0–1 정규화.
 */
function efficiencyScoreFactory(catalog: readonly MediaItem[]) {
  let maxRatio = 0;
  for (const m of catalog) {
    const priceMan = catalogPriceFieldToPriceMan(m.price);
    if (priceMan <= 0) continue;
    const r = (m.dailyFootTraffic ?? 0) / priceMan;
    if (r > maxRatio) maxRatio = r;
  }
  if (maxRatio === 0) return () => 0.5;
  return (media: MediaItem) => {
    const priceMan = catalogPriceFieldToPriceMan(media.price);
    if (priceMan <= 0) return 0.3;
    const r = (media.dailyFootTraffic ?? 0) / priceMan;
    return Math.max(0, Math.min(1, r / maxRatio));
  };
}

function goalFitScore(
  media: MediaItem,
  goal: PlannerCampaignGoal | null,
): number {
  if (!goal) return 0.6;
  const affinity = GOAL_TYPE_AFFINITY[goal];
  return affinity[media.type] ?? 0.5;
}

function visibilityScore(media: MediaItem): number {
  const v = media.visibilityScore;
  if (typeof v !== "number") return 0.5;
  if (v >= 100) return 1;
  if (v <= 0) return 0;
  return v / 100;
}

/** 단일 매체 스코어 + 기여도 상위 이유 추출 */
export function scoreMedia(
  media: MediaItem,
  ctx: RecommendationContext,
  effFn: (m: MediaItem) => number,
): ScoredMedia {
  const weights = ctx.goal
    ? WEIGHTS_BY_GOAL[ctx.goal] ?? DEFAULT_WEIGHTS
    : DEFAULT_WEIGHTS;

  const parts: Array<{
    key: RecommendReasonKey;
    raw: number;
    weighted: number;
  }> = [
    {
      key: "matchRegion",
      raw: regionScore(media, ctx.regions),
      weighted: 0,
    },
    {
      key: "ageMatch",
      raw: ageScore(ctx.ageKey, media.targetAge),
      weighted: 0,
    },
    {
      key: "budgetEfficient",
      raw: effFn(media),
      weighted: 0,
    },
    {
      key: "goalFit",
      raw: goalFitScore(media, ctx.goal),
      weighted: 0,
    },
    {
      key: "highVisibility",
      raw: visibilityScore(media),
      weighted: 0,
    },
  ];
  parts.forEach((p, i) => {
    p.weighted = p.raw * weights[i];
  });

  const score = parts.reduce((a, p) => a + p.weighted, 0);

  const reasons = parts
    .filter((p) => p.raw >= 0.7)
    .sort((a, b) => b.weighted - a.weighted)
    .slice(0, 3)
    .map<RecommendReason>((p) => ({ key: p.key, weight: p.weighted }));

  return { media, score, reasons };
}

/**
 * 매체 카탈로그에서 컨텍스트에 맞는 상위 N개 추천.
 *
 * - 카테고리 필터 적용 (선택한 유형만)
 * - 예산 미반영 (UI 단에서 "담기" 시 계산) — `limit` 만 컨트롤
 * - reasons 가 비어 있는 매체는 후순위로
 */
export function recommendPlannerMedia(
  catalog: readonly MediaItem[],
  ctx: RecommendationContext,
  limit = 5,
): ScoredMedia[] {
  const effFn = efficiencyScoreFactory(catalog);
  const filtered = catalog.filter((m) => {
    if (ctx.categories.length === 0) return true;
    // 네트워크 매체는 type="network" 이므로 별도 허용 (카테고리 필터에 포함되지 않음)
    if (m.type === "network") return true;
    return (ctx.categories as readonly string[]).includes(m.type);
  });
  const scored = filtered
    .map((m) => scoreMedia(m, ctx, effFn))
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}
