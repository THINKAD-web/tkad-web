import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/prisma";
import { eventLabel } from "@/lib/points";

export type PointsExpiryCronResult = {
  processed: number;
  expiredPoints: number;
  remindersSent: number;
};

export async function runPointsExpiryCron(now = new Date()): Promise<PointsExpiryCronResult> {
  if (!isDatabaseConfigured()) {
    return { processed: 0, expiredPoints: 0, remindersSent: 0 };
  }

  const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const expiringLots = await prisma.pointTransaction.findMany({
    where: {
      amount: { gt: 0 },
      expiredAt: null,
      expiresAt: { lte: now },
    },
    orderBy: { expiresAt: "asc" },
    take: 500,
    select: {
      id: true,
      userId: true,
      amount: true,
      expiresAt: true,
    },
  });

  let processed = 0;
  let expiredPoints = 0;

  for (const lot of expiringLots) {
    await prisma.$transaction(async (tx) => {
      const fresh = await tx.pointTransaction.findUnique({
        where: { id: lot.id },
        select: { expiredAt: true, amount: true },
      });
      if (!fresh || fresh.expiredAt) return;

      const account = await tx.userPoint.findUnique({
        where: { userId: lot.userId },
        select: { balance: true },
      });
      if (!account) return;

      const deduct = Math.min(fresh.amount, account.balance);
      if (deduct <= 0) {
        await tx.pointTransaction.update({
          where: { id: lot.id },
          data: { expiredAt: now },
        });
        return;
      }

      const updated = await tx.userPoint.update({
        where: { userId: lot.userId },
        data: { balance: { decrement: deduct } },
      });

      await tx.pointTransaction.update({
        where: { id: lot.id },
        data: { expiredAt: now },
      });

      await tx.pointTransaction.create({
        data: {
          userId: lot.userId,
          type: "EXPIRED",
          amount: -deduct,
          description: eventLabel("EXPIRED"),
          refId: lot.id,
          balanceAfter: updated.balance,
        },
      });

      processed += 1;
      expiredPoints += deduct;
    });
  }

  const reminderLots = await prisma.pointTransaction.findMany({
    where: {
      amount: { gt: 0 },
      expiredAt: null,
      expiresAt: { gt: now, lte: soon },
    },
    select: { userId: true, amount: true, expiresAt: true },
    take: 200,
  });

  let remindersSent = 0;
  for (const lot of reminderLots) {
    void import("@/lib/email/point-expiry-reminder")
      .then(({ sendPointExpiryReminderEmail }) =>
        sendPointExpiryReminderEmail({
          userId: lot.userId,
          points: lot.amount,
          expiresAt: lot.expiresAt!,
        }),
      )
      .then((sent) => {
        if (sent) remindersSent += 1;
      })
      .catch(() => {});
  }

  return { processed, expiredPoints, remindersSent };
}

export async function getAdminPointStats() {
  const [issued, spent, expired, balance] = await Promise.all([
    prisma.pointTransaction.aggregate({
      where: { amount: { gt: 0 }, type: { not: "ADMIN_ADJUST" } },
      _sum: { amount: true },
    }),
    prisma.pointTransaction.aggregate({
      where: {
        amount: { lt: 0 },
        type: {
          in: [
            "REDEEM_PRO_DAY",
            "REDEEM_PRO_WEEK",
            "REDEEM_PRO_MONTH",
            "REDEEM_REPORT",
            "REDEEM_MEDIA_DETAIL",
          ],
        },
      },
      _sum: { amount: true },
    }),
    prisma.pointTransaction.aggregate({
      where: { type: "EXPIRED" },
      _sum: { amount: true },
    }),
    prisma.userPoint.aggregate({ _sum: { balance: true } }),
  ]);

  return {
    totalIssued: issued._sum.amount ?? 0,
    totalRedeemed: Math.abs(spent._sum.amount ?? 0),
    totalExpired: Math.abs(expired._sum.amount ?? 0),
    circulatingBalance: balance._sum.balance ?? 0,
  };
}
