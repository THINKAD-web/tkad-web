/**
 * OAuth pending 쿠키 HMAC + 사용자 세션(`tkad_user_session`) 서명에 동일한 시크릿 우선순위.
 * AUTH_SECRET 과 USER_SESSION_SECRET 이 둘 다 있을 때 순서가 어긋나면 로그인 직후 세션이 깨집니다.
 */
export function readOAuthHmacSecret(): string | undefined {
  return (
    process.env.USER_SESSION_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    undefined
  );
}

export function readOAuthHmacSecretOrDev(): string | null {
  const fromEnv = readOAuthHmacSecret();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV !== "production") {
    return "dev-oauth-hmac-secret";
  }
  return null;
}
