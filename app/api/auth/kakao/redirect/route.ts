import { checkOAuthLoginConfig } from "@/lib/auth-oauth-env";
import { resolveAuthOrigin } from "@/lib/auth-url";
import { sanitizeAuthRedirect } from "@/lib/kakao-auth-redirect";
import { startOAuthSignIn } from "@/lib/oauth-signin-start";
import { oauthConfigErrorRedirect } from "@/lib/oauth-redirect-error";

export const runtime = "nodejs";

/** 카카오 OAuth 시작: redirect/locale 쿠키 저장 후 NextAuth sign-in 으로 이동 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const requestOrigin = new URL(req.url).origin;
  const authOrigin = resolveAuthOrigin(requestOrigin);
  const redirect = sanitizeAuthRedirect(searchParams.get("redirect"));
  const locale = searchParams.get("locale")?.trim() || "ko";

  const config = checkOAuthLoginConfig("kakao");
  if (!config.ok) {
    return oauthConfigErrorRedirect(authOrigin, locale, "kakao", redirect);
  }

  const callbackUrl = `${authOrigin}/${locale}${redirect}`;
  await startOAuthSignIn("kakao", { callbackUrl, redirect, locale });
}
