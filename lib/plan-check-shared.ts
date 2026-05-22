import { PRO_TRIAL_DAYS } from "@/lib/report-pricing-constants";

const MS_DAY = 24 * 60 * 60 * 1000;

export type PlanCheckUser = {
  plan: string;
  trialStartedAt?: Date | string | null;
  trialEndsAt?: Date | string | null;
  /** @deprecated legacy — prefer trialEndsAt + plan */
  proTrialEndsAt?: Date | string | null;
};

export function isPro(user: PlanCheckUser): boolean {
  if (user.plan === "PRO" || user.plan === "ENTERPRISE") return true;
  if (user.plan === "PRO_TRIAL") {
    const ends = user.trialEndsAt ?? user.proTrialEndsAt;
    if (!ends) return false;
    return Date.now() < new Date(ends).getTime();
  }
  if (user.proTrialEndsAt) {
    return Date.now() < new Date(user.proTrialEndsAt).getTime();
  }
  return false;
}

export function trialDaysLeft(user: PlanCheckUser): number | null {
  if (user.plan !== "PRO_TRIAL") return null;
  const ends = user.trialEndsAt ?? user.proTrialEndsAt;
  if (!ends) return null;
  const ms = new Date(ends).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / MS_DAY);
}

export function trialProgressPct(user: PlanCheckUser): number {
  if (user.plan !== "PRO_TRIAL") return 0;
  const started = user.trialStartedAt
    ? new Date(user.trialStartedAt).getTime()
    : null;
  const ends = user.trialEndsAt ?? user.proTrialEndsAt;
  if (!ends) return 0;
  const endMs = new Date(ends).getTime();
  const startMs = started ?? endMs - PRO_TRIAL_DAYS * MS_DAY;
  const total = endMs - startMs;
  if (total <= 0) return 100;
  const elapsed = Date.now() - startMs;
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}
