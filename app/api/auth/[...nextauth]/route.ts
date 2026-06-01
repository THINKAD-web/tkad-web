import { NextRequest, NextResponse } from "next/server";
import { handlers } from "@/lib/auth";
import { resolveAuthOrigin } from "@/lib/auth-url";
import {
  checkNextAuthConfig,
  checkOAuthLoginConfig,
  type OAuthProvider,
} from "@/lib/auth-oauth-env";
import { oauthConfigErrorRedirect } from "@/lib/oauth-redirect-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ nextauth: string[] }> };

function providerFromPath(segments: string[] | undefined): OAuthProvider | null {
  const joined = (segments ?? []).join("/");
  if (joined.includes("google")) return "google";
  if (joined.includes("kakao")) return "kakao";
  if (joined.includes("naver")) return "naver";
  return null;
}

function guardFailureResponse(
  req: NextRequest,
  provider: OAuthProvider | null,
  message: string,
): Response {
  if (req.method === "GET") {
    const locale =
      req.nextUrl.searchParams.get("locale")?.trim() === "en" ? "en" : "ko";
    const redirect =
      req.nextUrl.searchParams.get("callbackUrl")?.includes("/en/")
        ? "/my"
        : "/my";
    return oauthConfigErrorRedirect(
      resolveAuthOrigin(req.nextUrl.origin),
      locale,
      provider ?? "kakao",
      redirect,
    );
  }
  return NextResponse.json({ error: message }, { status: 500 });
}

async function guardAuthRequest(
  req: NextRequest,
  ctx: RouteContext,
  handler: (req: NextRequest) => Promise<Response>,
): Promise<Response> {
  const base = checkNextAuthConfig();
  if (!base.ok) {
    return guardFailureResponse(req, null, base.userMessage);
  }

  const segments = (await ctx.params).nextauth;
  const provider = providerFromPath(segments);
  if (provider) {
    const oauth = checkOAuthLoginConfig(provider);
    if (!oauth.ok) {
      return guardFailureResponse(req, provider, oauth.userMessage);
    }
  }

  try {
    return await handler(req);
  } catch (err) {
    console.error("[nextauth] handler error:", err);
    const msg =
      err instanceof Error ? err.message : "Authentication handler failed";
    const segments = (await ctx.params).nextauth;
    const isCallback = (segments ?? []).some((s) => s === "callback");
    if (req.method === "GET" && provider) {
      if (isCallback) {
        const locale =
          req.nextUrl.searchParams.get("locale")?.trim() === "en" ? "en" : "ko";
        const origin = resolveAuthOrigin(req.nextUrl.origin);
        const url = new URL(`/${locale}/login`, origin);
        url.searchParams.set("error", "oauth_signin_failed");
        url.searchParams.set("provider", provider);
        return NextResponse.redirect(url.toString());
      }
      return guardFailureResponse(req, provider, msg);
    }
    return NextResponse.json(
      { error: "로그인 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  return guardAuthRequest(req, ctx, handlers.GET);
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  return guardAuthRequest(req, ctx, handlers.POST);
}
