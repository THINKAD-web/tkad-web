/**
 * 소셜 OAuth + NextAuth 에 필요한 환경변수 검증.
 * Vercel 등 production 에서 누락 시 NextAuth "server configuration" 오류를 방지합니다.
 */

import {
  readGoogleOAuthClientId,
  readGoogleOAuthClientSecret,
  readKakaoOAuthClientId,
  readKakaoOAuthClientSecret,
  readNaverOAuthClientId,
  readNaverOAuthClientSecret,
} from "@/lib/oauth-credentials";

export type OAuthProvider = "kakao" | "naver" | "google";

export type AuthEnvIssue = {
  key: string;
  messageKo: string;
};

const PROVIDER_LABEL: Record<OAuthProvider, string> = {
  kakao: "카카오",
  naver: "네이버",
  google: "Google",
};

/** NextAuth JWT/쿠키 서명 + OAuth pending 쿠키 HMAC */
export function readAuthSecret(): string | undefined {
  return (
    process.env.AUTH_SECRET?.trim() ||
    process.env.USER_SESSION_SECRET?.trim() ||
    undefined
  );
}

/** 사용자 세션 쿠키 (`tkad_user_session`) HMAC */
export function readUserSessionSecret(): string | undefined {
  return process.env.USER_SESSION_SECRET?.trim() || undefined;
}

export function isAuthSecretConfigured(): boolean {
  if (readAuthSecret()) return true;
  if (process.env.NODE_ENV !== "production") return true;
  return false;
}

export function isKakaoOAuthConfigured(): boolean {
  return Boolean(readKakaoOAuthClientId() && readKakaoOAuthClientSecret());
}

export function isNaverOAuthConfigured(): boolean {
  return Boolean(readNaverOAuthClientId() && readNaverOAuthClientSecret());
}

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(readGoogleOAuthClientId() && readGoogleOAuthClientSecret());
}

export function isProviderConfigured(provider: OAuthProvider): boolean {
  if (provider === "kakao") return isKakaoOAuthConfigured();
  if (provider === "naver") return isNaverOAuthConfigured();
  return isGoogleOAuthConfigured();
}

export function collectAuthSecretIssues(): AuthEnvIssue[] {
  const issues: AuthEnvIssue[] = [];
  if (!process.env.AUTH_SECRET?.trim() && !process.env.USER_SESSION_SECRET?.trim()) {
    issues.push({
      key: "AUTH_SECRET",
      messageKo:
        "AUTH_SECRET 또는 USER_SESSION_SECRET 환경변수가 설정되지 않았습니다.",
    });
  }
  return issues;
}

export function collectProviderIssues(
  provider: OAuthProvider,
): AuthEnvIssue[] {
  const issues: AuthEnvIssue[] = [];
  const label = PROVIDER_LABEL[provider];

  if (provider === "kakao") {
    const clientId = readKakaoOAuthClientId();
    const clientSecret = readKakaoOAuthClientSecret();

    if (!clientId) {
      issues.push({
        key: "KAKAO_CLIENT_ID",
        messageKo: `KAKAO_CLIENT_ID 또는 KAKAO_REST_API_KEY 누락 (${label} 로그인)`,
      });
    }
    if (!clientSecret) {
      issues.push({
        key: "KAKAO_CLIENT_SECRET",
        messageKo: `KAKAO_CLIENT_SECRET 누락 (${label} 개발자 콘솔 → 보안 → Client Secret)`,
      });
    }
    return issues;
  }

  if (provider === "google") {
    if (!readGoogleOAuthClientId()) {
      issues.push({
        key: "GOOGLE_CLIENT_ID",
        messageKo: `GOOGLE_CLIENT_ID 환경변수 누락 (${label} 로그인)`,
      });
    }
    if (!readGoogleOAuthClientSecret()) {
      issues.push({
        key: "GOOGLE_CLIENT_SECRET",
        messageKo: `GOOGLE_CLIENT_SECRET 환경변수 누락 (${label} Cloud Console)`,
      });
    }
    return issues;
  }

  if (!readNaverOAuthClientId()) {
    issues.push({
      key: "NAVER_CLIENT_ID",
      messageKo: `NAVER_CLIENT_ID 환경변수 누락 (${label} 로그인 설정 오류)`,
    });
  }
  if (!readNaverOAuthClientSecret()) {
    issues.push({
      key: "NAVER_CLIENT_SECRET",
      messageKo: `NAVER_CLIENT_SECRET 환경변수 누락 (${label} 로그인 설정 오류)`,
    });
  }

  return issues;
}

export function collectOAuthLoginIssues(
  provider: OAuthProvider,
): AuthEnvIssue[] {
  return [...collectAuthSecretIssues(), ...collectProviderIssues(provider)];
}

export function oauthLoginUserMessage(
  provider: OAuthProvider,
  issues?: AuthEnvIssue[],
): string {
  const label = PROVIDER_LABEL[provider];
  const missingSecret = issues?.some((i) => i.key.endsWith("_CLIENT_SECRET"));
  const missingId = issues?.some(
    (i) => i.key.endsWith("_CLIENT_ID") || i.key === "KAKAO_CLIENT_ID",
  );

  if (provider === "kakao" && missingSecret && !missingId) {
    return `${label} Client Secret(KAKAO_CLIENT_SECRET)이 설정되지 않았습니다. 관리자에게 문의해주세요.`;
  }
  if (missingId && missingSecret) {
    return `${label} 로그인 키가 설정되지 않았습니다. 관리자에게 문의해주세요.`;
  }
  return `${label} 로그인 설정 오류. 관리자에게 문의해주세요.`;
}

export type OAuthLoginConfigCheck =
  | { ok: true }
  | { ok: false; issues: AuthEnvIssue[]; userMessage: string };

export function checkOAuthLoginConfig(
  provider: OAuthProvider,
): OAuthLoginConfigCheck {
  const issues = collectOAuthLoginIssues(provider);
  if (issues.length === 0) return { ok: true };

  for (const issue of issues) {
    console.error(`[oauth/${provider}] ${issue.key}: ${issue.messageKo}`);
  }

  return {
    ok: false,
    issues,
    userMessage: oauthLoginUserMessage(provider, issues),
  };
}

export type NextAuthConfigCheck =
  | { ok: true; secret: string }
  | { ok: false; issues: AuthEnvIssue[]; userMessage: string };

/** NextAuth handlers 실행 전 필수 설정 (production) */
export function checkNextAuthConfig(): NextAuthConfigCheck {
  const issues = collectAuthSecretIssues();

  const fromEnv = readAuthSecret();
  if (fromEnv) {
    return { ok: true, secret: fromEnv };
  }

  if (process.env.NODE_ENV !== "production") {
    return { ok: true, secret: "dev-auth-secret-change-in-prod" };
  }

  for (const issue of issues) {
    console.error(`[nextauth] ${issue.key}: ${issue.messageKo}`);
  }

  return {
    ok: false,
    issues,
    userMessage:
      "로그인 서버 설정 오류. AUTH_SECRET 또는 USER_SESSION_SECRET을 확인해주세요.",
  };
}

/** Vercel 등록용 — OAuth 로그인에 필요한 키 목록 */
export const OAUTH_VERCEL_ENV_KEYS = [
  "AUTH_SECRET",
  "AUTH_URL",
  "NEXTAUTH_URL",
  "USER_SESSION_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "KAKAO_CLIENT_ID",
  "KAKAO_CLIENT_SECRET",
  "KAKAO_REST_API_KEY",
  "NAVER_CLIENT_ID",
  "NAVER_CLIENT_SECRET",
  "NEXT_PUBLIC_SITE_URL",
  "SITE_URL",
  "DATABASE_URL",
] as const;

export {
  readGoogleOAuthClientId,
  readGoogleOAuthClientSecret,
  readKakaoOAuthClientId,
  readKakaoOAuthClientSecret,
  readNaverOAuthClientId,
  readNaverOAuthClientSecret,
};
