import type { ConversionEventType } from "@prisma/client";
import { CampaignStatus, MediaApplicationStatus, OoHQuoteStatus } from "@prisma/client";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { countActiveSessions } from "@/lib/tracking/record";
import { loadSystemHealth, type SystemHealthSnapshot } from "@/lib/monitoring/system-health";
import {
  periodStart,
  seoulDayStartUtc,
  type MonitoringPeriod,
} from "@/lib/monitoring/period";
import { seoulTargetYmd } from "@/lib/seoul-calendar";

export type MonitoringDashboardData = {
  configured: boolean;
  period: MonitoringPeriod;
  visitors: {
    activeNow: number;
    today: number;
    week: number;
    month: number;
    topPages: Array<{ path: string; views: number }>;
  };
  funnel: {
    visit: number;
    mediaView: number;
    favorite: number;
    quoteRequest: number;
    contract: number;
    rates: {
      visitToMediaView: number;
      mediaViewToFavorite: number;
      favoriteToQuote: number;
      quoteToContract: number;
    };
  };
  mediaRankings: {
    views: Array<{ mediaId: string; name: string; count: number }>;
    favorites: Array<{ mediaId: string; name: string; count: number }>;
    conversion: Array<{ mediaId: string; name: string; rate: number; inquiries: number; views: number }>;
  };
  alerts: {
    staleInquiries: Array<{ id: string; company: string; name: string; createdAt: string }>;
    expiringQuotes: Array<{ id: string; company: string; validUntil: string | null }>;
    campaignsStartingSoon: Array<{ id: string; name: string; startDate: string | null }>;
    pendingMediaApplications: number;
  };
  system: SystemHealthSnapshot;
};

function pct(num: number, den: number): number {
  if (den <= 0) return 0;
  return Math.round((num / den) * 1000) / 10;
}

async function countDistinctSessionsSince(since: Date): Promise<number> {
  const db = getPrisma();
  const rows = await db.pageView.findMany({
    where: { createdAt: { gte: since } },
    distinct: ["sessionId"],
    select: { sessionId: true },
  });
  return rows.length;
}

async function countDistinctSessionsInRange(
  start: Date,
  end: Date,
): Promise<number> {
  const db = getPrisma();
  const rows = await db.pageView.findMany({
    where: { createdAt: { gte: start, lt: end } },
    distinct: ["sessionId"],
    select: { sessionId: true },
  });
  return rows.length;
}

async function countConversionsSince(
  type: ConversionEventType,
  since: Date,
): Promise<number> {
  const db = getPrisma();
  return db.conversionEvent.count({
    where: { type, createdAt: { gte: since } },
  });
}

async function countContractsSince(since: Date): Promise<number> {
  const db = getPrisma();
  const [events, quotes, campaigns] = await Promise.all([
    db.conversionEvent.count({
      where: { type: "contract", createdAt: { gte: since } },
    }),
    db.ooHQuote.count({
      where: {
        status: {
          in: [
            OoHQuoteStatus.contract_confirmed,
            OoHQuoteStatus.in_progress,
            OoHQuoteStatus.completed,
          ],
        },
        updatedAt: { gte: since },
      },
    }),
    db.campaign.count({
      where: {
        status: {
          in: [
            CampaignStatus.contract,
            CampaignStatus.production,
            CampaignStatus.airing,
            CampaignStatus.completed,
          ],
        },
        updatedAt: { gte: since },
      },
    }),
  ]);
  return Math.max(events, quotes, campaigns);
}

async function topPagesSince(since: Date, limit = 10) {
  const db = getPrisma();
  const rows = await db.pageView.groupBy({
    by: ["path"],
    where: { createdAt: { gte: since } },
    _count: { _all: true },
    orderBy: { _count: { path: "desc" } },
    take: limit,
  });
  return rows.map((r) => ({ path: r.path, views: r._count._all }));
}

async function mediaEventCounts(
  type: ConversionEventType,
  since: Date,
  limit = 10,
): Promise<Array<{ mediaId: string; count: number }>> {
  const db = getPrisma();
  const rows = await db.conversionEvent.groupBy({
    by: ["mediaId"],
    where: {
      type,
      createdAt: { gte: since },
      mediaId: { not: null },
    },
    _count: { _all: true },
    orderBy: { _count: { mediaId: "desc" } },
    take: limit,
  });
  return rows
    .filter((r): r is typeof r & { mediaId: string } => Boolean(r.mediaId))
    .map((r) => ({ mediaId: r.mediaId, count: r._count._all }));
}

async function resolveMediaNames(
  ids: string[],
): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  const db = getPrisma();
  const media = await db.media.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  });
  return Object.fromEntries(media.map((m) => [m.id, m.name]));
}

async function loadAlerts(now = new Date()) {
  const empty = {
    staleInquiries: [] as MonitoringDashboardData["alerts"]["staleInquiries"],
    expiringQuotes: [] as MonitoringDashboardData["alerts"]["expiringQuotes"],
    campaignsStartingSoon: [] as MonitoringDashboardData["alerts"]["campaignsStartingSoon"],
    pendingMediaApplications: 0,
  };

  if (!isDatabaseConfigured()) return empty;

  const db = getPrisma();
  const dayAgo = new Date(now.getTime() - 86400000);
  const in3Days = new Date(now.getTime() + 3 * 86400000);
  const tomorrowYmd = seoulTargetYmd(1, now);

  const [staleInquiries, expiringQuotes, campaignsStartingSoon, pendingMediaApplications] =
    await Promise.all([
      db.contactInquiry.findMany({
        where: { createdAt: { lt: dayAgo } },
        orderBy: { createdAt: "asc" },
        take: 20,
        select: { id: true, company: true, name: true, createdAt: true },
      }),
      db.ooHQuote.findMany({
        where: {
          status: { in: [OoHQuoteStatus.sent, OoHQuoteStatus.draft] },
          validUntil: { gte: now, lte: in3Days },
        },
        orderBy: { validUntil: "asc" },
        take: 20,
        select: { id: true, clientCompany: true, clientName: true, validUntil: true },
      }),
      db.campaign.findMany({
        where: {
          startDate: { not: null },
          status: {
            in: [
              CampaignStatus.proposal,
              CampaignStatus.negotiation,
              CampaignStatus.contract,
            ],
          },
        },
        orderBy: { startDate: "asc" },
        take: 50,
        select: { id: true, name: true, startDate: true },
      }),
      db.mediaApplication.count({
        where: { status: MediaApplicationStatus.PENDING },
      }),
    ]);

  const campaignsFiltered = campaignsStartingSoon.filter((c) => {
    if (!c.startDate) return false;
    const ymd = c.startDate.toISOString().slice(0, 10);
    return ymd === tomorrowYmd;
  });

  return {
    staleInquiries: staleInquiries.map((i) => ({
      id: i.id,
      company: i.company,
      name: i.name,
      createdAt: i.createdAt.toISOString(),
    })),
    expiringQuotes: expiringQuotes.map((q) => ({
      id: q.id,
      company: q.clientCompany ?? q.clientName,
      validUntil: q.validUntil?.toISOString() ?? null,
    })),
    campaignsStartingSoon: campaignsFiltered.slice(0, 20).map((c) => ({
      id: c.id,
      name: c.name,
      startDate: c.startDate?.toISOString() ?? null,
    })),
    pendingMediaApplications,
  };
}

export async function loadMonitoringDashboard(
  period: MonitoringPeriod = "week",
): Promise<MonitoringDashboardData> {
  const system = await loadSystemHealth();

  if (!isDatabaseConfigured()) {
    return {
      configured: false,
      period,
      visitors: {
        activeNow: 0,
        today: 0,
        week: 0,
        month: 0,
        topPages: [],
      },
      funnel: {
        visit: 0,
        mediaView: 0,
        favorite: 0,
        quoteRequest: 0,
        contract: 0,
        rates: {
          visitToMediaView: 0,
          mediaViewToFavorite: 0,
          favoriteToQuote: 0,
          quoteToContract: 0,
        },
      },
      mediaRankings: { views: [], favorites: [], conversion: [] },
      alerts: await loadAlerts(),
      system,
    };
  }

  const now = new Date();
  const since = periodStart(period, now);
  const todayStart = seoulDayStartUtc(now);
  const weekStart = new Date(now.getTime() - 7 * 86400000);
  const monthStart = new Date(now.getTime() - 30 * 86400000);

  const [
    activeNow,
    todayVisitors,
    weekVisitors,
    monthVisitors,
    topPages,
    visit,
    mediaView,
    favorite,
    quoteRequest,
    contract,
    viewRankRaw,
    favRankRaw,
    alerts,
  ] = await Promise.all([
    countActiveSessions(now),
    countDistinctSessionsSince(todayStart),
    countDistinctSessionsSince(weekStart),
    countDistinctSessionsSince(monthStart),
    topPagesSince(since, 10),
    countConversionsSince("visit", since),
    countConversionsSince("media_view", since),
    countConversionsSince("favorite", since),
    countConversionsSince("quote_request", since),
    countContractsSince(since),
    mediaEventCounts("media_view", since, 10),
    mediaEventCounts("favorite", since, 10),
    loadAlerts(now),
  ]);

  const mediaIds = [
    ...new Set([
      ...viewRankRaw.map((r) => r.mediaId),
      ...favRankRaw.map((r) => r.mediaId),
    ]),
  ];
  const names = await resolveMediaNames(mediaIds);

  const inquiryByMedia = await mediaEventCounts("quote_request", since, 50);
  const inquiryMap = new Map(inquiryByMedia.map((r) => [r.mediaId, r.count]));
  const viewMap = new Map(viewRankRaw.map((r) => [r.mediaId, r.count]));

  const conversionRank = [...viewMap.entries()]
    .map(([mediaId, views]) => {
      const inquiries = inquiryMap.get(mediaId) ?? 0;
      return {
        mediaId,
        name: names[mediaId] ?? mediaId,
        views,
        inquiries,
        rate: pct(inquiries, views),
      };
    })
    .filter((r) => r.views > 0)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 10);

  return {
    configured: true,
    period,
    visitors: {
      activeNow,
      today: todayVisitors,
      week: weekVisitors,
      month: monthVisitors,
      topPages,
    },
    funnel: {
      visit,
      mediaView,
      favorite,
      quoteRequest,
      contract,
      rates: {
        visitToMediaView: pct(mediaView, visit),
        mediaViewToFavorite: pct(favorite, mediaView),
        favoriteToQuote: pct(quoteRequest, favorite),
        quoteToContract: pct(contract, quoteRequest),
      },
    },
    mediaRankings: {
      views: viewRankRaw.map((r) => ({
        mediaId: r.mediaId,
        name: names[r.mediaId] ?? r.mediaId,
        count: r.count,
      })),
      favorites: favRankRaw.map((r) => ({
        mediaId: r.mediaId,
        name: names[r.mediaId] ?? r.mediaId,
        count: r.count,
      })),
      conversion: conversionRank,
    },
    alerts,
    system,
  };
}

/** 일일 Slack 리포트용 집계 */
export async function loadDailyOpsMetrics(now = new Date()) {
  const yesterdayStart = new Date(seoulDayStartUtc(now).getTime() - 86400000);
  const yesterdayEnd = seoulDayStartUtc(now);

  if (!isDatabaseConfigured()) {
    return {
      configured: false,
      visitors: 0,
      newInquiries: 0,
      newUsers: 0,
      activeCampaigns: 0,
    };
  }

  const db = getPrisma();

  const [visitors, newInquiries, newUsers, activeCampaigns] = await Promise.all([
    countDistinctSessionsInRange(yesterdayStart, yesterdayEnd),
    db.contactInquiry.count({
      where: {
        createdAt: { gte: yesterdayStart, lt: yesterdayEnd },
      },
    }),
    db.user.count({
      where: {
        createdAt: { gte: yesterdayStart, lt: yesterdayEnd },
      },
    }),
    db.campaign.count({
      where: {
        status: {
          in: [
            CampaignStatus.contract,
            CampaignStatus.production,
            CampaignStatus.airing,
          ],
        },
      },
    }),
  ]);

  return {
    configured: true,
    visitors,
    newInquiries,
    newUsers,
    activeCampaigns,
  };
}
