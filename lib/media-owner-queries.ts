import { MediaBookingStatus } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import {
  anonymizeAdvertiserIndustry,
  calcNetFromGross,
  getOwnedMediaIds,
} from "@/lib/media-owner-guard";
import { loadMediaEngagementForIds } from "@/lib/media-owner-engagement";

function monthStart(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function monthKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${m}`;
}

export async function getMediaOwnerDashboard(ownerUserId: string) {
  const db = getPrisma();
  const mediaIds = await getOwnedMediaIds(ownerUserId);
  const since = monthStart();

  if (mediaIds.length === 0) {
    return {
      mediaCount: 0,
      inquiriesThisMonth: 0,
      activeCampaigns: 0,
      cumulativeNetWon: 0,
    };
  }

  const [inquiriesFromBookings, quotes, activeBookings, confirmedBookings] =
    await Promise.all([
      db.mediaBooking.count({
        where: {
          mediaId: { in: mediaIds },
          status: MediaBookingStatus.requested,
          createdAt: { gte: since },
        },
      }),
      db.quoteRequest.findMany({
        where: { createdAt: { gte: since } },
        select: { mediaIds: true },
        take: 3000,
      }),
      db.mediaBooking.count({
        where: {
          mediaId: { in: mediaIds },
          status: { in: ["tentative", "confirmed"] },
          endsAt: { gte: new Date() },
        },
      }),
      db.mediaBooking.findMany({
        where: {
          mediaId: { in: mediaIds },
          status: MediaBookingStatus.confirmed,
        },
        select: { budgetWon: true },
      }),
    ]);

  let inquiriesFromQuotes = 0;
  const idSet = new Set(mediaIds);
  for (const q of quotes) {
    const ids = q.mediaIds
      .split(/[,\s\[\]"]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.some((id) => idSet.has(id))) inquiriesFromQuotes += 1;
  }

  const gross = confirmedBookings.reduce(
    (sum, b) => sum + (b.budgetWon ?? 0),
    0,
  );
  const { netWon } = calcNetFromGross(gross);

  return {
    mediaCount: mediaIds.length,
    inquiriesThisMonth: inquiriesFromBookings + inquiriesFromQuotes,
    activeCampaigns: activeBookings,
    cumulativeNetWon: netWon,
  };
}

export type MediaOwnerListItem = {
  id: string;
  name: string;
  region: string;
  type: string;
  price: number;
  portalStatus: "pending" | "active" | "inactive";
  isActive: boolean;
  availability: string;
  viewCount: number;
  favoriteCount: number;
  inquiryCount: number;
  applicationStatus: string | null;
};

export async function listOwnerMedia(
  ownerUserId: string,
): Promise<MediaOwnerListItem[]> {
  const db = getPrisma();
  const mediaRows = await db.media.findMany({
    where: { ownerUserId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      region: true,
      type: true,
      price: true,
      isActive: true,
      availability: true,
    },
  });

  const mediaIds = mediaRows.map((m) => m.id);
  const engagement = await loadMediaEngagementForIds(mediaIds);

  const apps = await db.mediaApplication.findMany({
    where: {
      OR: [
        { userId: ownerUserId },
        { createdMediaId: { in: mediaIds } },
      ],
    },
    select: { createdMediaId: true, status: true, mediaName: true },
  });
  const appByMedia = new Map(
    apps
      .filter((a) => a.createdMediaId)
      .map((a) => [a.createdMediaId!, a.status] as const),
  );

  return mediaRows.map((m) => {
    const appStatus = appByMedia.get(m.id) ?? null;
    let portalStatus: MediaOwnerListItem["portalStatus"] = "inactive";
    if (!m.isActive) portalStatus = "inactive";
    else if (appStatus === "PENDING" || appStatus === "REVIEWING") {
      portalStatus = "pending";
    } else portalStatus = "active";

    const stats = engagement[m.id] ?? {
      viewCount: 0,
      favoriteCount: 0,
      inquiryCount: 0,
    };

    return {
      id: m.id,
      name: m.name,
      region: m.region,
      type: m.type,
      price: m.price,
      portalStatus,
      isActive: m.isActive,
      availability: m.availability,
      viewCount: stats.viewCount,
      favoriteCount: stats.favoriteCount,
      inquiryCount: stats.inquiryCount,
      applicationStatus: appStatus,
    };
  });
}

export async function listOwnerCampaigns(ownerUserId: string) {
  const db = getPrisma();
  const mediaIds = await getOwnedMediaIds(ownerUserId);
  if (mediaIds.length === 0) return [];

  const bookings = await db.mediaBooking.findMany({
    where: {
      mediaId: { in: mediaIds },
      status: { in: ["tentative", "confirmed"] },
      isOwnerBlock: false,
    },
    orderBy: { startsAt: "desc" },
    include: {
      media: { select: { id: true, name: true } },
      campaign: {
        select: {
          id: true,
          name: true,
          clientCompany: true,
          status: true,
          actualImpressions: true,
          actualReach: true,
        },
      },
    },
  });

  const campaignIds = [
    ...new Set(bookings.map((b) => b.campaignId).filter(Boolean)),
  ] as string[];

  const proofCounts =
    campaignIds.length > 0
      ? await db.campaignProofPhoto.groupBy({
          by: ["campaignId"],
          where: { campaignId: { in: campaignIds } },
          _count: { _all: true },
        })
      : [];
  const proofMap = new Map(
    proofCounts.map((p) => [p.campaignId, p._count._all]),
  );

  return bookings.map((b) => {
    const campaignId = b.campaignId ?? b.id;
    return {
      bookingId: b.id,
      mediaId: b.media.id,
      mediaName: b.media.name,
      campaignId,
      campaignName: b.campaign?.name ?? b.title,
      industryLabel: b.campaign
        ? anonymizeAdvertiserIndustry(b.campaign.clientCompany)
        : "미공개",
      startsAt: b.startsAt.toISOString(),
      endsAt: b.endsAt.toISOString(),
      amountWon: b.budgetWon ?? 0,
      status: b.status,
      campaignStatus: b.campaign?.status ?? b.status,
      proofPhotoCount: b.campaignId
        ? (proofMap.get(b.campaignId) ?? 0)
        : 0,
      canUploadProof: Boolean(b.campaignId),
      actualImpressions: b.campaign?.actualImpressions ?? null,
      actualReach: b.campaign?.actualReach ?? null,
    };
  });
}

export async function syncOwnerSettlements(ownerUserId: string) {
  const db = getPrisma();
  const mediaIds = await getOwnedMediaIds(ownerUserId);
  if (mediaIds.length === 0) return;

  const confirmed = await db.mediaBooking.findMany({
    where: {
      mediaId: { in: mediaIds },
      status: MediaBookingStatus.confirmed,
      budgetWon: { not: null },
    },
    select: { budgetWon: true, startsAt: true },
  });

  const byMonth = new Map<string, number>();
  for (const b of confirmed) {
    const key = monthKey(b.startsAt);
    byMonth.set(key, (byMonth.get(key) ?? 0) + (b.budgetWon ?? 0));
  }

  for (const [periodMonth, grossWon] of byMonth) {
    const { feeWon, netWon } = calcNetFromGross(grossWon);
    await db.mediaOwnerSettlement.upsert({
      where: {
        ownerUserId_periodMonth: { ownerUserId, periodMonth },
      },
      create: {
        ownerUserId,
        periodMonth,
        grossWon,
        feeWon,
        netWon,
        status: "SCHEDULED",
      },
      update: {
        grossWon,
        feeWon,
        netWon,
      },
    });
  }
}

export async function listOwnerSettlements(ownerUserId: string) {
  await syncOwnerSettlements(ownerUserId);
  const db = getPrisma();
  return db.mediaOwnerSettlement.findMany({
    where: { ownerUserId },
    orderBy: { periodMonth: "desc" },
  });
}
