import type { PlannerFreetextParseResult } from "@/lib/planner/parse-freetext-brief";
import { plannerFreetextToRecommendBrief } from "@/lib/recommend/planner-freetext-to-recommend-brief";
import type { FreetextRecommendDraft } from "@/lib/recommend/build-freetext-recommend-input";

/** 예산 미입력 시 기본 월 예산 (만원) */
export const FREETEXT_RECOMMEND_DEFAULT_BUDGET_MAN = 500;

export type FreetextDraftDefaultsResult = {
  draft: FreetextRecommendDraft;
  budgetDefaulted: boolean;
};

/** 확인 화면 드래프트 — 업종·타깃·예산 미입력 시 기본값 채움 */
export function applyFreetextRecommendDraftDefaults(
  draft: FreetextRecommendDraft,
  parseResult: PlannerFreetextParseResult,
  isKo: boolean,
): FreetextDraftDefaultsResult {
  const brief = plannerFreetextToRecommendBrief(parseResult, isKo);
  let budgetDefaulted = false;

  const next: FreetextRecommendDraft = {
    goal: draft.goal || brief.goal || "awareness",
    target: draft.target || brief.target || "mass",
    industry: draft.industry || brief.industry || "other",
    budgetMan:
      draft.budgetMan ||
      (brief.budgetMaxMan != null ? String(brief.budgetMaxMan) : ""),
    region: draft.region || brief.region || "",
  };

  if (!next.budgetMan || Number(next.budgetMan) <= 0) {
    next.budgetMan = String(FREETEXT_RECOMMEND_DEFAULT_BUDGET_MAN);
    budgetDefaulted = true;
  }

  return { draft: next, budgetDefaulted };
}
