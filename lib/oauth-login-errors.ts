import type { OAuthProvider } from "@/lib/auth-oauth-env";

export function resolveOAuthLoginErrorMessage(
  error: string | null,
  provider: string | null,
  isKo: boolean,
): string | null {
  if (error !== "oauth_config") return null;

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
