import type { PointEventType, UserPlan } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/prisma";
import {
  POINT_COSTS,
  POINT_REWARDS,
  type RedeemType,
} from "@/lib/points-constants";

export { POINT_COSTS, POINT_REWARDS, type RedeemType } from "@/lib/points-constants";

const MS_DAY = 24 * 60 * 60 * 1000;
const POINT_EXPIRY_MONTHS = 12;

const REDEEM_EVENT: Record<RedeemType, PointEventType> = {
  PRO_DAY: "REDEEM_PRO_DAY",
  PRO_WEEK: "REDEEM_PRO_WEEK",
  PRO_MONTH: "REDEEM_PRO_MONTH",
  PDF_REPORT: "REDEEM_REPORT",
  MEDIA_DETAIL: "REDEEM_MEDIA_DETAIL",
};

const REDEEM_DAYS: Partial<Record<RedeemType, number>> = {
  PRO_DAY: 1,
  PRO_WEEK: 7,
  PRO_MONTH: 30,
};

export type PointAwardResult = {
  awarded: boolean;
  amount: number;
  balance: number;
  type: PointEventType;
  label: string;
};

export type PointRedeemResult = {
  ok: true;
  cost: number;
  balance: number;
  type: RedeemType;
  proEndsAt?: string;
};

function eventLabel(type: PointEventType): string {
  const labels: Record<PointEventType, string> = {
    SIGNUP: "회원가입",
    REVIEW_WRITE: "리뷰 작성",
    REVIEW_HELPFUL: "리뷰 도움됨",
    COMMUNITY_POST: "커뮤니티 글",
    COMMUNITY_COMMENT: "커뮤니티 댓글",
    REFERRAL: "친구 초대",
    MEDIA_REGISTER: "매체 등록",
    INQUIRY_SUBMIT: "문의 제출",
    DAILY_CHECK: "출석 체크",
    PLANNER_COMPLETE: "플래너 완성",
    REDEEM_PRO_DAY: "PRO 1일 교환",
    REDEEM_PRO_WEEK: "PRO 1주 교환",
    REDEEM_PRO_MONTH: "PRO 1개월 교환",
    REDEEM_REPORT: "PDF 보고서 교환",
    REDEEM_MEDIA_DETAIL: "매체 상세 열람",
    ADMIN_ADJUST: "관리자 조정",
    EXPIRED: "포인트 만료",
  };
  return labels[type] ?? type;
}

function expiryDate(from = new Date()): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + POINT_EXPIRY_MONTHS);
  return d;
}

async function ensureUserPoint(userId: string) {
  return prisma.userPoint.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

export async function hasAlreadyEarned(
  userId: string,
  type: PointEventType,
  refId?: string | null,
): Promise<boolean> {
  if (!isDatabaseConfigured()) return true;
  if (!refId) {
    const row = await prisma.pointTransaction.findFirst({
      where: { userId, type },
      select: { id: true },
    });
    return Boolean(row);
  }
  const row = await prisma.pointTransaction.findUnique({
    where: { userId_type_refId: { userId, type, refId } },
    select: { id: true },
  });
  return Boolean(row);
}

export async function getPointBalance(userId: string): Promise<number> {
  if (!isDatabaseConfigured()) return 0;
  const row = await prisma.userPoint.findUnique({
    where: { userId },
    select: { balance: true },
  });
  return row?.balance ?? 0;
}

export async function getPointSummary(userId: string) {
  if (!isDatabaseConfigured()) {
    return { balance: 0, totalEarned: 0, totalSpent: 0, expiringSoon: 0, monthEarned: 0, monthSpent: 0 };
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const soon = new Date(now.getTime() + 30 * MS_DAY);

  const [account, monthTx, expiringSoonAgg] = await Promise.all([
    prisma.userPoint.findUnique({
      where: { userId },
      select: { balance: true, totalEarned: true, totalSpent: true },
    }),
    prisma.pointTransaction.findMany({
      where: { userId, createdAt: { gte: monthStart } },
      select: { amount: true },
    }),
    prisma.pointTransaction.aggregate({
      where: {
        userId,
        amount: { gt: 0 },
        expiredAt: null,
        expiresAt: { lte: soon, gt: now },
      },
      _sum: { amount: true },
    }),
  ]);

  let monthEarned = 0;
  let monthSpent = 0;
  for (const tx of monthTx) {
    if (tx.amount > 0) monthEarned += tx.amount;
    else monthSpent += Math.abs(tx.amount);
  }

  return {
    balance: account?.balance ?? 0,
    totalEarned: account?.totalEarned ?? 0,
    totalSpent: account?.totalSpent ?? 0,
    expiringSoon: expiringSoonAgg._sum.amount ?? 0,
    monthEarned,
    monthSpent,
  };
}

export async function awardPoints(
  userId: string,
  type: PointEventType,
  refId?: string | null,
  opts?: { amountOverride?: number; description?: string },
): Promise<PointAwardResult> {
  const label = opts?.description ?? eventLabel(type);
  const defaultAmount =
    type in POINT_REWARDS
      ? POINT_REWARDS[type as keyof typeof POINT_REWARDS]
      : 0;
  const amount = opts?.amountOverride ?? defaultAmount;

  if (!isDatabaseConfigured() || amount <= 0) {
    return { awarded: false, amount: 0, balance: 0, type, label };
  }

  if (refId && (await hasAlreadyEarned(userId, type, refId))) {
    const balance = await getPointBalance(userId);
    return { awarded: false, amount: 0, balance, type, label };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (refId) {
        const dup = await tx.pointTransaction.findUnique({
          where: { userId_type_refId: { userId, type, refId } },
          select: { id: true },
        });
        if (dup) return null;
      }

      const account = await tx.userPoint.upsert({
        where: { userId },
        create: {
          userId,
          balance: amount,
          totalEarned: amount,
        },
        update: {
          balance: { increment: amount },
          totalEarned: { increment: amount },
        },
      });

      await tx.pointTransaction.create({
        data: {
          userId,
          type,
          amount,
          description: label,
          refId: refId ?? null,
          balanceAfter: account.balance,
          expiresAt: amount > 0 ? expiryDate() : null,
        },
      });

      return account.balance;
    });

    if (result == null) {
      const balance = await getPointBalance(userId);
      return { awarded: false, amount: 0, balance, type, label };
    }

    return { awarded: true, amount, balance: result, type, label };
  } catch (err) {
    console.error("[points] awardPoints", type, err);
    const balance = await getPointBalance(userId);
    return { awarded: false, amount: 0, balance, type, label };
  }
}

function kstDateKey(d = new Date()): string {
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

export async function awardDailyCheckIn(userId: string): Promise<{
  ok: boolean;
  alreadyChecked: boolean;
  daily?: PointAwardResult;
  streakBonus?: PointAwardResult;
  streakDays: number;
}> {
  const todayRef = kstDateKey();
  if (await hasAlreadyEarned(userId, "DAILY_CHECK", todayRef)) {
    const balance = await getPointBalance(userId);
    return {
      ok: false,
      alreadyChecked: true,
      streakDays: 0,
      daily: { awarded: false, amount: 0, balance, type: "DAILY_CHECK", label: eventLabel("DAILY_CHECK") },
    };
  }

  const daily = await awardPoints(userId, "DAILY_CHECK", todayRef);

  const streakDays = await getCheckInStreakDays(userId);
  let streakBonus: PointAwardResult | undefined;
  if (streakDays >= 7) {
    const bonusRef = `streak-7-${todayRef}`;
    streakBonus = await awardPoints(userId, "DAILY_CHECK", bonusRef, {
      amountOverride: 70,
      description: "7일 연속 출석 보너스",
    });
  }

  return { ok: true, alreadyChecked: false, daily, streakBonus, streakDays };
}

export async function getCheckInStreakDays(userId: string): Promise<number> {
  if (!isDatabaseConfigured()) return 0;
  const rows = await prisma.pointTransaction.findMany({
    where: {
      userId,
      type: "DAILY_CHECK",
      amount: POINT_REWARDS.DAILY_CHECK,
    },
    orderBy: { createdAt: "desc" },
    take: 7,
    select: { refId: true, createdAt: true },
  });

  let streak = 0;
  for (let i = 0; i < 7; i++) {
    const expected = kstDateKey(new Date(Date.now() - i * MS_DAY));
    const hit = rows.some((r) => r.refId === expected);
    if (!hit) break;
    streak += 1;
  }
  return streak;
}

export async function hasCheckedInToday(userId: string): Promise<boolean> {
  return hasAlreadyEarned(userId, "DAILY_CHECK", kstDateKey());
}

export async function redeemPoints(
  userId: string,
  type: RedeemType,
): Promise<PointRedeemResult | { ok: false; error: string; balance: number }> {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: "DB unavailable", balance: 0 };
  }

  const cost = POINT_COSTS[type];
  const eventType = REDEEM_EVENT[type];
  const account = await ensureUserPoint(userId);

  if (account.balance < cost) {
    return { ok: false, error: "포인트가 부족합니다.", balance: account.balance };
  }

  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.userPoint.findUniqueOrThrow({ where: { userId } });
    if (current.balance < cost) {
      throw new Error("INSUFFICIENT");
    }

    const updated = await tx.userPoint.update({
      where: { userId },
      data: {
        balance: { decrement: cost },
        totalSpent: { increment: cost },
      },
    });

    await tx.pointTransaction.create({
      data: {
        userId,
        type: eventType,
        amount: -cost,
        description: eventLabel(eventType),
        balanceAfter: updated.balance,
      },
    });

    let proEndsAt: Date | undefined;
    const proDays = REDEEM_DAYS[type];
    if (proDays) {
      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { plan: true, trialEndsAt: true, proTrialEndsAt: true },
      });
      const base = Math.max(
        Date.now(),
        user.trialEndsAt?.getTime() ?? 0,
        user.proTrialEndsAt?.getTime() ?? 0,
      );
      proEndsAt = new Date(base + proDays * MS_DAY);
      await tx.user.update({
        where: { id: userId },
        data: {
          plan: "PRO" as UserPlan,
          trialEndsAt: proEndsAt,
          proTrialEndsAt: proEndsAt,
        },
      });
    }

    if (type === "PDF_REPORT" || type === "MEDIA_DETAIL") {
      await tx.userPointCredit.create({
        data: {
          userId,
          creditType: type,
          remainingUses: 1,
          expiresAt: new Date(Date.now() + 30 * MS_DAY),
        },
      });
    }

    return { balance: updated.balance, proEndsAt };
  }).catch((err) => {
    if (err instanceof Error && err.message === "INSUFFICIENT") return null;
    throw err;
  });

  if (!result) {
    const balance = await getPointBalance(userId);
    return { ok: false, error: "포인트가 부족합니다.", balance };
  }

  return {
    ok: true,
    cost,
    balance: result.balance,
    type,
    proEndsAt: result.proEndsAt?.toISOString(),
  };
}

export async function listPointTransactions(
  userId: string,
  opts: { cursor?: string; limit?: number } = {},
) {
  const limit = Math.min(opts.limit ?? 20, 50);
  const rows = await prisma.pointTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(opts.cursor
      ? { cursor: { id: opts.cursor }, skip: 1 }
      : {}),
    select: {
      id: true,
      type: true,
      amount: true,
      description: true,
      balanceAfter: true,
      createdAt: true,
    },
  });

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  return {
    items: items.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
    nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null,
  };
}

export async function processReferralSignup(
  newUserId: string,
  referrerUserId: string,
): Promise<void> {
  if (!isDatabaseConfigured() || newUserId === referrerUserId) return;

  const referrer = await prisma.user.findUnique({
    where: { id: referrerUserId },
    select: { id: true, deletedAt: true },
  });
  if (!referrer || referrer.deletedAt) return;

  await prisma.user.update({
    where: { id: newUserId },
    data: { referredByUserId: referrerUserId },
  });

  void awardPoints(referrerUserId, "REFERRAL", newUserId);
  void awardPoints(newUserId, "SIGNUP", `referral-bonus-${newUserId}`, {
    amountOverride: 500,
    description: "친구 초대 가입 보너스",
  });
}

export async function getReferralStats(userId: string) {
  const [count, earnedAgg] = await Promise.all([
    prisma.user.count({ where: { referredByUserId: userId } }),
    prisma.pointTransaction.aggregate({
      where: { userId, type: "REFERRAL" },
      _sum: { amount: true },
    }),
  ]);
  return {
    inviteCount: count,
    totalEarned: earnedAgg._sum.amount ?? 0,
  };
}

export { eventLabel };
