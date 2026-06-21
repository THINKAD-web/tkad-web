import {
  flattenMediaCategories,
  getChildCategories,
  getMediaCategoryBySlug,
  getTargetCategoryBySlug,
  TARGET_CATEGORIES,
  categoryLabel,
  targetLabel,
} from "@/lib/media-categories";
import type { MediaItem } from "@/lib/media-data";
import {
  isTier1MediaCategorySlug,
  tier1CategoryHeroTitle,
  tier1CategoryLandingDescription,
  tier1CategoryLandingTitle,
} from "@/lib/seo-landing-copy";

export const KNOWN_MEDIA_CATEGORY_SLUGS = flattenMediaCategories().map(
  (c) => c.slug,
);
export const KNOWN_TARGET_SLUGS = TARGET_CATEGORIES.map((t) => t.slug);

/** 랜딩·칩용 — 대표 슬러그만 */
export const FEATURED_MEDIA_CATEGORY_SLUGS = [
  "subway",
  "billboard",
  "dooh",
  "campus",
  "retail",
  "local",
] as const;

export const FEATURED_TARGET_SLUGS = [
  "brand",
  "fandom",
  "small_business",
  "event",
] as const;

export function mediaMatchesCategorySlug(
  m: MediaItem,
  slug: string,
): boolean {
  const cats = m.mediaCategory ?? [];
  if (cats.length === 0) return false;
  if (cats.includes(slug)) return true;
  const children = getChildCategories(slug).map((c) => c.slug);
  if (children.length > 0 && cats.some((c) => children.includes(c) || c === slug)) {
    return true;
  }
  const node = getMediaCategoryBySlug(slug);
  if (node?.parentId && cats.includes(node.parentId)) return true;
  return false;
}

export function mediaMatchesTargetSlug(m: MediaItem, slug: string): boolean {
  const cats = m.targetCategory ?? [];
  if (cats.includes(slug)) return true;
  if (slug === "seasonal" && cats.includes("event")) return true;
  if (slug === "global" && cats.includes("brand")) return true;
  return false;
}

export function filterCatalogByCategorySlug(
  catalog: MediaItem[],
  slug: string,
  limit = 12,
): MediaItem[] {
  return catalog.filter((m) => mediaMatchesCategorySlug(m, slug)).slice(0, limit);
}

export function filterCatalogByTargetSlug(
  catalog: MediaItem[],
  slug: string,
  limit = 12,
): MediaItem[] {
  return catalog.filter((m) => mediaMatchesTargetSlug(m, slug)).slice(0, limit);
}

export function categoryLandingTitle(
  slug: string,
  locale: string,
  count: number,
): string {
  if (isTier1MediaCategorySlug(slug)) {
    const tier1 = tier1CategoryLandingTitle(slug, locale, count);
    if (tier1) return tier1;
  }
  const label = categoryLabel(slug, locale);
  const isKo = locale.startsWith("ko");
  if (isKo) {
    const countPart = count > 0 ? ` ${count}개` : "";
    return `${label} 광고 단가${countPart} 비교 | THINKAD`;
  }
  const countPart = count > 0 ? ` — ${count} verified` : "";
  return `${label} OOH pricing${countPart} | THINKAD`;
}

export function categoryLandingDescription(
  slug: string,
  locale: string,
  count: number,
): string {
  if (isTier1MediaCategorySlug(slug)) {
    const tier1 = tier1CategoryLandingDescription(slug, locale, count);
    if (tier1) return tier1;
  }
  const node = getMediaCategoryBySlug(slug);
  const label = categoryLabel(slug, locale);
  const isKo = locale.startsWith("ko");
  if (isKo) {
    const base =
      node?.descriptionKo ??
      node?.heroSubtitleKo ??
      `${label} 광고 매체를 한눈에 비교하세요.`;
    const countPart = count > 0 ? `${count}개 ` : "";
    return `전국 ${label} 광고 ${countPart}매체. 월 단가·위치 비교. ${base} THINKAD 싱커드.`;
  }
  const base =
    node?.descriptionEn ??
    node?.heroSubtitleEn ??
    `Compare ${label.toLowerCase()} OOH media.`;
  const countPart = count > 0 ? `${count} ` : "";
  return `${countPart}${label} media listings. Compare monthly rates and locations. ${base} THINKAD.`;
}

export function categoryHeroTitle(slug: string, locale: string, count: number): string {
  if (isTier1MediaCategorySlug(slug)) {
    const tier1 = tier1CategoryHeroTitle(slug, locale, count);
    if (tier1) return tier1;
  }
  const label = categoryLabel(slug, locale);
  const isKo = locale.startsWith("ko");
  if (isKo) {
    const countPart = count > 0 ? `${count}개` : "";
    return countPart
      ? `${label} 광고 — 검증 매체 ${countPart}`
      : `${label} 광고 — 단가·비용 비교`;
  }
  return count > 0
    ? `${label} advertising — ${count} verified media`
    : `${label} advertising — compare pricing`;
}

export function targetLandingTitle(
  slug: string,
  locale: string,
  count: number,
): string {
  const label = targetLabel(slug, locale);
  const isKo = locale.startsWith("ko");
  if (isKo) {
    if (slug === "fandom") return "아이돌 생일광고 · 팬클럽 응원광고 | THINKAD";
    return `${label} 광고 매체 | THINKAD 싱커드`;
  }
  return `${label} campaigns — ${count} media · THINKAD`;
}

export function targetLandingDescription(
  slug: string,
  locale: string,
  count: number,
): string {
  const node = getTargetCategoryBySlug(slug);
  const isKo = locale.startsWith("ko");
  if (isKo) {
    return (
      node?.descriptionKo ??
      `${targetLabel(slug, locale)} 목적에 맞는 옥외광고 매체 ${count}개를 추천합니다.`
    );
  }
  return (
    node?.descriptionEn ??
    `${count} OOH media suited for ${targetLabel(slug, locale).toLowerCase()} campaigns.`
  );
}

export function targetHeroTitle(slug: string, locale: string): string {
  const isKo = locale.startsWith("ko");
  if (slug === "fandom" && isKo) {
    return "내 최애의 특별한 날을 더 빛나게";
  }
  return isKo
    ? `${targetLabel(slug, locale)} — 맞춤 매체 찾기`
    : `${targetLabel(slug, locale)} — find your media`;
}
