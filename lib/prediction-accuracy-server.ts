import type { CampaignKpiBooking } from "@/lib/campaign-kpis";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  computeCampaignPredictionVariance,
  PLATFORM_ACCURACY_FALLBACK,
  type PlatformPredictionAccuracy,
  type PredictionVariance,
} from "@/lib/prediction-accuracy";

function accuracyFromVariances(variances: PredictionVariance[]): number {
  if (variances.length === 0) return PLATFORM_ACCURACY_FALLBACK.accuracyPct;
  const avgAbsError =
    variances.reduce((s, v) => s + Math.abs(v.variancePct), 0) /
    variances.length;
  return Math.max(60, Math.min(99, Math.round(100 - avgAbsError)));
}

/** 최근 완료 캠페인(인증 사진 보유) 기준 플랫폼 예측 정확도 */
export async function getPlatformPredictionAccuracy(): Promise<PlatformPredictionAccuracy> {
  if (!isDatabaseConfigured()) return { ...PLATFORM_ACCURACY_FALLBACK };

  const db = getPrisma();
  const campaigns = await db.campaign
    .findMany({
      where: {
        status: "completed",
        proofPhotos: { some: {} },
        mediaBookings: { some: { status: "confirmed" } },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        proofPhotos: { select: { id: true } },
        mediaBookings: {
          where: { status: "confirmed" },
          select: {
            startsAt: true,
            endsAt: true,
            media: {
              select: { dailyFootfall: true, impressions: true },
            },
          },
        },
      },
    })
    .catch(() => []);

  if (campaigns.length === 0) return { ...PLATFORM_ACCURACY_FALLBACK };

  const variances: PredictionVariance[] = [];
  for (const c of campaigns) {
    const bookings: CampaignKpiBooking[] = c.mediaBookings.map((b) => ({
      startsAt: b.startsAt,
      endsAt: b.endsAt,
      dailyFootTraffic: b.media?.dailyFootfall ?? null,
      impressions: b.media?.impressions ?? null,
    }));
    const v = computeCampaignPredictionVariance(
      bookings,
      c.proofPhotos.length,
    );
    if (v) variances.push(v);
  }

  if (variances.length === 0) return { ...PLATFORM_ACCURACY_FALLBACK };

  return {
    accuracyPct: accuracyFromVariances(variances),
    sampleSize: variances.length,
  };
}
