/**
 * PR5-c — force local digital catalog/mix (skip dmpilot M2M) for verification.
 * Set `DIGITAL_FORCE_LOCAL=1` on Preview to test local-only without env-wide outage.
 */
export function isDigitalForceLocal(): boolean {
  const v = process.env.DIGITAL_FORCE_LOCAL?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}
