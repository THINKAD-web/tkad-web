/**
 * OAuth client credentials — Kakao REST API 키는 로그인 client_id 로 동일합니다.
 * @see https://developers.kakao.com/docs/latest/ko/kakaologin/rest-api
 */

export function readKakaoOAuthClientId(): string | undefined {
  return (
    process.env.KAKAO_CLIENT_ID?.trim() ||
    process.env.KAKAO_LOGIN_CLIENT_ID?.trim() ||
    process.env.AUTH_KAKAO_ID?.trim() ||
    process.env.KAKAO_REST_API_KEY?.trim() ||
    undefined
  );
}

export function readKakaoOAuthClientSecret(): string | undefined {
  return (
    process.env.KAKAO_CLIENT_SECRET?.trim() ||
    process.env.KAKAO_LOGIN_CLIENT_SECRET?.trim() ||
    process.env.AUTH_KAKAO_SECRET?.trim() ||
    undefined
  );
}

export function readNaverOAuthClientId(): string | undefined {
  return (
    process.env.NAVER_CLIENT_ID?.trim() ||
    process.env.AUTH_NAVER_ID?.trim() ||
    undefined
  );
}

export function readNaverOAuthClientSecret(): string | undefined {
  return (
    process.env.NAVER_CLIENT_SECRET?.trim() ||
    process.env.AUTH_NAVER_SECRET?.trim() ||
    undefined
  );
}

export function readGoogleOAuthClientId(): string | undefined {
  return (
    process.env.GOOGLE_CLIENT_ID?.trim() ||
    process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() ||
    process.env.AUTH_GOOGLE_ID?.trim() ||
    undefined
  );
}

export function readGoogleOAuthClientSecret(): string | undefined {
  return (
    process.env.GOOGLE_CLIENT_SECRET?.trim() ||
    process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() ||
    process.env.AUTH_GOOGLE_SECRET?.trim() ||
    undefined
  );
}
