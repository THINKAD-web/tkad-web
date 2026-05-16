import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  buildOAuthRedirectUri,
  getOAuthProvider,
  type OAuthProviderId,
} from "@/lib/oauth/providers";
import {
  OAUTH_STATE_COOKIE,
  decodeStateCookie,
} from "@/lib/oauth/state";
import { resolveOrCreateUserForOAuth } from "@/lib/oauth/link";
import {
  USER_SESSION_COOKIE,
  createSessionRecord,
  createUserSessionToken,
  userSessionCookieOptions,
} from "@/lib/user-session";
import { getClientIp } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * GET /api/auth/oauth/[provider]/callback?code=...&state=...
 *
 * 흐름:
 *  1. provider 활성 여부 확인
 *  2. state 쿠키 검증(provider, value, exp 일치)
 *  3. code → access_token 교환
 *  4. userInfo 조회 → 표준 프로필 추출
 *  5. User 조회/생성/링크 → tkad_user_session 발급
 *  6. 원래 redirect 경로로 302
 *
 * 실패 시 `/login?oauth_error=...` 로 302.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ provider: string }> },
) {
  const { provider: rawProvider } = await ctx.params;
  if (rawProvider !== "kakao" && rawProvider !== "naver") {
    return errorRedirect(req, "/login", "unknown_provider");
  }
  const providerId = rawProvider satisfies OAuthProviderId;
  const provider = getOAuthProvider(providerId);
  if (!provider) return errorRedirect(req, "/login", "provider_disabled");

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateFromQs = url.searchParams.get("state");
  const errorFromProvider = url.searchParams.get("error");
  if (errorFromProvider) {
    return errorRedirect(req, "/login", `provider_${errorFromProvider}`);
  }
  if (!code || !stateFromQs) {
    return errorRedirect(req, "/login", "missing_code_or_state");
  }

  const cookieStore = await cookies();
  const stateCookieRaw = cookieStore.get(OAUTH_STATE_COOKIE)?.value;
  const decoded = decodeStateCookie(stateCookieRaw);
  if (!decoded) return errorRedirect(req, "/login", "invalid_state_cookie");
  if (decoded.provider !== providerId) return errorRedirect(req, "/login", "state_provider_mismatch");
  if (decoded.state !== stateFromQs) return errorRedirect(req, "/login", "state_mismatch");

  // 토큰 교환
  const redirectUri = buildOAuthRedirectUri(req, providerId);
  let tokenPayload: unknown;
  try {
    const params = new URLSearchParams();
    params.set("grant_type", "authorization_code");
    params.set("client_id", provider.clientId);
    if (provider.clientSecret) params.set("client_secret", provider.clientSecret);
    params.set("code", code);
    params.set("redirect_uri", redirectUri);
    params.set("state", stateFromQs);

    const tokenRes = await fetch(provider.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: params.toString(),
    });
    if (!tokenRes.ok) {
      console.error(
        `[oauth:${providerId}:token]`,
        tokenRes.status,
        await safeText(tokenRes),
      );
      return errorRedirect(req, "/login", "token_exchange_failed");
    }
    tokenPayload = await tokenRes.json();
  } catch (e) {
    console.error(`[oauth:${providerId}:token]`, e);
    return errorRedirect(req, "/login", "token_exchange_failed");
  }

  const parsed = provider.parseTokenResponse(tokenPayload);
  if (!parsed) return errorRedirect(req, "/login", "invalid_token_response");

  // userInfo
  let userInfoPayload: unknown;
  try {
    const r = await fetch(provider.userInfoUrl, {
      headers: {
        Authorization: `Bearer ${parsed.accessToken}`,
        Accept: "application/json",
      },
    });
    if (!r.ok) {
      console.error(
        `[oauth:${providerId}:userinfo]`,
        r.status,
        await safeText(r),
      );
      return errorRedirect(req, "/login", "userinfo_failed");
    }
    userInfoPayload = await r.json();
  } catch (e) {
    console.error(`[oauth:${providerId}:userinfo]`, e);
    return errorRedirect(req, "/login", "userinfo_failed");
  }

  const profile = provider.normalizeProfile(userInfoPayload);
  if (!profile) return errorRedirect(req, "/login", "invalid_profile");

  // User 행 확보 + 세션 발급
  let userId: string;
  let emailNeeded: boolean;
  try {
    const linked = await resolveOrCreateUserForOAuth({
      provider: providerId,
      profile,
      locale: "ko",
    });
    userId = linked.userId;
    emailNeeded = linked.emailNeeded;
  } catch (e) {
    console.error(`[oauth:${providerId}:link]`, e);
    return errorRedirect(req, "/login", "link_failed");
  }

  // 세션 발급
  const userRow = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, deletedAt: true },
  });
  if (!userRow || userRow.deletedAt) {
    return errorRedirect(req, "/login", "user_unavailable");
  }

  const token = createUserSessionToken(userRow.id, userRow.role);
  if (!token) return errorRedirect(req, "/login", "session_secret_missing");

  await prisma.user.update({
    where: { id: userRow.id },
    data: { lastLoginAt: new Date() },
  });

  await createSessionRecord({
    userId: userRow.id,
    token,
    userAgent: req.headers.get("user-agent") ?? undefined,
    ip: getClientIp(req),
  });

  const finalRedirect = emailNeeded
    ? `/account/profile?welcome=1&needs_email=1`
    : decoded.redirect;
  const finalUrl = new URL(
    finalRedirect,
    `${url.protocol}//${url.host}`,
  ).toString();

  const res = NextResponse.redirect(finalUrl, 302);
  res.cookies.set(USER_SESSION_COOKIE, token, userSessionCookieOptions());
  res.cookies.delete(OAUTH_STATE_COOKIE);
  return res;
}

function errorRedirect(req: Request, path: string, code: string) {
  const url = new URL(req.url);
  const target = new URL(path, `${url.protocol}//${url.host}`);
  target.searchParams.set("oauth_error", code);
  const res = NextResponse.redirect(target.toString(), 302);
  res.cookies.delete(OAUTH_STATE_COOKIE);
  return res;
}

async function safeText(r: Response): Promise<string> {
  try {
    return (await r.text()).slice(0, 400);
  } catch {
    return "";
  }
}
