import type { MediaItem } from "@/lib/media-data";
import type {
  PlannerAgeKey,
  PlannerCampaignGoal,
  PlannerCategory,
  PlannerIndustryKey,
} from "@/lib/planner/types";
import { catalogPriceFieldToPriceMan } from "@/lib/media-price-format";
import { haversineKm } from "@/lib/media-data";

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
  /** Step 2 업종 — 매체 메타·설명 키워드와 느슨 매칭 */
  industryKey: PlannerIndustryKey | null;
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
  /** 가시성 한 축(구 0.4)이 과도하면 동일 "랜드마크" 5곳이 고정됨 → 지역/연령/목표 비중 상향 */
  brand: [0.18, 0.2, 0.18, 0.24, 0.2],
  launch: [0.24, 0.2, 0.16, 0.22, 0.18],
  event: [0.36, 0.12, 0.16, 0.24, 0.12],
  sales: [0.16, 0.18, 0.32, 0.2, 0.14],
  local: [0.42, 0.16, 0.12, 0.2, 0.1],
};

const DEFAULT_WEIGHTS: [number, number, number, number, number] = [
  0.2, 0.2, 0.2, 0.22, 0.18,
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
  if (ageKey === "ageAll") return 0.62;
  if (!targetAge) return 0.54; // 미디어 `targetAge` 없음 — 매칭 불가, 동률·가시성 편중 완화
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
  industryKey: PlannerIndustryKey | null,
): number {
  const typeFit = (() => {
    if (!goal) return 0.6;
    const affinity = GOAL_TYPE_AFFINITY[goal];
    return affinity[media.type] ?? 0.5;
  })();
  const ind = industryFitScore(media, industryKey);
  return Math.min(1, typeFit * (0.72 + 0.28 * ind));
}

function visibilityScore(media: MediaItem): number {
  const v = media.visibilityScore;
  if (typeof v !== "number") return 0.5;
  if (v <= 0) return 0;
  // DB는 0~4 척도, 레거시 목업은 0~100 — 둘 다 0~1로 정규화
  const linear =
    v <= 4 ? Math.min(1, v / 4) : v >= 100 ? 1 : Math.min(1, v / 100);
  // 상위권 쏠림 완화 (동일 권역 대형 매체만 쭉 뜨는 것 완화)
  return Math.max(0, Math.min(1, Math.pow(linear, 0.82)));
}

/** 업종 키워드(한·영) — 매체 텍스트 필드와 느슨 매칭, 규칙 기반 */
const INDUSTRY_HINTS: Record<Exclude<PlannerIndustryKey, "indOther">, string[]> = {
  indFb: [
    "f&b",
    "fb",
    "food",
    "beverage",
    "cafe",
    "coffee",
    "restaurant",
    "dining",
    "식음료",
    "카페",
    "음식",
    "레스토랑",
    "주류",
    "베이커리",
  ],
  indRetail: [
    "retail",
    "mall",
    "department",
    "mart",
    "shop",
    "store",
    "boutique",
    "리테일",
    "백화점",
    "마트",
    "쇼핑",
    "매장",
    "아울렛",
  ],
  indTech: [
    "tech",
    "it",
    "software",
    "saas",
    "ai",
    "digital",
    "electronics",
    "smartphone",
    "테크",
    "소프트웨어",
    "전자",
    "it ",
    "ict",
  ],
  indFinance: [
    "finance",
    "bank",
    "insurance",
    "fintech",
    "investment",
    "card",
    "금융",
    "은행",
    "보험",
    "증권",
    "카드",
  ],
  indEnt: [
    "entertainment",
    "concert",
    "game",
    "esports",
    "cinema",
    "culture",
    "k-pop",
    "엔터",
    "콘서트",
    "게임",
    "영화",
    "문화",
  ],
};

function industryFitScore(
  media: MediaItem,
  industryKey: PlannerIndustryKey | null,
): number {
  if (!industryKey || industryKey === "indOther") return 0.72;
  const hints = INDUSTRY_HINTS[industryKey as Exclude<PlannerIndustryKey, "indOther">];
  if (!hints?.length) return 0.72;
  const hay = [
    media.name,
    media.features,
    media.featuresEn,
    media.description,
    media.descriptionEn,
    media.catalogDescription,
    media.catalogDescriptionEn,
    media.nearbyFacilities,
    media.nearbyFacilitiesEn,
    media.advertiserHistory,
    media.advertiserHistoryEn,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (!hay.trim()) return 0.55;
  return hints.some((h) => hay.includes(h.toLowerCase())) ? 1 : 0.48;
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
      raw: goalFitScore(media, ctx.goal, ctx.industryKey ?? null),
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

function minKmToPicked(
  m: MediaItem,
  picked: readonly ScoredMedia[],
): number {
  let d = Number.POSITIVE_INFINITY;
  for (const p of picked) {
    const km = haversineKm(m, p.media);
    if (km < d) d = km;
  }
  return d;
}

/**
 * 점수 상위만 자르면 같은 5대 랜드마크가 반복 → 상위 풀에서 지리·유형 다양성을 반영해 N개 선별.
 * (MMR 느낀 규칙, LLM 아님)
 */
function pickDiverseTop(scored: ScoredMedia[], limit: number): ScoredMedia[] {
  if (scored.length === 0) return [];
  const pool = scored.slice(0, Math.min(45, scored.length));
  if (pool.length <= limit) return pool;

  const picked: ScoredMedia[] = [pool[0]!];
  const used = new Set<string>([pool[0]!.media.id]);

  while (picked.length < limit) {
    let best: ScoredMedia | null = null;
    let bestAdj = -1;
    for (const c of pool) {
      if (used.has(c.media.id)) continue;
      const minD = minKmToPicked(c.media, picked);
      const hasSameType = picked.some((p) => p.media.type === c.media.type);
      const typeFactor = hasSameType ? 0.91 : 1.05;
      const finiteD = Number.isFinite(minD) ? minD : 6;
      const distFactor = 1 + 0.12 * Math.min(1, finiteD / 7);
      const closeCluster =
        Number.isFinite(minD) && minD < 0.45 && picked.length > 0
          ? 0.8
          : 1;
      const adj = c.score * typeFactor * distFactor * closeCluster;
      if (adj > bestAdj) {
        bestAdj = adj;
        best = c;
      }
    }
    if (!best) break;
    picked.push(best);
    used.add(best.media.id);
  }
  return picked;
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
  const emptyReasonLast = (a: ScoredMedia, b: ScoredMedia) => {
    const ae = a.reasons.length === 0 ? 1 : 0;
    const be = b.reasons.length === 0 ? 1 : 0;
    if (ae !== be) return ae - be;
    return 0;
  };
  const scored = filtered
    .map((m) => scoreMedia(m, ctx, effFn))
    .sort((a, b) => {
      const d = b.score - a.score;
      if (Math.abs(d) > 1e-6) return d;
      const e = emptyReasonLast(a, b);
      if (e !== 0) return e;
      const ft = (b.media.dailyFootTraffic ?? 0) - (a.media.dailyFootTraffic ?? 0);
      if (ft !== 0) return ft;
      return a.media.id.localeCompare(b.media.id);
    });
  return pickDiverseTop(scored, limit);
}
