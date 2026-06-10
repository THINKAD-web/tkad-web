/** Cloudflare Turnstile site/secret keys are long tokens (typically 40+ chars). */
const MIN_TURNSTILE_KEY_LEN = 20;

export function isTurnstileSiteKeyConfigured(key?: string | null): boolean {
  const trimmed = key?.trim() ?? "";
  return trimmed.length >= MIN_TURNSTILE_KEY_LEN;
}

export function isTurnstileSecretConfigured(secret?: string | null): boolean {
  const trimmed = secret?.trim() ?? "";
  return trimmed.length >= MIN_TURNSTILE_KEY_LEN;
}

export function readTurnstileSiteKey(): string {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
}

export function readTurnstileSecret(): string {
  return process.env.TURNSTILE_SECRET_KEY?.trim() ?? "";
}
