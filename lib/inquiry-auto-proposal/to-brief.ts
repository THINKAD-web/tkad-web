import type { CampaignBriefInput } from "@/lib/planner/brief/types";
import { flightDays } from "@/lib/planner/brief/types";
import type { ParsedInquiryProposal } from "./parse-inquiry-text";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Inclusive YYYY-MM-DD window. 1 month → 30 days (start + 29). */
export function inclusiveFlightEnd(startYmd: string, days: number): string {
  const start = Date.parse(`${startYmd}T00:00:00Z`);
  if (Number.isNaN(start)) {
    throw new Error("PROPOSAL_INVALID_FLIGHT_START");
  }
  const span = Math.max(1, Math.round(days));
  return new Date(start + (span - 1) * MS_PER_DAY).toISOString().slice(0, 10);
}

export function utcDateOnly(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function inquiryFlightDays(months: number): number {
  return Math.max(1, Math.round(months)) * 30;
}

export function inquiryMixUnits(
  eligibleIds: readonly string[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of eligibleIds) {
    if (!id || out[id] != null) continue;
    out[id] = 1;
  }
  return out;
}

export function inquiryToBrief(
  parsed: ParsedInquiryProposal,
  opts?: { flightStart?: string },
): CampaignBriefInput {
  const flightStart = opts?.flightStart ?? utcDateOnly();
  const days = inquiryFlightDays(parsed.months);
  const flightEnd = inclusiveFlightEnd(flightStart, days);
  return {
    budgetInputWon: parsed.budgetWon,
    budgetMode: "total",
    regionCodes: [],
    genders: [],
    ageBands: [],
    goal: null,
    industry: null,
    flightStart,
    flightEnd,
    freeText: parsed.raw,
  };
}

export function assertInquiryBriefFlight(brief: CampaignBriefInput): void {
  const days = flightDays(brief);
  if (days == null || days < 1) {
    throw new Error("PROPOSAL_FLIGHT_REQUIRED");
  }
}
