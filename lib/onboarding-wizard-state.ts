import {
  isOnboardingBudgetRange,
  isOnboardingIndustry,
  isOnboardingRole,
  needsIndustrySteps,
  type OnboardingBudgetRange,
  type OnboardingIndustry,
  type OnboardingRole,
} from "@/lib/onboarding-types";

export type OnboardingInitialPreference = {
  onboardingRole: string | null;
  industries: string[];
  budgetRange: string | null;
};

export type WizardPhase = "prefs" | "preview";

export type OnboardingWizardInitialState = {
  phase: WizardPhase;
  role: OnboardingRole | null;
  industries: OnboardingIndustry[];
  budgetRange: OnboardingBudgetRange | null;
  roleLocked: boolean;
  totalSteps: number;
};

export function resolveOnboardingWizardInitialState(
  pref: OnboardingInitialPreference | null | undefined,
): OnboardingWizardInitialState {
  const role =
    pref?.onboardingRole && isOnboardingRole(pref.onboardingRole)
      ? pref.onboardingRole
      : null;
  const industries = (pref?.industries ?? []).filter(isOnboardingIndustry);
  const budgetRange =
    pref?.budgetRange && isOnboardingBudgetRange(pref.budgetRange)
      ? pref.budgetRange
      : null;

  if (role && !needsIndustrySteps(role)) {
    return {
      phase: "preview",
      role,
      industries: [],
      budgetRange: null,
      roleLocked: true,
      totalSteps: 1,
    };
  }

  if (role && needsIndustrySteps(role)) {
    return {
      phase: "prefs",
      role,
      industries,
      budgetRange,
      roleLocked: true,
      totalSteps: 2,
    };
  }

  return {
    phase: "prefs",
    role: null,
    industries: [],
    budgetRange: null,
    roleLocked: false,
    totalSteps: 2,
  };
}

export function wizardDisplayStep(
  phase: WizardPhase,
  totalSteps: number,
): number {
  if (totalSteps === 1) return 1;
  return phase === "preview" ? 2 : 1;
}

export function wizardProgressPct(
  phase: WizardPhase,
  totalSteps: number,
): number {
  if (totalSteps === 1) return phase === "preview" ? 100 : 50;
  return phase === "preview" ? 100 : 50;
}
