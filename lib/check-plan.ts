import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/prisma";
import { PRO_TRIAL_DAYS } from "@/lib/report-pricing-constants";

export type { PlanCheckUser } from "@/lib/plan-check-shared";
export {
  isPro,
  isLiteOrAbove,
  isAgencyOrAbove,
  userPlanToAccessLevel,
  teamSeatLimitForPlan,
  trialDaysLeft,
  trialProgressPct,
} from "@/lib/plan-check-shared";

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

function clearTrialFields() {
  return {
    trialStartedAt: null,
    trialEndsAt: null,
    proTrialEndsAt: null,
  };
}

/** 유료 PRO 구독 활성화 — 체험 필드 초기화 */
export async function activateProPlanForUser(userId: string): Promise<void> {
  if (!isDatabaseConfigured()) return;
  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: "PRO",
      ...clearTrialFields(),
    },
  });
}

/** 유료 LITE 구독 활성화 */
export async function activateLitePlanForUser(userId: string): Promise<void> {
  if (!isDatabaseConfigured()) return;
  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: "LITE",
      ...clearTrialFields(),
    },
  });
}

/** 유료 AGENCY 구독 활성화 (기능 게이트는 PRO와 동일) */
export async function activateAgencyPlanForUser(userId: string): Promise<void> {
  if (!isDatabaseConfigured()) return;
  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: "AGENCY",
      ...clearTrialFields(),
    },
  });
}

const PAID_SUBSCRIPTION_PLANS = ["LITE", "PRO", "AGENCY", "ENTERPRISE"] as const;

/** 구독 종료 시 잔여 활성 구독에 맞춰 User.plan 동기화 */
export async function syncUserPlanAfterSubscriptionEnd(
  userId: string,
): Promise<void> {
  if (!isDatabaseConfigured()) return;

  const now = new Date();
  const activePaid = await prisma.subscription.findFirst({
    where: {
      userId,
      plan: { in: [...PAID_SUBSCRIPTION_PLANS] },
      status: { in: ["ACTIVE", "TRIALING"] },
      OR: [{ endDate: null }, { endDate: { gt: now } }],
    },
    orderBy: { createdAt: "desc" },
    select: { plan: true },
  });

  if (activePaid?.plan === "ENTERPRISE") {
    await prisma.user.update({
      where: { id: userId },
      data: { plan: "ENTERPRISE", ...clearTrialFields() },
    });
    return;
  }
  if (activePaid?.plan === "AGENCY") {
    await activateAgencyPlanForUser(userId);
    return;
  }
  if (activePaid?.plan === "PRO") {
    await activateProPlanForUser(userId);
    return;
  }
  if (activePaid?.plan === "LITE") {
    await activateLitePlanForUser(userId);
    return;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { plan: "FREE" },
  });
}
