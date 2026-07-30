import {
  PARTIAL_PERIOD_RATE_DAYS,
  PARTIAL_PERIOD_RATE_KEYS,
  partialRateLookupKeyFromDays,
  type PartialPeriodRateAdminKey,
} from "@/lib/media-partial-period-rates";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_CAMPAIGN_DAYS = 366 * 2;

/** `YYYY-MM-DD` inclusive day count (timezone-neutral calendar math). */
export function inclusiveCampaignDaysFromIso(
  startIso: string,
  endIso: string,
): number | null {
  if (!ISO_DATE_RE.test(startIso) || !ISO_DATE_RE.test(endIso)) return null;
  const [sy, sm, sd] = startIso.split("-").map(Number);
  const [ey, em, ed] = endIso.split("-").map(Number);
  const start = Date.UTC(sy!, sm! - 1, sd!);
  const end = Date.UTC(ey!, em! - 1, ed!);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return null;
  }
  const days = Math.floor((end - start) / 86_400_000) + 1;
  if (days < 1 || days > MAX_CAMPAIGN_DAYS) return null;
  return days;
}

export function parseCampaignDaysParam(raw: string | null): number | null {
  if (!raw?.trim()) return null;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1 || n > MAX_CAMPAIGN_DAYS) return null;
  return n;
}

export function parseQuoteFlightStartParam(raw: string | null): string | null {
  if (!raw?.trim() || !ISO_DATE_RE.test(raw.trim())) return null;
  return raw.trim();
}

export function parseQuoteFlightEndParam(raw: string | null): string | null {
  return parseQuoteFlightStartParam(raw);
}

/** URL `start`+`end` → campaign days; `campaignDays` alone also accepted. */
export function resolveQuoteCampaignDaysFromParams(opts: {
  campaignDaysRaw?: string | null;
  startRaw?: string | null;
  endRaw?: string | null;
}): {
  campaignDays: number | null;
  flightStart: string | null;
  flightEnd: string | null;
} {
  const flightStart = parseQuoteFlightStartParam(opts.startRaw ?? null);
  const flightEnd = parseQuoteFlightEndParam(opts.endRaw ?? null);
  if (flightStart && flightEnd) {
    const fromRange = inclusiveCampaignDaysFromIso(flightStart, flightEnd);
    if (fromRange != null) {
      return { campaignDays: fromRange, flightStart, flightEnd };
    }
  }
  const campaignDays = parseCampaignDaysParam(opts.campaignDaysRaw ?? null);
  return {
    campaignDays,
    flightStart: campaignDays != null ? flightStart : null,
    flightEnd: campaignDays != null ? flightEnd : null,
  };
}

/** Step 2 드롭다운·부분기간 lookup 힌트 — 금액 계산 SSOT 아님. */
export function nearestQuoteCampaignPeriodKey(
  days: number,
): PartialPeriodRateAdminKey {
  const exact = partialRateLookupKeyFromDays(days);
  if (exact) return exact;
  const d = Math.max(1, Math.round(days));
  let best: PartialPeriodRateAdminKey = "30days";
  let bestDist = Number.POSITIVE_INFINITY;
  for (const key of PARTIAL_PERIOD_RATE_KEYS) {
    const dist = Math.abs(PARTIAL_PERIOD_RATE_DAYS[key] - d);
    if (dist < bestDist) {
      bestDist = dist;
      best = key;
    }
  }
  return best;
}

export function formatCustomCampaignPeriodLabel(
  days: number,
  isKo: boolean,
): string {
  const d = Math.max(1, Math.round(days));
  return isKo ? `맞춤 ${d}일` : `Custom ${d} days`;
}
