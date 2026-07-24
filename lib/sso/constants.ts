/** Cross-brand SSO (THINKAD IdP → THINKAD Digital RP). */

export const SSO_CODE_TTL_SEC = 60;
export const SSO_PENDING_COOKIE = "tkad_sso_pending";
export const SSO_PENDING_MAX_AGE_SEC = 60 * 10;

export const DEFAULT_SSO_DIGITAL_ORIGIN = "https://digital.tkad.co.kr";

export function ssoDigitalOrigin(): string {
  const fromEnv = process.env.SSO_DIGITAL_ORIGIN?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return DEFAULT_SSO_DIGITAL_ORIGIN;
}
