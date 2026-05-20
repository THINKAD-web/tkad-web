import type { MediaOwnerTier } from "@prisma/client";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { isMissingContentTableError } from "@/lib/prisma-content-guards";

/** 누적 계약 금액(만원) 기준 등급 */
export function tierFromCumulativeWon(manwon: number): MediaOwnerTier {
  if (manwon >= 50_000) return "GOLD";
  if (manwon >= 10_000) return "SILVER";
  return "BRONZE";
}

export const TIER_RANK: Record<MediaOwnerTier, number> = {
  BRONZE: 0,
  SILVER: 1,
  GOLD: 2,
};

export function tierLabel(tier: MediaOwnerTier, isKo = true): string {
  const labels: Record<MediaOwnerTier, { ko: string; en: string }> = {
    BRONZE: { ko: "Bronze", en: "Bronze" },
    SILVER: { ko: "Silver", en: "Silver" },
    GOLD: { ko: "Gold", en: "Gold" },
  };
  return isKo ? labels[tier].ko : labels[tier].en;
}

export async function ensureMediaOwnerStats(
  ownerUserId: string,
): Promise<{ tier: MediaOwnerTier; registrationFeeWaived: boolean } | null> {
  if (!isDatabaseConfigured()) return null;
  const db = getPrisma();
  try {
    const row = await db.mediaOwnerStats.upsert({
      where: { ownerUserId },
      create: { ownerUserId },
      update: {},
      select: { tier: true, registrationFeeWaived: true },
    });
    return row;
  } catch (e) {
    if (isMissingContentTableError(e)) return null;
    throw e;
  }
}

/** 첫 비딩 성공 시 등록비 면제 */
export async function applyFirstBidSuccessIncentive(
  ownerUserId: string,
): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const db = getPrisma();
  try {
    const stats = await db.mediaOwnerStats.findUnique({
      where: { ownerUserId },
    });
    if (!stats) {
      await db.mediaOwnerStats.create({
        data: {
          ownerUserId,
          registrationFeeWaived: true,
          successfulBidCount: 1,
        },
      });
      return;
    }
    if (stats.registrationFeeWaived && stats.successfulBidCount > 0) {
      await db.mediaOwnerStats.update({
        where: { ownerUserId },
        data: { successfulBidCount: { increment: 1 } },
      });
      return;
    }
    await db.mediaOwnerStats.update({
      where: { ownerUserId },
      data: {
        registrationFeeWaived: true,
        successfulBidCount: { increment: 1 },
      },
    });
  } catch (e) {
    if (!isMissingContentTableError(e)) throw e;
  }
}

export async function recordContractWon(
  ownerUserId: string,
  amountManwon: number,
): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const db = getPrisma();
  try {
    const stats = await db.mediaOwnerStats.upsert({
      where: { ownerUserId },
      create: {
        ownerUserId,
        cumulativeContractWon: amountManwon,
        tier: tierFromCumulativeWon(amountManwon),
      },
      update: {
        cumulativeContractWon: { increment: amountManwon },
      },
    });
    const total = stats.cumulativeContractWon;
    await db.mediaOwnerStats.update({
      where: { ownerUserId },
      data: { tier: tierFromCumulativeWon(total) },
    });
  } catch (e) {
    if (!isMissingContentTableError(e)) throw e;
  }
}
