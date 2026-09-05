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
 */
import type { MediaItem, MediaOnlineSpecView } from "@/lib/media-data";
import type { PlannerCampaignGoal } from "@/lib/planner-logic";
import type { BriefAgeBand, BriefIndustry } from "@/lib/planner/brief/types";
import type { CampaignPlanGender } from "@/lib/campaign-plan-schema";
import { targetingHasValue } from "@/lib/online/online-targeting-tags";
import { bestForGoalMatchCount } from "@/lib/online/online-best-for-match";

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
};

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
  estimatedImpressionsMin: number;
  estimatedImpressionsMax: number;
};

export type OnlineCatalogRecommendResult = {
  platforms: ScoredOnlinePlatformGroup[];
  totalBudgetMan: number;
};

function scoreProduct(
  media: MediaItem,
  spec: MediaOnlineSpecView,
  input: OnlineCatalogRecommendInput,
): ScoredProduct {
  const options = spec.targetingOptions ?? [];
  let score = 1; // baseline — 매칭 정보가 전혀 없어도 완전히 0이 되지 않도록

  const goalTags = input.goal ? GOAL_TO_ONLINE_TAGS[input.goal] : [];
  const matchedGoal = goalTags.some((tag) => targetingHasValue(options, "goal", tag));
  if (matchedGoal) score += 3;

  const industryTags = input.industry ? INDUSTRY_TO_ONLINE_TAGS[input.industry] : [];
  const matchedIndustry = industryTags.some((tag) =>
    targetingHasValue(options, "industry", tag),
  );
  if (matchedIndustry) score += 2;

  const ageTags = input.ageBands.flatMap((b) => AGE_BAND_TO_ONLINE_TAGS[b] ?? []);
  const matchedAge = ageTags.some((tag) => targetingHasValue(options, "age", tag));
  if (matchedAge) score += 1.5;

  // 성별 미지정이거나 상품이 "전체"를 타겟하면 소폭 가산 — 시드에 ALL만 있어 감점 로직은 보류
  if (input.genders.length === 0 || targetingHasValue(options, "gender", "ALL")) {
    score += 0.5;
  }

  score += bestForGoalMatchCount(spec.bestFor, input.goal) * 1;

  const budgetWon = input.budgetMan * 10_000;
  if (spec.minBudget > 0 && budgetWon > 0 && budgetWon < spec.minBudget) {
    // 최소 집행금액 미달 — 후보에서 제외하지 않고 순위만 크게 낮춘다(정직한 "가능은 하지만 비추천")
    score *= 0.2;
  }

  return { media, spec, score, matchedGoal, matchedIndustry, matchedAge };
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

function impressionsRange(
  spec: MediaOnlineSpecView,
  budgetWon: number,
): { min: number; max: number } {
  const cpmLow = spec.cpmMin ?? spec.cpmMax;
  const cpmHigh = spec.cpmMax ?? spec.cpmMin;
  if (!cpmLow && !cpmHigh) return { min: 0, max: 0 };
  const max = cpmLow ? Math.round((budgetWon / cpmLow) * 1000) : 0;
  const min = cpmHigh ? Math.round((budgetWon / cpmHigh) * 1000) : max;
  return { min: Math.min(min, max), max: Math.max(min, max) };
}

/**
 * 온라인 카탈로그에서 브리프에 맞는 채널(플랫폼)을 추천. 상품 단위 스코어링
 * → 플랫폼 단위 그룹핑(최고점 대표) → 플랫폼 간 예산 비중 분배 순.
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

  const byPlatform = new Map<string, ScoredProduct[]>();
  for (const item of scored) {
    const platform = item.spec.platform?.trim() || (isKo ? "기타" : "Other");
    const bucket = byPlatform.get(platform) ?? [];
    bucket.push(item);
    byPlatform.set(platform, bucket);
  }

  const platformGroups = Array.from(byPlatform.entries()).map(
    ([platform, members]) => {
      members.sort((a, b) => b.score - a.score);
      return { platform, members, score: members[0].score };
    },
  );
  platformGroups.sort((a, b) => b.score - a.score);

  const totalScore = platformGroups.reduce((s, g) => s + g.score, 0) || 1;

  const platforms: ScoredOnlinePlatformGroup[] = platformGroups.map((g) => {
    const shareOfTotal = g.score / totalScore;
    const budgetPct = Math.round(shareOfTotal * 100);
    const budgetMan = Math.max(0, Math.round(input.budgetMan * shareOfTotal));
    const budgetWon = budgetMan * 10_000;
    const top = g.members[0];
    const { min, max } = impressionsRange(top.spec, budgetWon);

    return {
      platform: g.platform,
      score: g.score,
      budgetPct,
      budgetMan,
      topProduct: top.media,
      otherProductCount: g.members.length - 1,
      reasonKo: buildReason(g.platform, g.members, true),
      reasonEn: buildReason(g.platform, g.members, false),
      estimatedImpressionsMin: min,
      estimatedImpressionsMax: max,
    };
  });

  return {
    platforms,
    totalBudgetMan: input.budgetMan,
  };
}
