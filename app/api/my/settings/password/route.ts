import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { getCurrentUser } from "@/lib/user-session";
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
  currentPassword: z.string().min(1).max(128).optional(),
  newPassword: z.string().min(8).max(128),
});

const limiter = rateLimit({ limit: 5, windowMs: 60 * 60 * 1000 });

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) return apiError("UNAUTHORIZED", 401);

    const ip = getClientIp(req);
    if (!limiter.check(`change-password:${session.id}:${ip}`)) {
      return apiError("RATE_LIMITED", 429);
    }

    const body = await readJson(req);
    if (!body) return apiError("INVALID_JSON", 400);

    const parsed = Body.safeParse(body);
    if (!parsed.success) return apiZodError(parsed.error);

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { passwordHash: true },
    });
    if (!user) return apiError("NOT_FOUND", 404);

    if (user.passwordHash) {
      if (!parsed.data.currentPassword) {
        return apiError("CURRENT_PASSWORD_REQUIRED", 400, {
          message: "현재 비밀번호를 입력해 주세요.",
        });
      }
      const valid = await verifyPassword(
        user.passwordHash,
        parsed.data.currentPassword,
      );
      if (!valid) {
        return apiError("INVALID_PASSWORD", 401, {
          message: "현재 비밀번호가 올바르지 않습니다.",
        });
      }
    }

    const passwordHash = await hashPassword(parsed.data.newPassword);
    await prisma.user.update({
      where: { id: session.id },
      data: { passwordHash },
    });

    return apiOk({ updated: true });
  } catch (e) {
    return apiServerError(e, "my/settings/password");
  }
}
