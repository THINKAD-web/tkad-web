import { NextRequest, NextResponse } from "next/server";
import { isAdminRequestAuthorized } from "@/lib/require-admin-request";
import { isDatabaseConfigured } from "@/lib/prisma";

export function json(data: unknown, status = 200) {
  const headers = new Headers();
  headers.set("Cache-Control", "no-store, private");
  return NextResponse.json(data, { status, headers });
}

export function adminUnauthorized() {
  return json({ error: "Unauthorized" }, 401);
}

export function adminDbUnavailable() {
  return json({ error: "Database not configured" }, 503);
}

/** Returns a Response to return early, or null if OK. */
export function assertAdmin(request: NextRequest): NextResponse | null {
  if (!isAdminRequestAuthorized(request)) return adminUnauthorized();
  return null;
}

export function assertAdminDb(request: NextRequest): NextResponse | null {
  const a = assertAdmin(request);
  if (a) return a;
  if (!isDatabaseConfigured()) return adminDbUnavailable();
  return null;
}
