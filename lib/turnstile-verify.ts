/**
 * Cloudflare Turnstile server-side verification.
 * @see https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */

import {
  isTurnstileSecretConfigured,
  readTurnstileSecret,
} from "@/lib/turnstile-config";

/**
 * Turnstile site key 가 등록된 운영 도메인 목록.
 * vercel.app preview / localhost 등 다른 호스트에서는 Turnstile 우회.
 *
 * 환경변수 TURNSTILE_REQUIRED_HOSTS 로 override 가능 (콤마 구분).
 */
function getProductionHosts(): string[] {
  const env = process.env.TURNSTILE_REQUIRED_HOSTS?.trim();
  if (env) return env.split(",").map((h) => h.trim()).filter(Boolean);
  return ["tkad.co.kr", "www.tkad.co.kr"];
}

/** 요청 host 가 Turnstile 필수 도메인인지. dev/preview/localhost → false. */
export function shouldRequireTurnstile(hostHeader: string | null | undefined): boolean {
  if (!hostHeader) return false;
  const host = hostHeader.split(":")[0].toLowerCase().trim();
  return getProductionHosts().includes(host);
}

export async function verifyTurnstileToken(
  token: string | undefined,
  remoteip: string | undefined,
): Promise<{ ok: true; bypassed?: boolean } | { ok: false; reason: string }> {
  const secret = readTurnstileSecret();
  if (!isTurnstileSecretConfigured(secret)) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[turnstile] TURNSTILE_SECRET_KEY not configured — verification bypassed",
      );
    }
    return { ok: true, bypassed: true };
  }
  if (!token?.trim()) {
    return { ok: false, reason: "missing_token" };
  }

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token.trim());
  if (remoteip) body.set("remoteip", remoteip);

  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    },
  );

  if (!res.ok) {
    return { ok: false, reason: "verify_http_error" };
  }

  const data = (await res.json()) as {
    success?: boolean;
    "error-codes"?: string[];
  };
  if (data.success !== true) {
    return {
      ok: false,
      reason: data["error-codes"]?.join(",") ?? "verify_failed",
    };
  }
  return { ok: true };
}

/**
 * 호스트 기반 Turnstile 검증 — vercel preview / localhost 등은 우회.
 * Community / Contact 등 다중 도메인 사용 라우트에서 사용.
 */
export async function verifyTurnstileForRequest(params: {
  token: string | undefined;
  remoteip: string | undefined;
  host: string | null | undefined;
}): Promise<{ ok: true; bypassed?: boolean } | { ok: false; reason: string }> {
  if (!shouldRequireTurnstile(params.host)) {
    return { ok: true, bypassed: true };
  }
  return verifyTurnstileToken(params.token, params.remoteip);
}

