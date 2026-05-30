/**
 * Vercel production builds: skip catalog-heavy static pre-rendering so parallel
 * DB catalog/detail fetches do not hit the 60s per-page SSG limit.
 * Affected routes use `dynamicParams` + `force-dynamic` instead.
 *
 * `vercel-build` sets `SKIP_CATALOG_HEAVY_SSG=1` so this stays on even if
 * `VERCEL` is unset during a step. Set `SKIP_CATALOG_HEAVY_SSG=0` to opt out.
 */
export function deferCatalogLandingStaticGeneration(): boolean {
  if (process.env.SKIP_CATALOG_HEAVY_SSG === "0") return false;
  if (process.env.SKIP_CATALOG_HEAVY_SSG === "1") return true;
  return process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV);
}

/** True during Vercel CI builds (used by scripts; segment config must stay literal). */
export function isVercelBuild(): boolean {
  return deferCatalogLandingStaticGeneration();
}
