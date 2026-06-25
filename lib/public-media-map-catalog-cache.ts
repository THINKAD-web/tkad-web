import {
  fetchPublicMediaMapCatalog,
  type PublicMediaMapCatalogSnapshot,
} from "@/lib/public-media-map-catalog";

/** 프로세스 내 map 카탈로그 TTL (ms) */
export const PUBLIC_MEDIA_MAP_CATALOG_TTL_MS = 60_000;

let cached: { expiresAt: number; data: PublicMediaMapCatalogSnapshot } | null =
  null;

export function invalidatePublicMediaMapCatalogCache(): void {
  cached = null;
}

export async function getPublicMediaMapCatalogCached(): Promise<PublicMediaMapCatalogSnapshot> {
  const now = Date.now();
  if (cached && now <= cached.expiresAt) {
    return cached.data;
  }
  const data = await fetchPublicMediaMapCatalog();
  cached = { expiresAt: now + PUBLIC_MEDIA_MAP_CATALOG_TTL_MS, data };
  return data;
}
