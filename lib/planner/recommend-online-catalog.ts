/**
 * PART3-2 — 온라인 플래너 자체 재구현 1단계: tkad-web 자체 온라인 카탈로그
 * (`Media.catalogChannel === "online"`, ~25건)에서 예산·목표·업종·타깃에 맞는
 * 채널을 추천. dmpilot API 브릿지를 호출하지 않는다(승인된 방향).
 *
 * `recommendDigitalChannels()`(lib/planner/recommend-digital.ts)와 같은
 * "점수 정규화 → 예산 비중% → 채널별 예산" 패턴을 따르되, 입력이 하드코딩된
 * 7개 채널이 아니라 실제 상품 25건이라는 차이가 있다. 상품 단위로 그대로
 * 스코어링하면 특정 플랫폼(인스타그램 등)에 상품이 몰려 추천이 편향될 수
 * 있어(데이터 25건 규모의 리스크), 플랫폼 단위로 1차 그룹핑해 점수를 매기고
 * 그 안에서 최적 상품을 골라주는 2단계 구조를 쓴다.
 *
 * 시나리오 검증(2026-08-31) 후 발견된 3가지 결함을 수정:
 * 1. baseline score=1로 시작해 무관 채널도 항상 전부 포함되던 문제 →
 *    baseline 0 + "실질 매칭 여부"(hasAnyMatch) 관련성 필터로 교체.
 *    브리프에 목표/업종/연령 중 하나라도 지정됐으면, 그중 아무것도 매칭되지
 *    않고 bestFor 키워드도 안 걸리는 플랫폼은 결과에서 제외한다 — 최소
 *    개수를 억지로 채우지 않는다(관련성 우선, 개수 보장 안 함. 근거는
 *    아래 report 참조).
 * 2. CPM 없는 CPC 전용 상품이 노출수 "0~0"으로 뜨던 문제 → CPM 있으면
 *    노출수, 없고 CPC만 있으면 클릭수로 전환(`metricType`로 구분).
 * 3. 최종 배정액이 minBudget 미만인 채널이 조용히 살아남던 문제 → 반복
 *    제거(water-filling): 배정액이 자기 minBudget 미만인 채널을 빼고 남은
 *    채널끼리 예산을 다시 100% 재분배 — 안정될 때까지 반복.
 */
import type { MediaItem, MediaOnlineSpecView } from "@/lib/media-data";
import type { PlannerCampaignGoal } from "@/lib/planner-logic";
import type { BriefAgeBand, BriefIndustry } from "@/lib/planner/brief/types";
import type { CampaignPlanGender } from "@/lib/campaign-plan-schema";
import {
  groupTargetingOptions,
  targetingHasValue,
} from "@/lib/online/online-targeting-tags";
import { bestForGoalMatchCount } from "@/lib/online/online-best-for-match";

/** 업종 태그가 있는데 지정 업종과 명시적으로 불일치할 때의 감점 — +2 매칭 보너스와 대칭 */
const INDUSTRY_MISMATCH_PENALTY = 2;

const GOAL_TO_ONLINE_TAGS: Record<PlannerCampaignGoal, string[]> = {
  brand: ["AWARENESS"],
  launch: ["AWARENESS", "TRAFFIC"],
  event: ["TRAFFIC", "VISIT"],
  sales: ["CONVERSION", "LEAD"],
  local: ["VISIT"],
};

const INDUSTRY_TO_ONLINE_TAGS: Record<BriefIndustry, string[]> = {
  fb: ["FNB"],
  retail: ["ECOMMERCE", "LOCAL"],
  tech: ["APP", "B2B"],
  finance: ["B2B"],
  ent: ["ENTER"],
  other: [],
};

/** 시드 데이터 실측 태그(18-24/25-34/35-44)와 겹치는 구간만 매핑 — 나머지는 보너스 없음(정직) */
const AGE_BAND_TO_ONLINE_TAGS: Partial<Record<BriefAgeBand, string[]>> = {
  "20s": ["18-24", "25-34"],
  "30s": ["25-34", "35-44"],
  "40s": ["35-44"],
};

export type OnlineCatalogRecommendInput = {
  goal: PlannerCampaignGoal | null;
  industry: BriefIndustry | null;
  ageBands: readonly BriefAgeBand[];
  genders: readonly CampaignPlanGender[];
  /** 만원 단위 총 예산 (recommendDigitalChannels 관례와 동일) */
  budgetMan: number;
  /** `canonicalCatalogChannel(m.catalogChannel) === "online"`로 이미 필터링된 카탈로그 */
  catalog: readonly MediaItem[];
};

type ScoredProduct = {
  media: MediaItem;
  spec: MediaOnlineSpecView;
  score: number;
  matchedGoal: boolean;
  matchedIndustry: boolean;
  matchedAge: boolean;
  bestForCount: number;
  /** 업종 태그가 있는데 지정 업종과 명시적으로 다름(감점 적용됨) — 태그 자체가 없는 경우와 구분 */
  industryMismatch: boolean;
};

export type OnlineRecommendMetricType = "impressions" | "clicks";

export type ScoredOnlinePlatformGroup = {
  platform: string;
  score: number;
  budgetPct: number;
  budgetMan: number;
  /** 이 플랫폼에서 브리프에 가장 잘 맞는 상품 */
  topProduct: MediaItem;
  /** topProduct 외 이 플랫폼에 더 있는 상품 수 (다양성 참고용) */
  otherProductCount: number;
  reasonKo: string;
  reasonEn: string;
  /** CPM 보유 시 "impressions", CPM 없고 CPC만 있으면 "clicks" */
  metricType: OnlineRecommendMetricType;
  estimatedMetricMin: number;
  estimatedMetricMax: number;
};

export type OnlineCatalogRecommendResult = {
  platforms: ScoredOnlinePlatformGroup[];
  totalBudgetMan: number;
  /** true면 목표/업종/연령 중 하나 이상 지정했는데 실질적으로 매칭되는 채널이 하나도 없었음 */
  noRelevantChannels: boolean;
  /** true면 관련 채널은 있었지만 예산이 그 채널들의 최소 집행금액에 전부 못 미쳐 전부 제외됨 */
  budgetTooSmall: boolean;
};

function scoreProduct(
  media: MediaItem,
  spec: MediaOnlineSpecView,
  input: OnlineCatalogRecommendInput,
): ScoredProduct {
  const options = spec.targetingOptions ?? [];
  let score = 0; // 수정 1 — 매칭 없으면 0. 예전엔 baseline=1이라 전부 살아남았음.

  const goalTags = input.goal ? GOAL_TO_ONLINE_TAGS[input.goal] : [];
  const matchedGoal = goalTags.some((tag) => targetingHasValue(options, "goal", tag));
  if (matchedGoal) score += 3;

  const industryTags = input.industry ? INDUSTRY_TO_ONLINE_TAGS[input.industry] : [];
  const matchedIndustry = industryTags.some((tag) =>
    targetingHasValue(options, "industry", tag),
  );
  if (matchedIndustry) score += 2;

  // 업종 불일치 감점 — 상품에 industry 태그가 "있는데" 지정 업종과 하나도 안 겹칠 때만.
  // 태그 자체가 없는 범용 채널(예: 순수 리치미디어)은 판단 근거가 없으므로 감점 대상 아님.
  // industryTags.length===0(예: "other"처럼 매핑 태그가 아예 없는 업종)도 판단 불가이므로 제외 —
  // 안 그러면 "other" 선택 시 태그 있는 상품 전부가 무조건 불일치로 몰려 부당하게 감점된다.
  const productIndustryTags = groupTargetingOptions(options).industry ?? [];
  const industryMismatch =
    industryTags.length > 0 && productIndustryTags.length > 0 && !matchedIndustry;
  if (industryMismatch) score -= INDUSTRY_MISMATCH_PENALTY;

  const ageTags = input.ageBands.flatMap((b) => AGE_BAND_TO_ONLINE_TAGS[b] ?? []);
  const matchedAge = ageTags.some((tag) => targetingHasValue(options, "age", tag));
  if (matchedAge) score += 1.5;

  const bestForCount = bestForGoalMatchCount(spec.bestFor, input.goal);
  score += bestForCount * 1;

  // 성별은 "제외하지 않는다"는 약한 신호일 뿐 실질 매칭으로 세지 않는다(hasAnyMatch에서 제외) —
  // 안 그러면 시드 전체가 gender:ALL이라 사실상 새로운 유사-baseline이 되어 수정 1이 무력화된다.
  if (input.genders.length === 0 || targetingHasValue(options, "gender", "ALL")) {
    score += 0.5;
  }

  // 감점이 다른 가산점을 넘어서도 예산 배분 수식(비율 계산)이 깨지지 않도록 0 이하로 내려가지 않게 고정.
  // 순위 비교엔 이미 감점이 반영된 뒤이므로(음수였던 정도는 0으로 뭉개져도) 다른 후보 대비 열위는 유지된다.
  score = Math.max(0, score);

  return {
    media,
    spec,
    score,
    matchedGoal,
    matchedIndustry,
    matchedAge,
    bestForCount,
    industryMismatch,
  };
}

/**
 * 관련성 게이트 강화 — 예전엔 4개 신호(목표/업종/연령/bestFor) 중 1개만 맞아도 통과였음
 * (시나리오 B에서 업종이 명백히 다른 쿠팡이 goal+age 둘만으로 통과한 사례로 문제 확인됨).
 * 이제 "신호 2개 이상 매칭" 또는 "업종 명시적 일치"(가장 구체적인 축이라 단독으로도 충분)여야
 * 관련 있다고 판정한다.
 */
function hasAnyRealMatch(p: ScoredProduct): boolean {
  const signals = [p.matchedGoal, p.matchedIndustry, p.matchedAge, p.bestForCount > 0].filter(
    Boolean,
  ).length;
  return signals >= 2 || p.matchedIndustry;
}

function buildReason(
  platform: string,
  members: ScoredProduct[],
  isKo: boolean,
): string {
  const top = members[0];
  const reasons: string[] = [];
  if (top.matchedGoal) reasons.push(isKo ? "목표 적합" : "goal fit");
  if (top.matchedIndustry) reasons.push(isKo ? "업종 적합" : "industry fit");
  if (top.matchedAge) reasons.push(isKo ? "연령 타겟 적합" : "age fit");
  const bestForLine = top.spec.bestFor?.[0];
  if (bestForLine) reasons.push(isKo ? bestForLine : bestForLine);
  if (reasons.length === 0) {
    return isKo
      ? `${platform} — 카탈로그 기본 추천`
      : `${platform} — default catalog pick`;
  }
  return `${platform} — ${reasons.join(", ")}`;
}

/**
 * 수정 2 — CPM 있으면 노출수, 없고 CPC만 있으면 클릭수로 전환.
 * 둘 다 없으면(이론상 시드엔 없음) impressions 0/0 반환.
 */
function estimateMetricRange(
  spec: MediaOnlineSpecView,
  budgetWon: number,
): { metricType: OnlineRecommendMetricType; min: number; max: number } {
  if (spec.cpmMin != null || spec.cpmMax != null) {
    const cpmLow = spec.cpmMin ?? spec.cpmMax!;
    const cpmHigh = spec.cpmMax ?? spec.cpmMin!;
    const max = Math.round((budgetWon / cpmLow) * 1000);
    const min = Math.round((budgetWon / cpmHigh) * 1000);
    return { metricType: "impressions", min: Math.min(min, max), max: Math.max(min, max) };
  }
  if (spec.cpcMin != null || spec.cpcMax != null) {
    const cpcLow = spec.cpcMin ?? spec.cpcMax!;
    const cpcHigh = spec.cpcMax ?? spec.cpcMin!;
    const maxClicks = cpcLow > 0 ? Math.round(budgetWon / cpcLow) : 0;
    const minClicks = cpcHigh > 0 ? Math.round(budgetWon / cpcHigh) : maxClicks;
    return {
      metricType: "clicks",
      min: Math.min(minClicks, maxClicks),
      max: Math.max(minClicks, maxClicks),
    };
  }
  return { metricType: "impressions", min: 0, max: 0 };
}

type Candidate = { platform: string; members: ScoredProduct[]; score: number };

function minBudgetManOf(c: Candidate): number {
  const won = c.members[0].spec.minBudget;
  return won > 0 ? Math.ceil(won / 10_000) : 0;
}

/**
 * 수정 3 — water-filling 방식 반복 제거. 한 라운드에 "가장 여유 없는(배정액이
 * 자기 minBudget에 비해 가장 심하게 못 미치는) 후보 1명만" 빼고 남은 채널끼리
 * 전체 예산을 다시 100% 나눈다 — 안정될 때까지 반복.
 *
 * 처음엔 "그 라운드의 미달자 전부"를 한 번에 뺐었는데, 후보가 많고 예산이
 * 고르게 분산되는 경우 1위 후보까지 포함해 전원이 동시에 미달 판정을 받아
 * 통째로 전멸하는 버그가 있었다(시나리오 A 500만원에서 실제로 재현: 18개
 * 후보에게 8%씩 나눠주면 전부 40만원 안팎인데 각자 minBudget은 50~200만원이라
 * 전원 FAIL → 결과 0건). 한 번에 하나씩만 빼야 상위 후보에게 예산이 뭉쳐
 * 안전하게 수렴한다.
 */
function allocateBudgetWithMinBudgetFilter(
  candidates: Candidate[],
  totalBudgetMan: number,
): { survivors: Candidate[]; budgetManByPlatform: Map<string, number> } {
  let pool = [...candidates];

  for (let round = 0; round < candidates.length + 1; round++) {
    if (pool.length === 0) break;
    const totalScore = pool.reduce((s, c) => s + c.score, 0) || 1;
    const allocated = pool.map((c) => ({
      candidate: c,
      budgetMan: Math.max(0, Math.round(totalBudgetMan * (c.score / totalScore))),
      minBudgetMan: minBudgetManOf(c),
    }));
    const failing = allocated.filter((a) => a.budgetMan < a.minBudgetMan);
    if (failing.length === 0) {
      const map = new Map<string, number>();
      for (const { candidate, budgetMan } of allocated) map.set(candidate.platform, budgetMan);
      return { survivors: pool, budgetManByPlatform: map };
    }
    // 배정액/최소예산 비율이 가장 낮은(가장 많이 모자란) 후보 하나만 제거
    failing.sort(
      (a, b) => a.budgetMan / Math.max(a.minBudgetMan, 1) - b.budgetMan / Math.max(b.minBudgetMan, 1),
    );
    const worst = failing[0].candidate.platform;
    pool = pool.filter((c) => c.platform !== worst);
  }

  return { survivors: [], budgetManByPlatform: new Map() };
}

/**
 * 온라인 카탈로그에서 브리프에 맞는 채널(플랫폼)을 추천. 상품 단위 스코어링
 * → 관련성 필터 → 플랫폼 단위 그룹핑(최고점 대표) → 최소예산 반복 제거 →
 * 플랫폼 간 예산 비중 분배 순.
 */
export function recommendOnlineCatalogChannels(
  input: OnlineCatalogRecommendInput,
  isKo = true,
): OnlineCatalogRecommendResult {
  const scored: ScoredProduct[] = [];
  for (const media of input.catalog) {
    const spec = media.onlineSpec;
    if (!spec) continue;
    scored.push(scoreProduct(media, spec, input));
  }

  const hasAnyCriteria =
    input.goal != null || input.industry != null || input.ageBands.length > 0;

  const byPlatform = new Map<string, ScoredProduct[]>();
  for (const item of scored) {
    // 브리프에 조건이 하나라도 있으면, 그중 아무것도 안 맞고 bestFor도 안 걸리는 상품은
    // 애초에 후보에 넣지 않는다(수정 1) — 조건이 전혀 없으면(자유 탐색) 필터하지 않는다.
    if (hasAnyCriteria && !hasAnyRealMatch(item)) continue;
    const platform = item.spec.platform?.trim() || (isKo ? "기타" : "Other");
    const bucket = byPlatform.get(platform) ?? [];
    bucket.push(item);
    byPlatform.set(platform, bucket);
  }

  const candidates: Candidate[] = Array.from(byPlatform.entries()).map(
    ([platform, members]) => {
      members.sort((a, b) => b.score - a.score);
      return { platform, members, score: members[0].score };
    },
  );
  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length === 0) {
    return {
      platforms: [],
      totalBudgetMan: input.budgetMan,
      noRelevantChannels: hasAnyCriteria,
      budgetTooSmall: false,
    };
  }

  const { survivors, budgetManByPlatform } = allocateBudgetWithMinBudgetFilter(
    candidates,
    input.budgetMan,
  );

  if (survivors.length === 0) {
    return {
      platforms: [],
      totalBudgetMan: input.budgetMan,
      noRelevantChannels: false,
      budgetTooSmall: true,
    };
  }

  const platforms: ScoredOnlinePlatformGroup[] = survivors
    .map((c) => {
      const budgetMan = budgetManByPlatform.get(c.platform) ?? 0;
      const budgetPct = Math.round((budgetMan / (input.budgetMan || 1)) * 100);
      const budgetWon = budgetMan * 10_000;
      const top = c.members[0];
      const { metricType, min, max } = estimateMetricRange(top.spec, budgetWon);

      return {
        platform: c.platform,
        score: c.score,
        budgetPct,
        budgetMan,
        topProduct: top.media,
        otherProductCount: c.members.length - 1,
        reasonKo: buildReason(c.platform, c.members, true),
        reasonEn: buildReason(c.platform, c.members, false),
        metricType,
        estimatedMetricMin: min,
        estimatedMetricMax: max,
      };
    })
    .sort((a, b) => b.score - a.score);

  return {
    platforms,
    totalBudgetMan: input.budgetMan,
    noRelevantChannels: false,
    budgetTooSmall: false,
  };
}
