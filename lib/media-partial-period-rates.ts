import type { MediaItem, MediaPriceOption } from "@/lib/media-data";
import type { QuoteCampaignPeriodKey } from "@/lib/quote-wizard-pricing";

/** 어드민 UI · lookup 공통 키 (QuoteCampaignPeriodKey `2weeks` 등과 호환) */
export const PARTIAL_PERIOD_RATE_KEYS = [
  "3days",
  "1week",
  "2weeks",
  "3weeks",
] as const;

export type PartialPeriodRateAdminKey =
  (typeof PARTIAL_PERIOD_RATE_KEYS)[number];

/** DB JSON — QuoteCampaignPeriodKey 값도 허용 (예: `1month`) */
export type PartialPeriodRatesMap = Partial<
  Record<PartialPeriodRateAdminKey | QuoteCampaignPeriodKey, number>
>;

export type PartialPeriodRatesDraft = Record<PartialPeriodRateAdminKey, string>;

export const EMPTY_PARTIAL_PERIOD_RATES_DRAFT: PartialPeriodRatesDraft = {
  "3days": "",
  "1week": "",
  "2weeks": "",
  "3weeks": "",
};

const ADMIN_KEY_SET = new Set<string>(PARTIAL_PERIOD_RATE_KEYS);

export function isPartialPeriodRateAdminKey(
  key: string,
): key is PartialPeriodRateAdminKey {
  return ADMIN_KEY_SET.has(key);
}

/** UI % 입력 → 0–1 배수. 빈 문자열은 skip */
export function parsePartialPeriodRatePercentInput(
  raw: string,
): number | null {
  const t = raw.trim().replace(/%/g, "");
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return null;
  const rate = n > 1 ? n / 100 : n;
  if (rate <= 0 || rate > 1) return null;
  return Math.round(rate * 10000) / 10000;
}

export function partialPeriodRateToPercentLabel(rate: number): string {
  const pct = rate <= 1 ? rate * 100 : rate;
  const rounded = Math.round(pct * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** API/DB JSON → 정규화 map (유효 키·0–1 값만) */
export function parsePartialPeriodRatesRaw(
  raw: unknown,
): PartialPeriodRatesMap | null {
  if (raw == null) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: PartialPeriodRatesMap = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    const rate = value > 1 ? value / 100 : value;
    if (rate <= 0 || rate > 1) continue;
    (out as Record<string, number>)[key] = Math.round(rate * 10000) / 10000;
  }
  return Object.keys(out).length > 0 ? out : null;
}

export function partialPeriodRatesDraftFromMap(
  map: PartialPeriodRatesMap | null | undefined,
): PartialPeriodRatesDraft {
  const draft = { ...EMPTY_PARTIAL_PERIOD_RATES_DRAFT };
  if (!map) return draft;
  for (const key of PARTIAL_PERIOD_RATE_KEYS) {
    const rate = map[key];
    if (rate != null && Number.isFinite(rate)) {
      draft[key] = partialPeriodRateToPercentLabel(rate);
    }
  }
  return draft;
}

export function partialPeriodRatesMapFromDraft(
  draft: PartialPeriodRatesDraft,
): PartialPeriodRatesMap | null {
  const out: PartialPeriodRatesMap = {};
  for (const key of PARTIAL_PERIOD_RATE_KEYS) {
    const rate = parsePartialPeriodRatePercentInput(draft[key] ?? "");
    if (rate != null) out[key] = rate;
  }
  return Object.keys(out).length > 0 ? out : null;
}

function lookupRateInMap(
  map: PartialPeriodRatesMap | null | undefined,
  periodKey: QuoteCampaignPeriodKey | PartialPeriodRateAdminKey,
): number | null {
  if (!map) return null;
  const rate = map[periodKey];
  if (rate != null && Number.isFinite(rate) && rate > 0 && rate <= 1) {
    return rate;
  }
  return null;
}

/**
 * 매체·옵션 부분기간 요율 lookup.
 * 우선순위: priceOption override → Media default → null (P1에서 기존 proration 폴백).
 */
export function resolvePartialPeriodRate(
  media: Pick<MediaItem, "partialPeriodRates">,
  priceOption: Pick<MediaPriceOption, "partialPeriodRates"> | null | undefined,
  periodKey: QuoteCampaignPeriodKey | PartialPeriodRateAdminKey,
): number | null {
  const fromOption = lookupRateInMap(priceOption?.partialPeriodRates, periodKey);
  if (fromOption != null) return fromOption;
  return lookupRateInMap(media.partialPeriodRates, periodKey);
}

/** 매체 지정 요율(0–1) × 패키지/월 단가(원) */
export function quoteLineTotalWonFromPartialRate(
  unitPriceWon: number,
  rate: number,
): number {
  return Math.round(unitPriceWon * rate);
}

export function parsePartialPeriodRatesFromPriceOptionRow(
  row: Record<string, unknown>,
): PartialPeriodRatesMap | undefined {
  return parsePartialPeriodRatesRaw(row.partialPeriodRates) ?? undefined;
}
