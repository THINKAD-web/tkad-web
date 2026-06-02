import { siteUrl } from "@/lib/seo";

/** OAuth Redirect URI·NextAuth baseUrl 에 허용할 프로덕션 호스트 */
const TKAD_AUTH_HOSTS = new Set([
  "tkad.co.kr",
  "www.tkad.co.kr",
  "app.tkad.co.kr",
]);

function originFromKnownHost(raw?: string): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    if (!TKAD_AUTH_HOSTS.has(url.hostname)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * NextAuth + Kakao/Naver Redirect URI 의 canonical origin.
 * 요청 Host(tkad.co.kr / app.tkad.co.kr)를 env 보다 우선 — 도메인 리다이렉트 시 콜백 불일치 방지.
 */
export function resolveAuthOrigin(requestOrigin?: string): string {
  const fromRequest = originFromKnownHost(requestOrigin);
  if (fromRequest) return fromRequest;

  const candidates = [
    process.env.AUTH_URL?.trim(),
    process.env.NEXTAUTH_URL?.trim(),
    process.env.NEXT_PUBLIC_SITE_URL?.trim(),
    process.env.SITE_URL?.trim(),
    siteUrl,
  ].filter(Boolean) as string[];

  for (const raw of candidates) {
    const fromEnv = originFromKnownHost(raw);
    if (fromEnv) return fromEnv;
    try {
      const withProto = raw.includes("://") ? raw : `https://${raw}`;
      return new URL(withProto).origin;
    } catch {
      /* try next */
    }
  }

  return "https://tkad.co.kr";
}

/** NextAuth v5: AUTH_URL / basePath(`/api/auth`) 추론용 */
export function ensureAuthEnvDefaults(): void {
  const origin = resolveAuthOrigin();
  if (!process.env.AUTH_URL?.trim()) {
    process.env.AUTH_URL = origin;
  }
  if (!process.env.NEXTAUTH_URL?.trim()) {
    process.env.NEXTAUTH_URL = process.env.AUTH_URL;
  }
}

export function authCallbackUrl(providerId: string, requestOrigin?: string): string {
  return `${resolveAuthOrigin(requestOrigin)}/api/auth/callback/${providerId}`;
}
