import { z } from "zod";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import {
  USER_SESSION_COOKIE,
  getCurrentUser,
  revokeSessionByToken,
} from "@/lib/user-session";
import { rateLimit } from "@/lib/rate-limit";
import {
  apiError,
  apiOk,
  apiServerError,
  apiZodError,
  getClientIp,
  readJson,
} from "@/lib/api-response";

export const runtime = "nodejs";

const Body = z.object({
  password: z.string().min(1).max(128).optional(),
  confirm: z.literal(true),
});

const limiter = rateLimit({ limit: 3, windowMs: 60 * 60 * 1000 });

export async function DELETE(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return apiError("UNAUTHORIZED", 401);

    const ip = getClientIp(req);
    if (!limiter.check(`delete-account:${session.id}:${ip}`)) {
      return apiError("RATE_LIMITED", 429);
    }

    const body = await readJson(req);
    if (!body) return apiError("INVALID_JSON", 400);

    const parsed = Body.safeParse(body);
    if (!parsed.success) return apiZodError(parsed.error);

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { passwordHash: true, deletedAt: true },
    });
    if (!user || user.deletedAt) return apiError("NOT_FOUND", 404);

    if (user.passwordHash) {
      if (!parsed.data.password) {
        return apiError("PASSWORD_REQUIRED", 400, {
          message: "계정 삭제를 위해 비밀번호를 입력해 주세요.",
        });
      }
      const valid = await verifyPassword(user.passwordHash, parsed.data.password);
      if (!valid) {
        return apiError("INVALID_PASSWORD", 401, {
          message: "비밀번호가 올바르지 않습니다.",
        });
      }
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.id },
        data: { deletedAt: new Date() },
      }),
      prisma.userSession.updateMany({
        where: { userId: session.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    const c = await cookies();
    const token = c.get(USER_SESSION_COOKIE)?.value;
    if (token) await revokeSessionByToken(token);

    const res = apiOk({ deleted: true });
    res.cookies.set(USER_SESSION_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return res;
  } catch (e) {
    return apiServerError(e, "my/settings/account DELETE");
  }
}
