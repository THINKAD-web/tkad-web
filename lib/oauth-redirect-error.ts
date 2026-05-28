import { NextResponse } from "next/server";
import type { OAuthProvider } from "@/lib/auth-oauth-env";

export function oauthConfigErrorRedirect(
  origin: string,
  locale: string,
  provider: OAuthProvider,
  redirect = "/my",
): NextResponse {
  const safeLocale = locale === "en" ? "en" : "ko";
  const safeRedirect = redirect.startsWith("/") && !redirect.startsWith("//")
    ? redirect
    : "/my";
  const url = new URL(`/${safeLocale}/login`, origin);
  url.searchParams.set("error", "oauth_config");
  url.searchParams.set("provider", provider);
  url.searchParams.set("redirect", safeRedirect);
  return NextResponse.redirect(url.toString());
}
