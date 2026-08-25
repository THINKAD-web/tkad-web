import { revalidatePath, revalidateTag } from "next/cache";
import { PUBLIC_MEDIA_CATALOG_CACHE_TAG } from "@/lib/public-media-catalog";
import { MEDIA_TRUST_BADGE_CONTEXT_CACHE_TAG } from "@/lib/media-trust-catalog";

const MEDIA_CACHE_LOCALES = ["ko", "en"] as const;

/**
 * 단일 매체 등록/수정/삭제 시 영향받는 캐시만 정밀 무효화.
 *
 * - 무효화 대상: 해당 매체 상세(`/media/{slug}`, `/media/{id}`) + 공개 목록(`/media`).
 *   상세 경로는 리터럴 path 이므로 Route Handler 에서 호출 시 "그 페이지 1개"만
 *   stale 처리되고 다음 방문 때 갱신된다(즉시 반영 보장, wave 없음).
 * - 의도적으로 `/planner`·`/quote`·`/compare` 는 건드리지 않는다. 이들은
 *   revalidate=86400 상세/목록은 어드민 편집 시에만 여기서 무효화한다.
 *   planner·quote·compare 까지 매 편집마다 건드리면 ISR write wave 가 난다.
 */
export function revalidateMediaCaches(ref: {
  id: string;
  slug?: string | null;
}): void {
  const detailRefs = new Set<string>([ref.id]);
  const slug = ref.slug?.trim();
  if (slug) detailRefs.add(slug);
  try {
    revalidateTag(PUBLIC_MEDIA_CATALOG_CACHE_TAG, "max");
    revalidateTag(MEDIA_TRUST_BADGE_CONTEXT_CACHE_TAG, "max");
    for (const locale of MEDIA_CACHE_LOCALES) {
      revalidatePath(`/${locale}/media`);
      for (const detailRef of detailRefs) {
        revalidatePath(`/${locale}/media/${detailRef}`);
      }
    }
  } catch {
    /* revalidatePath 는 build/script 등 일부 환경에서만 no-op */
  }
}

/**
 * 대량 임포트 전용: 공개 목록은 로케일당 1회만 무효화(행별 wave 방지),
 * 영향 상세는 매체별로 1회씩만 무효화(중복 제거).
 */
export function revalidateMediaCachesBulk(
  refs: ReadonlyArray<{ id: string; slug?: string | null }>,
): void {
  try {
    revalidateTag(PUBLIC_MEDIA_CATALOG_CACHE_TAG, "max");
    revalidateTag(MEDIA_TRUST_BADGE_CONTEXT_CACHE_TAG, "max");
    for (const locale of MEDIA_CACHE_LOCALES) {
      revalidatePath(`/${locale}/media`);
    }
    const seen = new Set<string>();
    for (const ref of refs) {
      const detailRef = ref.slug?.trim() || ref.id;
      if (seen.has(detailRef)) continue;
      seen.add(detailRef);
      for (const locale of MEDIA_CACHE_LOCALES) {
        revalidatePath(`/${locale}/media/${detailRef}`);
      }
    }
  } catch {
    /* optional */
  }
}
