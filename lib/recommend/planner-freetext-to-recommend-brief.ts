import type { PlannerFreetextParseResult } from "@/lib/planner/parse-freetext-brief";
import { plannerRegionLabel } from "@/lib/planner/planner-regions";
import { PLANNER_SEOUL_ZONE_LABELS } from "@/lib/planner/seoul-zones";
import type {
  PlannerAgeKey,
  PlannerCampaignGoal,
  PlannerIndustryKey,
} from "@/lib/planner/types";
import type {
  RecommendBriefFields,
  RecommendGoal,
  RecommendIndustry,
  RecommendTarget,
} from "@/lib/recommend-freetext-parse";

const GOAL_MAP: Record<PlannerCampaignGoal, RecommendGoal> = {
  brand: "awareness",
  launch: "launch",
  event: "consideration",
  sales: "consideration",
  local: "awareness",
};

const INDUSTRY_MAP: Record<PlannerIndustryKey, RecommendIndustry | null> = {
  indFb: "retail",
  indRetail: "retail",
  indTech: "other",
  indFinance: "fintech",
  indEnt: "entertainment",
  indOther: null,
};

function mapAgeToTarget(ageKeys: PlannerAgeKey[]): RecommendTarget | null {
  if (ageKeys.length === 0) return null;
  const has20 = ageKeys.includes("age20s");
  const has30 = ageKeys.includes("age30s");
  const has40 = ageKeys.includes("age40s");
  const has50 = ageKeys.includes("age50plus");
  if (has20 && !has30 && !has40 && !has50) return "genz";
  if ((has20 || has30) && !has40 && !has50) return "millennial";
  if (has40 || has50) return "family";
  return "mass";
}

function formatRegionText(
  result: PlannerFreetextParseResult,
  isKo: boolean,
): string | null {
  const loc = isKo ? "ko" : "en";
  const zones = result.fields.seoulZones.value;
  if (zones?.length) {
    return zones
      .map((z) =>
        isKo
          ? PLANNER_SEOUL_ZONE_LABELS[z].labelKo
          : PLANNER_SEOUL_ZONE_LABELS[z].labelEn,
      )
      .join(", ");
  }
  const regions = result.fields.regions.value;
  if (regions?.length) {
    return regions.map((r) => plannerRegionLabel(r, loc)).join(", ");
  }
  return null;
}

/** Rule-based planner parse → recommend confirm form fields (0 tokens). */
export function plannerFreetextToRecommendBrief(
  result: PlannerFreetextParseResult,
  isKo: boolean,
): RecommendBriefFields {
  const { fields } = result;
  return {
    goal: fields.campaignGoal.value
      ? GOAL_MAP[fields.campaignGoal.value]
      : null,
    target: fields.ageKeys.value?.length
      ? mapAgeToTarget(fields.ageKeys.value)
      : null,
    budgetMaxMan: fields.budgetMan.value ?? null,
    region: formatRegionText(result, isKo),
    industry: fields.industryKey.value
      ? INDUSTRY_MAP[fields.industryKey.value]
      : null,
  };
}
