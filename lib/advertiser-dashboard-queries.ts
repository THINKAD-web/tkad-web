import type { CampaignStatus } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import {
  buildDailyImpressionSeries,
  classifyCampaignTab,
  estimateDailyImpressions,
  mediaTypeToMapType,
  sumImpressionsInMonth,
  type CampaignTab,
} from "@/lib/advertiser-campaign-metrics";
import { campaignAccessWhere } from "@/lib/advertiser-campaign-access";
import type { CampaignMapPin } from "@/lib/campaign-monitoring-mock";

const campaignInclude = {
  proofPhotos: { orderBy: { createdAt: "desc" as const }, take: 8 },
  mediaBookings: {
    include: {
      media: {
        select: {
          id: true,
          name: true,
          nameEn: true,
          type: true,
          location: true,
          image: true,
          latitude: true,
          longitude: true,
          impressions: true,
          dailyFootfall: true,
        },
      },
    },
  },
  financialDocs: {
    where: { status: "paid" as const },
    select: { amountKrw: true },
  },
} as const;

export async function fetchAdvertiserCampaigns(
  userId: string,
  email: string,
  tab?: CampaignTab,
) {
  const db = getPrisma();
  const rows = await db.campaign.findMany({
    where: campaignAccessWhere(userId, email),
    orderBy: { updatedAt: "desc" },
    include: campaignInclude,
  });

  const now = new Date();
  const mapped = rows.map((c) => {
    const dailyPerMedia = c.mediaBookings.reduce(
      (s, b) => s + estimateDailyImpressions(b.media ?? {}),
      0,
    );
    const series = buildDailyImpressionSeries({
      startDate: c.startDate,
      endDate: c.endDate,
      dailyTotal: dailyPerMedia,
    });
    const tabKey = classifyCampaignTab(
      c.status,
      c.startDate,
      c.endDate,
      now,
    );
    const thumb = c.proofPhotos[0]?.imageUrl ?? c.mediaBookings[0]?.media?.image ?? null;
    return {
      id: c.id,
      name: c.name,
      status: c.status,
      tab: tabKey,
      startDate: c.startDate?.toISOString().slice(0, 10) ?? null,
      endDate: c.endDate?.toISOString().slice(0, 10) ?? null,
      mediaNames: c.mediaBookings
        .map((b) => b.media?.name)
        .filter(Boolean) as string[],
      impressionsTotal: series.reduce((s, p) => s + p.impressions, 0),
      proofThumbUrl: thumb,
      proofCount: c.proofPhotos.length,
      reportReady: Boolean(c.reportGeneratedAt),
    };
  });

  if (tab) return mapped.filter((c) => c.tab === tab);
  return mapped;
}

export async function fetchAdvertiserDashboardSummary(
  userId: string,
  email: string,
) {
  const campaigns = await fetchAdvertiserCampaigns(userId, email);
  const now = new Date();
  const active = campaigns.filter((c) => c.tab === "active");

  let monthImpressions = 0;
  const db = getPrisma();
  const full = await db.campaign.findMany({
    where: campaignAccessWhere(userId, email),
    include: campaignInclude,
  });
  for (const c of full) {
    const dailyPerMedia = c.mediaBookings.reduce(
      (s, b) => s + estimateDailyImpressions(b.media ?? {}),
      0,
    );
    const series = buildDailyImpressionSeries({
      startDate: c.startDate,
      endDate: c.endDate,
      dailyTotal: dailyPerMedia,
    });
    monthImpressions += sumImpressionsInMonth(
      series,
      now.getFullYear(),
      now.getMonth() + 1,
    );
  }

  let totalSpend = 0;
  for (const c of full) {
    totalSpend += c.financialDocs.reduce(
      (s, d) => s + (d.amountKrw ?? 0),
      0,
    );
    if (!c.financialDocs.length && c.budgetMax) {
      totalSpend += c.budgetMax;
    }
  }

  const endDates = active
    .map((c) => c.endDate)
    .filter(Boolean)
    .map((d) => new Date(d!))
    .filter((d) => d >= now)
    .sort((a, b) => a.getTime() - b.getTime());

  return {
    activeCount: active.length,
    monthImpressions,
    totalSpendWon: totalSpend,
    nextEndDate: endDates[0]?.toISOString().slice(0, 10) ?? null,
  };
}

export async function fetchAdvertiserCampaignDetail(
  userId: string,
  email: string,
  campaignId: string,
) {
  const db = getPrisma();
  const c = await db.campaign.findFirst({
    where: { id: campaignId, ...campaignAccessWhere(userId, email) },
    include: {
      proofPhotos: { orderBy: { createdAt: "desc" } },
      mediaBookings: {
        include: {
          media: {
            select: {
              id: true,
              name: true,
              nameEn: true,
              type: true,
              location: true,
              image: true,
              latitude: true,
              longitude: true,
              impressions: true,
              dailyFootfall: true,
            },
          },
        },
      },
    },
  });
  if (!c) return null;

  const dailyPerMedia = c.mediaBookings.reduce(
    (s, b) => s + estimateDailyImpressions(b.media ?? {}),
    0,
  );
  const dailySeries = buildDailyImpressionSeries({
    startDate: c.startDate,
    endDate: c.endDate,
    dailyTotal: dailyPerMedia,
  });

  const pins: CampaignMapPin[] = [];
  let idx = 0;
  for (const b of c.mediaBookings) {
    const m = b.media;
    if (!m?.latitude || !m.longitude) continue;
    const mapType = mediaTypeToMapType(m.type);
    pins.push({
      id: m.id,
      projectId: c.id,
      lat: m.latitude,
      lng: m.longitude,
      fallbackX: 30 + (idx % 5) * 12,
      fallbackY: 40 + Math.floor(idx / 5) * 10,
      mediaType: mapType,
      spotNameKo: m.name,
      spotNameEn: m.nameEn || m.name,
      creativeCaptionKo: m.location,
      creativeCaptionEn: m.location,
      imageUrl: m.image ?? "",
      impressionsToday: dailyPerMedia,
      impressionsTotal: (m.impressions ?? dailyPerMedia * 30),
      lastUpdatedIso: new Date().toISOString(),
    });
    idx += 1;
  }

  return {
    id: c.id,
    name: c.name,
    status: c.status as CampaignStatus,
    startDate: c.startDate?.toISOString().slice(0, 10) ?? null,
    endDate: c.endDate?.toISOString().slice(0, 10) ?? null,
    clientCompany: c.clientCompany,
    dailySeries,
    impressionsTotal: dailySeries.reduce((s, p) => s + p.impressions, 0),
    proofPhotos: c.proofPhotos.map((p) => ({
      id: p.id,
      imageUrl: p.imageUrl,
      caption: p.caption,
    })),
    mapPins: pins,
    reportReady:
      Boolean(c.reportGeneratedAt) ||
      c.status === "completed" ||
      c.proofPhotos.length > 0,
    reportGeneratedAt: c.reportGeneratedAt?.toISOString() ?? null,
    mediaBookings: c.mediaBookings.map((b) => ({
      id: b.id,
      title: b.title,
      mediaName: b.media?.name ?? b.title,
      location: b.media?.location ?? "",
      startsAt: b.startsAt.toISOString().slice(0, 10),
      endsAt: b.endsAt.toISOString().slice(0, 10),
      status: b.status,
    })),
  };
}

export type AdvertiserNotificationItem = {
  id: string;
  type: "campaign_start" | "campaign_end" | "report_ready";
  title: string;
  body: string;
  campaignId?: string;
  dueDate?: string;
  createdAt: string;
};

export async function fetchAdvertiserNotifications(
  userId: string,
  email: string,
): Promise<AdvertiserNotificationItem[]> {
  const db = getPrisma();
  const rows = await db.campaign.findMany({
    where: campaignAccessWhere(userId, email),
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      reportGeneratedAt: true,
      status: true,
      updatedAt: true,
    },
  });

  const now = new Date();
  const items: AdvertiserNotificationItem[] = [];
  const msDay = 86400000;

  for (const c of rows) {
    if (c.startDate) {
      const start = new Date(c.startDate);
      const days = Math.ceil((start.getTime() - now.getTime()) / msDay);
      if (days >= 0 && days <= 7) {
        items.push({
          id: `start-${c.id}`,
          type: "campaign_start",
          title: `캠페인 시작 D-${days}`,
          body: c.name,
          campaignId: c.id,
          dueDate: start.toISOString().slice(0, 10),
          createdAt: c.updatedAt.toISOString(),
        });
      }
    }
    if (c.endDate) {
      const end = new Date(c.endDate);
      const days = Math.ceil((end.getTime() - now.getTime()) / msDay);
      if (days >= 0 && days <= 7) {
        items.push({
          id: `end-${c.id}`,
          type: "campaign_end",
          title: `캠페인 종료 D-${days}`,
          body: c.name,
          campaignId: c.id,
          dueDate: end.toISOString().slice(0, 10),
          createdAt: c.updatedAt.toISOString(),
        });
      }
    }
    if (c.reportGeneratedAt) {
      const gen = new Date(c.reportGeneratedAt);
      const daysSince = Math.floor((now.getTime() - gen.getTime()) / msDay);
      if (daysSince <= 14) {
        items.push({
          id: `report-${c.id}`,
          type: "report_ready",
          title: "성과 보고서가 준비되었습니다",
          body: c.name,
          campaignId: c.id,
          createdAt: c.reportGeneratedAt.toISOString(),
        });
      }
    }
  }

  return items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function fetchAdvertiserInquiries(email: string) {
  const db = getPrisma();
  const [contacts, quotes] = await Promise.all([
    db.contactInquiry.findMany({
      where: { email: { equals: email, mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    db.ooHQuote.findMany({
      where: { clientEmail: { equals: email, mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        status: true,
        createdAt: true,
        totalAmount: true,
        mediaIds: true,
      },
    }),
  ]);

  const items = [
    ...contacts.map((c) => ({
      id: c.id,
      kind: "contact" as const,
      date: c.createdAt.toISOString(),
      title: c.inquiryType ?? "문의",
      body: c.message.slice(0, 200),
      status: "received",
    })),
    ...quotes.map((q) => ({
      id: q.id,
      kind: "quote" as const,
      date: q.createdAt.toISOString(),
      title: `견적 (${q.mediaIds.length}개 매체)`,
      body: q.totalAmount
        ? `${q.totalAmount.toLocaleString("ko-KR")}원`
        : "견적 진행 중",
      status: q.status,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return items;
}
