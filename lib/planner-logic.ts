import { getMainCategory } from "@/lib/media-browse-categories";
import type { MediaItem } from "@/lib/media-data";
import {
  catalogPriceFieldToPriceMan,
  catalogPriceFieldToWon,
} from "@/lib/media-price-format";
import { isNetworkCatalogItem } from "@/lib/matching-network-helpers";
import {
  type CampaignMediaQuantities,
  type CampaignMediaPriceOptionIndex,
  type PlannerPortfolioPricing,
  plannerMonthlyImpressionsForMedia,
  plannerMonthlyPriceManForMedia,
  plannerMonthlyPriceWonForMedia,
} from "@/lib/planner/planner-media-quantity";

function portfolioPriceMan(
  m: MediaItem,
  pricing?: PlannerPortfolioPricing,
): number {
  return plannerMonthlyPriceManForMedia(
    m,
    pricing?.quantities,
    pricing?.priceOptionIndex,
  );
}

function portfolioPriceWon(
  m: MediaItem,
  pricing?: PlannerPortfolioPricing,
): number {
  return plannerMonthlyPriceWonForMedia(
    m,
    pricing?.quantities,
    pricing?.priceOptionIndex,
  );
}

function portfolioImpressions(
  m: MediaItem,
  pricing?: PlannerPortfolioPricing,
): number {
  return plannerMonthlyImpressionsForMedia(
    m,
    pricing?.quantities,
    pricing?.priceOptionIndex,
  );
}

import {
  filterPlannerMediaByRegions,
  countPlannerMediaByBrowseRegion,
} from "@/lib/planner/planner-regions";
import {
  normalizeCampaignGoal,
  type CampaignFunnel,
} from "@/lib/planner/normalize-campaign-goal";
import type { RecommendationContext } from "@/lib/planner/recommendation-context";
import { plannerContextToMatching } from "@/lib/recommendation-adapters";
import { matchMediaCatalog } from "@/lib/matching-engine";
import type { PlannerGoalFollowUp } from "@/lib/planner/goal-follow-up";
import { followUpKpiBoost } from "@/lib/planner/goal-follow-up";
import { PLANNER_BUDGET_MIN } from "@/lib/planner/types";
import type { PlannerIndustryKey } from "@/lib/planner/types";
import type { PlannerSeoulZoneKey } from "@/lib/planner/seoul-zones";
import { mediaMatchesSeoulZones } from "@/lib/planner/seoul-zones";
import type { PlannerBusanZoneKey } from "@/lib/planner/busan-zones";
import { mediaMatchesBusanZones } from "@/lib/planner/busan-zones";

export type PlannerCategory = "digital" | "static" | "mobile";

/** DB `Media.type` · 레거시 값 → 플래너 유형 (매칭용) */
export type PlannerMediaKind = "digital" | "static" | "mobile" | "network";

/** 차량·차내·기내 등 실제로 움직이는 매체 (등록 type 미기입 레거시용) */
const TRULY_MOBILE_SUBCATEGORIES = new Set([
  "bus_interior",
  "bus_exterior",
  "bus_wrap",
  "vehicle_wrap",
  "taxi_interior",
  "taxi_exterior",
  "subway_train",
  "subway_incar",
  "inflight",
  "ferry",
]);

/** 역사·터미널 등 고정 설치 교통 매체 (레거시 type 없을 때 디지털 추정) */
const FIXED_SITE_SUBCATEGORIES = new Set([
  "subway_station",
  "subway_platform",
  "subway_screendoor",
  "ktx_terminal",
  "airport",
]);

export type PlannerMediaKindInput = Pick<
  MediaItem,
  | "type"
  | "subCategory"
  | "mediaSubCategory"
  | "mediaMainCategory"
  | "name"
  | "nameEn"
  | "tags"
>;

/**
 * 보고서 유형(디지털/고정형/이동형) 분류.
 * 1순위: 매체 등록 시 선택한 `type` (admin: 디지털·고정형·이동형 3종).
 * 2순위: type 미입력 레거시만 서브카테고리·이름 휴리스틱.
 * Browse `transit` 등 메인카테고리는 보고서 유형을 바꾸지 않음.
 */
export function resolvePlannerMediaKind(
  item: PlannerMediaKindInput,
): PlannerMediaKind | null {
  const fromType = normalizeMediaTypeForPlanner(item.type);
  if (fromType) return fromType;

  const sub = (item.mediaSubCategory ?? item.subCategory ?? "")
    .trim()
    .toLowerCase();

  if (sub && TRULY_MOBILE_SUBCATEGORIES.has(sub)) return "mobile";
  if (sub && FIXED_SITE_SUBCATEGORIES.has(sub)) return "digital";

  const hay = [item.name, item.nameEn, ...(item.tags ?? [])]
    .filter(Boolean)
    .join(" ");
  if (/버스|bus|택시|taxi|랩핑|vehicle[\s_-]?wrap|bus[\s_-]?wrap/i.test(hay)) {
    return "mobile";
  }
  if (/차내|in[\s-]?car|subway\s*train|기내|inflight|비행|항공/i.test(hay)) {
    return "mobile";
  }

  return null;
}

export function normalizeMediaTypeForPlanner(
  type: string | undefined | null,
): PlannerMediaKind | null {
  if (type == null || typeof type !== "string") return null;
  const t = type.trim().toLowerCase().replace(/\s+/g, "_");
  if (t === "network") return "network";
  if (
    t === "digital" ||
    t === "dooh" ||
    t === "ooh" ||
    t === "ooh_digital" ||
    t === "led" ||
    t === "signage" ||
    t === "digital_signage" ||
    t === "electronic" ||
    t === "screen"
  ) {
    return "digital";
  }
  if (
    t === "static" ||
    t === "billboard" ||
    t === "outdoor" ||
    t === "wallscape" ||
    t === "print"
  ) {
    return "static";
  }
  if (
    t === "mobile" ||
    t === "bus" ||
    t === "bus_interior" ||
    t === "bus_exterior" ||
    t === "bus_wrap" ||
    t === "transport" ||
    t === "vehicle"
  ) {
    return "mobile";
  }
  if (t === "fixed" || t === "고정형" || t === "고정") return "static";
  if (/고정|빌보드|billboard|wallscape|포스터/.test(t) && !/digital|dooh|디지털/.test(t)) {
    return "static";
  }
  if (/디지털|dooh|ooh|사이니지|signage|led|전광/.test(t)) return "digital";
  if (/이동|버스|택시|랩핑|vehicle|차내|기내|inflight|비행/.test(t)) return "mobile";
  return null;
}

/** 지도·다중 선택용 (전국 패널은 `national`) */
export const PLANNER_MAP_REGIONS = [
  "seoul",
  "busan",
  "jeju",
  "national",
] as const;

export type PlannerMapRegion = (typeof PLANNER_MAP_REGIONS)[number];

export type PlannerCampaignGoal =
  | "brand"
  | "launch"
  | "event"
  | "sales"
  | "local";

export function matchesPlannerCategory(
  item: MediaItem,
  cat: PlannerCategory,
): boolean {
  const norm = resolvePlannerMediaKind(item);
  if (cat === "digital")
    return norm === "digital" || norm === "network";
  if (cat === "static") return norm === "static";
  if (cat === "mobile") return norm === "mobile";
  return false;
}

/**
 * 이동형 OOH 명시 키워드 — 이름·카테고리 필드만 (tags 제외: 터미널·역 인접 '버스' 오탐 방지).
 * @deprecated `mediaMatchesPlannerMobileIntent` 내부에서 primary/exclusion 조합으로 대체.
 */
export const PLANNER_MOBILE_HAYSTACK_RE =
  /택시|taxi|(?<!캔)버스(?!터미널)[\s_-]?(래핑|랩핑|wrap|외부|광고)?|(?<!캔)버스(?!터미널)(?![\w가-힣])|\bbus\b(?!way)[\s_-]?(wrap)?|리무진|limousine|차량[\s_-]?(래핑|랩핑|wrap)|vehicle[\s_-]?wrap|트럭[\s_-]?(래핑|랩핑|wrap)|truck[\s_-]?wrap|이동형/i;

/** 고정형 디지털·역사 — mobile 의도 제외 (택시쉘터·버스래핑 등은 primary 매칭으로 포함) */
export const PLANNER_MOBILE_EXCLUSION_RE =
  /사이니지|signage|digital[\s_-]?signage|DOOH|전광판|미디어타워|미디어월|보이드|void|엘리베이터|elevator|지하철|subway|역사[\s_]|역[\s_(]|station[\s_(]|캔버스(?!.*(?:버스|bus|택시|taxi))|택배|delivery|고속터미널[\s_]*역|LED[\s_-]?보드|실내[\s_-]?디지털|버스터미널|bus[\s_-]?terminal/i;

/** 택시쉘터 — 고정형이지만 택시 대기 동선 연관 → mobile 의도 포함 */
export const PLANNER_TAXI_SHELTER_RE = /택시\s*쉘터|taxi\s*shelter/i;

function plannerMobilePrimaryHaystack(item: MediaItem): string {
  return [
    item.name,
    item.nameEn,
    item.subCategory,
    item.mediaSubCategory,
    item.networkSubtype,
  ]
    .filter(Boolean)
    .join(" ");
}

/** network·digital 타입이어도 택시·버스·래핑 등 실제 이동형만 mobile 의도 (recommend 매칭용) */
export function mediaMatchesPlannerMobileIntent(item: MediaItem): boolean {
  if (matchesPlannerCategory(item, "mobile")) return true;

  const primary = plannerMobilePrimaryHaystack(item);
  if (!primary.trim()) return false;

  if (PLANNER_TAXI_SHELTER_RE.test(primary)) return true;

  if (/쉘터|shelter/i.test(primary) && !/택시|taxi/i.test(primary)) {
    return false;
  }

  const hasTransitSignal =
    PLANNER_MOBILE_HAYSTACK_RE.test(primary) ||
    (/(?<!캔)버스(?!터미널)|\bbus\b(?!way)/i.test(primary) &&
      !PLANNER_MOBILE_EXCLUSION_RE.test(primary));

  if (!hasTransitSignal) return false;

  if (PLANNER_MOBILE_EXCLUSION_RE.test(primary)) {
    return /(?:택시|taxi|(?<!캔)버스(?!터미널)|\bbus\b(?!way)|래핑|랩핑|wrap|리무진|limousine)/i.test(
      primary,
    );
  }

  return true;
}

export function filterPlannerMedia(
  items: readonly MediaItem[],
  region: "all" | string,
  categories: ReadonlySet<PlannerCategory>,
): MediaItem[] {
  if (categories.size === 0) return [];
  return items.filter((m) => {
    if (region !== "all" && m.region !== region) return false;
    for (const c of categories) {
      if (matchesPlannerCategory(m, c)) return true;
    }
    return false;
  });
}

/** 다중 지역(OR). `regions`가 비어 있으면 유형만으로 전체. 서울·부산 하위 상권은 각 zones로 추가 필터. */
export function filterPlannerMediaMulti(
  items: readonly MediaItem[],
  regions: ReadonlySet<string>,
  categories: ReadonlySet<PlannerCategory>,
  seoulZones: readonly PlannerSeoulZoneKey[] = [],
  busanZones: readonly PlannerBusanZoneKey[] = [],
): MediaItem[] {
  let filtered = filterPlannerMediaByRegions(items, regions, categories);
  if (regions.has("seoul") && seoulZones.length > 0) {
    filtered = filtered.filter((m) => mediaMatchesSeoulZones(m, seoulZones));
  }
  if (regions.has("busan") && busanZones.length > 0) {
    filtered = filtered.filter((m) => mediaMatchesBusanZones(m, busanZones));
  }
  return filtered;
}

export function countPlannerMediaByRegion(
  items: readonly MediaItem[],
  categories: ReadonlySet<PlannerCategory>,
): Record<string, number> {
  return countPlannerMediaByBrowseRegion(items, categories);
}

/** 포트폴리오 월 단가(만원) 대비 예상 월간 노출로 블렌드 CPM(원/천회) 추정 */
export function plannerBlendCpmKrw(
  portfolio: readonly MediaItem[],
  estimatedMonthlyImpressions: number,
  pricing?: PlannerPortfolioPricing,
): number | null {
  if (portfolio.length === 0 || estimatedMonthlyImpressions <= 0) return null;
  const wonPerMonth = portfolio.reduce(
    (s, m) => s + portfolioPriceWon(m, pricing),
    0,
  );
  if (wonPerMonth <= 0) return null;
  return Math.round(wonPerMonth / (estimatedMonthlyImpressions / 1000));
}

/** 보고서 성과 요약 — 선택 포트폴리오 기준 노출·CPM (차트·KPI 정합) */
export function computePortfolioReportMetrics(
  portfolio: readonly MediaItem[],
  months: number,
  pricing?: PlannerPortfolioPricing,
): {
  monthlyImpressions: number;
  totalImpressions: number;
  blendedCpmKrw: number | null;
} {
  const monthlyImpressions = portfolio.reduce(
    (s, m) => s + portfolioImpressions(m, pricing),
    0,
  );
  const m = Math.max(1, months);
  const totalImpressions = monthlyImpressions * m;
  const blendedCpmKrw = plannerBlendCpmKrw(
    portfolio,
    monthlyImpressions,
    pricing,
  );
  return { monthlyImpressions, totalImpressions, blendedCpmKrw };
}

/** AI 자동 조합 상한 (직접 선택 시에는 적용하지 않음) */
export const PLANNER_AUTO_PORTFOLIO_MAX_ITEMS = 12;

/** matchMediaCatalog 후보 풀 상한 (다양성 pick 전) */
export const PLANNER_AUTO_PORTFOLIO_POOL_SIZE = 20;

/** 자동 포트폴리오 내 네트워크 상한 — 저가 다지점이 일반 매체를 전부 대체하지 않도록 */
export const PLANNER_AUTO_PORTFOLIO_MAX_NETWORK_ITEMS = 2;

export function computePlannerPortfolioMonthlyMan(
  portfolio: readonly MediaItem[],
  pricing?: PlannerPortfolioPricing,
): number {
  return portfolio.reduce(
    (s, m) => s + portfolioPriceMan(m, pricing),
    0,
  );
}

export function computePlannerPortfolioBudgetStatus(
  portfolio: readonly MediaItem[],
  budgetMan: number,
  months: number,
  pricing?: PlannerPortfolioPricing,
): {
  monthlyTotalMan: number;
  monthlyBudgetMan: number;
  overBudget: boolean;
} {
  const monthlyBudgetMan = months > 0 ? budgetMan / months : budgetMan;
  const monthlyTotalMan = computePlannerPortfolioMonthlyMan(
    portfolio,
    pricing,
  );
  return {
    monthlyTotalMan,
    monthlyBudgetMan,
    overBudget: monthlyTotalMan > monthlyBudgetMan + 0.01,
  };
}

/**
 * 설계·보고서용 포트폴리오.
 * - 직접 선택: 담은 매체 전부 (지역·유형 필터와 무관, 예산 초과는 별도 안내)
 * - 미선택: 예산 내 AI 자동 조합 (상한 PLANNER_AUTO_PORTFOLIO_MAX_ITEMS)
 */
export function orderPlannerSelectedMedia(
  catalog: readonly MediaItem[],
  campaignMediaIds: readonly string[],
  supplementalById: Readonly<Record<string, MediaItem>> = {},
): MediaItem[] {
  const byId = new Map(catalog.map((m) => [m.id, m]));
  const out: MediaItem[] = [];
  for (const id of campaignMediaIds) {
    const m = byId.get(id) ?? supplementalById[id];
    if (m) out.push(m);
  }
  return out;
}

export function resolvePlannerPortfolio(args: {
  campaignMediaIds: readonly string[];
  selectedMediaOrdered: readonly MediaItem[];
  filtered: readonly MediaItem[];
  budgetMan: number;
  months: number;
  mediaSelectionExplicit: boolean;
  recommendCtx: RecommendationContext;
}): MediaItem[] {
  const {
    campaignMediaIds,
    selectedMediaOrdered,
    filtered,
    budgetMan,
    months,
    mediaSelectionExplicit,
    recommendCtx,
  } = args;
  if (months <= 0 || budgetMan < PLANNER_BUDGET_MIN) {
    return [];
  }
  /** 직접 선택 — 필터·예산으로 잘리지 않음 (구버전 manualIntersect+auto 폴백 버그 방지) */
  if (campaignMediaIds.length > 0) {
    return [...selectedMediaOrdered];
  }
  if (mediaSelectionExplicit) {
    return [];
  }
  if (filtered.length === 0) {
    return [];
  }
  return selectPlannerPortfolioFromMatching(
    [...filtered],
    recommendCtx,
    budgetMan,
    months,
    PLANNER_AUTO_PORTFOLIO_MAX_ITEMS,
  );
}

function knapsackPortfolioWithinMonthlyCap(
  candidates: readonly MediaItem[],
  budgetMan: number,
  months: number,
  maxItems: number,
  fallbackPool: readonly MediaItem[],
  maxNetworkItems = Number.POSITIVE_INFINITY,
  pricing?: PlannerPortfolioPricing,
): MediaItem[] {
  if (months <= 0 || budgetMan < 1) return [];

  const spendPerMonth = budgetMan / months;
  const cap = spendPerMonth * 0.92;
  const seen = new Set<string>();
  const ordered: MediaItem[] = [];
  for (const m of candidates) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    ordered.push(m);
  }

  const out: MediaItem[] = [];
  let allocated = 0;
  let networkCount = 0;
  for (const m of ordered) {
    if (out.length >= maxItems) break;
    if (isNetworkCatalogItem(m) && networkCount >= maxNetworkItems) continue;
    const priceMan = portfolioPriceMan(m, pricing);
    if (allocated + priceMan <= cap) {
      out.push(m);
      allocated += priceMan;
      if (isNetworkCatalogItem(m)) networkCount++;
    }
  }

  if (out.length === 0 && fallbackPool.length > 0) {
    const cheapest = [...fallbackPool].sort(
      (a, b) =>
        portfolioPriceMan(a, pricing) -
        portfolioPriceMan(b, pricing),
    )[0];
    if (cheapest) out.push(cheapest);
  }
  return out;
}

function ensurePortfolioNetworkCandidate(
  candidates: MediaItem[],
  filtered: MediaItem[],
  matched: readonly { media: MediaItem }[],
): MediaItem[] {
  if (candidates.some((m) => isNetworkCatalogItem(m))) return candidates;

  const matchedNw = matched
    .map((r) => r.media)
    .filter((m) => isNetworkCatalogItem(m));
  const poolNw = filtered.filter((m) => isNetworkCatalogItem(m));
  const best =
    matchedNw[0] ??
    poolNw.sort(
      (a, b) =>
        portfolioPriceMan(a) - portfolioPriceMan(b),
    )[0];
  if (!best) return candidates;

  const seen = new Set(candidates.map((m) => m.id));
  if (seen.has(best.id)) return candidates;
  return [best, ...candidates];
}

function injectAffordableNetworkIntoPortfolio(
  portfolio: MediaItem[],
  candidates: MediaItem[],
  budgetMan: number,
  months: number,
  maxItems: number,
  pricing?: PlannerPortfolioPricing,
): MediaItem[] {
  if (portfolio.some((m) => isNetworkCatalogItem(m))) return portfolio;
  const spendPerMonth = budgetMan / months;
  const cap = spendPerMonth * 0.92;
  const allocated = portfolio.reduce(
    (s, m) => s + portfolioPriceMan(m, pricing),
    0,
  );

  const affordable = candidates
    .filter((m) => isNetworkCatalogItem(m))
    .filter((m) => {
      const p = portfolioPriceMan(m, pricing);
      return p > 0 && allocated + p <= cap;
    })
    .sort(
      (a, b) =>
        portfolioPriceMan(a, pricing) -
        portfolioPriceMan(b, pricing),
    );

  const pick = affordable[0];
  if (!pick) return portfolio;

  if (portfolio.length < maxItems) {
    return [...portfolio, pick];
  }

  const dropIdx = portfolio.findIndex((m) => !isNetworkCatalogItem(m));
  if (dropIdx < 0) return portfolio;
  const dropPrice = portfolioPriceMan(portfolio[dropIdx]!, pricing);
  const pickPrice = portfolioPriceMan(pick, pricing);
  if (allocated - dropPrice + pickPrice > cap) return portfolio;

  const next = [...portfolio];
  next[dropIdx] = pick;
  return next;
}

/**
 * 하이브리드 자동 조합 — matchMediaCatalog(목표·연령·업종) + 월예산 92% knapsack.
 * `PLANNER_AUTO_PORTFOLIO_MAX_ITEMS`(12) 상한 유지.
 */
export function selectPlannerPortfolioFromMatching(
  filtered: MediaItem[],
  ctx: RecommendationContext,
  budgetMan: number,
  months: number,
  maxItems = PLANNER_AUTO_PORTFOLIO_MAX_ITEMS,
  poolSize = PLANNER_AUTO_PORTFOLIO_POOL_SIZE,
  pricing?: PlannerPortfolioPricing,
): MediaItem[] {
  if (filtered.length === 0 || months <= 0 || budgetMan < 1) return [];

  const matchingInput = plannerContextToMatching(ctx, 0);
  const matched = matchMediaCatalog(filtered, matchingInput, poolSize);
  let candidates = matched.map((row) => row.media);
  candidates = ensurePortfolioNetworkCandidate(candidates, filtered, matched);

  const portfolio = knapsackPortfolioWithinMonthlyCap(
    candidates,
    budgetMan,
    months,
    maxItems,
    filtered,
    PLANNER_AUTO_PORTFOLIO_MAX_NETWORK_ITEMS,
    pricing,
  );
  return injectAffordableNetworkIntoPortfolio(
    portfolio,
    candidates,
    budgetMan,
    months,
    maxItems,
    pricing,
  );
}

/** 레거시 자동 조합 — 유동인구÷가격 효율 greedy (before/after 비교용). */
export function selectPlannerPortfolio(
  filtered: MediaItem[],
  budgetMan: number,
  months: number,
  maxItems = 6,
): MediaItem[] {
  if (filtered.length === 0 || months <= 0 || budgetMan < 1) return [];
  const scored = filtered.map((m) => ({
    m,
    score:
      m.dailyFootTraffic /
      Math.max(catalogPriceFieldToPriceMan(m.price), 0.01),
  }));
  scored.sort((a, b) => b.score - a.score);
  const ordered = scored.map((s) => s.m);
  return knapsackPortfolioWithinMonthlyCap(
    ordered,
    budgetMan,
    months,
    maxItems,
    filtered,
  );
}

/** 사용자가 고른 순서를 유지하며 월 예산 상한 내에서 슬롯 구성 */
export function portfolioFromManualSelection(
  orderedItems: MediaItem[],
  budgetMan: number,
  months: number,
  maxItems = 12,
): MediaItem[] {
  if (orderedItems.length === 0 || months <= 0 || budgetMan < 1) return [];
  const spendPerMonth = budgetMan / months;
  const cap = spendPerMonth * 0.92;
  const out: MediaItem[] = [];
  let allocated = 0;
  for (const m of orderedItems) {
    if (out.length >= maxItems) break;
    const priceMan = catalogPriceFieldToPriceMan(m.price);
    if (allocated + priceMan <= cap) {
      out.push(m);
      allocated += priceMan;
    }
  }
  if (out.length === 0) {
    const cheapest = [...orderedItems].sort((a, b) => a.price - b.price)[0];
    if (cheapest) out.push(cheapest);
  }
  return out;
}

export type BudgetBlurbParts = {
  sampleName: string;
  samplePrice: number;
  slotsAtMonth: number;
};

/** 추천 문구용: 대표 매체 1건과 “월 예산으로 몇 슬롯” 가늠 */
export function computeBudgetBlurbParts(
  filtered: MediaItem[],
  budgetMan: number,
  months: number,
): BudgetBlurbParts | null {
  if (filtered.length === 0 || months <= 0 || budgetMan < 1) return null;
  const perMonth = budgetMan / months;
  const pool = [...filtered].sort(
    (a, b) => a.price - b.price || b.dailyFootTraffic - a.dailyFootTraffic,
  );
  const sample = pool.find((m) => m.price > 0) ?? pool[0];
  if (!sample) return null;
  const samplePriceMan = catalogPriceFieldToPriceMan(sample.price);
  const slotsAtMonth = Math.max(
    1,
    Math.floor(perMonth / Math.max(samplePriceMan, 0.01)),
  );
  return {
    sampleName: sample.name,
    samplePrice: samplePriceMan,
    slotsAtMonth,
  };
}

export type CategoryBarPoint = { key: string; labelKo: string; labelEn: string; daily: number };

const TYPE_META: Record<
  string,
  { labelKo: string; labelEn: string }
> = {
  digital: { labelKo: "디지털", labelEn: "Digital" },
  static: { labelKo: "고정형", labelEn: "Static" },
  mobile: { labelKo: "이동형", labelEn: "Mobile" },
  network: { labelKo: "네트워크", labelEn: "Network" },
  other: { labelKo: "기타", labelEn: "Other" },
};

/** 보고서·성과 요약 차트용 — network→digital 등 유형 통합 키 */
export function plannerReportCategoryKey(m: MediaItem): string {
  const norm = resolvePlannerMediaKind(m);
  if (norm === "network" || norm === "digital") return "digital";
  if (norm === "static") return "static";
  if (norm === "mobile") return "mobile";
  return "other";
}

function groupPortfolioByReportCategory(
  portfolio: readonly MediaItem[],
): Map<string, MediaItem[]> {
  const groups = new Map<string, MediaItem[]>();
  for (const m of portfolio) {
    const key = plannerReportCategoryKey(m);
    const list = groups.get(key) ?? [];
    list.push(m);
    groups.set(key, list);
  }
  return groups;
}

function monthlyImpressionsOf(
  m: MediaItem,
  pricing?: PlannerPortfolioPricing,
): number {
  return portfolioImpressions(m, pricing);
}

/** 비중 % — 도넛·범례·시뮬레이션 공통 (소수 1자리) */
export function formatPlannerSharePct(pct: number): string {
  const rounded = Math.round(pct * 10) / 10;
  return `${rounded.toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

function sharePctOf(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

export function portfolioDailyByCategory(portfolio: MediaItem[]): CategoryBarPoint[] {
  const sums = new Map<string, number>();
  for (const [key, list] of groupPortfolioByReportCategory(portfolio)) {
    const daily = list.reduce((s, m) => s + (m.dailyFootTraffic ?? 0), 0);
    sums.set(key, daily);
  }
  return [...sums.entries()]
    .map(([key, daily]) => ({
      key,
      labelKo: TYPE_META[key]?.labelKo ?? key,
      labelEn: TYPE_META[key]?.labelEn ?? key,
      daily,
    }))
    .sort((a, b) => b.daily - a.daily);
}

export type CpmBarPoint = { key: string; labelKo: string; labelEn: string; cpm: number };

export function estimateCpmByCategory(filtered: MediaItem[]): CpmBarPoint[] {
  const groups = new Map<string, MediaItem[]>();
  for (const m of filtered) {
    const t = m.type;
    if (!groups.has(t)) groups.set(t, []);
    groups.get(t)!.push(m);
  }
  const out: CpmBarPoint[] = [];
  const visibility = 0.18;
  for (const [key, list] of groups) {
    if (list.length === 0) continue;
    const avgP =
      list.reduce((s, m) => s + catalogPriceFieldToWon(m.price), 0) /
      Math.max(list.length, 1);
    const avgD =
      list.reduce((s, m) => s + m.dailyFootTraffic, 0) /
      Math.max(list.length, 1);
    const estImp = Math.max(1, avgD * 30 * visibility);
    const krwMonth = avgP;
    const cpm = krwMonth / (estImp / 1000);
    out.push({
      key,
      labelKo: TYPE_META[key]?.labelKo ?? key,
      labelEn: TYPE_META[key]?.labelEn ?? key,
      cpm: Math.round(cpm),
    });
  }
  return out.sort((a, b) => a.cpm - b.cpm);
}

/** 선택 포트폴리오 기준 유형별 CPM — 예산·노출 가중 (단순 평균 아님) */
export function portfolioCpmByCategory(
  portfolio: MediaItem[],
  pricing?: PlannerPortfolioPricing,
): CpmBarPoint[] {
  const out: CpmBarPoint[] = [];
  for (const [key, list] of groupPortfolioByReportCategory(portfolio)) {
    let priceWon = 0;
    let monthlyImp = 0;
    for (const m of list) {
      priceWon += portfolioPriceWon(m, pricing);
      monthlyImp += monthlyImpressionsOf(m, pricing);
    }
    let cpm = 0;
    if (priceWon > 0 && monthlyImp > 0) {
      cpm = Math.round(priceWon / (monthlyImp / 1000));
    } else {
      cpm = estimateCpmByCategory(list)[0]?.cpm ?? 0;
    }
    if (cpm > 0) {
      out.push({
        key,
        labelKo: TYPE_META[key]?.labelKo ?? key,
        labelEn: TYPE_META[key]?.labelEn ?? key,
        cpm,
      });
    }
  }
  return out.sort((a, b) => a.cpm - b.cpm);
}

export type BudgetPieSlice = {
  key: string;
  labelKo: string;
  labelEn: string;
  /** 차트 세그먼트 가중치(0원 매체는 폴백 반영) */
  value: number;
  /** 실제 월 단가 합(원) — 표시용 */
  actualWon: number;
  pct: number;
};

export function budgetSplitByCategory(
  portfolio: MediaItem[],
  pricing?: PlannerPortfolioPricing,
): BudgetPieSlice[] {
  return budgetSplitByGroupedKeys(
    portfolio,
    plannerReportCategoryKey,
    (key) => ({
      labelKo: TYPE_META[key]?.labelKo ?? key,
      labelEn: TYPE_META[key]?.labelEn ?? key,
    }),
    pricing,
  );
}

/** 유형별 월 노출 비중 — 예산 배분과 대비해 효율 차이를 설명 */
export function impressionShareByCategory(
  portfolio: MediaItem[],
  pricing?: PlannerPortfolioPricing,
): BudgetPieSlice[] {
  if (portfolio.length === 0) return [];
  const impSums = new Map<string, number>();
  for (const [key, list] of groupPortfolioByReportCategory(portfolio)) {
    const imp = list.reduce((s, m) => s + monthlyImpressionsOf(m, pricing), 0);
    impSums.set(key, imp);
  }
  const total = [...impSums.values()].reduce((a, b) => a + b, 0) || 1;
  return [...impSums.entries()]
    .map(([key, imp]) => ({
      key,
      labelKo: TYPE_META[key]?.labelKo ?? key,
      labelEn: TYPE_META[key]?.labelEn ?? key,
      value: imp,
      actualWon: imp,
      pct: sharePctOf(imp, total),
    }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);
}

const BROWSE_OTHER_KEY = "other";

const BROWSE_CATEGORY_META: Record<
  string,
  { labelKo: string; labelEn: string }
> = {
  other: { labelKo: "기타", labelEn: "Other" },
};

function browseCategoryLabels(key: string): { labelKo: string; labelEn: string } {
  if (BROWSE_CATEGORY_META[key]) return BROWSE_CATEGORY_META[key]!;
  const main = getMainCategory(key);
  if (!main) return { labelKo: key, labelEn: key };
  return { labelKo: main.label, labelEn: main.labelEn ?? main.label };
}

/** 발견하기 메인 카테고리(mediaMainCategory) — 미입력·미등록은 기타 */
export function plannerBrowseCategoryKey(m: MediaItem): string {
  const raw = m.mediaMainCategory?.trim();
  if (!raw || !getMainCategory(raw)) return BROWSE_OTHER_KEY;
  return raw;
}

function groupPortfolioByBrowseCategory(
  portfolio: readonly MediaItem[],
): Map<string, MediaItem[]> {
  const groups = new Map<string, MediaItem[]>();
  for (const m of portfolio) {
    const key = plannerBrowseCategoryKey(m);
    const list = groups.get(key) ?? [];
    list.push(m);
    groups.set(key, list);
  }
  return groups;
}

function budgetSplitByGroupedKeys(
  portfolio: MediaItem[],
  keyOf: (m: MediaItem) => string,
  labelsOf: (key: string) => { labelKo: string; labelEn: string },
  pricing?: PlannerPortfolioPricing,
): BudgetPieSlice[] {
  if (portfolio.length === 0) return [];

  const positivePrices = portfolio
    .map((m) => portfolioPriceWon(m, pricing))
    .filter((won) => won > 0);
  const fallbackWon =
    positivePrices.length > 0
      ? Math.round(positivePrices.reduce((a, b) => a + b, 0) / positivePrices.length)
      : 1;
  const weightOf = (m: MediaItem): number => {
    const won = portfolioPriceWon(m, pricing);
    return won > 0 ? won : fallbackWon;
  };

  const weightSums = new Map<string, number>();
  const wonSums = new Map<string, number>();
  for (const m of portfolio) {
    const key = keyOf(m);
    weightSums.set(key, (weightSums.get(key) ?? 0) + weightOf(m));
    wonSums.set(
      key,
      (wonSums.get(key) ?? 0) + portfolioPriceWon(m, pricing),
    );
  }
  const totalWeight = [...weightSums.values()].reduce((a, b) => a + b, 0) || 1;
  const totalActual = [...wonSums.values()].reduce((a, b) => a + b, 0);
  const useActual = totalActual > 0;
  const totalSegment = useActual ? totalActual : totalWeight;

  return [...weightSums.entries()]
    .map(([key, weight]) => {
      const actualWon = wonSums.get(key) ?? 0;
      const segmentValue = useActual ? actualWon : weight;
      const labels = labelsOf(key);
      return {
        key,
        labelKo: labels.labelKo,
        labelEn: labels.labelEn,
        value: segmentValue,
        actualWon,
        pct: sharePctOf(segmentValue, totalSegment),
      };
    })
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);
}

/** 발견하기 카테고리별 예산 배분 — catalog 유형 축과 별도 */
export function budgetSplitByBrowseCategory(
  portfolio: MediaItem[],
  pricing?: PlannerPortfolioPricing,
): BudgetPieSlice[] {
  return budgetSplitByGroupedKeys(
    portfolio,
    plannerBrowseCategoryKey,
    browseCategoryLabels,
    pricing,
  );
}

/** 발견하기 카테고리별 월 노출 비중 */
export function impressionShareByBrowseCategory(
  portfolio: MediaItem[],
  pricing?: PlannerPortfolioPricing,
): BudgetPieSlice[] {
  if (portfolio.length === 0) return [];
  const impSums = new Map<string, number>();
  for (const [key, list] of groupPortfolioByBrowseCategory(portfolio)) {
    const imp = list.reduce((s, m) => s + monthlyImpressionsOf(m, pricing), 0);
    impSums.set(key, imp);
  }
  const total = [...impSums.values()].reduce((a, b) => a + b, 0) || 1;
  return [...impSums.entries()]
    .map(([key, imp]) => {
      const labels = browseCategoryLabels(key);
      return {
        key,
        labelKo: labels.labelKo,
        labelEn: labels.labelEn,
        value: imp,
        actualWon: imp,
        pct: sharePctOf(imp, total),
      };
    })
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);
}

/** 목표별 “핵심 도달” 비중(데모, 0–100) — 퍼널 기준 + displayKey 세분 */
export function reachSplitForGoal(goal: PlannerCampaignGoal | null): {
  corePct: number;
  extendedPct: number;
} {
  const funnelTable: Record<CampaignFunnel, [number, number]> = {
    awareness: [62, 38],
    consideration: [58, 42],
    conversion: [52, 48],
  };

  const displayOverride: Partial<Record<PlannerCampaignGoal, [number, number]>> =
    {
      launch: [55, 45],
      local: [68, 32],
    };

  if (!goal) {
    return {
      corePct: funnelTable.awareness[0],
      extendedPct: funnelTable.awareness[1],
    };
  }

  const normalized = normalizeCampaignGoal(goal);
  const override = displayOverride[normalized.displayKey];
  if (override) {
    return { corePct: override[0], extendedPct: override[1] };
  }
  const row = funnelTable[normalized.funnel];
  return { corePct: row[0], extendedPct: row[1] };
}

export type MonthPlanCompare = {
  months: number;
  totalImpressions: number;
  monthlyImpressions: number;
};

export function comparePlansByDuration(
  filtered: MediaItem[],
  budgetMan: number,
  durations: readonly number[],
): MonthPlanCompare[] {
  return durations.map((months) => {
    const m = computePlannerMetrics(filtered, budgetMan, months);
    return {
      months,
      totalImpressions: m?.estimatedTotalImpressions ?? 0,
      monthlyImpressions: m?.estimatedMonthlyImpressions ?? 0,
    };
  });
}

function goalRoiBoost(goal: PlannerCampaignGoal | null): number {
  if (!goal) return 0;

  const funnelBoost: Record<CampaignFunnel, number> = {
    awareness: 0.08,
    consideration: 0.1,
    conversion: 0.12,
  };

  const displayOverride: Partial<Record<PlannerCampaignGoal, number>> = {
    launch: 0.12,
    local: 0.06,
    sales: 0.15,
    event: 0.1,
  };

  const normalized = normalizeCampaignGoal(goal);
  const override = displayOverride[normalized.displayKey];
  if (override != null) return override;
  return funnelBoost[normalized.funnel] ?? 0;
}

/**
 * 매체별 가시성 점수를 0~1 로 정규화. DB는 0~4, 일부 mock 은 0~100.
 * 점수 미기입(null/undef) 은 0.5 로 가정.
 */
export function normalizeVisibilityScore(v: unknown): number {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return 0.5;
  if (v <= 4) return Math.min(1, v / 4);
  if (v >= 100) return 1;
  return Math.min(1, v / 100);
}

export type PlannerAdvancedMetricsRow = {
  id: string;
  name: string;
  type: string;
  region: string;
  /** 일평균 노출 (= dailyFootTraffic) */
  dailyImpressions: number;
  /** 1개월 노출 (= dailyFootTraffic × 30) */
  monthlyImpressions: number;
  /** 캠페인 총 노출 (= 1개월 × months) */
  totalImpressions: number;
  /** 0~1 정규화 가시성 */
  visibilityNorm: number;
  /** 매체별 OTS (가시성 가중 노출) */
  ots: number;
  /** 매체별 CPM (원 / 1000회) — 카탈로그 단가 기준. null = 단가/노출 없음 */
  cpmKrw: number | null;
};

export type PlannerAdvancedMetrics = {
  /** 캠페인 총 노출 (= sum perMedia.totalImpressions) */
  totalImpressions: number;
  /** 일평균 노출 합계 (= sum dailyFootTraffic) — 차트·요약용 */
  dailyImpressions: number;
  /** 가시성으로 가중한 실질 노출 기회 (OTS) */
  totalOts: number;
  /** 중복 제거 추정 도달 — 지역별 saturation 합 */
  uniqueReach: number;
  /** 1인당 평균 노출 횟수 (도달 0 일 때 1 로 클램프) */
  avgFrequency: number;
  /** CPM (원/1000회). 노출 0 일 때 null. */
  cpmKrw: number | null;
  perMedia: PlannerAdvancedMetricsRow[];
};

/**
 * 도달·빈도·OTS·CPM 시뮬레이션.
 *
 *   - 매체별: imp = dailyFootTraffic × 30 × months, OTS = imp × normalize(visibility)
 *   - 지역별: 같은 지역 매체끼리는 중복 도달이 발생하므로 saturation 모델 적용.
 *     audiencePool_region = max(daily) × periodDays × regionUniqueFactor
 *     reach_region = audiencePool × (1 − exp(−impressions_region / audiencePool))
 *   - 총 도달 = 각 region 의 reach 합 (region 끼리는 독립 가정)
 *   - 빈도 = totalImpressions / uniqueReach (클램프 1 이상)
 *   - CPM = budgetKrw / (totalImpressions / 1000)
 *
 * 모든 결과는 데모 모형이며 실제 캠페인 평가용은 아닙니다.
 */
export function computeAdvancedPlannerMetrics(args: {
  portfolio: MediaItem[];
  budgetMan: number;
  months: number;
  /** 같은 지역 매체끼리의 도달 중복 할인 계수 (0~1). 작을수록 도달이 작아짐. 기본 0.45. */
  regionUniqueFactor?: number;
}): PlannerAdvancedMetrics | null {
  const { portfolio, budgetMan, months } = args;
  if (portfolio.length === 0 || months <= 0) return null;

  const regionFactor = Math.max(
    0.05,
    Math.min(1, args.regionUniqueFactor ?? 0.45),
  );
  const periodDays = months * 30;

  let totalImpressions = 0;
  let dailyImpressions = 0;
  let totalOts = 0;
  const perMedia: PlannerAdvancedMetricsRow[] = [];
  const regionAgg = new Map<
    string,
    { impressions: number; maxDaily: number }
  >();

  for (const m of portfolio) {
    const daily = Math.max(0, m.dailyFootTraffic ?? 0);
    const monthly = Math.round(daily * 30);
    const total = Math.round(monthly * months);
    const visNorm = normalizeVisibilityScore(m.visibilityScore);
    const ots = Math.round(total * visNorm);

    const priceWon =
      typeof m.price === "number" && Number.isFinite(m.price) && m.price > 0
        ? catalogPriceFieldToWon(m.price)
        : 0;
    const monthlyImp = Math.max(0, monthly);
    const cpmKrw = monthlyImp > 0 && priceWon > 0
      ? Math.round(priceWon / (monthlyImp / 1000))
      : null;

    totalImpressions += total;
    dailyImpressions += daily;
    totalOts += ots;

    const r = regionAgg.get(m.region) ?? { impressions: 0, maxDaily: 0 };
    r.impressions += daily * periodDays;
    if (daily > r.maxDaily) r.maxDaily = daily;
    regionAgg.set(m.region, r);

    perMedia.push({
      id: m.id,
      name: m.name,
      type: m.type,
      region: m.region,
      dailyImpressions: daily,
      monthlyImpressions: monthly,
      totalImpressions: total,
      visibilityNorm: visNorm,
      ots,
      cpmKrw,
    });
  }

  let uniqueReach = 0;
  for (const r of regionAgg.values()) {
    if (r.impressions <= 0 || r.maxDaily <= 0) continue;
    const audiencePool = r.maxDaily * periodDays * regionFactor;
    if (audiencePool <= 0) continue;
    const reach = audiencePool * (1 - Math.exp(-r.impressions / audiencePool));
    uniqueReach += reach;
  }
  uniqueReach = Math.round(uniqueReach);

  const avgFrequency =
    uniqueReach > 0
      ? Math.max(1, Math.round((totalImpressions / uniqueReach) * 10) / 10)
      : 1;

  const budgetKrw = Math.max(0, budgetMan) * 10_000;
  const cpmKrw =
    totalImpressions > 0 && budgetKrw > 0
      ? Math.round(budgetKrw / (totalImpressions / 1000))
      : null;

  return {
    totalImpressions,
    dailyImpressions,
    totalOts,
    uniqueReach,
    avgFrequency,
    cpmKrw,
    perMedia,
  };
}

export type PlannerMetrics = {
  avgMonthlyPrice: number;
  blendDailyReach: number;
  estimatedMonthlyImpressions: number;
  estimatedTotalImpressions: number;
  roiConservative: number;
  roiExpected: number;
  roiOptimistic: number;
  cumulativeByMonth: { month: number; impressions: number }[];
  /** Scenario ROI ramp over the campaign (reference curve for charting). */
  roiByMonth: {
    month: number;
    conservative: number;
    expected: number;
    optimistic: number;
  }[];
};

function industryRoiBoost(industryKey: PlannerIndustryKey | null | undefined): number {
  if (!industryKey || industryKey === "indOther") return 0;
  const map: Partial<Record<PlannerIndustryKey, number>> = {
    indRetail: 0.04,
    indFb: 0.03,
    indTech: 0.02,
    indFinance: 0.03,
    indEnt: 0.02,
  };
  return map[industryKey] ?? 0;
}

/**
 * Demo model: budget (만원), period (months), visibility factor for OOH frequency.
 * `media`는 포트폴리오(선택 매체) 또는 필터 풀 — 노출은 foot-traffic 합 우선(도넛·CPM과 정합).
 */
export function computePlannerMetrics(
  media: MediaItem[],
  budgetMan: number,
  months: number,
  options?: {
    campaignGoal?: PlannerCampaignGoal | null;
    industryKey?: PlannerIndustryKey | null;
    goalFollowUp?: PlannerGoalFollowUp;
    pricing?: PlannerPortfolioPricing;
  },
): PlannerMetrics | null {
  if (media.length === 0 || months <= 0 || budgetMan <= 0) return null;

  const pricing = options?.pricing;
  const portReport = computePortfolioReportMetrics(media, months, pricing);
  const useFootTrafficSum = portReport.monthlyImpressions > 0;

  const avgMonthlyPriceMan =
    media.reduce(
      (s, m) => s + portfolioPriceMan(m, pricing),
      0,
    ) / media.length;
  const blendDailyReach =
    media.reduce((s, m) => s + (m.dailyFootTraffic ?? 0), 0) / media.length;

  const spendPerMonth = budgetMan / months;
  const intensity = Math.min(
    1.2,
    spendPerMonth / Math.max(avgMonthlyPriceMan, 0.01),
  );
  const visibility = 0.14 + intensity * 0.1;

  const estimatedMonthlyImpressions = useFootTrafficSum
    ? portReport.monthlyImpressions
    : Math.round(
        blendDailyReach * 30 * visibility * Math.min(1, intensity + 0.25),
      );
  const estimatedTotalImpressions = useFootTrafficSum
    ? portReport.totalImpressions
    : Math.round(estimatedMonthlyImpressions * months);

  const mixBonus =
    (media.some((m) => m.type === "digital" || m.type === "network")
      ? 0.25
      : 0) +
    (media.some((m) => m.type === "static") ? 0.15 : 0) +
    (media.some((m) => m.type === "mobile") ? 0.1 : 0);

  const goalBoost = goalRoiBoost(options?.campaignGoal ?? null);
  const indBoost = industryRoiBoost(options?.industryKey ?? null);
  const followBoost = followUpKpiBoost(
    options?.campaignGoal ?? null,
    options?.goalFollowUp ?? {},
  );

  const roiMonthsForScale = Math.max(months, 7 / 30);
  const baseRoi =
    2.1 +
    Math.min(2.2, (budgetMan / (450 * roiMonthsForScale)) * 0.45) +
    mixBonus * 0.4 +
    goalBoost +
    indBoost +
    followBoost;

  const roiExpected = Math.round(baseRoi * 10) / 10;
  const roiConservative = Math.round(baseRoi * 0.82 * 10) / 10;
  const roiOptimistic = Math.round(baseRoi * 1.18 * 10) / 10;

  const cumulativeByMonth: { month: number; impressions: number }[] = [];
  let acc = 0;
  const fullMonths = Math.floor(months + 1e-9);
  const fracRemain = months - fullMonths;
  for (let mo = 1; mo <= fullMonths; mo++) {
    acc += estimatedMonthlyImpressions;
    cumulativeByMonth.push({ month: mo, impressions: acc });
  }
  if (fracRemain > 1e-6) {
    acc += Math.round(estimatedMonthlyImpressions * fracRemain);
    cumulativeByMonth.push({ month: fullMonths + 1, impressions: acc });
  }
  if (cumulativeByMonth.length === 0) {
    cumulativeByMonth.push({
      month: 1,
      impressions: estimatedTotalImpressions,
    });
  }

  const roiSteps = Math.max(1, cumulativeByMonth.length);
  const roiByMonth: PlannerMetrics["roiByMonth"] = [];
  for (let mo = 1; mo <= roiSteps; mo++) {
    const t = roiSteps <= 1 ? 1 : (mo - 1) / (roiSteps - 1);
    const ramp = 0.88 + 0.12 * t;
    roiByMonth.push({
      month: mo,
      conservative: Math.round(roiConservative * ramp * 10) / 10,
      expected: Math.round(roiExpected * ramp * 10) / 10,
      optimistic: Math.round(roiOptimistic * ramp * 10) / 10,
    });
  }

  return {
    avgMonthlyPrice: avgMonthlyPriceMan,
    blendDailyReach,
    estimatedMonthlyImpressions,
    estimatedTotalImpressions,
    roiConservative,
    roiExpected,
    roiOptimistic,
    cumulativeByMonth,
    roiByMonth,
  };
}
