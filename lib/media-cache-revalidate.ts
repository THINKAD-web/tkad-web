import { revalidatePath, revalidateTag } from "next/cache";
import {
  PUBLIC_MEDIA_CATALOG_DETAIL_CACHE_TAG,
  PUBLIC_MEDIA_CATALOG_LIST_CACHE_TAG,
} from "@/lib/media-catalog-cache-tags";
import { MEDIA_TRUST_BADGE_CONTEXT_CACHE_TAG } from "@/lib/media-trust-catalog";

const MEDIA_CACHE_LOCALES = ["ko", "en"] as const;

/**
 * `export const revalidate` + CDN Cache-Control 로 edge 캐시되는 공개 API.
 * tag 무효화만으로는 Vercel CDN 이 stale 응답을 계속 줄 수 있어 path 도 함께 무효화.
 */
const PUBLIC_MEDIA_CDN_CACHED_API_PATHS = [
  "/api/public/media-filter-counts",
  "/api/public/media-catalog",
] as const;

function revalidatePublicMediaCatalogApiPaths(): void {
  for (const path of PUBLIC_MEDIA_CDN_CACHED_API_PATHS) {
    revalidatePath(path);
  }
}

export type RevalidateMediaCachesOptions = {
  /** When false, skip list/browse tag + list path (detail-only admin edit). Default true. */
  invalidateList?: boolean;
};

function revalidateDetailMediaPaths(detailRefs: Set<string>): void {
  for (const locale of MEDIA_CACHE_LOCALES) {
    for (const detailRef of detailRefs) {
      revalidatePath(`/${locale}/media/${detailRef}`);
    }
  }
}

/**
 * 단일 매체 등록/수정/삭제 시 영향받는 캐시만 정밀 무효화.
 *
 * List tag (`public-media-catalog-list`) — browse/landing ISR only.
 * Detail tag (`public-media-catalog-detail`) — per-slug detail Data Cache.
 */
export function revalidateMediaCaches(
  ref: { id: string; slug?: string | null },
  opts?: RevalidateMediaCachesOptions,
): void {
  const invalidateList = opts?.invalidateList !== false;
  const detailRefs = new Set<string>([ref.id]);
  const slug = ref.slug?.trim();
  if (slug) detailRefs.add(slug);

  try {
    revalidateTag(PUBLIC_MEDIA_CATALOG_DETAIL_CACHE_TAG, "max");
    revalidateTag(MEDIA_TRUST_BADGE_CONTEXT_CACHE_TAG, "max");
    revalidateDetailMediaPaths(detailRefs);

    if (invalidateList) {
      revalidateTag(PUBLIC_MEDIA_CATALOG_LIST_CACHE_TAG, "max");
      revalidatePublicMediaCatalogApiPaths();
      for (const locale of MEDIA_CACHE_LOCALES) {
        revalidatePath(`/${locale}/media`);
      }
    }
  } catch {
    /* revalidatePath 는 build/script 등 일부 환경에서만 no-op */
  }
}

/**
 * 대량 임포트 전용: list tag 1회 + 영향 상세 path만 (행별 list wave 방지).
 */
export function revalidateMediaCachesBulk(
  refs: ReadonlyArray<{ id: string; slug?: string | null }>,
): void {
  try {
    revalidateTag(PUBLIC_MEDIA_CATALOG_LIST_CACHE_TAG, "max");
    revalidateTag(PUBLIC_MEDIA_CATALOG_DETAIL_CACHE_TAG, "max");
    revalidateTag(MEDIA_TRUST_BADGE_CONTEXT_CACHE_TAG, "max");
    revalidatePublicMediaCatalogApiPaths();
    for (const locale of MEDIA_CACHE_LOCALES) {
      revalidatePath(`/${locale}/media`);
    }
    const seen = new Set<string>();
    for (const ref of refs) {
      const detailRef = ref.slug?.trim() || ref.id;
      if (seen.has(detailRef)) continue;
      seen.add(detailRef);
      revalidateDetailMediaPaths(new Set([detailRef]));
    }
  } catch {
    /* optional */
  }
}
