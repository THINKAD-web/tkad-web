import type { NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  isAdminAuthDebugEnabled,
  isAdminAuthDebugVerbose,
  verifyAdminSessionDetails,
} from "@/lib/admin-session";

/**
 * 관리자 세션 검증. 실패 원인 파악: `ADMIN_AUTH_DEBUG=1` 환경 변수 설정 후 API 호출 시 서버 로그 확인.
 * (쿠키 값·토큰은 로그에 남기지 않음)
 */
export function isAdminRequestAuthorized(request: NextRequest): boolean {
  const rawCookie = request.cookies.get(ADMIN_SESSION_COOKIE);
  const token = rawCookie?.value;
  const result = verifyAdminSessionDetails(token);

  if (result.ok) {
    if (isAdminAuthDebugVerbose()) {
      console.log("[admin-auth] authorized", {
        path: request.nextUrl.pathname,
        method: request.method,
      });
    }
    return true;
  }

  if (isAdminAuthDebugEnabled()) {
    console.warn("[admin-auth] denied", {
      code: result.code,
      path: request.nextUrl.pathname,
      method: request.method,
      cookieName: ADMIN_SESSION_COOKIE,
      cookieHeaderPresent: request.headers.has("cookie"),
      /** 이름만 일치하는 쿠키 존재 여부 (값은 출력 안 함) */
      sessionCookiePresent: Boolean(rawCookie),
    });
  }

  return false;
}
