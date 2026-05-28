import { NextResponse } from "next/server";
import { checkOAuthLoginConfig } from "@/lib/auth-oauth-env";
import {
  applyKakaoAuthCookies,
  sanitizeAuthRedirect,
} from "@/lib/kakao-auth-redirect";
import { oauthConfigErrorRedirect } from "@/lib/oauth-redirect-error";

export const runtime = "nodejs";

/** 카카오 OAuth 시작: redirect/locale 쿠키 저장 후 NextAuth sign-in 으로 이동 */
export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const redirect = sanitizeAuthRedirect(searchParams.get("redirect"));
  const locale = searchParams.get("locale")?.trim() || "ko";

  const config = checkOAuthLoginConfig("kakao");
  if (!config.ok) {
    return oauthConfigErrorRedirect(origin, locale, "kakao", redirect);
  }

  const callbackUrl = `${origin}/${locale}${redirect}`;
  const signInUrl = new URL("/api/auth/signin/kakao", origin);
  signInUrl.searchParams.set("callbackUrl", callbackUrl);

  const res = NextResponse.redirect(signInUrl.toString());
  applyKakaoAuthCookies(res, redirect, locale);
  return res;
}
