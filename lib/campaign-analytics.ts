import type { CampaignStatus } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { campaignAccessWhere } from "@/lib/advertiser-campaign-access";
import {
  buildDailyImpressionSeries,
  estimateDailyImpressions,
} from "@/lib/advertiser-campaign-metrics";
import {
  computeCampaignKpis,
  type CampaignKpiBooking,
} from "@/lib/campaign-kpis";

export type CampaignAnalyticsDailyPoint = {
  date: string;
  impressions: number;
  isWeekend: boolean;
  weekdayImp: number | null;
  weekendImp: number | null;
};

export type CampaignAnalyticsMediaShare = {
  mediaId: string;
  name: string;
  location: string;
  impressions: number;
  sharePct: number;
};

export type CampaignAnalyticsRegionShare = {
  region: string;
  impressions: number;
  sharePct: number;
};

export type CampaignAnalyticsData = {
  id: string;
  name: string;
  status: CampaignStatus;
  startDate: string | null;
  endDate: string | null;
  clientCompany: string | null;
  kpis: {
    totalImpressions: number;
    reach: number;
    frequency: number;
    cpm: number | null;
  };
  dailySeries: CampaignAnalyticsDailyPoint[];
  mediaShares: CampaignAnalyticsMediaShare[];
  regionShares: CampaignAnalyticsRegionShare[];
  proofPhotos: { id: string; imageUrl: string; caption: string | null }[];
  totalSpendWon: number;
};

function diffDaysSafe(start: Date, end: Date): number {
  return Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / 86_400_000),
  );
}

function bookingImpressions(
  startsAt: Date,
  endsAt: Date,
  media: {
    impressions?: number | null;
    dailyFootfall?: number | null;
  } | null,
): number {
  const days = diffDaysSafe(startsAt, endsAt);
  const daily = estimateDailyImpressions(media ?? {});
  if (media?.impressions != null && media.impressions > 0) {
    return Math.round((media.impressions / 30) * days) || daily * days;
  }
  return daily * days;
}

function isWeekendDate(isoDate: string): boolean {
  const d = new Date(`${isoDate}T12:00:00`);
  const day = d.getDay();
  return day === 0 || day === 6;
}

function enrichDailySeries(
  series: { date: string; impressions: number }[],
): CampaignAnalyticsDailyPoint[] {
  return series.map((p) => {
    const isWeekend = isWeekendDate(p.date);
    return {
      ...p,
      isWeekend,
      weekdayImp: isWeekend ? null : p.impressions,
      weekendImp: isWeekend ? p.impressions : null,
    };
  });
}

function buildMediaShares(
  bookings: {
    media: {
      id: string;
      name: string;
      location: string;
      impressions: number | null;
      dailyFootfall: number | null;
    } | null;
    startsAt: Date;
    endsAt: Date;
  }[],
): CampaignAnalyticsMediaShare[] {
  const byMedia = new Map<
    string,
    { mediaId: string; name: string; location: string; impressions: number }
  >();

  for (const b of bookings) {
    if (!b.media) continue;
    const imp = bookingImpressions(b.startsAt, b.endsAt, b.media);
    const cur = byMedia.get(b.media.id);
    if (cur) {
      cur.impressions += imp;
    } else {
      byMedia.set(b.media.id, {
        mediaId: b.media.id,
        name: b.media.name,
        location: b.media.location,
        impressions: imp,
      });
    }
  }

  const rows = Array.from(byMedia.values()).sort(
    (a, b) => b.impressions - a.impressions,
  );
  const total = rows.reduce((s, r) => s + r.impressions, 0) || 1;
  return rows.map((r) => ({
    ...r,
    sharePct: Math.round((r.impressions / total) * 1000) / 10,
  }));
}

function buildRegionShares(
  mediaShares: CampaignAnalyticsMediaShare[],
  bookings: {
    media: { id: string; region: string | null } | null;
  }[],
): CampaignAnalyticsRegionShare[] {
  const mediaToRegion = new Map<string, string>();
  for (const b of bookings) {
    if (b.media?.id) {
      mediaToRegion.set(
        b.media.id,
        b.media.region?.trim() || "기타",
      );
    }
  }

  const byRegion = new Map<string, number>();
  for (const m of mediaShares) {
    const region = mediaToRegion.get(m.mediaId) ?? "기타";
    byRegion.set(region, (byRegion.get(region) ?? 0) + m.impressions);
  }

  const rows = Array.from(byRegion.entries())
    .map(([region, impressions]) => ({ region, impressions }))
    .sort((a, b) => b.impressions - a.impressions);

  const total = rows.reduce((s, r) => s + r.impressions, 0) || 1;
  return rows.map((r) => ({
    ...r,
    sharePct: Math.round((r.impressions / total) * 1000) / 10,
  }));
}

const campaignAnalyticsInclude = {
  proofPhotos: { orderBy: { createdAt: "desc" as const } },
  financialDocs: true,
  mediaBookings: {
    include: {
      media: {
        select: {
          id: true,
          name: true,
          location: true,
          region: true,
          impressions: true,
          dailyFootfall: true,
          visibilityScore: true,
          type: true,
        },
      },
    },
  },
} as const;

function mapCampaignToAnalytics(c: {
  id: string;
  name: string;
  status: CampaignStatus;
  startDate: Date | null;
  endDate: Date | null;
  clientCompany: string;
  proofPhotos: { id: string; imageUrl: string; caption: string | null }[];
  financialDocs: { amountKrw: number | null }[];
  mediaBookings: {
    startsAt: Date;
    endsAt: Date;
    media: {
      id: string;
      name: string;
      location: string;
      region: string | null;
      impressions: number | null;
      dailyFootfall: number | null;
      visibilityScore: number | null;
      type: string | null;
    } | null;
  }[];
}): CampaignAnalyticsData {
  const dailyPerMedia = c.mediaBookings.reduce(
    (s, b) => s + estimateDailyImpressions(b.media ?? {}),
    0,
  );
  const dailySeries = enrichDailySeries(
    buildDailyImpressionSeries({
      startDate: c.startDate,
      endDate: c.endDate,
      dailyTotal: dailyPerMedia,
    }),
  );

  const kpiBookings: CampaignKpiBooking[] = c.mediaBookings.map((b) => ({
    startsAt: b.startsAt,
    endsAt: b.endsAt,
    dailyFootTraffic: b.media?.dailyFootfall ?? null,
    impressions: b.media?.impressions ?? null,
    type: b.media?.type ?? null,
    region: b.media?.region ?? null,
    visibilityScore: b.media?.visibilityScore ?? null,
    location: b.media?.location ?? null,
  }));

  const { plannerKpis, totalAmountKrw } = computeCampaignKpis({
    mediaBookings: kpiBookings,
    financialDocs: c.financialDocs,
  });

  const mediaShares = buildMediaShares(c.mediaBookings);
  const regionShares = buildRegionShares(mediaShares, c.mediaBookings);

  const totalImpressions =
    plannerKpis?.totalImp ??
    dailySeries.reduce((s, p) => s + p.impressions, 0);

  return {
    id: c.id,
    name: c.name,
    status: c.status,
    startDate: c.startDate?.toISOString().slice(0, 10) ?? null,
    endDate: c.endDate?.toISOString().slice(0, 10) ?? null,
    clientCompany: c.clientCompany,
    kpis: {
      totalImpressions,
      reach: plannerKpis?.reach ?? 0,
      frequency: plannerKpis?.avgFrequency ?? 6,
      cpm: plannerKpis?.blendedCpm ?? null,
    },
    dailySeries,
    mediaShares,
    regionShares,
    proofPhotos: c.proofPhotos.map((p) => ({
      id: p.id,
      imageUrl: p.imageUrl,
      caption: p.caption,
    })),
    totalSpendWon: totalAmountKrw,
  };
}

/** 광고주 대시보드 — 본인 캠페인만 */
export async function fetchCampaignAnalyticsForUser(
  userId: string,
  email: string,
  campaignId: string,
): Promise<CampaignAnalyticsData | null> {
  const db = getPrisma();
  const c = await db.campaign.findFirst({
    where: { id: campaignId, ...campaignAccessWhere(userId, email) },
    include: campaignAnalyticsInclude,
  });
  if (!c) return null;
  return mapCampaignToAnalytics(c);
}

/** 어드민 — 캠페인 ID만으로 조회 */
export async function fetchCampaignAnalyticsById(
  campaignId: string,
): Promise<CampaignAnalyticsData | null> {
  const db = getPrisma();
  const c = await db.campaign.findUnique({
    where: { id: campaignId },
    include: campaignAnalyticsInclude,
  });
  if (!c) return null;
  return mapCampaignToAnalytics(c);
}
