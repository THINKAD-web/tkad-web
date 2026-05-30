import { siteUrl } from "@/lib/seo";

/**
 * NextAuth + Kakao/Naver Redirect URI 의 canonical origin.
 * 요청 Host(vercel.app 프리뷰 등)보다 AUTH_URL / SITE_URL 을 우선합니다.
 */
export function resolveAuthOrigin(requestOrigin?: string): string {
  const candidates = [
    process.env.AUTH_URL?.trim(),
    process.env.NEXTAUTH_URL?.trim(),
    process.env.NEXT_PUBLIC_SITE_URL?.trim(),
    process.env.SITE_URL?.trim(),
    siteUrl,
    requestOrigin?.trim(),
  ].filter(Boolean) as string[];

  for (const raw of candidates) {
    try {
      const withProto = raw.includes("://") ? raw : `https://${raw}`;
      return new URL(withProto).origin;
    } catch {
      /* try next */
    }
  }

  return "https://app.tkad.co.kr";
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
