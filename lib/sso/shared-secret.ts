import { timingSafeEqual } from "crypto";

export function readSsoSharedSecret(): string | null {
  const s = process.env.SSO_SHARED_SECRET?.trim();
  if (s) return s;
  if (process.env.NODE_ENV !== "production") {
    return "dev-sso-shared-secret";
  }
  return null;
}

export function ssoSecretsEqual(
  provided: string | null | undefined,
  expected: string | null,
): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
