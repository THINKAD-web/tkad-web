import {
  buildScenarioPatchFromFreetextParse,
  parsePlannerFreetextBrief,
} from "@/lib/planner/parse-freetext-brief";
import {
  buildFreetextBriefSummarySentence,
  buildFreetextBriefSummaryShort,
} from "@/lib/planner/freetext-brief-summary";
import type { PlannerScenarioApplyPatch } from "@/lib/planner/scenario-types";
import type { PlannerFreetextParseResult } from "@/lib/planner/parse-freetext-brief";

export type FreetextBriefApplySummary = {
  sentence: string;
  short: string | null;
};

export type FreetextBriefApplyPayload = {
  raw: string;
  parseResult: PlannerFreetextParseResult;
  patch: PlannerScenarioApplyPatch;
  summary: FreetextBriefApplySummary;
};

/** Rule-based brief → planner scenario patch (0 tokens). */
export function buildFreetextBriefApply(
  raw: string,
  isKo: boolean,
): FreetextBriefApplyPayload | null {
  const trimmed = raw.trim();
  if (trimmed.length < 3) return null;
  const parseResult = parsePlannerFreetextBrief(trimmed);
  const patch = buildScenarioPatchFromFreetextParse(parseResult);
  return {
    raw: trimmed,
    parseResult,
    patch,
    summary: {
      sentence: buildFreetextBriefSummarySentence(parseResult, isKo),
      short: buildFreetextBriefSummaryShort(parseResult, isKo),
    },
  };
}
