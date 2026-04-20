import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import {
  USER_SESSION_COOKIE,
  createSessionRecord,
  createUserSessionToken,
  userSessionCookieOptions,
} from "@/lib/user-session";
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
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});

const limiter = rateLimit({ limit: 10, windowMs: 60 * 1000 });

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    if (!limiter.check(`login:${ip}`)) {
      return apiError("RATE_LIMITED", 429, {
        message: "너무 많은 요청입니다. 잠시 후 다시 시도해주세요.",
      });
    }

    const body = await readJson(req);
    if (!body) return apiError("INVALID_JSON", 400);

    const parsed = Body.safeParse(body);
    if (!parsed.success) return apiZodError(parsed.error);

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        passwordHash: true,
        deletedAt: true,
      },
    });

    if (!user || !user.passwordHash || user.deletedAt) {
      return apiError("INVALID_CREDENTIALS", 401, {
        message: "이메일 또는 비밀번호가 올바르지 않습니다.",
      });
    }

    const valid = await verifyPassword(user.passwordHash, password);
    if (!valid) {
      return apiError("INVALID_CREDENTIALS", 401, {
        message: "이메일 또는 비밀번호가 올바르지 않습니다.",
      });
    }

    const token = createUserSessionToken(user.id, user.role);
    if (!token) {
      return apiError("SESSION_SECRET_MISSING", 500, {
        message: "서버 설정 오류입니다. 관리자에게 문의해주세요.",
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await createSessionRecord({
      userId: user.id,
      token,
      userAgent: req.headers.get("user-agent") ?? undefined,
      ip,
    });

    const res = apiOk({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
    res.cookies.set(USER_SESSION_COOKIE, token, userSessionCookieOptions());
    return res;
  } catch (e) {
    return apiServerError(e, "auth/login");
  }
}
