import { THINKAD_DIGITAL_URL } from "@/lib/navigation/cross-brand";

function readDigitalOriginFromEnv(): string | null {
  for (const key of ["DIGITAL_ORIGIN", "SSO_DIGITAL_ORIGIN"] as const) {
    const raw = process.env[key]?.trim();
    if (raw) return raw.replace(/\/$/, "");
  }
  return null;
}

/** Digital origin for internal catalog/mix calls. Preview must point at Preview Digital. */
export function readDigitalOrigin(): string {
  return readDigitalOriginFromEnv() ?? THINKAD_DIGITAL_URL.replace(/\/$/, "");
}

/** For diagnostics — whether env explicitly set a non-empty origin. */
export function readDigitalOriginConfigured(): string | null {
  return readDigitalOriginFromEnv();
}

/** Vercel Deployment Protection bypass for server-to-server calls to Preview Digital. */
export function readDigitalOriginProtectionBypass(): string | null {
  const bypass =
    process.env.DIGITAL_ORIGIN_PROTECTION_BYPASS?.trim() ||
    process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
  return bypass || null;
}
