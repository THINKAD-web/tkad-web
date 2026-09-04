/** @see lib/integrated/mix-e2e-bypass.ts */
export const E2E_MIX_BYPASS_HEADER = "x-tkad-e2e-mix-bypass";

/** Playwright `extraHTTPHeaders` for integrated mix E2E scripts. */
export function e2eMixBypassHeaders() {
  const secret = process.env.TKAD_E2E_MIX_BYPASS_SECRET?.trim();
  if (!secret) {
    console.warn(
      "[warn] TKAD_E2E_MIX_BYPASS_SECRET unset — mix E2E may flake on trial cookie / rate limit",
    );
    return {};
  }
  return { [E2E_MIX_BYPASS_HEADER]: secret };
}
