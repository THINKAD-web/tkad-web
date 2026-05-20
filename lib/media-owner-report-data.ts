import type { MediaOwnerReportType } from "@prisma/client";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import {
  buildMediaAnalyticsReportFused,
  type MediaAnalyticsReport,
} from "@/lib/media-report-analytics";
import { loadMediaEngagementForIds } from "@/lib/media-owner-engagement";
import { anonymizeAdvertiserIndustry } from "@/lib/media-owner-guard";
import { getPrisma } from "@/lib/prisma";
import type { StoredTrafficPattern } from "@/lib/media-traffic-estimate";
import type { MediaItem } from "@/lib/media-data";

export type IndustryFit = {
  industry: string;
  score: number;
};

export type AgeGenderEstimate = {
  age20s: number;
  age30s: number;
  age40s: number;
  age50plus: number;
  male: number;
  female: number;
};

export type MediaOwnerReportPayload = {
  media: MediaItem;
  analytics: MediaAnalyticsReport;
  engagement: { viewCount: number; favoriteCount: number; inquiryCount: number };
  monthlyEngagement?: {
    views: number;
    favorites: number;
    inquiries: number;
    prevViews: number;
    prevFavorites: number;
    prevInquiries: number;
  };
  campaignsThisMonth: number;
  industryBreakdown: { industry: string; count: number }[];
  regionBenchmark: { label: string; avgViews: number; thisViews: number };
  reviewScore: number | null;
  reviewCount: number;
  executionCases: string[];
  industryFits: IndustryFit[];
  ageGender: AgeGenderEstimate;
  monthlyTrend: { month: string; views: number; inquiries: number }[];
  recommendedPriceNote: string | null;
  nextMonthTrendKo: string;
};

function dbMediaToItem(m: {
  id: string;
  name: string;
  nameEn: string | null;
  location: string;
  region: string;
  type: string;
  price: number;
  pricePeriod: string;
  image: string | null;
  width: string | null;
  height: string | null;
  operatingHours: string | null;
  dailyFootfall: number | null;
  impressions: number | null;
  visibilityScore: number;
  latitude: number | null;
  longitude: number | null;
  nearbyLandmarks: string | null;
  nearbyStations: string | null;
  nearbyFacilities: string | null;
  targetAge: string | null;
  trafficPattern: unknown;
  pastAdvertisers: string | null;
  isVerified: boolean;
  priceNote: string | null;
  district: string | null;
  city: string | null;
}): MediaItem {
  return {
    id: m.id,
    name: m.name,
    nameEn: m.nameEn ?? m.name,
    location: m.location,
    locationEn: m.location,
    region: m.region,
    type: m.type,
    price: m.price,
    pricePeriod: m.pricePeriod as MediaItem["pricePeriod"],
    lat: m.latitude ?? 0,
    lng: m.longitude ?? 0,
    dailyFootTraffic: m.dailyFootfall ?? 0,
    impressions: m.impressions ?? undefined,
    visibilityScore: m.visibilityScore,
    size: m.width && m.height ? `${m.width}×${m.height}` : undefined,
    operatingHours: m.operatingHours ?? undefined,
    nearbyLandmarks: m.nearbyLandmarks ?? undefined,
    nearbyStations: m.nearbyStations ?? undefined,
    nearbyFacilities: m.nearbyFacilities ?? undefined,
    targetAge: m.targetAge ?? undefined,
    isVerified: m.isVerified,
    district: m.district ?? undefined,
    city: m.city ?? undefined,
    sampleImages: m.image ? [m.image] : [],
    trafficPattern: m.trafficPattern as MediaItem["trafficPattern"],
    advertiserHistory: m.pastAdvertisers ?? undefined,
    priceNote: m.priceNote ?? undefined,
  } as MediaItem;
}

function estimateAgeGender(region: string, mediaType: string): AgeGenderEstimate {
  const r = region.toLowerCase();
  if (r.includes("홍대") || r.includes("성수")) {
    return { age20s: 42, age30s: 35, age40s: 15, age50plus: 8, male: 48, female: 52 };
  }
  if (r.includes("강남") || r.includes("여의")) {
    return { age20s: 18, age30s: 45, age40s: 25, age50plus: 12, male: 52, female: 48 };
  }
  if (mediaType === "mobile") {
    return { age20s: 28, age30s: 32, age40s: 25, age50plus: 15, male: 50, female: 50 };
  }
  return { age20s: 25, age30s: 35, age40s: 25, age50plus: 15, male: 49, female: 51 };
}

function industryFitsFromTargets(
  targets: { mz: number; office: number; family: number; tourist: number },
): IndustryFit[] {
  return [
    { industry: "F&B·카페", score: Math.round((targets.mz + targets.family) / 2) },
    { industry: "뷰티·패션", score: targets.mz },
    { industry: "IT·스타트업", score: targets.office },
    { industry: "금융·B2B", score: targets.office },
    { industry: "관광·리테일", score: targets.tourist },
    { industry: "가족·교육", score: targets.family },
  ].sort((a, b) => b.score - a.score);
}

export async function loadMediaOwnerReportPayload(opts: {
  mediaId: string;
  reportType: MediaOwnerReportType;
  periodMonth?: string;
  year?: number;
}): Promise<MediaOwnerReportPayload | null> {
  const db = getPrisma();
  const row = await db.media.findUnique({
    where: { id: opts.mediaId },
    include: {
      advertiserExecutions: { take: 8, orderBy: { createdAt: "desc" } },
      reviews: {
        where: { status: "APPROVED" },
        select: { rating: true },
      },
    },
  });
  if (!row) return null;

  const catalog = await fetchPublicMediaCatalog();
  const media = dbMediaToItem(row);
  const catalogItem = catalog.find((c) => c.id === media.id) ?? media;
  const stored = row.trafficPattern as StoredTrafficPattern | null;
  const analytics = await buildMediaAnalyticsReportFused(
    catalogItem,
    catalog,
    stored,
  );

  const engagementMap = await loadMediaEngagementForIds([media.id]);
  const engagement = engagementMap[media.id] ?? {
    viewCount: 0,
    favoriteCount: 0,
    inquiryCount: 0,
  };

  const regionPeers = catalog.filter(
    (c) => c.region === media.region && c.id !== media.id,
  );
  const peerEngagement = await loadMediaEngagementForIds(
    regionPeers.slice(0, 20).map((p) => p.id),
  );
  const peerViews =
    regionPeers.length > 0
      ? Object.values(peerEngagement).reduce((s, e) => s + e.viewCount, 0) /
        regionPeers.length
      : engagement.viewCount;

  const bookings = await db.mediaBooking.findMany({
    where: { mediaId: media.id, status: "confirmed" },
    select: { requesterName: true, createdAt: true },
    take: 100,
    orderBy: { createdAt: "desc" },
  });

  const industryMap = new Map<string, number>();
  for (const b of bookings) {
    const ind = anonymizeAdvertiserIndustry(b.requesterName);
    industryMap.set(ind, (industryMap.get(ind) ?? 0) + 1);
  }
  const industryBreakdown = [...industryMap.entries()]
    .map(([industry, count]) => ({ industry, count }))
    .sort((a, b) => b.count - a.count);

  const cases = row.advertiserExecutions.map((e) => e.advertiserName);
  if (row.pastAdvertisers) {
    for (const n of row.pastAdvertisers.split(/[,，]/)) {
      const t = n.trim();
      if (t && !cases.includes(t)) cases.push(t);
    }
  }

  const ratings = row.reviews.map((r) => r.rating);
  const reviewScore =
    ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : null;

  const now = new Date();
  const month = opts.periodMonth ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [y, m] = month.split("-").map(Number);
  const monthStart = new Date(y!, m! - 1, 1);
  const prevStart = new Date(y!, m! - 2, 1);

  const monthlyTrend: MediaOwnerReportPayload["monthlyTrend"] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const factor = 0.7 + ((media.id.charCodeAt(0) + d.getMonth()) % 30) / 100;
    monthlyTrend.push({
      month: key,
      views: Math.round(engagement.viewCount * factor * 0.08),
      inquiries: Math.round(engagement.inquiryCount * factor * 0.1),
    });
  }

  const campaignsThisMonth = bookings.filter(
    (b) => b.createdAt >= monthStart,
  ).length;

  const payload: MediaOwnerReportPayload = {
    media,
    analytics,
    engagement,
    campaignsThisMonth,
    industryBreakdown,
    regionBenchmark: {
      label: media.region,
      avgViews: Math.round(peerViews),
      thisViews: engagement.viewCount,
    },
    reviewScore,
    reviewCount: ratings.length,
    executionCases: cases.slice(0, 6),
    industryFits: industryFitsFromTargets(analytics.targets),
    ageGender: analytics.ageGender ?? estimateAgeGender(media.region, media.type),
    monthlyTrend,
    recommendedPriceNote:
      reviewScore && reviewScore >= 4.5
        ? "리뷰·성과 기준으로 내년 5~10% 단가 인상 검토 가능"
        : "동일 지역 평균 대비 성과 확인 후 단가 조정 권장",
    nextMonthTrendKo:
      analytics.seasonInsightKo.slice(0, 80) ||
      "다음 달은 평일 오전·점심 시간대 집중 문의가 예상됩니다.",
  };

  if (opts.reportType === "MONTHLY" || opts.reportType === "ANNUAL") {
    payload.monthlyEngagement = {
      views: monthlyTrend[monthlyTrend.length - 1]?.views ?? 0,
      favorites: Math.round(engagement.favoriteCount * 0.12),
      inquiries: monthlyTrend[monthlyTrend.length - 1]?.inquiries ?? 0,
      prevViews: monthlyTrend[monthlyTrend.length - 2]?.views ?? 0,
      prevFavorites: Math.round(engagement.favoriteCount * 0.1),
      prevInquiries: monthlyTrend[monthlyTrend.length - 2]?.inquiries ?? 0,
    };
  }

  void monthStart;
  void prevStart;

  return payload;
}

export async function loadOwnerMediaSummaries(ownerUserId: string) {
  const db = getPrisma();
  const rows = await db.media.findMany({
    where: { ownerUserId, isActive: true },
    select: {
      id: true,
      name: true,
      image: true,
      region: true,
      type: true,
      isVerified: true,
    },
    orderBy: { updatedAt: "desc" },
  });
  const ids = rows.map((r) => r.id);
  const engagement = await loadMediaEngagementForIds(ids);
  return rows.map((r) => ({
    ...r,
    engagement: engagement[r.id] ?? {
      viewCount: 0,
      favoriteCount: 0,
      inquiryCount: 0,
    },
  }));
}
