/**
 * PR-6c L-1 — 브리프 핵심 필드 지문(fingerprint).
 *
 * mixUnits 가 어느 브리프 조건에서 담겼는지 추적한다.
 * 예산·지역·타깃·기간·목표·업종을 포함한다.
 */

import type { MediaItem } from "@/lib/media-data";
import type { CampaignBriefInput } from "@/lib/planner/brief/types";
import { normalizeSidoCodes } from "@/lib/planner/brief/regions";

export type BriefFingerprintInput = Pick<
  CampaignBriefInput,
  | "budgetInputWon"
  | "budgetMode"
  | "regionCodes"
  | "genders"
  | "ageBands"
  | "flightStart"
  | "flightEnd"
  | "goal"
  | "industry"
>;

export function computeBriefFingerprint(
  brief: BriefFingerprintInput,
): string {
  const payload = {
    budgetInputWon: Math.max(0, Math.round(brief.budgetInputWon)),
    budgetMode: brief.budgetMode,
    regionCodes: normalizeSidoCodes(brief.regionCodes),
    genders: [...brief.genders].sort(),
    ageBands: [...brief.ageBands].sort(),
    flightStart: brief.flightStart ?? "",
    flightEnd: brief.flightEnd ?? "",
    goal: brief.goal ?? null,
    industry: brief.industry ?? null,
  };
  return JSON.stringify(payload);
}

export function countMixUnits(mixUnits: Record<string, number>): number {
  return Object.values(mixUnits).filter((u) => u > 0).length;
}

/** mix 가 있고, mix 가 만들어질 때의 브리프와 현재 브리프가 다르면 true */
export function isMixBriefStale(params: {
  mixUnits: Record<string, number>;
  mixBriefFingerprint: string | null;
  brief: BriefFingerprintInput;
}): boolean {
  if (countMixUnits(params.mixUnits) === 0) return false;
  const current = computeBriefFingerprint(params.brief);
  if (!params.mixBriefFingerprint) return true;
  return current !== params.mixBriefFingerprint;
}
