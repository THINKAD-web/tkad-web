import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { OAuthProviderId } from "@/lib/oauth/providers";

/**
 * 짧은 수명의 1회용 OAuth state.
 * httpOnly 쿠키에만 저장되며 콜백에서 검증 후 즉시 폐기.
 * `USER_SESSION_SECRET` 와 별도 솔트로 서명 → 세션 토큰과 충돌 안 함.
 */
export const OAUTH_STATE_COOKIE = "tkad_oauth_state";

const MAX_AGE_SEC = 60 * 10; // 10분
const SALT = "tkad.oauth.state.v1";

type StatePayload = {
  v: 1;
  state: string; // 32바이트 base64url
  provider: OAuthProviderId;
  redirect: string; // 로그인 성공 후 이동할 내부 경로
  exp: number; // ms
};

function secret(): string | null {
  const s = process.env.USER_SESSION_SECRET?.trim();
  if (s) return s;
  if (process.env.NODE_ENV !== "production") {
    return "dev-user-session-secret-change-in-prod";
  }
  return null;
}

function sign(payload: string, key: string): string {
  return createHmac("sha256", `${key}|${SALT}`).update(payload).digest("base64url");
}

export function randomState(): string {
  return randomBytes(24).toString("base64url");
}

export function encodeStateCookie(payload: {
  state: string;
  provider: OAuthProviderId;
  redirect: string;
}): string | null {
  const key = secret();
  if (!key) return null;
  const body: StatePayload = {
    v: 1,
    state: payload.state,
    provider: payload.provider,
    redirect: payload.redirect,
    exp: Date.now() + MAX_AGE_SEC * 1000,
  };
  const json = JSON.stringify(body);
  const enc = Buffer.from(json, "utf8").toString("base64url");
  const sig = sign(json, key);
  return `${enc}.${sig}`;
}

export function decodeStateCookie(
  raw: string | undefined,
): StatePayload | null {
  if (!raw) return null;
  const key = secret();
  if (!key) return null;
  const dot = raw.indexOf(".");
  if (dot <= 0) return null;
  const enc = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  let json: string;
  try {
    json = Buffer.from(enc, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const expected = sign(json, key);
  try {
    if (expected.length !== sig.length) return null;
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  } catch {
    return null;
  }
  let body: StatePayload;
  try {
    body = JSON.parse(json) as StatePayload;
  } catch {
    return null;
  }
  if (body.v !== 1) return null;
  if (typeof body.state !== "string" || typeof body.redirect !== "string") return null;
  if (typeof body.exp !== "number" || Date.now() > body.exp) return null;
  if (body.provider !== "kakao" && body.provider !== "naver") return null;
  return body;
}

export function oauthStateCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SEC,
  };
}
