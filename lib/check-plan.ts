import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/prisma";
import { PRO_TRIAL_DAYS } from "@/lib/report-pricing-constants";

export type { PlanCheckUser } from "@/lib/plan-check-shared";
export { isPro, trialDaysLeft, trialProgressPct } from "@/lib/plan-check-shared";

const MS_DAY = 24 * 60 * 60 * 1000;

/** 신규 가입 시 PRO 14일 체험 부여 (이미 체험·유료 플랜이면 스킵) */
export async function grantProTrialOnSignup(userId: string): Promise<void> {
  if (!isDatabaseConfigured()) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      plan: true,
      trialEndsAt: true,
      proTrialEndsAt: true,
    },
  });
  if (!user) return;
  if (user.trialEndsAt || user.proTrialEndsAt) return;
  if (user.plan !== "FREE") return;

  const now = new Date();
  const trialEnds = new Date(now.getTime() + PRO_TRIAL_DAYS * MS_DAY);

  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: "PRO_TRIAL",
      trialStartedAt: now,
      trialEndsAt: trialEnds,
      proTrialEndsAt: trialEnds,
    },
  });
}

export function buildTrialGrantData(now = new Date()) {
  const trialEnds = new Date(now.getTime() + PRO_TRIAL_DAYS * MS_DAY);
  return {
    plan: "PRO_TRIAL" as const,
    trialStartedAt: now,
    trialEndsAt: trialEnds,
    proTrialEndsAt: trialEnds,
  };
}

/** 유료 PRO 구독 활성화 — 체험 필드 초기화 */
export async function activateProPlanForUser(userId: string): Promise<void> {
  if (!isDatabaseConfigured()) return;
  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: "PRO",
      trialStartedAt: null,
      trialEndsAt: null,
      proTrialEndsAt: null,
    },
  });
}

/** 구독 종료 시 FREE로 다운그레이드 (다른 활성 구독 없을 때만) */
export async function syncUserPlanAfterSubscriptionEnd(
  userId: string,
): Promise<void> {
  if (!isDatabaseConfigured()) return;

  const now = new Date();
  const activePaid = await prisma.subscription.findFirst({
    where: {
      userId,
      plan: { in: ["PRO", "ENTERPRISE"] },
      status: { in: ["ACTIVE", "TRIALING"] },
      OR: [{ endDate: null }, { endDate: { gt: now } }],
    },
    orderBy: { createdAt: "desc" },
    select: { plan: true },
  });

  if (activePaid?.plan === "ENTERPRISE") {
    await prisma.user.update({
      where: { id: userId },
      data: { plan: "ENTERPRISE" },
    });
    return;
  }
  if (activePaid?.plan === "PRO") {
    await activateProPlanForUser(userId);
    return;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { plan: "FREE" },
  });
}
