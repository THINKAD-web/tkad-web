import type { MediaItem, MediaPricePeriodKey } from "@/lib/media-data";
import {
  catalogPriceFieldToWon,
  normalizeMediaPricePeriod,
} from "@/lib/media-price-format";
import {
  estimatedCpmWon,
  estimatedMonthlyImpressions,
  resolveDisplayCpmWon,
} from "@/lib/ai-recommend-metrics";

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

export function calculateMediaQuoteByDays(
  media: MediaItem,
  durationDays: number,
): MediaQuoteLine {
  const days = Math.max(1, Math.round(durationDays));
  const period = normalizeMediaPricePeriod(media.pricePeriod);
  const periodDays = pricePeriodDays(period);
  const unitPriceWon = catalogPriceFieldToWon(media.price);
  const costWon = Math.round(unitPriceWon * (days / periodDays));

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
