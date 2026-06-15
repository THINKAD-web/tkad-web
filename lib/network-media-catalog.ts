import type { MediaCatalogSort } from "@/lib/media-catalog-types";
import type { MediaItem } from "@/lib/media-data";
import { mapMediaItemToHomeCatalog } from "@/lib/media-catalog-map";
import type { HomeCatalogMediaItem } from "@/lib/media-catalog-types";
import {
  prismaNetworkToMediaItem,
  type MediaNetworkWithLocs,
} from "@/lib/media-network-public";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  buildPublicNetworkOrderBy,
  buildPublicNetworkWhere,
} from "@/lib/public-network-query";

export async function fetchFilteredNetworkCatalogItems(opts: {
  sort: MediaCatalogSort;
  limit: number;
  skip?: number;
  networkType?: string;
  regionMain?: string;
  regionSub?: string;
  q?: string;
}): Promise<MediaItem[]> {
  if (!isDatabaseConfigured()) return [];
  try {
    const db = getPrisma();
    const where = buildPublicNetworkWhere(opts);
    const orderBy = buildPublicNetworkOrderBy(opts.sort);
    const rows = await db.mediaNetwork.findMany({
      where,
      orderBy,
      skip: opts.skip ?? 0,
      take: opts.limit,
      include: { locations: true },
    });
    return rows.map((row) =>
      prismaNetworkToMediaItem(row as MediaNetworkWithLocs),
    );
  } catch (e) {
    console.error("[fetchFilteredNetworkCatalogItems]", e);
    return [];
  }
}

export async function fetchFilteredNetworkCatalog(opts: {
  sort: MediaCatalogSort;
  limit: number;
  skip?: number;
  networkType?: string;
  regionMain?: string;
  regionSub?: string;
  q?: string;
}): Promise<HomeCatalogMediaItem[]> {
  const items = await fetchFilteredNetworkCatalogItems(opts);
  return items.map(mapMediaItemToHomeCatalog);
}

export async function countNetworkCatalog(opts: {
  networkType?: string;
  regionMain?: string;
  regionSub?: string;
  q?: string;
}): Promise<number> {
  if (!isDatabaseConfigured()) return 0;
  try {
    const db = getPrisma();
    return await db.mediaNetwork.count({
      where: buildPublicNetworkWhere(opts),
    });
  } catch {
    return 0;
  }
}
