import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import {
  USER_SESSION_COOKIE,
  createSessionRecord,
  createUserSessionToken,
  userSessionCookieOptions,
} from "@/lib/user-session";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});

const limiter = rateLimit({ limit: 10, windowMs: 60 * 1000 });

function getIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

export async function POST(req: Request) {
  const ip = getIp(req);
  if (!limiter.check(`login:${ip}`)) {
    return NextResponse.json(
      { ok: false, error: { code: "RATE_LIMITED" } },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_JSON" } },
      { status: 400 },
    );
  }

  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_INPUT" } },
      { status: 400 },
    );
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      passwordHash: true,
      deletedAt: true,
    },
  });

  if (!user || !user.passwordHash || user.deletedAt) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_CREDENTIALS" } },
      { status: 401 },
    );
  }

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_CREDENTIALS" } },
      { status: 401 },
    );
  }

  const token = createUserSessionToken(user.id, user.role);
  if (!token) {
    return NextResponse.json(
      { ok: false, error: { code: "SESSION_SECRET_MISSING" } },
      { status: 500 },
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await createSessionRecord({
    userId: user.id,
    token,
    userAgent: req.headers.get("user-agent") ?? undefined,
    ip,
  });

  const res = NextResponse.json({
    ok: true,
    data: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
  res.cookies.set(USER_SESSION_COOKIE, token, userSessionCookieOptions());
  return res;
}
