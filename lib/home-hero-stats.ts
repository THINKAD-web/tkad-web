import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

/**
 * 홈 히어로 노출 수가 DB에 없거나 합계가 0일 때 사용하는 보수적 플레이스홀더.
 * 실제 합계는 `Media.impressions` (활성 매체만) 합산으로 대체됩니다.
 */
const HERO_IMPRESSIONS_FALLBACK = 1_862_000;

export type HomeHeroInventorySnapshot = {
  /** 활성 매체의 `impressions` 필드 합(일 추정치). DB·데이터 없으면 FALLBACK */
  estimatedDailyImpressions: number;
  /** `isActive && isVerified` 매체 건수 */
  verifiedActiveMediaCount: number;
  impressionSource: "db_sum" | "fallback";
};

/**
 * 공개 홈 히어로용 — 집행 로그가 아니라 **카탈로그에 등록된 추정 일 노출** 합계.
 * 실시간 집행 실적이 아님을 UI 라벨로 명시합니다.
 */
export async function fetchHomeHeroInventoryStats(): Promise<HomeHeroInventorySnapshot> {
  if (!isDatabaseConfigured()) {
    return {
      estimatedDailyImpressions: HERO_IMPRESSIONS_FALLBACK,
      verifiedActiveMediaCount: 0,
      impressionSource: "fallback",
    };
  }

  try {
    const db = getPrisma();
    const [sumAgg, verifiedCount] = await Promise.all([
      db.media.aggregate({
        _sum: { impressions: true },
        where: {
          isActive: true,
          impressions: { not: null, gt: 0 },
        },
      }),
      db.media.count({
        where: { isActive: true, isVerified: true },
      }),
    ]);

    const summed = sumAgg._sum.impressions ?? 0;
    const estimatedDailyImpressions =
      summed > 0 ? summed : HERO_IMPRESSIONS_FALLBACK;

    return {
      estimatedDailyImpressions,
      verifiedActiveMediaCount: verifiedCount,
      impressionSource: summed > 0 ? "db_sum" : "fallback",
    };
  } catch (e) {
    console.error("[fetchHomeHeroInventoryStats]", e);
    return {
      estimatedDailyImpressions: HERO_IMPRESSIONS_FALLBACK,
      verifiedActiveMediaCount: 0,
      impressionSource: "fallback",
    };
  }
}
