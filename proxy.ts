import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { withAbVariantCookie } from "@/lib/ab-middleware";

const intlMiddleware = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  const isAdminRoute = /\/(?:ko|en)\/admin(?:\/|$)/.test(
    request.nextUrl.pathname,
  );
  const requestHeaders = new Headers(request.headers);
  if (isAdminRoute) {
    requestHeaders.set("x-tkad-admin-route", "1");
  }
  const req = new NextRequest(request.url, {
    headers: requestHeaders,
    method: request.method,
  });
  const response = intlMiddleware(req);
  return withAbVariantCookie(req, response);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
