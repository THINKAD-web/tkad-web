import type { CatalogChannel } from "@/lib/catalog-channel";
import type { MediaPricePeriodKey } from "@/lib/media-data";

export type HomeCatalogMediaItem = {
  id: string;
  slug?: string;
  name: string;
  /** PR3 — browse plan-cart online gate (`lib/pricing-unavailable.ts`) */
  catalogChannel?: CatalogChannel;
  type?: string;
  region?: string;
  location?: string;
  size?: string;
  dailyFootTraffic?: number;
  /** 월 노출 (DB `impressions`) — 카드 CPM 계산용 */
  impressions?: number;
  /** 월 유동 (`monthlyFootTraffic` 또는 `impressions` 폴백) */
  monthlyFootTraffic?: number;
  /** DB 저장 CPM — `resolveDisplayCpmWon` 이 재계산과 대조 */
  cpm?: number;
  visibilityScore?: number;
  features?: string;
  advertiserHistory?: string;
  trustScore?: number;
  executionCount?: number;
  lastExecutionMonthsAgo?: number | null;
  /** ISO 3166-1 alpha-2 — JJ-1 JP ¥ 표시 */
  country?: string;
  /** 목록 표시가 — `resolveMediaDisplayPrice` (최저 옵션 포함) */
  price?: number;
  pricePeriod?: MediaPricePeriodKey;
  /**
   * DB `Media.price` / 대표가 — 카드 CPM SSOT (`resolveCpmWon`).
   * `price`와 다를 수 있음(패키지 옵션형).
   */
  catalogPrice?: number;
  catalogPricePeriod?: MediaPricePeriodKey;
  /**
   * 실제 등록 상품가 (`lib/metrics/media-price-adapter`).
   * 표시가와 CPM 분자가 **같은 값**을 쓰도록 하는 단일 기준 —
   * 일/주 단가 × N 선형 환산이 아니다 (D-04/D-05).
   */
  productPriceWon?: number;
  /** `productPriceWon` 이 성립하는 실제 상품 일수 */
  productPriceDays?: number;
  /** 등록 상품과 정확히 일치하지 않아 보간·외삽된 값이면 true */
  productPriceIsEstimate?: boolean;
  thumbnailUrl?: string;
  /** 피드·갤러리용 (최대 6장, 썸네일 포함) */
  galleryImages?: string[];
  reviewAvg?: number;
  reviewCount?: number;
  isInstantBooking?: boolean;
  popularityScore?: number;
  /** THINKAD 현장 검증 완료 */
  isVerified?: boolean;
  trustBadges?: import("@/lib/media-trust").MediaTrustBadge[];
};

export type MediaCatalogSort =
  | "recommended"
  | "popular"
  | "newest"
  | "price_asc"
  | "price_desc";
