import type { MediaItem } from "@/lib/media-data";
import { getMediaBrowseMockCatalog } from "@/lib/media-browse-catalog";
import { attachPublicMediaCatalogExtras } from "@/lib/attach-public-media-catalog-extras";
import { fetchPublicMediaNetworks } from "@/lib/media-network-public";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { prismaMediaToMediaItem } from "@/lib/public-media-catalog";
import { publicActiveMediaWhere } from "@/lib/media-review-status";

export type PublicMediaMapCatalogFacets = {
  regions: string[];
  types: string[];
};

export type PublicMediaMapCatalogSnapshot = {
  catalog: MediaItem[];
  facets: PublicMediaMapCatalogFacets;
};

function computeMapCatalogFacets(catalog: MediaItem[]): PublicMediaMapCatalogFacets {
  return {
    regions: Array.from(
      new Set(catalog.map((m) => m.region).filter((v): v is string => !!v)),
    ).sort(),
    types: Array.from(
      new Set(catalog.map((m) => m.type).filter((v): v is string => !!v)),
    ).sort(),
  };
}

async function appendNetworksIfAny(base: MediaItem[]): Promise<MediaItem[]> {
  try {
    const networks = await fetchPublicMediaNetworks();
    return networks.length > 0 ? [...base, ...networks] : base;
  } catch {
    return base;
  }
}

/**
 * `/api/media/map` 전용 카탈로그 — 리뷰·trust enrichment 없이 installLocations 등만 부착.
 */
export async function fetchPublicMediaMapCatalog(): Promise<PublicMediaMapCatalogSnapshot> {
  const forceMockOnly =
    process.env.PUBLIC_MEDIA_FORCE_MOCK_CATALOG === "1" ||
    process.env.PUBLIC_MEDIA_FORCE_MOCK_CATALOG === "true";

  if (!isDatabaseConfigured() || forceMockOnly) {
    const catalog = await appendNetworksIfAny(getMediaBrowseMockCatalog());
    return { catalog, facets: computeMapCatalogFacets(catalog) };
  }

  try {
    const db = getPrisma();
    const rows = await db.media.findMany({
      where: publicActiveMediaWhere(),
      orderBy: { updatedAt: "desc" },
    });
    const rowsWithCoverage = await attachPublicMediaCatalogExtras(db, rows);
    const dbItems = rowsWithCoverage.map((row) => prismaMediaToMediaItem(row));
    const catalog = await appendNetworksIfAny(dbItems);
    return { catalog, facets: computeMapCatalogFacets(catalog) };
  } catch (e) {
    console.error(
      "[fetchPublicMediaMapCatalog] DB query failed — returning empty catalog",
      e instanceof Error ? `${e.name}: ${e.message}` : e,
    );
    const catalog = await appendNetworksIfAny([]);
    return { catalog, facets: computeMapCatalogFacets(catalog) };
  }
}
