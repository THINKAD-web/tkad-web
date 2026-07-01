/**
 * 미구현 special 랜딩 slug → /media 타겟 필터 영구 리다이렉트.
 * 키는 lib/media-campaign-target-cards.ts · MEDIA_TARGET_PAGE_CHIPS 와 동일.
 */
export const SPECIAL_SLUG_MEDIA_TARGET_REDIRECTS: Readonly<
  Record<string, string>
> = {
  popup: "event",
  local: "small_business",
  campus: "university",
} as const;

export function getSpecialSlugMediaTargetRedirect(
  slug: string,
): string | undefined {
  const key = decodeURIComponent(slug).trim().toLowerCase();
  return SPECIAL_SLUG_MEDIA_TARGET_REDIRECTS[key];
}

export function specialSlugRedirectPath(
  locale: string,
  slug: string,
): string | undefined {
  const target = getSpecialSlugMediaTargetRedirect(slug);
  if (!target) return undefined;
  const qs = new URLSearchParams({ target });
  return `/${locale}/media?${qs.toString()}`;
}
