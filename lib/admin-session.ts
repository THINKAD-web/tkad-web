import { createHmac, timingSafeEqual } from "crypto";

export const ADMIN_SESSION_COOKIE = "tkad_admin_session";

/** 세션 검증 실패 시 `console.warn` — 토큰/쿠키 값은 출력하지 않음 */
export function isAdminAuthDebugEnabled(): boolean {
  return process.env.ADMIN_AUTH_DEBUG === "1";
}

/** 인증·DB 게이트 통과 시에도 `console.log` (선택) */
export function isAdminAuthDebugVerbose(): boolean {
  return process.env.ADMIN_AUTH_DEBUG_VERBOSE === "1";
}

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

/** 디버깅용 — 토큰 값은 절대 로그하지 말 것 */
export type AdminSessionVerifyCode =
  | "ok"
  | "missing_secret"
  | "missing_token"
  | "malformed_token"
  | "bad_payload_encoding"
  | "bad_signature"
  | "invalid_payload_json"
  | "invalid_payload_shape"
  | "expired";

export function verifyAdminSessionDetails(
  token: string | undefined,
): { ok: boolean; code: AdminSessionVerifyCode } {
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
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(sig)))
      return { ok: false, code: "bad_signature" };
  } catch {
    return { ok: false, code: "bad_signature" };
  }

  try {
    const data = JSON.parse(payload) as { v?: number; exp?: number };
    if (data.v !== 1 || typeof data.exp !== "number") {
      return { ok: false, code: "invalid_payload_shape" };
    }
    if (Date.now() > data.exp) return { ok: false, code: "expired" };
    return { ok: true, code: "ok" };
  } catch {
    return { ok: false, code: "invalid_payload_json" };
  }
}

export function verifyAdminSessionToken(token: string | undefined): boolean {
  return verifyAdminSessionDetails(token).ok;
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
