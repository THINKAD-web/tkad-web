import { THINKAD_DIGITAL_URL } from "@/lib/navigation/cross-brand";

/** Digital origin for internal catalog/mix calls. Preview must point at Preview Digital. */
export function readDigitalOrigin(): string {
  const fromEnv = process.env.DIGITAL_ORIGIN?.trim() || process.env.SSO_DIGITAL_ORIGIN?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return THINKAD_DIGITAL_URL.replace(/\/$/, "");
}
