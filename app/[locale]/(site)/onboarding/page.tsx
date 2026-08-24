import { redirect } from "@/i18n/navigation";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { getCurrentUser } from "@/lib/user-session";
import { getUserPreferenceByUserId } from "@/lib/user-preference";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { setRequestLocale } from "next-intl/server";
import {
  isOnboardingBudgetRange,
  isOnboardingIndustry,
  isOnboardingRole,
} from "@/lib/onboarding-types";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function OnboardingPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) {
    redirect({ href: "/login?redirect=/onboarding", locale });
  }

  const pref = await getUserPreferenceByUserId(user!.id);
  const initialCompleted = Boolean(pref?.onboardingCompletedAt);

  const initialPreference = pref
    ? {
        onboardingRole:
          pref.onboardingRole && isOnboardingRole(pref.onboardingRole)
            ? pref.onboardingRole
            : null,
        industries: (pref.industries ?? []).filter(isOnboardingIndustry),
        budgetRange:
          pref.budgetRange && isOnboardingBudgetRange(pref.budgetRange)
            ? pref.budgetRange
            : null,
      }
    : null;

  return (
    <OnboardingWizard
      initialCompleted={initialCompleted}
      initialPreference={initialPreference}
    />
  );
}
