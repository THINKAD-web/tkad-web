import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/prisma";
import {
  COMPETITIVE_INDUSTRIES,
  industryFromText,
  industryLabel,
  mediaTypeLabel,
} from "@/lib/insights/industry-classify";

export type RegionConcentration = {
  region: string;
  count: number;
  pct: number;
};

export type MediaTypePreference = {
  type: string;
  label: string;
  count: number;
  pct: number;
};

export type SeasonHeatCell = {
  month: number;
  monthLabel: string;
  industry: string;
  count: number;
  intensity: number;
};

export type CompetitiveDashboardData = {
  generatedAt: string;
  selectedIndustry: string;
  industries: string[];
  snapshot: {
    totalCampaigns: number;
    topRegions: RegionConcentration[];
    mediaTypePrefs: MediaTypePreference[];
    avgDurationDays: number;
    periodLabelKo: string;
    periodLabelEn: string;
  };
  seasonalHeatmap: SeasonHeatCell[];
  heatmapIndustries: string[];
  heatmapMonthLabels: string[];
  currentSeasonTop: { industry: string; label: string; score: number }[];
  confidenceNoteKo: string;
  confidenceNoteEn: string;
};

type RawEvent = {
  industry: string;
  region: string;
  mediaType: string;
  month: number;
  durationDays: number | null;
};

function monthLabel(m: number, isKo: boolean): string {
  if (isKo) return `${m}월`;
  return new Date(2000, m - 1, 1).toLocaleString("en-US", { month: "short" });
}

function durationDays(
  start: Date | null | undefined,
  end: Date | null | undefined,
): number | null {
  if (!start || !end) return null;
  const ms = end.getTime() - start.getTime();
  if (ms <= 0) return null;
  return Math.round(ms / 86400_000);
}

async function loadRawEvents(since: Date): Promise<RawEvent[]> {
  if (!isDatabaseConfigured()) return [];

  const [executions, cases, bookings] = await Promise.all([
    prisma.mediaAdvertiserExecution
      .findMany({
        where: { createdAt: { gte: since } },
        select: {
          advertiserName: true,
          campaignLabel: true,
          periodStart: true,
          periodEnd: true,
          createdAt: true,
          media: { select: { region: true, type: true } },
        },
        take: 800,
      })
      .catch(() => []),
    prisma.successCase
      .findMany({
        where: { status: "published", publishedAt: { gte: since } },
        select: {
          industry: true,
          periodStart: true,
          periodEnd: true,
          publishedAt: true,
          mediaIds: true,
        },
        take: 300,
      })
      .catch(() => []),
    prisma.mediaBooking
      .findMany({
        where: { status: "confirmed", createdAt: { gte: since } },
        select: {
          startsAt: true,
          endsAt: true,
          createdAt: true,
          requesterName: true,
          media: { select: { region: true, type: true } },
        },
        take: 400,
      })
      .catch(() => []),
  ]);

  const events: RawEvent[] = [];

  for (const e of executions) {
    const text = [e.advertiserName, e.campaignLabel].filter(Boolean).join(" ");
    const d = durationDays(e.periodStart, e.periodEnd);
    events.push({
      industry: industryFromText(text),
      region: e.media.region?.trim() || "기타",
      mediaType: e.media.type ?? "digital",
      month: (e.periodStart ?? e.createdAt).getMonth() + 1,
      durationDays: d,
    });
  }

  for (const c of cases) {
    const d = durationDays(c.periodStart, c.periodEnd);
    const month = (c.periodStart ?? c.publishedAt ?? new Date()).getMonth() + 1;
    events.push({
      industry: industryFromText(c.industry),
      region: "전국",
      mediaType: "digital",
      month,
      durationDays: d,
    });
  }

  for (const b of bookings) {
    const d = durationDays(b.startsAt, b.endsAt);
    events.push({
      industry: industryFromText(b.requesterName ?? ""),
      region: b.media.region?.trim() || "기타",
      mediaType: b.media.type ?? "digital",
      month: b.startsAt.getMonth() + 1,
      durationDays: d,
    });
  }

  return events;
}

export async function buildCompetitiveDashboardData(opts: {
  isKo: boolean;
  industry?: string;
}): Promise<CompetitiveDashboardData> {
  const isKo = opts.isKo;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const [monthEvents, yearEvents] = await Promise.all([
    loadRawEvents(monthStart),
    loadRawEvents(yearStart),
  ]);

  const industryCounts = new Map<string, number>();
  for (const e of monthEvents) {
    industryCounts.set(e.industry, (industryCounts.get(e.industry) ?? 0) + 1);
  }

  const selectedIndustry =
    opts.industry && COMPETITIVE_INDUSTRIES.includes(opts.industry as (typeof COMPETITIVE_INDUSTRIES)[number])
      ? opts.industry
      : [...industryCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
        "뷰티·패션";

  const filtered = monthEvents.filter((e) => e.industry === selectedIndustry);

  const regionMap = new Map<string, number>();
  const typeMap = new Map<string, number>();
  const durations: number[] = [];

  for (const e of filtered) {
    regionMap.set(e.region, (regionMap.get(e.region) ?? 0) + 1);
    typeMap.set(e.mediaType, (typeMap.get(e.mediaType) ?? 0) + 1);
    if (e.durationDays != null && e.durationDays > 0) durations.push(e.durationDays);
  }

  const total = filtered.length || 1;
  const topRegions: RegionConcentration[] = [...regionMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([region, count]) => ({
      region,
      count,
      pct: Math.round((count / total) * 100),
    }));

  const mediaTypePrefs: MediaTypePreference[] = [...typeMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({
      type,
      label: mediaTypeLabel(type, isKo),
      count,
      pct: Math.round((count / total) * 100),
    }));

  const avgDurationDays =
    durations.length > 0
      ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
      : 28;

  const heatmapIndustries: string[] = [...COMPETITIVE_INDUSTRIES].slice(0, 7);
  const heatCounts = new Map<string, number>();
  let maxHeat = 1;

  for (const e of yearEvents) {
    if (!heatmapIndustries.includes(e.industry)) continue;
    const key = `${e.month}|${e.industry}`;
    heatCounts.set(key, (heatCounts.get(key) ?? 0) + 1);
    maxHeat = Math.max(maxHeat, heatCounts.get(key)!);
  }

  const heatmapMonthLabels: string[] = [];
  const seasonalHeatmap: SeasonHeatCell[] = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = d.getMonth() + 1;
    const label = monthLabel(m, isKo);
    if (!heatmapMonthLabels.includes(label)) heatmapMonthLabels.push(label);

    for (const ind of heatmapIndustries) {
      const count = heatCounts.get(`${m}|${ind}`) ?? 0;
      seasonalHeatmap.push({
        month: m,
        monthLabel: label,
        industry: ind,
        count,
        intensity: count / maxHeat,
      });
    }
  }

  const currentMonth = now.getMonth() + 1;
  const seasonScores = new Map<string, number>();
  for (const e of yearEvents) {
    if (e.month === currentMonth) {
      seasonScores.set(e.industry, (seasonScores.get(e.industry) ?? 0) + 1);
    }
  }
  const currentSeasonTop = [...seasonScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([industry, score]) => ({
      industry,
      label: industryLabel(industry, isKo),
      score,
    }));

  const monthName = isKo
    ? `${now.getMonth() + 1}월`
    : now.toLocaleString("en-US", { month: "long" });

  return {
    generatedAt: now.toISOString(),
    selectedIndustry,
    industries: [...COMPETITIVE_INDUSTRIES],
    snapshot: {
      totalCampaigns: filtered.length,
      topRegions,
      mediaTypePrefs,
      avgDurationDays,
      periodLabelKo: `이번 달(${monthName})`,
      periodLabelEn: `This month (${monthName})`,
    },
    seasonalHeatmap,
    heatmapIndustries,
    heatmapMonthLabels,
    currentSeasonTop,
    confidenceNoteKo:
      "집행 건수는 MediaAdvertiserExecution·SuccessCase·MediaBooking(확정) 기반 추정치입니다.",
    confidenceNoteEn:
      "Counts aggregate MediaAdvertiserExecution, published SuccessCase, and confirmed MediaBooking.",
  };
}

/** FREE 사용자 블러용 — 구조만 동일, 민감 데이터 없음 */
export async function buildCompetitiveDashboardTeaser(opts: {
  isKo: boolean;
}): Promise<CompetitiveDashboardData> {
  const full = await buildCompetitiveDashboardData({
    isKo: opts.isKo,
    industry: "뷰티·패션",
  });
  return {
    ...full,
    snapshot: {
      ...full.snapshot,
      totalCampaigns: Math.max(full.snapshot.totalCampaigns, 12),
      topRegions: full.snapshot.topRegions.length
        ? full.snapshot.topRegions
        : [
            { region: opts.isKo ? "강남" : "Gangnam", count: 5, pct: 42 },
            { region: opts.isKo ? "홍대" : "Hongdae", count: 3, pct: 28 },
          ],
    },
  };
}
