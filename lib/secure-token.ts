import { createHash, randomBytes } from "crypto";

/** URL-safe random token (32 bytes → 43 chars base64url). */
export function generateSecureToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
