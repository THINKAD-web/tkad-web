export type QuotePremiumMediaInput = {
  id: string;
  name: string;
  location: string;
  thumbUrl: string | null;
  lineTotalWon: number;
  priceOnInquiry?: boolean;
  inquiryLabel?: string;
  dailyFootTraffic?: number | null;
  impressions?: number | null;
  /** 공식 견적서 — 규격 */
  size?: string | null;
  /** 공식 견적서 — 유형 라벨 */
  mediaTypeLabel?: string | null;
  categoryLabel?: string | null;
  operatingHours?: string | null;
  broadcastLabel?: string | null;
  recommendReason?: string | null;
  unitPriceWon?: number;
  unitPeriodLabel?: string | null;
  executionPeriodLabel?: string | null;
};

export type QuotePremiumMetrics = {
  totalReach: number;
  totalImpression: number;
  avgCpm: number;
  durationLabel: string;
  mediaRows: {
    id: string;
    name: string;
    impressions: number;
    costWon: number;
  }[];
};

const AVG_FREQ = 4.2;
const FALLBACK_DAILY_FOOT = 35_000;

import { isQuoteCampaignPeriodKey, quoteCampaignDaysFromPeriodKey } from "@/lib/quote-wizard-pricing";

export function quoteCampaignDays(
  periodKey: string,
  periodMonths: number,
): number {
  if (isQuoteCampaignPeriodKey(periodKey)) {
    return quoteCampaignDaysFromPeriodKey(periodKey);
  }
  if (periodMonths > 0) return periodMonths * 30;
  return 30;
}

export function computeQuotePremiumMetrics(opts: {
  mediaItems: QuotePremiumMediaInput[];
  periodKey: string;
  periodMonths: number;
  durationLabel: string;
  subtotalWon: number;
}): QuotePremiumMetrics {
  const days = quoteCampaignDays(opts.periodKey, opts.periodMonths);

  let totalReach = 0;
  let totalImpression = 0;

  const mediaRows = opts.mediaItems.map((m) => {
    const daily = m.dailyFootTraffic ?? FALLBACK_DAILY_FOOT;
    const reach = daily * days;
    const impressions =
      m.impressions && m.impressions > 0
        ? m.impressions
        : Math.round(reach * AVG_FREQ);

    totalReach += reach;
    totalImpression += impressions;

    return {
      id: m.id,
      name: m.name,
      impressions,
      costWon: m.priceOnInquiry ? 0 : m.lineTotalWon,
    };
  });

  const avgCpm =
    totalImpression > 0
      ? Math.round(opts.subtotalWon / (totalImpression / 1000))
      : 0;

  return {
    totalReach,
    totalImpression,
    avgCpm,
    durationLabel: opts.durationLabel,
    mediaRows,
  };
}

export function formatCompactMetric(value: number, locale: string): string {
  const isKo = locale.startsWith("ko");
  if (value >= 1_000_000) {
    const n = value / 1_000_000;
    return isKo ? `${n.toFixed(1)}M` : `${n.toFixed(1)}M`;
  }
  if (value >= 10_000) {
    const n = value / 1_000;
    return isKo ? `${Math.round(n).toLocaleString("ko-KR")}K` : `${Math.round(n)}K`;
  }
  return value.toLocaleString(locale);
}

export function formatKrw(value: number, locale: string): string {
  return `₩${value.toLocaleString(locale)}`;
}
