import type { CampaignStatus } from "@prisma/client";

export type CampaignTab = "active" | "completed" | "upcoming";

const ACTIVE_STATUSES: CampaignStatus[] = [
  "contract",
  "production",
  "airing",
];

const UPCOMING_STATUSES: CampaignStatus[] = ["proposal", "negotiation"];

export function classifyCampaignTab(
  status: CampaignStatus,
  startDate: Date | null,
  endDate: Date | null,
  now = new Date(),
): CampaignTab {
  if (status === "completed") return "completed";
  if (ACTIVE_STATUSES.includes(status)) return "active";
  const start = startDate ? new Date(startDate) : null;
  if (
    UPCOMING_STATUSES.includes(status) ||
    (start && start.getTime() > now.getTime())
  ) {
    return "upcoming";
  }
  if (endDate && new Date(endDate) < now) {
    return "completed";
  }
  return "active";
}

type MediaLike = {
  impressions?: number | null;
  dailyFootfall?: number | null;
};

export function estimateDailyImpressions(media: MediaLike): number {
  if (media.impressions != null && media.impressions > 0) {
    return Math.round(media.impressions / 30);
  }
  if (media.dailyFootfall != null && media.dailyFootfall > 0) {
    return media.dailyFootfall;
  }
  return 0;
}

export function buildDailyImpressionSeries(opts: {
  startDate: Date | null;
  endDate: Date | null;
  dailyTotal: number;
  maxDays?: number;
}): { date: string; impressions: number }[] {
  const { startDate, endDate, dailyTotal, maxDays = 90 } = opts;
  const now = new Date();
  const start = startDate
    ? new Date(startDate)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const end = endDate ? new Date(endDate) : now;
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  if (end < start) return [];

  const perDay = Math.max(0, Math.round(dailyTotal));
  const out: { date: string; impressions: number }[] = [];
  const cur = new Date(start);
  let n = 0;
  while (cur <= end && n < maxDays) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, "0");
    const d = String(cur.getDate()).padStart(2, "0");
    out.push({ date: `${y}-${m}-${d}`, impressions: perDay });
    cur.setDate(cur.getDate() + 1);
    n += 1;
  }
  return out;
}

export function sumImpressionsInMonth(
  series: { date: string; impressions: number }[],
  year: number,
  month: number,
): number {
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  return series
    .filter((p) => p.date.startsWith(prefix))
    .reduce((s, p) => s + p.impressions, 0);
}

export function mediaTypeToMapType(
  type: string | null | undefined,
): "billboard" | "digital" | "transport" | "special" {
  const t = (type ?? "").toLowerCase();
  if (t === "digital") return "digital";
  if (t === "transport" || t === "mobile") return "transport";
  if (t === "billboard" || t === "static") return "billboard";
  return "special";
}
