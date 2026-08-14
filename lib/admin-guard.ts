import { NextRequest, NextResponse } from "next/server";
import {
  isAdminAuthDebugEnabled,
  isAdminAuthDebugVerbose,
} from "@/lib/admin-session";
import { isAdminRequestAuthorized } from "@/lib/require-admin-request";
import { isDatabaseConfigured } from "@/lib/prisma";
import { prismaErrorDetail } from "@/lib/prisma-error-detail";

export function json(data: unknown, status = 200) {
  const headers = new Headers();
  headers.set("Cache-Control", "no-store, private");
  return NextResponse.json(data, { status, headers });
}

export function jsonWithHeaders(
  data: unknown,
  status: number,
  extraHeaders?: Record<string, string>,
) {
  const headers = new Headers();
  headers.set("Cache-Control", "no-store, private");
  if (extraHeaders) {
    for (const [key, value] of Object.entries(extraHeaders)) {
      headers.set(key, value);
    }
  }
  return NextResponse.json(data, { status, headers });
}

export function adminUnauthorized() {
  return json({ error: "Unauthorized" }, 401);
}

export function adminDbUnavailable() {
  return json(
    {
      error:
        "DB 연결 미설정 (DATABASE_URL). Vercel 환경 변수를 확인하세요.",
      code: "DATABASE_NOT_CONFIGURED",
    },
    503,
  );
}

/** Prisma/query failures — always JSON so admin clients do not parse HTML as JSON. */
export function adminDbQueryFailed(e: unknown) {
  console.error("[admin] database query failed", e);
  const detail = prismaErrorDetail(e);
  return json(
    {
      error: detail ?? "database_error",
      code: "DATABASE_QUERY_FAILED",
    },
    503,
  );
}

/** Returns a Response to return early, or null if OK. */
export function assertAdmin(request: NextRequest): NextResponse | null {
  if (!isAdminRequestAuthorized(request)) return adminUnauthorized();
  return null;
}

export function assertAdminDb(request: NextRequest): NextResponse | null {
  const a = assertAdmin(request);
  if (a) return a;
  if (!isDatabaseConfigured()) {
    if (isAdminAuthDebugEnabled()) {
      console.warn("[admin-auth] database not configured", {
        path: request.nextUrl.pathname,
        method: request.method,
      });
    }
    return adminDbUnavailable();
  }
  if (isAdminAuthDebugVerbose()) {
    console.log("[admin-auth] admin + db gate passed", {
      path: request.nextUrl.pathname,
      method: request.method,
    });
  }
  return null;
}
