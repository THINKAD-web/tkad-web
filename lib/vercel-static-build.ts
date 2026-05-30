/**
 * Vercel production builds: skip catalog-heavy `generateStaticParams` so
 * hundreds of parallel `fetchPublicMediaCatalog()` calls do not hit the 60s
 * per-page SSG limit. Pages stay available via ISR (`dynamicParams` + `revalidate`).
 */
export function deferCatalogLandingStaticGeneration(): boolean {
  return (
    process.env.VERCEL === "1" &&
    process.env.SKIP_CATALOG_HEAVY_SSG !== "0"
  );
}
