/**
 * 브리프 stale 확인 후 "다시 추천받기" — scoreMediaCandidates + buildRecommendedMix.
 */

import type { MediaItem } from "@/lib/media-data";
import type { CampaignBriefInput } from "@/lib/planner/brief/types";
import { flightDays, totalBudgetWon } from "@/lib/planner/brief/types";
import { filterBriefCatalogByRegion } from "@/lib/planner/brief/regions";
import {
  buildRecommendedMix,
  scoreMediaCandidates,
} from "@/lib/planner/brief/scoring";

export function rebuildBriefRecommendedMix(params: {
  brief: CampaignBriefInput;
  catalog: readonly MediaItem[];
  isKo?: boolean;
}): { mediaId: string; units: number }[] {
  const isKo = params.isKo ?? true;
  const days = flightDays(params.brief) ?? 30;
  const budgetWon = totalBudgetWon(params.brief);
  const candidates = filterBriefCatalogByRegion(
    params.catalog,
    params.brief.regionCodes,
  );
  const scored = scoreMediaCandidates({
    candidates,
    brief: params.brief,
    days,
    isKo,
  });
  return buildRecommendedMix({ scored, days, budgetWon });
}
