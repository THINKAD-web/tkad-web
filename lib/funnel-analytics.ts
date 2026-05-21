import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export type AdvertiserFunnelStats = {
  periodDays: number;
  journeys: number;
  withBudgetPreview: number;
  withQuickQuote: number;
  withGuideDownload: number;
  withQuoteRequest: number;
  withSignup: number;
  byUtmSource: { source: string; count: number }[];
  stepCounts: { step: string; count: number }[];
  daily: { date: string; journeys: number; quotes: number }[];
};

export async function getAdvertiserFunnelStats(
  periodDays = 30,
): Promise<AdvertiserFunnelStats | null> {
  if (!isDatabaseConfigured()) return null;
  const db = getPrisma();
  const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

  const [
    journeys,
    withBudgetPreview,
    withQuickQuote,
    withGuideDownload,
    withQuoteRequest,
    withSignup,
    utmRows,
    stepRows,
    recentJourneys,
  ] = await Promise.all([
    db.visitorJourney.count({ where: { firstSeenAt: { gte: since } } }),
    db.visitorJourney.count({
      where: { firstSeenAt: { gte: since }, budgetPreviewAt: { not: null } },
    }),
    db.visitorJourney.count({
      where: { firstSeenAt: { gte: since }, quickQuoteAt: { not: null } },
    }),
    db.visitorJourney.count({
      where: { firstSeenAt: { gte: since }, guideDownloadedAt: { not: null } },
    }),
    db.visitorJourney.count({
      where: { firstSeenAt: { gte: since }, quoteRequestedAt: { not: null } },
    }),
    db.visitorJourney.count({
      where: { firstSeenAt: { gte: since }, signedUpAt: { not: null } },
    }),
    db.visitorJourney.groupBy({
      by: ["utmSource"],
      where: { firstSeenAt: { gte: since }, utmSource: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { utmSource: "desc" } },
      take: 12,
    }),
    db.visitorJourneyStep.groupBy({
      by: ["step"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
      orderBy: { _count: { step: "desc" } },
      take: 20,
    }),
    db.visitorJourney.findMany({
      where: { firstSeenAt: { gte: since } },
      select: {
        firstSeenAt: true,
        quoteRequestedAt: true,
        quickQuoteAt: true,
      },
      orderBy: { firstSeenAt: "asc" },
    }),
  ]);

  const dayMap = new Map<string, { journeys: number; quotes: number }>();
  for (const j of recentJourneys) {
    const d = j.firstSeenAt.toISOString().slice(0, 10);
    const row = dayMap.get(d) ?? { journeys: 0, quotes: 0 };
    row.journeys += 1;
    if (j.quoteRequestedAt || j.quickQuoteAt) row.quotes += 1;
    dayMap.set(d, row);
  }

  const daily = [...dayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));

  return {
    periodDays,
    journeys,
    withBudgetPreview,
    withQuickQuote,
    withGuideDownload,
    withQuoteRequest,
    withSignup,
    byUtmSource: utmRows.map((r) => ({
      source: r.utmSource ?? "(direct)",
      count: r._count._all,
    })),
    stepCounts: stepRows.map((r) => ({
      step: r.step,
      count: r._count._all,
    })),
    daily,
  };
}
