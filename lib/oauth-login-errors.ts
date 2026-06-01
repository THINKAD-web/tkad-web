import type { OAuthProvider } from "@/lib/auth-oauth-env";

const NEXT_AUTH_ERROR_CODES = new Set([
  "Configuration",
  "AccessDenied",
  "Verification",
  "OAuthSignin",
  "OAuthCallback",
  "OAuthCreateAccount",
  "EmailCreateAccount",
  "Callback",
  "OAuthAccountNotLinked",
  "EmailSignin",
  "CredentialsSignin",
  "SessionRequired",
]);

export function resolveOAuthLoginErrorMessage(
  error: string | null,
  provider: string | null,
  isKo: boolean,
): string | null {
  if (!error) return null;

  if (error === "oauth_config") {
    return oauthConfigMessage(provider, isKo);
  }

  if (error === "oauth_signin_failed") {
    return isKo
      ? "소셜 로그인 처리에 실패했습니다. 잠시 후 다시 시도하거나 이메일 로그인을 이용해주세요."
      : "Social sign-in failed. Please try again or use email sign-in.";
  }

  if (NEXT_AUTH_ERROR_CODES.has(error)) {
    if (error === "Configuration") {
      return isKo
        ? "로그인 서버 설정 오류입니다. AUTH_SECRET·OAuth 키를 확인해주세요."
        : "Login server configuration error. Please contact support.";
    }
    if (error === "AccessDenied") {
      return isKo
        ? "소셜 로그인이 거부되었습니다. 동의 항목을 확인하거나 이메일 로그인을 이용해주세요."
        : "Social sign-in was denied. Please try again or use email sign-in.";
    }
    if (
      error === "OAuthCallback" ||
      error === "Callback" ||
      error === "OAuthSignin"
    ) {
      return isKo
        ? "소셜 로그인 콜백 처리 중 오류가 발생했습니다. Redirect URI·Client Secret을 확인해주세요."
        : "OAuth callback failed. Please try again later.";
    }
    return isKo
      ? "소셜 로그인 중 오류가 발생했습니다. 이메일 로그인을 이용해주세요."
      : "Social sign-in failed. Please use email sign-in.";
  }

  return null;
}

function oauthConfigMessage(provider: string | null, isKo: boolean): string {
  if (provider === "kakao") {
    return isKo
      ? "카카오 로그인 설정이 완료되지 않았습니다. (KAKAO_CLIENT_SECRET 필요) 잠시 후 다시 시도하거나 이메일 로그인을 이용해주세요."
      : "Kakao login is not fully configured yet. Please use email sign-in or try again later.";
  }

  if (provider === "google") {
    return isKo
      ? "Google 로그인 설정이 완료되지 않았습니다. (GOOGLE_CLIENT_ID/SECRET 필요) 이메일 로그인을 이용해주세요."
      : "Google login is not configured yet. Please use email sign-in.";
  }

  if (provider === "naver") {
    return isKo
      ? "네이버 로그인 설정이 완료되지 않았습니다. (NAVER_CLIENT_ID/SECRET 필요) 이메일 로그인을 이용해주세요."
      : "Naver login is not configured yet. Please use email sign-in.";
  }

  return isKo
    ? "소셜 로그인 설정 오류입니다. 이메일 로그인을 이용해주세요."
    : "Social login is unavailable. Please use email sign-in.";
}

export function isOAuthProvider(value: string | null): value is OAuthProvider {
  return value === "kakao" || value === "naver" || value === "google";
}
