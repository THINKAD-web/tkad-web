import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
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
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(40),
  phone: z.string().max(20).optional(),
  company: z.string().max(80).optional(),
  locale: z.enum(["ko", "en", "zh", "ja"]).default("ko"),
});

const limiter = rateLimit({ limit: 5, windowMs: 60 * 60 * 1000 });

function getIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

export async function POST(req: Request) {
  const ip = getIp(req);
  if (!limiter.check(`register:${ip}`)) {
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
      { ok: false, error: { code: "INVALID_INPUT", issues: parsed.error.flatten() } },
      { status: 400 },
    );
  }

  const { email, password, name, phone, company, locale } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { ok: false, error: { code: "EMAIL_IN_USE" } },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      phone,
      company,
      locale,
      role: "advertiser",
      lastLoginAt: new Date(),
    },
    select: { id: true, email: true, name: true, role: true },
  });

  const token = createUserSessionToken(user.id, user.role);
  if (!token) {
    return NextResponse.json(
      { ok: false, error: { code: "SESSION_SECRET_MISSING" } },
      { status: 500 },
    );
  }

  await createSessionRecord({
    userId: user.id,
    token,
    userAgent: req.headers.get("user-agent") ?? undefined,
    ip,
  });

  const res = NextResponse.json({ ok: true, data: user }, { status: 201 });
  res.cookies.set(USER_SESSION_COOKIE, token, userSessionCookieOptions());
  return res;
}
