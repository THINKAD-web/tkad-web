import type {
  AiRecommendInput,
  CampaignGoal,
  Industry,
  TargetAudience,
} from "@/lib/ai-media-recommend";
import {
  parsePlannerFreetextBrief,
  type PlannerFreetextParseResult,
} from "@/lib/planner/parse-freetext-brief";
import { plannerFreetextToRecommendBrief } from "@/lib/recommend/planner-freetext-to-recommend-brief";

type GoalKey = CampaignGoal;
type TargetKey = TargetAudience;
type IndustryKey = Industry;

export type FreetextRecommendDraft = {
  goal: string;
  target: string;
  budgetMan: string;
  region: string;
  industry: string;
};

/** 파싱·확인 폼 → API 추천 입력 (regionCodes·categories·zones는 파싱 필드만) */
export function buildAiRecommendInputFromFreetext(
  parseResult: PlannerFreetextParseResult,
  draft: FreetextRecommendDraft,
  freetextSource: string,
): AiRecommendInput | null {
  const budget = Math.round(Number(draft.budgetMan) || 0);
  if (!draft.goal || !draft.target || !draft.industry || budget <= 0) {
    return null;
  }

  const zones = parseResult.fields.seoulZones.value ?? [];
  const busanZones = parseResult.fields.busanZones.value ?? [];
  const parsedRegions = parseResult.fields.regions.value ?? [];
  const hasParsedRegion =
    parsedRegions.length > 0 || zones.length > 0 || busanZones.length > 0;

  if (hasParsedRegion && !draft.region.trim()) {
    return null;
  }

  const regionCodes =
    parsedRegions.length > 0 ? parsedRegions
    : zones.length > 0 ? (["seoul"] as const)
    : busanZones.length > 0 ? (["busan"] as const)
    : undefined;

  const categories = parseResult.fields.categories.value ?? undefined;

  return {
    goal: draft.goal as GoalKey,
    target: draft.target as TargetKey,
    budgetMaxMan: budget,
    region:
      regionCodes?.length === 1 ? regionCodes[0]!
      : hasParsedRegion ? draft.region.trim()
      : "all",
    industry: draft.industry as IndustryKey,
    ...(regionCodes?.length ? { regionCodes: [...regionCodes] } : {}),
    ...(zones.length > 0 ? { seoulZones: zones } : {}),
    ...(busanZones.length > 0 ? { busanZones } : {}),
    ...(categories?.length ? { plannerCategories: [...categories] } : {}),
    freetextSource: freetextSource.trim(),
  };
}

/** URL brief 등 — 파싱만으로 추천 입력 (빈 필드는 기본값) */
export function buildAiRecommendInputFromFreetextRaw(
  raw: string,
  isKo: boolean,
): AiRecommendInput | null {
  const trimmed = raw.trim();
  if (trimmed.length < 3) return null;

  const parseResult = parsePlannerFreetextBrief(trimmed);
  const fields = plannerFreetextToRecommendBrief(parseResult, isKo);

  const draft: FreetextRecommendDraft = {
    goal: fields.goal ?? "awareness",
    target: fields.target ?? "mass",
    budgetMan: String(fields.budgetMaxMan ?? 0),
    region: fields.region ?? "",
    industry: fields.industry ?? "other",
  };

  if (Number(draft.budgetMan) <= 0) {
    draft.budgetMan = "1000";
  }

  return buildAiRecommendInputFromFreetext(parseResult, draft, trimmed);
}
