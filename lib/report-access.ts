import type { SubscriptionPlan, SubscriptionStatus, ReportAccessLevel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/prisma";
import {
  PRO_TRIAL_DAYS,
  FREE_PLANNER_PDF_LIMIT,
} from "@/lib/report-pricing-constants";
import {
  rankLevel,
  type AccessCheckResult,
  type ReportFeature,
} from "@/lib/report-access-shared";
import { FEATURE_MIN_LEVEL } from "@/lib/entitlements/features";
import {
  grantProTrialOnSignup,
  isPro,
  trialDaysLeft as getTrialDaysLeft,
} from "@/lib/check-plan";

export type { AccessCheckResult, ReportFeature } from "@/lib/report-access-shared";
export {
  PRO_MONTHLY_KRW,
  PRO_TRIAL_DAYS,
  FREE_PLANNER_PDF_LIMIT,
  rankLevel,
  featureLabel,
} from "@/lib/report-access-shared";

export function resolveLevelFromPlan(
  plan: SubscriptionPlan,
  status: SubscriptionStatus,
  trialEndsAt: Date | null,
  userPlan: { plan: string; trialEndsAt: Date | null; proTrialEndsAt: Date | null },
): ReportAccessLevel {
  const now = Date.now();
  const subActive = status === "ACTIVE" || status === "TRIALING";
  const subTrialOk = !trialEndsAt || trialEndsAt.getTime() >= now;

  if (plan === "ENTERPRISE" && status === "ACTIVE") return "ENTERPRISE";
  // AGENCY 기능 게이트 = PRO (팀 좌석은 별도)
  if (plan === "AGENCY" && subActive) {
    if (!subTrialOk) return "MEMBER";
    return "PRO";
  }
  if (plan === "PRO" && subActive) {
    if (!subTrialOk) return "MEMBER";
    return "PRO";
  }
  if (plan === "LITE" && subActive) {
    if (!subTrialOk) return "MEMBER";
    return "LITE";
  }
  if (userPlan.plan === "ENTERPRISE") return "ENTERPRISE";
  if (isPro(userPlan)) return "PRO";
  if (userPlan.plan === "LITE") return "LITE";
  if (plan === "FREE" || status === "EXPIRED" || status === "CANCELLED") {
    return "MEMBER";
  }
  return "MEMBER";
}

export async function getUserReportLevel(userId: string | null): Promise<ReportAccessLevel> {
  if (!userId) return "FREE";
  if (!isDatabaseConfigured()) return "MEMBER";

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        plan: true,
        trialEndsAt: true,
        proTrialEndsAt: true,
        subscriptions: {
          where: { status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { plan: true, status: true, trialEndsAt: true },
        },
      },
    });
    if (!user) return "FREE";

    const sub = user.subscriptions[0];
    if (!sub) {
      if (user.plan === "ENTERPRISE") return "ENTERPRISE";
      if (isPro(user)) return "PRO";
      if (user.plan === "LITE") return "LITE";
      return "MEMBER";
    }

    return resolveLevelFromPlan(
      sub.plan,
      sub.status,
      sub.trialEndsAt,
      user,
    );
  } catch {
    return "MEMBER";
  }
}

export async function checkReportAccess(
  userId: string | null,
  feature: ReportFeature,
): Promise<AccessCheckResult> {
  const minLevel = FEATURE_MIN_LEVEL[feature];
  const level = await getUserReportLevel(userId);

  if (rankLevel(level) >= rankLevel(minLevel)) {
    let trialDaysLeft: number | undefined;
    if (userId && isDatabaseConfigured()) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { plan: true, trialEndsAt: true, proTrialEndsAt: true },
        });
        if (user) {
          const days = getTrialDaysLeft(user);
          if (days != null && days > 0) trialDaysLeft = days;
        }
      } catch {
        /* schema drift — treat as allowed without trial metadata */
      }
    }
    return { allowed: true, level, trialDaysLeft };
  }

  if (!userId) {
    return { allowed: false, level: "FREE", reason: "login" };
  }

  if (minLevel === "ENTERPRISE") {
    return { allowed: false, level, reason: "enterprise" };
  }

  return { allowed: false, level, reason: "upgrade" };
}

/** 첫 가입 PRO 14일 체험 시작 */
export async function startProTrialIfEligible(userId: string): Promise<void> {
  await grantProTrialOnSignup(userId);
}

/** 플래너 PDF 1회 무료 (리드 수집 후) */
export async function consumeFreePlannerPdf(userId: string): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { freeReportDownloads: true, plannerLeadCaptured: true },
  });
  if (!user) return false;
  if (user.freeReportDownloads >= FREE_PLANNER_PDF_LIMIT) return false;

  await prisma.user.update({
    where: { id: userId },
    data: {
      freeReportDownloads: { increment: 1 },
      plannerLeadCaptured: true,
    },
  });
  return true;
}

export async function canUseFreePlannerPdf(userId: string): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { freeReportDownloads: true },
  });
  return (user?.freeReportDownloads ?? 0) < FREE_PLANNER_PDF_LIMIT;
}
