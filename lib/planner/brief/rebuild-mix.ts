/**
 * 브리프 stale 확인 후 "다시 추천받기" — scoreMediaCandidates + buildRecommendedMix.
 *
 * PR5-c commit 4 — autofill uses offline-only catalog (`isQuoteWizardSelectableMedia`).
 * Manually added online lines in `preserveMixUnits` are kept (not wiped by replaceMix).
 */

import type { MediaItem } from "@/lib/media-data";
import { isQuoteWizardSelectableMedia } from "@/lib/pricing-unavailable";
import type { CampaignBriefInput } from "@/lib/planner/brief/types";
import { flightDays, totalBudgetWon } from "@/lib/planner/brief/types";
import { filterBriefCatalogByRegion } from "@/lib/planner/brief/regions";
import {
  buildRecommendedMix,
  scoreMediaCandidates,
} from "@/lib/planner/brief/scoring";

/** Merge offline autofill with non-autofillable manual lines (online). */
export function mergeAutofillWithPreservedManualLines(
  autofill: readonly { mediaId: string; units: number }[],
  preserveMixUnits: Record<string, number> | undefined,
  catalog: readonly MediaItem[],
): { mediaId: string; units: number }[] {
  if (!preserveMixUnits) return [...autofill];

  const byId = new Map(autofill.map((line) => [line.mediaId, line]));

  for (const [mediaId, rawUnits] of Object.entries(preserveMixUnits)) {
    const units = Math.floor(rawUnits);
    if (!Number.isFinite(units) || units <= 0) continue;
    if (byId.has(mediaId)) continue;

    const row = catalog.find((m) => m.id === mediaId);
    // Autofill-eligible (offline) rows are replaced; online manual picks stay.
    if (!row || isQuoteWizardSelectableMedia(row)) continue;

    byId.set(mediaId, { mediaId, units });
  }

  return [...byId.values()];
}

export function rebuildBriefRecommendedMix(params: {
  brief: CampaignBriefInput;
  catalog: readonly MediaItem[];
  isKo?: boolean;
  /** Current mix — manual online lines are preserved across autofill triggers. */
  preserveMixUnits?: Record<string, number>;
}): { mediaId: string; units: number }[] {
  const isKo = params.isKo ?? true;
  const days = flightDays(params.brief) ?? 30;
  const budgetWon = totalBudgetWon(params.brief);

  const autofillCatalog = params.catalog.filter(isQuoteWizardSelectableMedia);
  const candidates = filterBriefCatalogByRegion(
    autofillCatalog,
    params.brief.regionCodes,
  );
  const scored = scoreMediaCandidates({
    candidates,
    brief: params.brief,
    days,
    isKo,
  });
  const autofill = buildRecommendedMix({ scored, days, budgetWon });

  return mergeAutofillWithPreservedManualLines(
    autofill,
    params.preserveMixUnits,
    params.catalog,
  );
}
