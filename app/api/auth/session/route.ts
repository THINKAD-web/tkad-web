import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-session";
import { userNeedsEmailVerification } from "@/lib/user-email";
import { apiOk, apiServerError } from "@/lib/api-response";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return apiOk(null);

    const row = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true, phone: true },
    });

    const needsEmailVerification = row
      ? userNeedsEmailVerification({
          email: user.email,
          emailVerifiedAt: user.emailVerifiedAt,
          passwordHash: row.passwordHash,
        })
      : false;

    return apiOk({
      ...user,
      phone: row?.phone ?? null,
      needsEmailVerification,
    });
  } catch (e) {
    return apiServerError(e, "auth/session");
  }
}
