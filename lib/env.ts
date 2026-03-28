const requiredVars = ["DATABASE_URL"] as const;

const optionalVars = [
  "DATABASE_POOL_MAX",
  "SITE_URL",
] as const;

export function validateEnv() {
  const missing = requiredVars.filter((v) => !process.env[v]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  const warnings: string[] = [];
  for (const v of optionalVars) {
    if (!process.env[v]?.trim()) {
      warnings.push(v);
    }
  }
  if (warnings.length > 0 && process.env.NODE_ENV !== "production") {
    console.warn(
      `[env] Optional vars not set: ${warnings.join(", ")}`,
    );
  }
}

export function getEnv(key: string, fallback?: string): string {
  const value = process.env[key]?.trim();
  if (!value) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  return value;
}

export const SITE_URL =
  process.env.SITE_URL?.trim() || "https://tkad.co.kr";
