import { userPreferenceDelegate } from "@/lib/user-preference";
import type { SignupStartRole } from "@/lib/signup-start-roles";

export async function seedSignupOnboardingPreference(
  userId: string,
  onboardingRole: SignupStartRole,
): Promise<void> {
  const db = userPreferenceDelegate();
  if (!db) return;
  await db.upsert({
    where: { userId },
    create: { userId, onboardingRole },
    update: { onboardingRole },
  });
}
