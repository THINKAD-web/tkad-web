import type { MediaItem, MediaPriceOption } from "@/lib/media-data";

/** 운영 부분기간 요율 · 견적 캠페인 기간 공통 키 (1/3/5/7/15/30일) */
export const PARTIAL_PERIOD_RATE_KEYS = [
  "1day",
  "3days",
  "5days",
  "7days",
  "15days",
  "30days",
] as const;

export type PartialPeriodRateAdminKey =
  (typeof PARTIAL_PERIOD_RATE_KEYS)[number];

export const PARTIAL_PERIOD_RATE_DAYS: Record<
  PartialPeriodRateAdminKey,
  number
> = {
  "1day": 1,
  "3days": 3,
  "5days": 5,
  "7days": 7,
  "15days": 15,
  "30days": 30,
};

/** DB JSON — 운영 6키만 저장·lookup */
export type PartialPeriodRatesMap = Partial<
  Record<PartialPeriodRateAdminKey, number>
>;

export type PartialPeriodRatesDraft = Record<PartialPeriodRateAdminKey, string>;

export const EMPTY_PARTIAL_PERIOD_RATES_DRAFT: PartialPeriodRatesDraft = {
  "1day": "",
  "3days": "",
  "5days": "",
  "7days": "",
  "15days": "",
  "30days": "",
};

const ADMIN_KEY_SET = new Set<string>(PARTIAL_PERIOD_RATE_KEYS);

/** 구 P0 키 → 신 키 (값 유지 remap). `3weeks`(21일)는 폐기 */
const LEGACY_PARTIAL_PERIOD_RATE_KEY_ALIASES: Record<
  string,
  PartialPeriodRateAdminKey
> = {
  "1week": "7days",
  "2weeks": "15days",
  "1month": "30days",
};

export function isPartialPeriodRateAdminKey(
  key: string,
): key is PartialPeriodRateAdminKey {
  return ADMIN_KEY_SET.has(key);
}

export function partialPeriodRateDaysFromKey(
  key: PartialPeriodRateAdminKey,
): number {
  return PARTIAL_PERIOD_RATE_DAYS[key];
}

/** 캠페인 일수 → 부분기간 lookup 키 (정확 일치만) */
export function partialRateLookupKeyFromDays(
  days: number,
): PartialPeriodRateAdminKey | null {
  const d = Math.max(1, Math.round(days));
  for (const key of PARTIAL_PERIOD_RATE_KEYS) {
    if (PARTIAL_PERIOD_RATE_DAYS[key] === d) return key;
  }
  return null;
}

export function normalizePartialPeriodRateLookupKey(
  key: string,
): PartialPeriodRateAdminKey | null {
  if (isPartialPeriodRateAdminKey(key)) return key;
  return LEGACY_PARTIAL_PERIOD_RATE_KEY_ALIASES[key] ?? null;
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

function normalizePartialPeriodRateKeyForStorage(
  key: string,
): PartialPeriodRateAdminKey | null {
  return normalizePartialPeriodRateLookupKey(key);
}

/** API/DB JSON → 정규화 map (유효 키·0–1 값만, 구 키 alias remap) */
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
    const normalizedKey = normalizePartialPeriodRateKeyForStorage(key);
    if (!normalizedKey) continue;
    out[normalizedKey] = Math.round(rate * 10000) / 10000;
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
  periodKey: PartialPeriodRateAdminKey,
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
 * 우선순위: priceOption override → Media default → null (선형 proration 폴백).
 */
export function resolvePartialPeriodRate(
  media: Pick<MediaItem, "partialPeriodRates">,
  priceOption: Pick<MediaPriceOption, "partialPeriodRates"> | null | undefined,
  periodKey: string,
): number | null {
  const normalized = normalizePartialPeriodRateLookupKey(periodKey);
  if (!normalized) return null;
  const fromOption = lookupRateInMap(
    priceOption?.partialPeriodRates,
    normalized,
  );
  if (fromOption != null) return fromOption;
  return lookupRateInMap(media.partialPeriodRates, normalized);
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
