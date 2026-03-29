import { createHmac, timingSafeEqual } from "crypto";

export const ADMIN_SESSION_COOKIE = "tkad_admin_session";

const MAX_AGE_SEC = 60 * 60 * 24 * 7;

function sessionSecret(): string | null {
  const s = process.env.ADMIN_SESSION_SECRET?.trim();
  if (s) return s;
  if (process.env.NODE_ENV !== "production") {
    return "dev-admin-session-secret-set-admin-session-secret-in-prod";
  }
  return null;
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createAdminSessionToken(): string | null {
  const secret = sessionSecret();
  if (!secret) return null;
  const exp = Date.now() + MAX_AGE_SEC * 1000;
  const payload = JSON.stringify({ v: 1, exp });
  const sig = signPayload(payload, secret);
  const enc = Buffer.from(payload, "utf8").toString("base64url");
  return `${enc}.${sig}`;
}

export function verifyAdminSessionToken(token: string | undefined): boolean {
  const secret = sessionSecret();
  if (!secret) return false;
  if (!token?.includes(".")) return false;
  const dot = token.indexOf(".");
  const enc = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!enc || !sig) return false;

  let payload: string;
  try {
    payload = Buffer.from(enc, "base64url").toString("utf8");
  } catch {
    return false;
  }

  const expected = signPayload(payload, secret);
  try {
    if (expected.length !== sig.length) return false;
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return false;
  } catch {
    return false;
  }

  try {
    const data = JSON.parse(payload) as { v?: number; exp?: number };
    if (data.v !== 1 || typeof data.exp !== "number") return false;
    if (Date.now() > data.exp) return false;
    return true;
  } catch {
    return false;
  }
}

export function adminSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SEC,
  };
}

export function getExpectedAdminUsername(): string {
  return process.env.ADMIN_USERNAME?.trim() || "admin";
}

/** Returns empty string in production when unset (login disabled until configured). */
export function getExpectedAdminPassword(): string {
  const fromEnv = process.env.ADMIN_PASSWORD?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV !== "production") return "thinkad2024";
  return "";
}
