import type { MediaItem } from "@/lib/media-data";
import { getPrimaryMediaImageUrl } from "@/lib/media-data";
import { catalogPriceFieldToPriceMan } from "@/lib/media-price-format";
import { buildFreetextBriefApply } from "@/lib/planner/freetext-brief-apply";
import {
  buildPlannerBriefPath,
  buildRecommendBriefPath,
} from "@/lib/planner/freetext-brief-url";
import type { PlannerFreetextParseResult } from "@/lib/planner/parse-freetext-brief";
import {
  recommendPlannerMedia,
  type RecommendReason,
  type RecommendReasonKey,
} from "@/lib/planner/recommend";
import type { RecommendationContext } from "@/lib/planner/recommendation-context";
import type { PlannerScenarioApplyPatch } from "@/lib/planner/scenario-types";
import type { AiChatbotMediaCard } from "@/lib/ai-chatbot-tools";

function readGyeonggiZoneValues(
  result: PlannerFreetextParseResult,
): string[] | null {
  const zones = result.fields.gyeonggiZones.value;
  return zones?.length ? zones : null;
}

const REASON_LABELS: Record<RecommendReasonKey, { ko: string; en: string }> = {
  matchRegion: { ko: "타깃 지역 매칭", en: "Region match" },
  ageMatch: { ko: "타깃 연령 매칭", en: "Age match" },
  budgetEfficient: { ko: "예산 효율 우수", en: "Budget efficient" },
  goalFit: { ko: "목표 적합", en: "Goal fit" },
  industryFit: { ko: "업종 적합", en: "Industry fit" },
  highVisibility: { ko: "고가시성", en: "High visibility" },
  landmarkHotspot: { ko: "랜드마크·대형 스팟", en: "Landmark hotspot" },
  transitHotspot: { ko: "역·환승 동선", en: "Transit hotspot" },
  retailHotspot: { ko: "쇼핑·상권 인접", en: "Retail hotspot" },
  neighborhoodHotspot: { ko: "주거·생활권", en: "Neighborhood hotspot" },
};

export type PlanFromBriefParsed = {
  campaignGoal: string | null;
  regions: string[] | null;
  seoulZones: string[] | null;
  busanZones: string[] | null;
  gyeonggiZones: string[] | null;
  ageKeys: string[] | null;
  industryKey: string | null;
  budgetMan: number | null;
  months: number | null;
  durationDays: number | null;
  categories: string[] | null;
  unmatchedTokens: string[];
};

export type PlanFromBriefItem = AiChatbotMediaCard & {
  score: number;
  reasonKeys: RecommendReasonKey[];
  reasonLabels: string[];
};

export type PlanFromBriefResult = {
  brief: string;
  parseSummary: string;
  parseSummaryShort: string | null;
  parsed: PlanFromBriefParsed;
  parsedFieldCount: number;
  needsClarification: boolean;
  clarificationHint: string | null;
  items: PlanFromBriefItem[];
  recommendDeeplink: string | null;
  plannerDeeplink: string | null;
  totalCandidates: number;
};

function localeFlag(locale: "ko" | "en"): boolean {
  return locale === "ko";
}

export function formatRecommendReasonLabels(
  reasons: readonly RecommendReason[],
  locale: "ko" | "en",
): string[] {
  const isKo = localeFlag(locale);
  return reasons.map((r) =>
    isKo ? REASON_LABELS[r.key].ko : REASON_LABELS[r.key].en,
  );
}

function compactMediaCard(m: MediaItem): AiChatbotMediaCard {
  return {
    id: m.id,
    name: m.name,
    nameEn: m.nameEn,
    location: m.location,
    price: catalogPriceFieldToPriceMan(m.price),
    pricePeriod: m.pricePeriod,
    type: m.type,
    region: m.region,
    imageUrl: getPrimaryMediaImageUrl(m),
  };
}

function countParsedFields(result: PlannerFreetextParseResult): number {
  const { fields } = result;
  let n = 0;
  if (fields.campaignGoal.value != null) n++;
  if (fields.regions.value?.length) n++;
  if (fields.seoulZones.value?.length) n++;
  if (fields.busanZones.value?.length) n++;
  if (readGyeonggiZoneValues(result)?.length) n++;
  if (fields.ageKeys.value?.length) n++;
  if (fields.industryKey.value != null) n++;
  if (fields.budgetMan.value != null) n++;
  if (fields.months.value != null) n++;
  if (fields.durationDays.value != null) n++;
  if (fields.categories.value?.length) n++;
  return n;
}

function toParsedSnapshot(
  result: PlannerFreetextParseResult,
): PlanFromBriefParsed {
  const { fields } = result;
  return {
    campaignGoal: fields.campaignGoal.value,
    regions: fields.regions.value,
    seoulZones: fields.seoulZones.value,
    busanZones: fields.busanZones.value,
    gyeonggiZones: readGyeonggiZoneValues(result),
    ageKeys: fields.ageKeys.value,
    industryKey: fields.industryKey.value,
    budgetMan: fields.budgetMan.value,
    months: fields.months.value,
    durationDays: fields.durationDays.value,
    categories: fields.categories.value,
    unmatchedTokens: result.unmatchedTokens,
  };
}

function patchToRecommendationContext(
  patch: PlannerScenarioApplyPatch,
): RecommendationContext {
  return {
    goal: patch.campaignGoal ?? null,
    regions: patch.regions ?? [],
    seoulZones: patch.seoulZones ?? [],
    busanZones: patch.busanZones ?? [],
    gyeonggiZones: patch.gyeonggiZones ?? [],
    categories: patch.categories ?? [],
    ageKeys: patch.ageKeys ?? [],
    industryKey: patch.industryKey ?? null,
    budgetMan: patch.budgetMan ?? 0,
    months: patch.months ?? 1,
    durationDays: patch.goalFollowUp?.eventDurationDays ?? undefined,
    goalFollowUp: patch.goalFollowUp,
  };
}

function clarificationHint(
  locale: "ko" | "en",
  parsedFieldCount: number,
): string | null {
  if (parsedFieldCount > 0) return null;
  return locale === "ko"
    ? "지역·목표·예산·타깃 연령·매체 유형(예: 택시·버스·디지털) 중 알려주실 수 있는 것을 짧게 말씀해 주세요. 없는 조건은 추측하지 않겠습니다."
    : "Please share region, goal, budget, target age, or format (e.g. taxi, bus, digital). I will not guess missing fields.";
}

function clampLimit(n: unknown, fallback: number, cap: number): number {
  const x = typeof n === "number" && Number.isFinite(n) ? Math.floor(n) : fallback;
  return Math.min(cap, Math.max(1, x));
}

/** Rule-based brief → planner-ranked media (0-token parse). */
export function executePlanFromBrief(
  brief: string,
  catalog: readonly MediaItem[],
  locale: "ko" | "en",
  limitInput?: unknown,
): PlanFromBriefResult | { error: string } {
  const trimmed = brief.trim();
  if (trimmed.length < 3) {
    return { error: "brief must be at least 3 characters" };
  }

  const apply = buildFreetextBriefApply(trimmed, localeFlag(locale));
  if (!apply) {
    return { error: "brief is too short" };
  }

  const limit = clampLimit(limitInput, 6, 10);
  const ctx = patchToRecommendationContext(apply.patch);
  const scored = recommendPlannerMedia(catalog, ctx, limit);
  const parsedFieldCount = countParsedFields(apply.parseResult);
  const needsClarification = parsedFieldCount === 0;

  const items: PlanFromBriefItem[] = scored.map((row) => ({
    ...compactMediaCard(row.media),
    score: row.score,
    reasonKeys: row.reasons.map((r) => r.key),
    reasonLabels: formatRecommendReasonLabels(row.reasons, locale),
  }));

  return {
    brief: apply.raw,
    parseSummary: apply.summary.sentence,
    parseSummaryShort: apply.summary.short,
    parsed: toParsedSnapshot(apply.parseResult),
    parsedFieldCount,
    needsClarification,
    clarificationHint: clarificationHint(locale, parsedFieldCount),
    items,
    recommendDeeplink: buildRecommendBriefPath(apply.raw),
    plannerDeeplink: buildPlannerBriefPath(apply.raw),
    totalCandidates: scored.length,
  };
}
