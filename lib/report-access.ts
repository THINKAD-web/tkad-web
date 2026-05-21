import type { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";
import type { ReportAccessLevel } from "@prisma/client";
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

export type { AccessCheckResult, ReportFeature } from "@/lib/report-access-shared";
export {
  PRO_MONTHLY_KRW,
  PRO_TRIAL_DAYS,
  FREE_PLANNER_PDF_LIMIT,
  rankLevel,
  featureLabel,
} from "@/lib/report-access-shared";

const FEATURE_MIN_LEVEL: Record<ReportFeature, ReportAccessLevel> = {
  media_spec: "MEMBER",
  planner_result: "MEMBER",
  detail_data: "PRO",
  planner_pdf: "PRO",
  competitor: "PRO",
  simulation_full: "PRO",
  market_dashboard: "PRO",
  api: "ENTERPRISE",
  whitelabel: "ENTERPRISE",
};

export function resolveLevelFromPlan(
  plan: SubscriptionPlan,
  status: SubscriptionStatus,
  trialEndsAt: Date | null,
  proTrialEndsAt: Date | null,
): ReportAccessLevel {
  const now = Date.now();
  if (plan === "ENTERPRISE" && status === "ACTIVE") return "ENTERPRISE";
  if (plan === "PRO" && (status === "ACTIVE" || status === "TRIALING")) {
    if (trialEndsAt && trialEndsAt.getTime() < now) return "MEMBER";
    return "PRO";
  }
  if (proTrialEndsAt && proTrialEndsAt.getTime() > now) return "PRO";
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
      if (user.proTrialEndsAt && user.proTrialEndsAt.getTime() > Date.now()) {
        return "PRO";
      }
      return "MEMBER";
    }

    return resolveLevelFromPlan(
      sub.plan,
      sub.status,
      sub.trialEndsAt,
      user.proTrialEndsAt,
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
          select: { proTrialEndsAt: true },
        });
        if (user?.proTrialEndsAt) {
          const ms = user.proTrialEndsAt.getTime() - Date.now();
          if (ms > 0) trialDaysLeft = Math.ceil(ms / (86400 * 1000));
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
  if (!isDatabaseConfigured()) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { proTrialEndsAt: true, createdAt: true },
  });
  if (!user || user.proTrialEndsAt) return;

  const trialEnds = new Date(user.createdAt);
  trialEnds.setDate(trialEnds.getDate() + PRO_TRIAL_DAYS);

  await prisma.user.update({
    where: { id: userId },
    data: { proTrialEndsAt: trialEnds },
  });
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
