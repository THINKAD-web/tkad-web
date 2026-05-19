import type {
  OnboardingBudgetRange,
  OnboardingIndustry,
  OnboardingRole,
  UserPreferenceDto,
} from "@/lib/onboarding-types";
import { needsIndustrySteps } from "@/lib/onboarding-types";

export function profileCompletionPercent(pref: UserPreferenceDto | null): number {
  if (!pref) return 0;
  if (pref.onboardingCompletedAt) return 100;

  let pct = 0;
  if (pref.onboardingRole) pct += 25;

  if (needsIndustrySteps(pref.onboardingRole)) {
    if (pref.industries.length > 0) pct += 25;
    if (pref.budgetRange) pct += 25;
  } else if (pref.onboardingRole) {
    pct += 50;
  }

  return Math.min(pct, 75);
}

export function shouldShowOnboardingBar(pref: UserPreferenceDto | null): boolean {
  if (!pref) return true;
  return !pref.onboardingCompletedAt;
}

export type PreferenceRow = {
  onboardingRole: string | null;
  industries: string[];
  budgetRange: string | null;
  onboardingCompletedAt: Date | null;
};

export function rowToDto(row: PreferenceRow): UserPreferenceDto {
  return {
    onboardingRole: row.onboardingRole as OnboardingRole | null,
    industries: row.industries.filter(Boolean) as OnboardingIndustry[],
    budgetRange: row.budgetRange as OnboardingBudgetRange | null,
    onboardingCompletedAt: row.onboardingCompletedAt?.toISOString() ?? null,
  };
}
