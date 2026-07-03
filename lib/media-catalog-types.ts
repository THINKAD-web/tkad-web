import type { MediaPricePeriodKey } from "@/lib/media-data";

export type HomeCatalogMediaItem = {
  id: string;
  slug?: string;
  name: string;
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
  price?: number;
  pricePeriod?: MediaPricePeriodKey;
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
