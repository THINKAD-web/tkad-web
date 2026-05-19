import type { PrismaClient } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { rowToDto, type PreferenceRow } from "@/lib/onboarding-profile";
import type { UserPreferenceDto } from "@/lib/onboarding-types";

type UserPreferenceDelegate = PrismaClient["userPreference"];

export function userPreferenceDelegate(): UserPreferenceDelegate | null {
  const client = getPrisma();
  if (!("userPreference" in client)) return null;
  const delegate = (client as PrismaClient).userPreference;
  return delegate ?? null;
}

export async function getUserPreferenceByUserId(
  userId: string,
): Promise<UserPreferenceDto | null> {
  const delegate = userPreferenceDelegate();
  if (!delegate) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[user-preference] Prisma client missing userPreference — run: npx prisma generate && npx prisma db push",
      );
    }
    return null;
  }

  try {
    const row = await delegate.findUnique({
      where: { userId },
      select: {
        onboardingRole: true,
        industries: true,
        budgetRange: true,
        onboardingCompletedAt: true,
      },
    });
    if (!row) return null;
    return rowToDto(row);
  } catch (error) {
    console.error("[user-preference] findUnique failed:", error);
    return null;
  }
}

export async function userNeedsOnboarding(userId: string): Promise<boolean> {
  const pref = await getUserPreferenceByUserId(userId);
  return !pref?.onboardingCompletedAt;
}
