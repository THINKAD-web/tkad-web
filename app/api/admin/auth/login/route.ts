import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieOptions,
  createAdminSessionToken,
  getExpectedAdminPassword,
  getExpectedAdminUsername,
} from "@/lib/admin-session";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const limiter = rateLimit({ limit: 15, windowMs: 60_000 });

function json(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store, private");
  return NextResponse.json(body, { ...init, headers });
}

function safeEqual(a: string, b: string): boolean {
  const ea = Buffer.from(a, "utf8");
  const eb = Buffer.from(b, "utf8");
  if (ea.length !== eb.length) return false;
  return timingSafeEqual(ea, eb);
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (!limiter.check(ip)) {
    return json({ error: "Too many requests" }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }

  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");

  const expectedUser = getExpectedAdminUsername();
  const expectedPass = getExpectedAdminPassword();
  if (!expectedPass) {
    return json({ error: "Admin login is not configured" }, { status: 503 });
  }

  if (!safeEqual(username, expectedUser) || !safeEqual(password, expectedPass)) {
    return json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = createAdminSessionToken();
  if (!token) {
    return json(
      { error: "Set ADMIN_SESSION_SECRET in production to enable admin login" },
      { status: 503 },
    );
  }

  const res = json({ ok: true }, { status: 200 });
  res.cookies.set(ADMIN_SESSION_COOKIE, token, adminSessionCookieOptions());
  return res;
}
