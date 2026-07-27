import { THINKAD_DIGITAL_URL } from "@/lib/navigation/cross-brand";

/** Digital origin for internal catalog/mix calls. Preview must point at Preview Digital. */
export function readDigitalOrigin(): string {
  const fromEnv = process.env.DIGITAL_ORIGIN?.trim() || process.env.SSO_DIGITAL_ORIGIN?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return THINKAD_DIGITAL_URL.replace(/\/$/, "");
}

/** Vercel Deployment Protection bypass for server-to-server calls to Preview Digital. */
export function readDigitalOriginProtectionBypass(): string | null {
  const bypass =
    process.env.DIGITAL_ORIGIN_PROTECTION_BYPASS?.trim() ||
    process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
  return bypass || null;
}
