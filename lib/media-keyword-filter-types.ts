/** `data/media-items-keyword-filter.json` — `mediaItems` 항목 스키마 */

import type { MediaPriceOption } from "@/lib/media-data";

export type KeywordFilterFacetKey =
  | "region"
  | "media"
  | "target"
  | "industry"
  | "size"
  | "duration"
  | "exposureTime"
  | "specialFeature";

export const KEYWORD_FILTER_FACET_KEYS: readonly KeywordFilterFacetKey[] = [
  "region",
  "media",
  "target",
  "industry",
  "size",
  "duration",
  "exposureTime",
  "specialFeature",
] as const;

export const KEYWORD_FILTER_FACET_LABELS_KO: Record<
  KeywordFilterFacetKey,
  string
> = {
  region: "지역",
  media: "매체",
  target: "타겟",
  industry: "업종",
  size: "규모",
  duration: "집행 기간",
  exposureTime: "노출 시간대",
  specialFeature: "스페셜",
};

export type KeywordFilterMediaItem = {
  id: string;
  /** 검색·노출용 상세 제목 (`media_name`이 있으면 카드명과 구분) */
  title: string;
  /** 실제 매체명 — 있으면 `MediaItem.name`으로 우선 사용 */
  mediaName?: string;
  /** English name for /en pages */
  nameEn?: string;
  region: string[];
  media: string[];
  target: string[];
  industry: string[];
  budgetMin: number;
  budgetMax: number;
  duration: string[];
  exposureTime: string[];
  size: string;
  features: string[];
  specialFeature: string[];
  status: string;
  priceText: string;
  thumbnail: string;
  description: string;
  searchKeywords: string[];
  /**
   * 월 단가 숫자.
   * - 기본: 만원(예: 1500 → 1,500만원)
   * - 1,000,000 이상이면 원(KRW)으로 간주(예: 15_000_000) — `priceUnit`으로 재정의 가능
   */
  price_per_month?: number;
  full_address?: string;
  city?: string;
  /** 0–100, JSON `visibilityScore` */
  visibilityScore?: number;
  /** 복수 가격 옵션 — `MediaItem.priceOptions`로 전달 */
  priceOptions?: MediaPriceOption[];
};

export type KeywordFilterSelection = Record<
  KeywordFilterFacetKey,
  string[]
>;

export function emptyKeywordFilterSelection(): KeywordFilterSelection {
  return {
    region: [],
    media: [],
    target: [],
    industry: [],
    size: [],
    duration: [],
    exposureTime: [],
    specialFeature: [],
  };
}
