import type { MediaItem, MediaPriceOption, MediaPricePeriodKey } from "@/lib/media-data";
import {
  catalogPriceFieldToWon,
  getCheapestMediaPriceOption,
  inferMediaPricePeriodFromPriceOption,
  normalizeMediaPricePeriod,
} from "@/lib/media-price-format";
import {
  estimatedCpmWon,
  estimatedMonthlyImpressions,
  resolveDisplayCpmWon,
} from "@/lib/ai-recommend-metrics";
import {
  quoteLineTotalWonFromPartialRate,
  resolvePartialPeriodRate,
  type PartialPeriodRateAdminKey,
} from "@/lib/media-partial-period-rates";
import type { QuoteCampaignPeriodKey } from "@/lib/quote-wizard-pricing";

export type QuoteDurationUnit = "day" | "week" | "month";

export function durationToDays(
  value: number,
  unit: QuoteDurationUnit,
): number {
  const v = Math.max(1, Math.round(value));
  if (unit === "day") return v;
  if (unit === "week") return v * 7;
  return v * 30;
}

export function pricePeriodDays(period: MediaPricePeriodKey): number {
  switch (period) {
    case "day":
      return 1;
    case "week":
      return 7;
    case "biweekly":
      return 14;
    default:
      return 30;
  }
}

export function resolveMediaCpmWon(m: MediaItem): number | null {
  return resolveDisplayCpmWon(m);
}

export type MediaQuoteLine = {
  mediaId: string;
  name: string;
  costWon: number;
  impressions: number;
  cpm: number | null;
};

/** 패키지 총액 × (캠페인 일수 ÷ 번들 일수) — 스티키 패널·마법사 공용 */
export function quoteBundleProrationWon(
  bundlePriceWon: number,
  campaignDays: number,
  bundleDays: number,
): number {
  const days = Math.max(1, Math.round(campaignDays));
  const bundle = Math.max(1, Math.round(bundleDays));
  return Math.round(bundlePriceWon * (days / bundle));
}

function parseExplicitBundleDaysFromText(text: string): number | null {
  const dayKo = text.match(/(\d+)\s*일/);
  if (dayKo) return Math.max(1, parseInt(dayKo[1], 10));
  const weekKo = text.match(/(\d+)\s*주/);
  if (weekKo) return Math.max(1, parseInt(weekKo[1], 10)) * 7;
  const monthKo = text.match(/(\d+)\s*개월/);
  if (monthKo) return Math.max(1, parseInt(monthKo[1], 10)) * 30;
  const dayEn = text.match(/(\d+)\s*days?/i);
  if (dayEn) return Math.max(1, parseInt(dayEn[1], 10));
  const weekEn = text.match(/(\d+)\s*weeks?/i);
  if (weekEn) return Math.max(1, parseInt(weekEn[1], 10)) * 7;
  const monthEn = text.match(/(\d+)\s*months?/i);
  if (monthEn) return Math.max(1, parseInt(monthEn[1], 10)) * 30;
  return null;
}

/** 라벨·period 텍스트에 명시된 번들 일수만 추출 — 없으면 null (period 추론 폴백 없음) */
export function tryResolveExplicitPriceOptionBundleDays(
  option: Pick<MediaPriceOption, "label" | "period">,
): number | null {
  const label = option.label?.trim() ?? "";
  if (label) {
    const fromLabel = parseExplicitBundleDaysFromText(label);
    if (fromLabel != null) return fromLabel;
  }
  const periodText = String(option.period ?? "").trim();
  if (periodText) {
    return parseExplicitBundleDaysFromText(periodText);
  }
  return null;
}

function quoteLineFromCostWon(
  media: MediaItem,
  costWon: number,
  durationDays: number,
): MediaQuoteLine {
  const days = Math.max(1, Math.round(durationDays));
  const monthlyImp = estimatedMonthlyImpressions(media);
  const impressions = Math.round(monthlyImp * (days / 30));
  const cpm =
    impressions > 0 ? Math.round(costWon / (impressions / 1000)) : null;

  return {
    mediaId: media.id,
    name: media.name,
    costWon,
    impressions,
    cpm,
  };
}

function quoteLineFromUnitPrice(
  media: MediaItem,
  unitPriceWon: number,
  durationDays: number,
  bundleDays: number,
): MediaQuoteLine {
  const costWon = quoteBundleProrationWon(
    unitPriceWon,
    durationDays,
    bundleDays,
  );

  const days = Math.max(1, Math.round(durationDays));
  const monthlyImp = estimatedMonthlyImpressions(media);
  const impressions = Math.round(monthlyImp * (days / 30));
  const cpm =
    impressions > 0 ? Math.round(costWon / (impressions / 1000)) : null;

  return {
    mediaId: media.id,
    name: media.name,
    costWon,
    impressions,
    cpm,
  };
}

/** 비교·상세 instant quote — 일수 → 부분기간 lookup 키 */
export function quotePeriodLookupKeyFromDays(
  days: number,
): QuoteCampaignPeriodKey | PartialPeriodRateAdminKey | null {
  const d = Math.max(1, Math.round(days));
  const adminByDays: Record<number, PartialPeriodRateAdminKey> = {
    3: "3days",
    7: "1week",
    14: "2weeks",
    21: "3weeks",
  };
  if (adminByDays[d]) return adminByDays[d];
  const wizardByDays: Record<number, QuoteCampaignPeriodKey> = {
    14: "2weeks",
    30: "1month",
    90: "3months",
    180: "6months",
    360: "12months",
  };
  return wizardByDays[d] ?? null;
}

export function calculateMediaQuoteByDays(
  media: MediaItem,
  durationDays: number,
): MediaQuoteLine {
  const days = Math.max(1, Math.round(durationDays));
  const periodKey = quotePeriodLookupKeyFromDays(days);
  const partialRate =
    periodKey != null
      ? resolvePartialPeriodRate(media, null, periodKey)
      : null;
  const unitPriceWon = catalogPriceFieldToWon(media.price);

  if (partialRate != null) {
    const costWon = quoteLineTotalWonFromPartialRate(unitPriceWon, partialRate);
    return quoteLineFromCostWon(media, costWon, durationDays);
  }

  const period = normalizeMediaPricePeriod(media.pricePeriod);
  const periodDays = pricePeriodDays(period);
  return quoteLineFromUnitPrice(media, unitPriceWon, durationDays, periodDays);
}

/** 옵션 라벨·period에서 패키지 길이(일) 추출 — 예: "20초 3일" → 3, "1개월" → 30 */
export function resolvePriceOptionBundleDays(
  option: Pick<MediaPriceOption, "label" | "period">,
  fallbackPeriod: MediaPricePeriodKey | string | null | undefined,
): number {
  const explicit = tryResolveExplicitPriceOptionBundleDays(option);
  if (explicit != null) return explicit;
  const periodKey = inferMediaPricePeriodFromPriceOption(option, fallbackPeriod);
  return pricePeriodDays(periodKey);
}

/** priceOptions 중 최저가 인덱스 — getCheapestMediaPriceOption과 동일 기준 */
export function findCheapestPriceOptionIndex(
  media: Pick<MediaItem, "price" | "pricePeriod" | "priceOptions">,
): number {
  const opts = media.priceOptions ?? [];
  if (opts.length === 0) return 0;

  const cheapest = getCheapestMediaPriceOption(media);
  if (cheapest) {
    const matchIdx = opts.findIndex(
      (o) => catalogPriceFieldToWon(o.price) === cheapest.priceWon,
    );
    if (matchIdx >= 0) return matchIdx;
  }

  let bestIdx = 0;
  let bestWon = catalogPriceFieldToWon(opts[0].price);
  for (let i = 1; i < opts.length; i++) {
    const won = catalogPriceFieldToWon(opts[i].price);
    if (won < bestWon) {
      bestWon = won;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/** 선택 priceOption 단가·패키지 기간 기준 일할 견적 (기존 calculateMediaQuoteByDays 동작 불변) */
export function calculateMediaQuoteFromOption(
  media: MediaItem,
  option: MediaPriceOption,
  durationDays: number,
): MediaQuoteLine {
  const days = Math.max(1, Math.round(durationDays));
  const periodKey = quotePeriodLookupKeyFromDays(days);
  const partialRate =
    periodKey != null
      ? resolvePartialPeriodRate(media, option, periodKey)
      : null;
  const unitPriceWon = catalogPriceFieldToWon(option.price);

  if (partialRate != null) {
    const costWon = quoteLineTotalWonFromPartialRate(unitPriceWon, partialRate);
    return quoteLineFromCostWon(media, costWon, durationDays);
  }

  const bundleDays = resolvePriceOptionBundleDays(option, media.pricePeriod);
  return quoteLineFromUnitPrice(
    media,
    unitPriceWon,
    durationDays,
    bundleDays,
  );
}

export function calculateMediaQuote(
  media: MediaItem,
  durationValue: number,
  durationUnit: QuoteDurationUnit,
): MediaQuoteLine {
  return calculateMediaQuoteByDays(
    media,
    durationToDays(durationValue, durationUnit),
  );
}

export type CompareQuoteTotals = {
  lines: MediaQuoteLine[];
  subtotalWon: number;
  vatWon: number;
  totalWithVatWon: number;
  totalImpressions: number;
  avgCpm: number | null;
};

export function aggregateQuoteLines(lines: MediaQuoteLine[]): CompareQuoteTotals {
  const subtotalWon = lines.reduce((s, l) => s + l.costWon, 0);
  const vatWon = Math.round(subtotalWon * 0.1);
  const totalWithVatWon = subtotalWon + vatWon;
  const totalImpressions = lines.reduce((s, l) => s + l.impressions, 0);
  const avgCpm =
    totalImpressions > 0
      ? Math.round(subtotalWon / (totalImpressions / 1000))
      : null;
  return {
    lines,
    subtotalWon,
    vatWon,
    totalWithVatWon,
    totalImpressions,
    avgCpm,
  };
}

/** CPM 효율 승자 — 가장 낮은 CPM */
export function pickCpmWinner(
  items: MediaItem[],
  isKo: boolean,
): { media: MediaItem; cpm: number; reason: string } | null {
  if (items.length < 2) return null;

  const scored = items
    .map((m) => ({ m, cpm: resolveMediaCpmWon(m) }))
    .filter((x): x is { m: MediaItem; cpm: number } => x.cpm != null && x.cpm > 0);

  if (scored.length === 0) return null;

  scored.sort((a, b) => a.cpm - b.cpm);
  const best = scored[0];
  const ties = scored.filter((s) => s.cpm === best.cpm);
  if (ties.length > 1) return null;

  const imp = estimatedMonthlyImpressions(best.m);
  const reason = isKo
    ? `월 약 ${imp.toLocaleString("ko-KR")}회 노출 대비 CPM ₩${Math.round(best.cpm).toLocaleString("ko-KR")}로 비교군 중 가장 효율적입니다.`
    : `Best CPM at ₩${Math.round(best.cpm).toLocaleString("en-US")} vs ~${imp.toLocaleString("en-US")} monthly impressions.`;

  return { media: best.m, cpm: best.cpm, reason };
}

export function availabilityScore(m: MediaItem): number {
  switch (m.availability) {
    case "available":
      return 100;
    case "reserved":
      return 42;
    case "maintenance":
      return 12;
    default:
      return 68;
  }
}

export function accessibilityScore(m: MediaItem): number {
  const foot = m.dailyFootTraffic ?? 0;
  if (foot <= 0) return 50;
  return Math.min(100, Math.round(Math.log10(foot + 1) * 22));
}

export type RadarAxisKey =
  | "impressions"
  | "cpmEfficiency"
  | "visibility"
  | "accessibility"
  | "availability";

export type CompareRadarPoint = {
  mediaId: string;
  name: string;
  impressions: number;
  cpmEfficiency: number;
  visibility: number;
  accessibility: number;
  availability: number;
};

function normalizeScores(
  values: number[],
  higherIsBetter: boolean,
): number[] {
  const finite = values.filter((v) => Number.isFinite(v) && v > 0);
  if (finite.length === 0) return values.map(() => 0);
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  if (min === max) return values.map(() => 75);
  return values.map((v) => {
    if (!Number.isFinite(v) || v <= 0) return 0;
    const t = (v - min) / (max - min);
    const score = higherIsBetter ? t : 1 - t;
    return Math.round(Math.max(8, Math.min(100, score * 100)));
  });
}

export function buildCompareRadarData(items: MediaItem[]): CompareRadarPoint[] {
  const impRaw = items.map((m) => estimatedMonthlyImpressions(m));
  const cpmRaw = items.map((m) => resolveMediaCpmWon(m) ?? 0);
  const visRaw = items.map((m) => m.visibilityScore ?? 0);
  const accRaw = items.map((m) => accessibilityScore(m));
  const availRaw = items.map((m) => availabilityScore(m));

  const impScores = normalizeScores(impRaw, true);
  const cpmScores = normalizeScores(cpmRaw, false);
  const visScores = normalizeScores(visRaw, true);
  const accScores = normalizeScores(accRaw, true);
  const availScores = normalizeScores(availRaw, true);

  return items.map((m, i) => ({
    mediaId: m.id,
    name: m.name,
    impressions: impScores[i] ?? 0,
    cpmEfficiency: cpmScores[i] ?? 0,
    visibility: visScores[i] ?? 0,
    accessibility: accScores[i] ?? 0,
    availability: availScores[i] ?? 0,
  }));
}

export function formatWonShort(won: number, locale: string): string {
  const isKo = locale === "ko" || locale.startsWith("ko");
  if (won >= 100_000_000) {
    const eok = won / 100_000_000;
    return isKo
      ? `약 ${eok % 1 === 0 ? eok.toFixed(0) : eok.toFixed(1)}억원`
      : `~₩${(won / 1_000_000).toFixed(1)}M`;
  }
  if (won >= 10_000) {
    const man = won / 10_000;
    return isKo
      ? `약 ${man % 1 === 0 ? man.toFixed(0) : man.toFixed(1)}만원`
      : `~₩${won.toLocaleString(locale)}`;
  }
  return isKo
    ? `${won.toLocaleString("ko-KR")}원`
    : `₩${won.toLocaleString("en-US")}`;
}

export function buildQuoteContactHref(params: {
  mediaIds: string[];
  durationDays: number;
  totals: CompareQuoteTotals;
  locale: string;
  includeVat: boolean;
}): string {
  const { mediaIds, durationDays, totals, locale, includeVat } = params;
  const isKo = locale === "ko" || locale.startsWith("ko");
  const costLabel = includeVat
    ? formatWonShort(totals.totalWithVatWon, locale)
    : formatWonShort(totals.subtotalWon, locale);
  const vatNote = includeVat
    ? isKo
      ? "VAT 포함"
      : "VAT incl."
    : isKo
      ? "VAT 별도"
      : "excl. VAT";

  const summary = [
    isKo ? "[인스턴트 견적 · 비교]" : "[Instant quote · compare]",
    isKo ? `집행 기간: ${durationDays}일` : `Duration: ${durationDays} days`,
    isKo
      ? `예상 비용(${vatNote}): ${costLabel}`
      : `Est. cost (${vatNote}): ${costLabel}`,
    isKo
      ? `예상 총 노출: ${totals.totalImpressions.toLocaleString(isKo ? "ko-KR" : "en-US")}회`
      : `Est. impressions: ${totals.totalImpressions.toLocaleString(isKo ? "ko-KR" : "en-US")}`,
    totals.avgCpm
      ? isKo
        ? `평균 CPM: ₩${totals.avgCpm.toLocaleString("ko-KR")}`
        : `Avg. CPM: ₩${totals.avgCpm.toLocaleString("en-US")}`
      : null,
    isKo ? `매체 ID: ${mediaIds.join(", ")}` : `Media IDs: ${mediaIds.join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");

  const q = new URLSearchParams();
  q.set("type", "media");
  if (mediaIds.length) q.set("media", mediaIds.join(","));
  q.set("quote", summary);
  return `/contact?${q.toString()}`;
}
