/**
 * Vercel production builds: skip catalog-heavy static pre-rendering so parallel
 * DB catalog/detail fetches do not hit the 60s per-page SSG limit.
 * Affected routes use `dynamicParams` + `revalidate` or `force-dynamic` instead.
 */
export function deferCatalogLandingStaticGeneration(): boolean {
  return (
    process.env.VERCEL === "1" &&
    process.env.SKIP_CATALOG_HEAVY_SSG !== "0"
  );
}
