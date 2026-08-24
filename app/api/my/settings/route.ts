import { z } from "zod";
import { trialDaysLeft } from "@/lib/plan-check-shared";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-session";
import { userNeedsEmailVerification, isOAuthPlaceholderEmail } from "@/lib/user-email";
import {
  apiError,
  apiOk,
  apiServerError,
  apiZodError,
  readJson,
} from "@/lib/api-response";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) return apiError("UNAUTHORIZED", 401);

    const user = await prisma.user.findFirst({
      where: { id: session.id, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        company: true,
        phone: true,
        locale: true,
        plan: true,
        trialEndsAt: true,
        proTrialEndsAt: true,
        emailVerifiedAt: true,
        passwordHash: true,
        accounts: {
          select: { provider: true, providerAccountId: true },
        },
        subscriptions: {
          where: {
            status: { in: ["ACTIVE", "TRIALING"] },
            OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
          },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { plan: true, endDate: true, status: true },
        },
      },
    });

    if (!user) return apiError("NOT_FOUND", 404);

    const linkedProviders = user.accounts.map((a) => a.provider);
    const hasPassword = !!user.passwordHash;
    const needsEmailVerification = userNeedsEmailVerification({
      email: user.email,
      emailVerifiedAt: user.emailVerifiedAt,
      passwordHash: user.passwordHash,
    });

    const activeSub = user.subscriptions[0] ?? null;

    return apiOk({
      id: user.id,
      email: user.email,
      name: user.name,
      company: user.company,
      phone: user.phone,
      locale: user.locale,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      needsEmailVerification,
      hasPassword,
      isOAuthPlaceholderEmail: isOAuthPlaceholderEmail(user.email),
      linkedProviders,
      plan: user.plan,
      trialEndsAt: user.trialEndsAt?.toISOString() ?? null,
      proTrialEndsAt: user.proTrialEndsAt?.toISOString() ?? null,
      trialDaysLeft: trialDaysLeft({
        plan: user.plan,
        trialEndsAt: user.trialEndsAt,
        proTrialEndsAt: user.proTrialEndsAt,
      }),
      subscriptionPlan: activeSub?.plan ?? null,
      subscriptionEndDate: activeSub?.endDate?.toISOString() ?? null,
    });
  } catch (e) {
    return apiServerError(e, "my/settings GET");
  }
}

const PatchBody = z.object({
  name: z.string().min(1).max(40).optional(),
  company: z.string().max(80).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
});

export async function PATCH(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return apiError("UNAUTHORIZED", 401);

    const body = await readJson(req);
    if (!body) return apiError("INVALID_JSON", 400);

    const parsed = PatchBody.safeParse(body);
    if (!parsed.success) return apiZodError(parsed.error);

    const data: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.company !== undefined) data.company = parsed.data.company;
    if (parsed.data.phone !== undefined) data.phone = parsed.data.phone;

    if (Object.keys(data).length === 0) {
      return apiError("NO_CHANGES", 400, { message: "변경할 항목이 없습니다." });
    }

    const user = await prisma.user.update({
      where: { id: session.id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        company: true,
        phone: true,
      },
    });

    return apiOk(user);
  } catch (e) {
    return apiServerError(e, "my/settings PATCH");
  }
}
