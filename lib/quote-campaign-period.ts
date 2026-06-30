import { inclusiveCampaignDays, monthFactorFromDays } from "@/lib/pricing";

export function parseCampaignPeriodRange(
  periodLabel: string,
): { start: Date; end: Date } | null {
  const m = periodLabel.trim().match(/^(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})$/);
  if (!m) return null;
  const start = new Date(`${m[1]}T12:00:00`);
  const end = new Date(`${m[2]}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return null;
  }
  return { start, end };
}

/** 집행 기간 라벨에서 주·개월 수 요약 (예: "26주 · 6개월") */
export function formatCampaignDurationMeta(
  periodLabel: string,
  isKo: boolean,
): string | null {
  const range = parseCampaignPeriodRange(periodLabel);
  if (!range) return null;
  const days = inclusiveCampaignDays(range.start, range.end);
  if (days <= 0) return null;

  const weeks = Math.max(1, Math.round(days / 7));
  const months = monthFactorFromDays(days);
  const monthsText =
    months % 1 === 0 ? String(Math.round(months)) : months.toFixed(1);
  return isKo ? `${weeks}주 · ${monthsText}개월` : `${weeks} wk · ${monthsText} mo`;
}
