export const dynamic = "force-dynamic";
export const revalidate = 0;

import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import { resolveAllMediaPackages } from "@/lib/media-packages";
import { PackagesPageClient } from "@/components/packages/packages-page-client";

export default async function MediaPackagesPage() {
  const catalog = await fetchPublicMediaCatalog();
  const packages = resolveAllMediaPackages(catalog);

  return <PackagesPageClient packages={packages} />;
}
