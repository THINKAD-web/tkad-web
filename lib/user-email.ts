export const OAUTH_PLACEHOLDER_DOMAIN = "@oauth.tkad.local";

export function isOAuthPlaceholderEmail(email: string): boolean {
  return email.includes(OAUTH_PLACEHOLDER_DOMAIN);
}

/** 이메일·비밀번호 가입자 중 아직 인증하지 않은 경우 */
export function userNeedsEmailVerification(user: {
  email: string;
  emailVerifiedAt: Date | null;
  passwordHash: string | null;
}): boolean {
  if (user.emailVerifiedAt) return false;
  if (!user.passwordHash) return false;
  if (isOAuthPlaceholderEmail(user.email)) return false;
  return true;
}
