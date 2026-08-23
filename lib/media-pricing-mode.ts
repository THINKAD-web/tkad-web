/**
 * 협의가(quote_only) 매체 SSOT.
 *
 * 외벽광고 등 price=0 이 정상인 상품. `fixed` + price≤0 은 어드민 누락 후보.
 */

import type { MediaItem } from "@/lib/media-data";
import { plannerMonthlyPriceWonForMedia } from "@/lib/planner/planner-media-quantity";

export type MediaPricingMode = "fixed" | "quote_only";

const WALL_MURAL_SUB = "wall_mural";

export function isMediaPricingMode(value: unknown): value is MediaPricingMode {
  return value === "fixed" || value === "quote_only";
}

/**
 * TODO(remove-legacy-quote-only-fallback): 마이그레이션·어드민 일괄 설정 완료 후
 * `pricingMode` 명시 필드만 본다. 그 전까지 외벽+무단가 레거시만 폴백.
 */
export function isQuoteOnlyMedia(m: Pick<MediaItem, "id" | "pricingMode" | "mediaSubCategory" | "price" | "priceOptions" | "pricePeriod">): boolean {
  if (m.pricingMode === "quote_only") return true;
  if (m.pricingMode === "fixed") return false;
  return legacyQuoteOnlyFallback(m);
}

function legacyQuoteOnlyFallback(
  m: Pick<MediaItem, "mediaSubCategory" | "price" | "priceOptions">,
): boolean {
  if (m.mediaSubCategory !== WALL_MURAL_SUB) return false;
  if (plannerMonthlyPriceWonForMedia(m as MediaItem) > 0) return false;
  const opts = m.priceOptions ?? [];
  const hasPositiveOption = opts.some(
    (o) => typeof o.price === "number" && o.price > 0,
  );
  return !hasPositiveOption;
}

export function portfolioQuoteOnlyMedia(
  portfolio: readonly MediaItem[],
): MediaItem[] {
  return portfolio.filter((m) => isQuoteOnlyMedia(m));
}

/** 보고서·카드 공통 — 「문의」 */
export function mediaQuoteOnlyLabel(isKo: boolean): string {
  return isKo ? "문의" : "Inquiry";
}

/**
 * 협의가 매체 묶음 라벨 — 현재는 외벽만이므로 「외벽」, 혼합 시 일반화.
 */
export function quoteOnlyGroupLabel(
  items: readonly MediaItem[],
  isKo: boolean,
): string {
  if (items.length === 0) return isKo ? "매체" : "media";
  const allWall = items.every((m) => m.mediaSubCategory === WALL_MURAL_SUB);
  if (allWall) return isKo ? "외벽" : "wall";
  return isKo ? "협의가 매체" : "on-request media";
}

/** 어드민 신규 등록 — 외벽 소분류면 기본 quote_only */
export function defaultPricingModeForBrowseSub(
  mediaSubCategory: string | null | undefined,
): MediaPricingMode {
  return mediaSubCategory?.trim() === WALL_MURAL_SUB ? "quote_only" : "fixed";
}
