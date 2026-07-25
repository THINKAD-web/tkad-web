import { createHmac, createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { readOAuthHmacSecretOrDev } from "@/lib/oauth-hmac-secret";
import { prisma } from "@/lib/prisma";
import type { AppUserRole, UserPlan } from "@prisma/client";

export const USER_SESSION_COOKIE = "tkad_user_session";

const MAX_AGE_SEC = 60 * 60 * 24 * 7;

function sessionSecret(): string | null {
  return readOAuthHmacSecretOrDev();
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

type SessionPayload = {
  v: 1;
  sub: string;
  role: AppUserRole;
  exp: number;
};

export function createUserSessionToken(
  userId: string,
  role: AppUserRole,
): string | null {
  const secret = sessionSecret();
  if (!secret) return null;
  const exp = Date.now() + MAX_AGE_SEC * 1000;
  const payload: SessionPayload = { v: 1, sub: userId, role, exp };
  const json = JSON.stringify(payload);
  const sig = signPayload(json, secret);
  const enc = Buffer.from(json, "utf8").toString("base64url");
  return `${enc}.${sig}`;
}

export type UserSessionVerifyCode =
  | "ok"
  | "missing_secret"
  | "missing_token"
  | "malformed_token"
  | "bad_payload_encoding"
  | "bad_signature"
  | "invalid_payload_json"
  | "invalid_payload_shape"
  | "expired";

export type UserSessionVerifyResult =
  | { ok: true; code: "ok"; userId: string; role: AppUserRole; exp: number }
  | { ok: false; code: Exclude<UserSessionVerifyCode, "ok"> };

export function verifyUserSessionDetails(
  token: string | undefined,
): UserSessionVerifyResult {
  const secret = sessionSecret();
  if (!secret) return { ok: false, code: "missing_secret" };
  if (token == null || token === "") return { ok: false, code: "missing_token" };
  if (!token.includes(".")) return { ok: false, code: "malformed_token" };

  const dot = token.indexOf(".");
  const enc = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!enc || !sig) return { ok: false, code: "malformed_token" };

  let payload: string;
  try {
    payload = Buffer.from(enc, "base64url").toString("utf8");
  } catch {
    return { ok: false, code: "bad_payload_encoding" };
  }

  const expected = signPayload(payload, secret);
  try {
    if (expected.length !== sig.length) return { ok: false, code: "bad_signature" };
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) {
      return { ok: false, code: "bad_signature" };
    }
  } catch {
    return { ok: false, code: "bad_signature" };
  }

  let data: SessionPayload;
  try {
    data = JSON.parse(payload) as SessionPayload;
  } catch {
    return { ok: false, code: "invalid_payload_json" };
  }

  if (
    data.v !== 1 ||
    typeof data.sub !== "string" ||
    typeof data.role !== "string" ||
    typeof data.exp !== "number"
  ) {
    return { ok: false, code: "invalid_payload_shape" };
  }
  if (Date.now() > data.exp) return { ok: false, code: "expired" };

  return {
    ok: true,
    code: "ok",
    userId: data.sub,
    role: data.role as AppUserRole,
    exp: data.exp,
  };
}

export function verifyUserSessionToken(token: string | undefined): boolean {
  return verifyUserSessionDetails(token).ok;
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function userSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SEC,
  };
}

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  company: string | null;
  role: AppUserRole;
  communityRole: string | null;
  communityBio: string | null;
  region: string | null;
  locale: string;
  emailVerifiedAt: Date | null;
  /** SaaS plan — used by SSO accessLevel (and other plan-aware call sites). */
  plan: UserPlan;
  trialEndsAt: Date | null;
  proTrialEndsAt: Date | null;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const c = await cookies();
  const token = c.get(USER_SESSION_COOKIE)?.value;
  const result = verifyUserSessionDetails(token);
  if (!result.ok) return null;

  const row = await prisma.user.findFirst({
    where: { id: result.userId, deletedAt: null },
    select: {
      id: true,
      email: true,
      name: true,
      company: true,
      role: true,
      communityRole: true,
      communityBio: true,
      locale: true,
      emailVerifiedAt: true,
      plan: true,
      trialEndsAt: true,
      proTrialEndsAt: true,
    },
  });
  if (!row) return null;
  return { ...row, region: null };
}

export async function createSessionRecord(params: {
  userId: string;
  token: string;
  userAgent?: string;
  ip?: string;
}): Promise<void> {
  await prisma.userSession.create({
    data: {
      userId: params.userId,
      tokenHash: hashSessionToken(params.token),
      userAgent: params.userAgent,
      ip: params.ip,
      expiresAt: new Date(Date.now() + MAX_AGE_SEC * 1000),
    },
  });
}

export async function revokeSessionByToken(token: string): Promise<void> {
  await prisma.userSession.updateMany({
    where: { tokenHash: hashSessionToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
