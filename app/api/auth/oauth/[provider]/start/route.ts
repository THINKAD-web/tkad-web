import { NextResponse } from "next/server";
import {
  buildOAuthRedirectUri,
  getOAuthProvider,
  type OAuthProviderId,
} from "@/lib/oauth/providers";
import {
  OAUTH_STATE_COOKIE,
  encodeStateCookie,
  oauthStateCookieOptions,
  randomState,
} from "@/lib/oauth/state";

export const runtime = "nodejs";

/**
 * GET /api/auth/oauth/[provider]/start?redirect=/path
 *
 * - provider 가 enabled 가 아니면 503
 * - state 발급 → httpOnly 쿠키 저장 → provider authorize URL 로 302
 * - redirect 파라미터는 내부 경로만 허용(`/`로 시작, `//` 금지)
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ provider: string }> },
) {
  const { provider: rawProvider } = await ctx.params;
  if (rawProvider !== "kakao" && rawProvider !== "naver") {
    return NextResponse.json(
      { ok: false, error: { code: "UNKNOWN_PROVIDER" } },
      { status: 404 },
    );
  }
  const providerId = rawProvider satisfies OAuthProviderId;
  const provider = getOAuthProvider(providerId);
  if (!provider) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "PROVIDER_DISABLED",
          message: `${providerId} 로그인이 비활성화돼 있습니다. 관리자에게 문의해주세요.`,
        },
      },
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  const requestedRedirect = url.searchParams.get("redirect") ?? "/my";
  const redirect = sanitizeInternalRedirect(requestedRedirect);

  const state = randomState();
  const cookieValue = encodeStateCookie({ state, provider: providerId, redirect });
  if (!cookieValue) {
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_MISCONFIGURED" } },
      { status: 500 },
    );
  }

  const redirectUri = buildOAuthRedirectUri(req, providerId);
  const authorize = new URL(provider.authorizeUrl);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("client_id", provider.clientId);
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("state", state);
  if (provider.scope) authorize.searchParams.set("scope", provider.scope);
  if (provider.extraAuthorizeParams) {
    for (const [k, v] of Object.entries(provider.extraAuthorizeParams)) {
      authorize.searchParams.set(k, v);
    }
  }

  const res = NextResponse.redirect(authorize.toString(), 302);
  res.cookies.set(OAUTH_STATE_COOKIE, cookieValue, oauthStateCookieOptions());
  return res;
}

function sanitizeInternalRedirect(raw: string): string {
  // 빈/외부/프로토콜·`//` 시작은 모두 기본값(`/my`)으로
  if (!raw || raw.length > 500) return "/my";
  if (!raw.startsWith("/")) return "/my";
  if (raw.startsWith("//")) return "/my";
  if (/^\/[^\/]+:/.test(raw)) return "/my";
  return raw;
}
