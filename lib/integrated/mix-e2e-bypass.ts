/** Header sent by Playwright E2E to skip trial cookie + rate limit on mix API. */
export const INTEGRATED_MIX_E2E_BYPASS_HEADER = "x-tkad-e2e-mix-bypass";

/**
 * When `TKAD_E2E_MIX_BYPASS_SECRET` matches the request header, automated
 * tests may call POST /api/integrated/mix repeatedly without hitting the
 * anonymous trial cookie or per-IP rate limit.
 */
export function isIntegratedMixE2eBypass(req: Request): boolean {
  const secret = process.env.TKAD_E2E_MIX_BYPASS_SECRET?.trim();
  if (!secret) return false;
  const provided = req.headers.get(INTEGRATED_MIX_E2E_BYPASS_HEADER)?.trim();
  return provided === secret;
}
