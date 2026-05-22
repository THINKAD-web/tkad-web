import { NextRequest, NextResponse } from "next/server";
import { handlers } from "@/lib/auth";
import {
  checkNextAuthConfig,
  checkOAuthLoginConfig,
  type OAuthProvider,
} from "@/lib/auth-oauth-env";

type RouteContext = { params: Promise<{ nextauth: string[] }> };

function providerFromPath(segments: string[] | undefined): OAuthProvider | null {
  const joined = (segments ?? []).join("/");
  if (joined.includes("kakao")) return "kakao";
  if (joined.includes("naver")) return "naver";
  return null;
}

async function guardAuthRequest(
  req: NextRequest,
  ctx: RouteContext,
  handler: (req: NextRequest) => Promise<Response>,
): Promise<Response> {
  const base = checkNextAuthConfig();
  if (!base.ok) {
    return NextResponse.json({ error: base.userMessage }, { status: 500 });
  }

  const segments = (await ctx.params).nextauth;
  const provider = providerFromPath(segments);
  if (provider) {
    const oauth = checkOAuthLoginConfig(provider);
    if (!oauth.ok) {
      return NextResponse.json({ error: oauth.userMessage }, { status: 500 });
    }
  }

  return handler(req);
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  return guardAuthRequest(req, ctx, handlers.GET);
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  return guardAuthRequest(req, ctx, handlers.POST);
}
