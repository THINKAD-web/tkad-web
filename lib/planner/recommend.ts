import type { MediaItem } from "@/lib/media-data";
import { matchesPlannerCategory } from "@/lib/planner-logic";
import { matchesPlannerRegion } from "@/lib/planner/planner-regions";
import type {
  PlannerAgeKey,
  PlannerCampaignGoal,
  PlannerCategory,
  PlannerIndustryKey,
} from "@/lib/planner/types";
import { matchMediaCatalog } from "@/lib/matching-engine";
import { plannerContextToMatching } from "@/lib/recommendation-adapters";
import { catalogPriceFieldToPriceMan } from "@/lib/media-price-format";
import { haversineKm } from "@/lib/media-data";

export type RecommendReasonKey =
  | "matchRegion"
  | "highVisibility"
  | "budgetEfficient"
  | "ageMatch"
  | "goalFit"
  | "landmarkHotspot"
  | "transitHotspot"
  | "retailHotspot"
  | "neighborhoodHotspot";

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
  ageKeys: PlannerAgeKey[];
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

/**
 * 목표별 텍스트 힌트(규칙 기반).
 * 매체 데이터가 빈약해도(=targetAge/description 없음) 최소한의 “맥락 차이”를 만들기 위한 신호.
 */
const GOAL_HINTS: Record<PlannerCampaignGoal, string[]> = {
  brand: [
    "랜드마크",
    "대형",
    "프리미엄",
    "미디어월",
    "led",
    "media wall",
    "광장",
    "스퀘어",
    "메가",
    "타워",
    "센터",
    "airport",
    "인천공항",
  ],
  launch: [
    "신규",
    "오픈",
    "런칭",
    "launch",
    "grand",
    "opening",
    "신제품",
    "팝업",
    "pop-up",
    "미디어월",
    "전광판",
  ],
  event: [
    "행사",
    "페스티벌",
    "festival",
    "콘서트",
    "concert",
    "경기장",
    "stadium",
    "전시",
    "exhibition",
    "역",
    "환승",
    "터미널",
    "terminal",
    "버스",
    "지하철",
  ],
  sales: [
    "쇼핑",
    "매장",
    "리테일",
    "백화점",
    "마트",
    "아울렛",
    "mall",
    "department",
    "mart",
    "outlet",
    "store",
    "프로모션",
    "coupon",
    "쿠폰",
  ],
  local: [
    "동네",
    "주거",
    "아파트",
    "학원",
    "병원",
    "시장",
    "community",
    "residential",
    "neighborhood",
    "역세권",
    "로데오",
  ],
};

const LANDMARK_HINTS = [
  "랜드마크",
  "광장",
  "스퀘어",
  "타워",
  "센터",
  "미디어월",
  "전광판",
  "airport",
  "인천공항",
  "터미널",
  "terminal",
];

const TRANSIT_HINTS = [
  "역",
  "지하철",
  "환승",
  "버스",
  "정류장",
  "terminal",
  "터미널",
  "station",
  "subway",
  "bus",
];

const RETAIL_HINTS = [
  "백화점",
  "마트",
  "아울렛",
  "쇼핑",
  "상권",
  "mall",
  "department",
  "mart",
  "outlet",
  "shopping",
];

const NEIGHBORHOOD_HINTS = [
  "주거",
  "아파트",
  "학원",
  "병원",
  "시장",
  "동네",
  "residential",
  "apartment",
  "neighborhood",
];

function haystackForHints(media: MediaItem): string {
  return [
    media.name,
    media.nameEn,
    media.location,
    media.locationEn,
    media.subCategory,
    ...(media.tags ?? []),
    media.nearbyFacilities,
    media.nearbyFacilitiesEn,
    media.nearbyStations,
    media.nearbyLandmarks,
    media.features,
    media.featuresEn,
    media.description,
    media.descriptionEn,
    media.catalogDescription,
    media.catalogDescriptionEn,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function hintHitCount(hay: string, hints: string[]): number {
  if (!hay.trim()) return 0;
  let hits = 0;
  for (const h of hints) if (hay.includes(h.toLowerCase())) hits += 1;
  return hits;
}

function regionScore(media: MediaItem, regions: string[]): number {
  if (regions.length === 0) return 0.5;
  if (regions.some((r) => matchesPlannerRegion(media, r))) return 1;
  if (regions.includes("national") && media.region === "national") return 0.4;
  return 0.1;
}

function ageScoreForKeys(
  ageKeys: PlannerAgeKey[],
  targetAge?: string | null,
): number {
  if (ageKeys.length === 0) return 0.62;
  let best = 0;
  for (const key of ageKeys) {
    best = Math.max(best, ageScoreSingle(key, targetAge));
  }
  return best;
}

function ageScoreSingle(ageKey: PlannerAgeKey, targetAge?: string | null): number {
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
  const goalHintScore = (() => {
    if (!goal) return 0.6;
    const hints = GOAL_HINTS[goal] ?? [];
    if (hints.length === 0) return 0.6;
    const hay = [
      media.name,
      media.nameEn,
      media.location,
      media.locationEn,
      media.subCategory,
      ...(media.tags ?? []),
      media.nearbyFacilities,
      media.nearbyFacilitiesEn,
      media.nearbyStations,
      media.nearbyLandmarks,
      media.features,
      media.featuresEn,
      media.description,
      media.descriptionEn,
      media.catalogDescription,
      media.catalogDescriptionEn,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!hay.trim()) return 0.55;
    let hits = 0;
    for (const h of hints) {
      if (hay.includes(h.toLowerCase())) hits += 1;
    }
    // 0~1: 0 hits -> 0.45, 1~ -> 상승, 상한
    if (hits <= 0) return 0.45;
    return Math.min(1, 0.55 + 0.15 * hits);
  })();

  const typeFit = (() => {
    if (!goal) return 0.6;
    const affinity = GOAL_TYPE_AFFINITY[goal];
    return affinity[media.type] ?? 0.5;
  })();
  const ind = industryFitScore(media, industryKey);
  const base = typeFit * (0.68 + 0.32 * ind);
  // 목표 힌트는 “결정적” 신호가 아니라 보조. base를 해치지 않게 완만히 반영.
  return Math.max(0, Math.min(1, base * (0.85 + 0.15 * goalHintScore)));
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
      raw: ageScoreForKeys(ctx.ageKeys, media.targetAge),
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

  const hay = haystackForHints(media);
  const extraReasonKeys: RecommendReasonKey[] = (() => {
    const goal = ctx.goal;
    if (!goal) return [];
    // pick one strongest “goal-like” extra reason to avoid clutter
    if (goal === "sales") {
      return hintHitCount(hay, RETAIL_HINTS) >= 1 ? ["retailHotspot"] : [];
    }
    if (goal === "event") {
      return hintHitCount(hay, TRANSIT_HINTS) >= 1 ? ["transitHotspot"] : [];
    }
    if (goal === "local") {
      const districtSignal =
        typeof media.district === "string" && media.district.trim() ? 1 : 0;
      const hits = hintHitCount(hay, NEIGHBORHOOD_HINTS);
      return districtSignal || hits >= 1 ? ["neighborhoodHotspot"] : [];
    }
    // brand/launch: landmark-ish
    return hintHitCount(hay, LANDMARK_HINTS) >= 1 ? ["landmarkHotspot"] : [];
  })();

  let reasons = parts
    .filter((p) => p.raw >= 0.55)
    .sort((a, b) => b.weighted - a.weighted)
    .slice(0, 3)
    .map<RecommendReason>((p) => ({ key: p.key, weight: p.weighted }));
  if (reasons.length === 0) {
    const top = [...parts].sort((a, b) => b.weighted - a.weighted)[0];
    if (top && top.raw > 0.12) {
      reasons = [{ key: top.key, weight: top.weighted }];
    }
  }

  // inject goal-specific extra reason (UI clarity), without inflating score.
  for (const k of extraReasonKeys) {
    if (reasons.some((r) => r.key === k)) continue;
    if (reasons.length >= 3) break;
    reasons.push({ key: k, weight: 0.00001 });
  }

  return { media, score, reasons };
}

/**
 * 총예산(만원) ÷ 기간(월) 대비 매체 월 단가(만원) — 추천에 반영해 예산만 바꿔도 믹스가 움직이게 함.
 * 가격 미기입(0)이면 중립 1.
 */
function budgetAffordabilityMultiplier(
  media: MediaItem,
  budgetMan: number,
  months: number,
): number {
  if (!Number.isFinite(budgetMan) || budgetMan <= 0 || months <= 0) return 1;
  const spendPerMonth = budgetMan / months;
  const priceMan = catalogPriceFieldToPriceMan(media.price);
  if (!(priceMan > 0) || !(spendPerMonth > 0)) return 1;
  const ratio = priceMan / spendPerMonth;
  if (ratio <= 0.85) return 1.04;
  if (ratio <= 1) return 1;
  if (ratio <= 1.25) return 0.93;
  if (ratio <= 1.6) return 0.82;
  if (ratio <= 2.2) return 0.68;
  if (ratio <= 3.5) return 0.52;
  return Math.max(0.22, 0.75 / Math.sqrt(ratio));
}

function ageTargetTilt(
  ageKeys: PlannerAgeKey[],
  targetAge?: string | null,
): number {
  if (ageKeys.length === 0) return 1;
  return 0.9 + 0.14 * ageScoreForKeys(ageKeys, targetAge);
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
 *
 * `seed`(새로고침 틱): 정렬 상위 구간에서 첫 매체를 바꿔 같은 5곡만 반복되는 느낌을 줄임.
 */
function pickDiverseTop(
  scored: ScoredMedia[],
  limit: number,
  seed: number,
): ScoredMedia[] {
  if (scored.length === 0) return [];
  const pool = scored.slice(0, Math.min(45, scored.length));
  if (pool.length <= limit) {
    if (seed === 0 || pool.length <= 1) return pool;
    const rot = ((seed * 1103515245) >>> 0) % pool.length;
    return [...pool.slice(rot), ...pool.slice(0, rot)];
  }

  const span = Math.min(18, pool.length);
  const firstIdx =
    seed === 0 ? 0 : ((seed * 2654435761 + 1597334677) >>> 0) % span;
  const first = pool[firstIdx]!;
  const picked: ScoredMedia[] = [first];
  const used = new Set<string>([first.media.id]);

  while (picked.length < limit) {
    let best: ScoredMedia | null = null;
    let bestAdj = -1;
    for (const c of pool) {
      if (used.has(c.media.id)) continue;
      const minD = minKmToPicked(c.media, picked);
      const hasSameType = picked.some((p) => p.media.type === c.media.type);
      const typeFactor = hasSameType ? 0.82 : 1.08;
      const finiteD = Number.isFinite(minD) ? minD : 6;
      const distFactor = 1 + 0.18 * Math.min(1, finiteD / 7);
      const closeCluster =
        Number.isFinite(minD) && minD < 0.45 && picked.length > 0
          ? 0.72
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
 * - 총예산·기간으로 월 가용액 대비 매체 월 단가 적합도 + 연령 타깃 틸트
 * - 새로고침(seed>0): 정렬 상위권에서 슬라이딩 윈도우로 후보 풀을 옮겨 다른 믹스 탐색
 * - reasons 가 비어 있는 매체는 후순위로
 */
export function recommendPlannerMedia(
  catalog: readonly MediaItem[],
  ctx: RecommendationContext,
  limit = 5,
  seed = 0,
): ScoredMedia[] {
  const filteredByCategory = catalog.filter((m) => {
    if (ctx.categories.length === 0) return true;
    return (ctx.categories as readonly PlannerCategory[]).some((c) =>
      matchesPlannerCategory(m, c),
    );
  });

  const matchingInput = plannerContextToMatching(ctx, seed);
  const matched = matchMediaCatalog(filteredByCategory, matchingInput, limit);

  return matched.map((m) => ({
    media: m.media,
    score: m.score / 100,
    reasons: [
      ...(m.breakdown.budget >= 20
        ? [{ key: 'budgetEfficient' as RecommendReasonKey, weight: m.breakdown.budget / 100 }]
        : []),
      ...(m.breakdown.region >= 15
        ? [{ key: 'matchRegion' as RecommendReasonKey, weight: m.breakdown.region / 100 }]
        : []),
      ...(m.breakdown.industry >= 10
        ? [{ key: 'goalFit' as RecommendReasonKey, weight: m.breakdown.industry / 100 }]
        : []),
      ...(m.breakdown.target >= 12
        ? [{ key: 'ageMatch' as RecommendReasonKey, weight: m.breakdown.target / 100 }]
        : []),
      ...(m.breakdown.popularity >= 5
        ? [{ key: 'highVisibility' as RecommendReasonKey, weight: m.breakdown.popularity / 100 }]
        : []),
    ],
  }));
}
