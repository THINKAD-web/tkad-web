import { cookies } from "next/headers";
import type { AppUserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/api-response";
import {
  USER_SESSION_COOKIE,
  createSessionRecord,
  createUserSessionToken,
  userSessionCookieOptions,
} from "@/lib/user-session";

/** 로그인·OAuth 완료 후 `tkad_user_session` 쿠키를 발급합니다. */
export async function establishUserSession(
  userId: string,
  role: AppUserRole,
  req?: Request,
): Promise<boolean> {
  const token = createUserSessionToken(userId, role);
  if (!token) return false;

  await prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  });

  await createSessionRecord({
    userId,
    token,
    userAgent: req?.headers.get("user-agent") ?? undefined,
    ip: req ? getClientIp(req) : undefined,
  });

  const cookieStore = await cookies();
  cookieStore.set(USER_SESSION_COOKIE, token, userSessionCookieOptions());
  return true;
}
