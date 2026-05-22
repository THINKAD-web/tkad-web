import { NextResponse } from "next/server";
import { checkOAuthLoginConfig } from "@/lib/auth-oauth-env";
import {
  applyNaverAuthCookies,
  sanitizeAuthRedirect,
} from "@/lib/naver-auth-redirect";

export const runtime = "nodejs";

/** 네이버 OAuth 시작: redirect/locale 쿠키 저장 후 NextAuth sign-in 으로 이동 */
export async function GET(req: Request) {
  const config = checkOAuthLoginConfig("naver");
  if (!config.ok) {
    return NextResponse.json({ error: config.userMessage }, { status: 500 });
  }

  const { searchParams, origin } = new URL(req.url);
  const redirect = sanitizeAuthRedirect(searchParams.get("redirect"));
  const locale = searchParams.get("locale")?.trim() || "ko";

  const callbackUrl = `${origin}/${locale}${redirect}`;
  const signInUrl = new URL("/api/auth/signin/naver", origin);
  signInUrl.searchParams.set("callbackUrl", callbackUrl);

  const res = NextResponse.redirect(signInUrl.toString());
  applyNaverAuthCookies(res, redirect, locale);
  return res;
}
