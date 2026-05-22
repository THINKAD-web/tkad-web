import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-session";
import { userNeedsEmailVerification } from "@/lib/user-email";
import { apiOk, apiServerError } from "@/lib/api-response";
import { trialDaysLeft, trialProgressPct } from "@/lib/check-plan";
import { getPointBalance } from "@/lib/points";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return apiOk(null);

    const row = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        passwordHash: true,
        phone: true,
        plan: true,
        trialStartedAt: true,
        trialEndsAt: true,
        proTrialEndsAt: true,
      },
    });

    const needsEmailVerification = row
      ? userNeedsEmailVerification({
          email: user.email,
          emailVerifiedAt: user.emailVerifiedAt,
          passwordHash: row.passwordHash,
        })
      : false;

    const planUser = row
      ? {
          plan: row.plan,
          trialStartedAt: row.trialStartedAt,
          trialEndsAt: row.trialEndsAt,
          proTrialEndsAt: row.proTrialEndsAt,
        }
      : null;

    const pointBalance = await getPointBalance(user.id);

    return apiOk({
      ...user,
      phone: row?.phone ?? null,
      needsEmailVerification,
      plan: row?.plan ?? "FREE",
      trialStartedAt: row?.trialStartedAt?.toISOString() ?? null,
      trialEndsAt: row?.trialEndsAt?.toISOString() ?? null,
      trialDaysLeft: planUser ? (trialDaysLeft(planUser) ?? 0) : 0,
      trialProgressPct: planUser ? trialProgressPct(planUser) : 0,
      pointBalance,
    });
  } catch (e) {
    return apiServerError(e, "auth/session");
  }
}
