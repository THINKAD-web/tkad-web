export const ONBOARDING_ROLES = [
  "ADVERTISER",
  "AGENCY",
  "MEDIA",
  "BROWSER",
] as const;
export type OnboardingRole = (typeof ONBOARDING_ROLES)[number];

export const ONBOARDING_INDUSTRIES = [
  "beauty_fashion",
  "fnb",
  "tech",
  "finance",
  "entertainment",
  "other",
] as const;
export type OnboardingIndustry = (typeof ONBOARDING_INDUSTRIES)[number];

export const ONBOARDING_BUDGET_RANGES = [
  "under_500",
  "500_3000",
  "over_3000",
  "undecided",
] as const;
export type OnboardingBudgetRange = (typeof ONBOARDING_BUDGET_RANGES)[number];

export type UserPreferenceDto = {
  onboardingRole: OnboardingRole | null;
  industries: OnboardingIndustry[];
  budgetRange: OnboardingBudgetRange | null;
  onboardingCompletedAt: string | null;
};

export function needsIndustrySteps(role: OnboardingRole | null): boolean {
  return role === "ADVERTISER" || role === "AGENCY";
}

export function isOnboardingRole(v: string): v is OnboardingRole {
  return (ONBOARDING_ROLES as readonly string[]).includes(v);
}

export function isOnboardingIndustry(v: string): v is OnboardingIndustry {
  return (ONBOARDING_INDUSTRIES as readonly string[]).includes(v);
}

export function isOnboardingBudgetRange(v: string): v is OnboardingBudgetRange {
  return (ONBOARDING_BUDGET_RANGES as readonly string[]).includes(v);
}
