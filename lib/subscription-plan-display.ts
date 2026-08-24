import { isPro, trialDaysLeft, type PlanCheckUser } from "@/lib/plan-check-shared";

export type SubscriptionSummary = {
  plan: string;
  trialEndsAt: string | null;
  subscriptionEndDate: string | null;
  subscriptionPlan: string | null;
};

export type PlanDisplayInfo = {
  planLabel: string;
  expiryLabel: string | null;
  upgradeHref: string;
  upgradeLabelKo: string;
  upgradeLabelEn: string;
};

function formatDate(iso: string, isKo: boolean): string {
  return new Date(iso).toLocaleDateString(isKo ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function planDisplayLabel(plan: string, isKo: boolean): string {
  switch (plan) {
    case "PRO_TRIAL":
      return isKo ? "PRO (체험)" : "PRO (trial)";
    case "PRO":
      return "PRO";
    case "LITE":
      return "LITE";
    case "AGENCY":
      return "AGENCY";
    case "ENTERPRISE":
      return "ENTERPRISE";
    default:
      return "FREE";
  }
}

export function resolvePlanDisplayInfo(
  user: PlanCheckUser & { trialDaysLeft?: number },
  subscription: SubscriptionSummary | null,
  isKo: boolean,
): PlanDisplayInfo {
  const plan = user.plan ?? "FREE";
  const days = user.trialDaysLeft ?? trialDaysLeft(user);

  let expiryLabel: string | null = null;
  if (plan === "PRO_TRIAL" && user.trialEndsAt) {
    expiryLabel = isKo
      ? `체험 만료: ${formatDate(String(user.trialEndsAt), true)}${days != null && days > 0 ? ` (D-${days})` : ""}`
      : `Trial ends ${formatDate(String(user.trialEndsAt), false)}${days != null && days > 0 ? ` (${days}d left)` : ""}`;
  } else if (subscription?.subscriptionEndDate) {
    expiryLabel = isKo
      ? `구독 만료: ${formatDate(subscription.subscriptionEndDate, true)}`
      : `Renews / ends ${formatDate(subscription.subscriptionEndDate, false)}`;
  } else if (isPro(user) && user.trialEndsAt && plan !== "PRO_TRIAL") {
    expiryLabel = isKo
      ? `PRO 기간: ~${formatDate(String(user.trialEndsAt), true)}`
      : `PRO until ${formatDate(String(user.trialEndsAt), false)}`;
  }

  let upgradeHref = "/pricing#pro-upgrade";
  let upgradeLabelKo = "PRO 업그레이드";
  let upgradeLabelEn = "Upgrade to PRO";

  if (plan === "LITE") {
    upgradeHref = "/pricing#pro-upgrade";
    upgradeLabelKo = "PRO로 업그레이드";
    upgradeLabelEn = "Upgrade to PRO";
  } else if (plan === "PRO" || plan === "PRO_TRIAL") {
    upgradeHref = "/pricing#pro-upgrade";
    upgradeLabelKo = "PRO 기간 연장";
    upgradeLabelEn = "Extend PRO";
  } else if (plan === "AGENCY" || plan === "ENTERPRISE") {
    upgradeHref = "/pricing";
    upgradeLabelKo = "요금제 보기";
    upgradeLabelEn = "View plans";
  } else {
    upgradeHref = "/pricing#lite-upgrade";
    upgradeLabelKo = "LITE 시작하기";
    upgradeLabelEn = "Get LITE";
  }

  return {
    planLabel: planDisplayLabel(plan, isKo),
    expiryLabel,
    upgradeHref,
    upgradeLabelKo,
    upgradeLabelEn,
  };
}
