import type {
  AiRecommendInput,
  CampaignGoal,
  Industry,
  TargetAudience,
} from "@/lib/ai-media-recommend";
import { parsePlannerFreetextBrief } from "@/lib/planner/parse-freetext-brief";
import { plannerFreetextToRecommendBrief } from "@/lib/recommend/planner-freetext-to-recommend-brief";

/** Rule-based brief → recommend API input (0 tokens). Missing fields use safe defaults. */
export function buildRecommendInputFromBriefRaw(
  raw: string,
  isKo: boolean,
): AiRecommendInput | null {
  const trimmed = raw.trim();
  if (trimmed.length < 3) return null;

  const parseResult = parsePlannerFreetextBrief(trimmed);
  const fields = plannerFreetextToRecommendBrief(parseResult, isKo);

  return {
    goal: (fields.goal as CampaignGoal | null) ?? "awareness",
    target: (fields.target as TargetAudience | null) ?? "mass",
    budgetMaxMan: fields.budgetMaxMan ?? 0,
    region:
      fields.region?.trim() || (isKo ? "전국" : "Nationwide"),
    industry: (fields.industry as Industry | null) ?? "other",
  };
}
