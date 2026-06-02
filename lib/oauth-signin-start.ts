import { cookies } from "next/headers";
import { signIn } from "@/lib/auth";
import type { OAuthProvider } from "@/lib/auth-oauth-env";
import {
  applyGoogleAuthCookies,
  sanitizeAuthRedirect,
} from "@/lib/google-auth-redirect";
import {
  applyKakaoAuthCookies,
} from "@/lib/kakao-auth-redirect";
import {
  applyNaverAuthCookies,
} from "@/lib/naver-auth-redirect";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

function applyProviderCookies(
  provider: OAuthProvider,
  store: CookieStore,
  redirect: string,
  locale: string,
) {
  const safeRedirect = sanitizeAuthRedirect(redirect);
  const res = { cookies: store };
  if (provider === "kakao") {
    applyKakaoAuthCookies(res, safeRedirect, locale);
    return;
  }
  if (provider === "naver") {
    applyNaverAuthCookies(res, safeRedirect, locale);
    return;
  }
  applyGoogleAuthCookies(res, safeRedirect, locale);
}

/**
 * Auth.js v5: GET /api/auth/signin/{provider} 는 Configuration 오류가 날 수 있음.
 * redirect/locale 쿠키 저장 후 서버 signIn() 으로 OAuth 를 시작합니다.
 */
export async function startOAuthSignIn(
  provider: OAuthProvider,
  params: { callbackUrl: string; redirect: string; locale: string },
): Promise<never> {
  const cookieStore = await cookies();
  applyProviderCookies(
    provider,
    cookieStore,
    params.redirect,
    params.locale,
  );
  await signIn(provider, { redirectTo: params.callbackUrl });
}
