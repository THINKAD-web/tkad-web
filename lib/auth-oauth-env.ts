/**
 * 카카오/네이버 OAuth + NextAuth 에 필요한 환경변수 검증.
 * Vercel 등 production 에서 누락 시 NextAuth "server configuration" 오류를 방지합니다.
 */

export type OAuthProvider = "kakao" | "naver";

export type AuthEnvIssue = {
  key: string;
  messageKo: string;
};

const PROVIDER_LABEL: Record<OAuthProvider, string> = {
  kakao: "카카오",
  naver: "네이버",
};

const PROVIDER_ENV: Record<
  OAuthProvider,
  { clientId: string; clientSecret: string }
> = {
  kakao: {
    clientId: "KAKAO_CLIENT_ID",
    clientSecret: "KAKAO_CLIENT_SECRET",
  },
  naver: {
    clientId: "NAVER_CLIENT_ID",
    clientSecret: "NAVER_CLIENT_SECRET",
  },
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
  return Boolean(
    process.env.KAKAO_CLIENT_ID?.trim() &&
      process.env.KAKAO_CLIENT_SECRET?.trim(),
  );
}

export function isNaverOAuthConfigured(): boolean {
  return Boolean(
    process.env.NAVER_CLIENT_ID?.trim() &&
      process.env.NAVER_CLIENT_SECRET?.trim(),
  );
}

export function isProviderConfigured(provider: OAuthProvider): boolean {
  return provider === "kakao"
    ? isKakaoOAuthConfigured()
    : isNaverOAuthConfigured();
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
  const { clientId, clientSecret } = PROVIDER_ENV[provider];
  const label = PROVIDER_LABEL[provider];

  if (!process.env[clientId]?.trim()) {
    issues.push({
      key: clientId,
      messageKo: `${clientId} 환경변수 누락 (${label} 로그인 설정 오류)`,
    });
  }
  if (!process.env[clientSecret]?.trim()) {
    issues.push({
      key: clientSecret,
      messageKo: `${clientSecret} 환경변수 누락 (${label} 로그인 설정 오류)`,
    });
  }

  return issues;
}

export function collectOAuthLoginIssues(
  provider: OAuthProvider,
): AuthEnvIssue[] {
  return [...collectAuthSecretIssues(), ...collectProviderIssues(provider)];
}

export function oauthLoginUserMessage(provider: OAuthProvider): string {
  const label = PROVIDER_LABEL[provider];
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
    userMessage: oauthLoginUserMessage(provider),
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
  "USER_SESSION_SECRET",
  "KAKAO_CLIENT_ID",
  "KAKAO_CLIENT_SECRET",
  "NAVER_CLIENT_ID",
  "NAVER_CLIENT_SECRET",
  "NEXT_PUBLIC_SITE_URL",
  "DATABASE_URL",
] as const;
