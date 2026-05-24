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
  return (m.targetCategory ?? []).includes(slug);
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
  const label = categoryLabel(slug, locale);
  const isKo = locale.startsWith("ko");
  if (isKo) {
    return `${label} 광고 추천 매체 | THINKAD 싱커드`;
  }
  return `${label} OOH media — ${count} verified · THINKAD`;
}

export function categoryLandingDescription(
  slug: string,
  locale: string,
  count: number,
): string {
  const node = getMediaCategoryBySlug(slug);
  const label = categoryLabel(slug, locale);
  const isKo = locale.startsWith("ko");
  if (isKo) {
    const base =
      node?.descriptionKo ??
      node?.heroSubtitleKo ??
      `${label} 광고 매체를 한눈에 비교하세요.`;
    return `전국 ${label} 광고 ${count}개 매체. ${base}`;
  }
  const base =
    node?.descriptionEn ??
    node?.heroSubtitleEn ??
    `Compare ${label.toLowerCase()} OOH media.`;
  return `${count} ${label} media listings. ${base}`;
}

export function categoryHeroTitle(slug: string, locale: string, count: number): string {
  const label = categoryLabel(slug, locale);
  const isKo = locale.startsWith("ko");
  if (isKo) {
    if (slug === "subway") {
      return `지하철 광고 — 매일 출퇴근하는 ${count > 0 ? count : ""}개 매체`;
    }
    return `${label} 광고 — 검증 매체 ${count}개`;
  }
  return `${label} advertising — ${count} verified media`;
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
