/**
 * 공통 매체 타입 — 카탈로그·카드·API 응답에서 공유.
 * 풀 스키마는 `lib/media-data`의 MediaItem; 목록 카드는 HomeCatalogMediaItem.
 */
export type { MediaItem, MediaPricePeriodKey } from "@/lib/media-data";
export type {
  HomeCatalogMediaItem,
  MediaCatalogSort,
} from "@/lib/media-catalog-types";

export type MediaCardMode = "feed" | "card" | "compact";

export type { MediaCatalogListItem } from "@/lib/media-catalog-list-dto";

/** API `/api/public/media` 페이지네이션 응답 */
export type PublicMediaListResponse = {
  data?: import("@/lib/media-catalog-list-dto").MediaCatalogListItem[];
  media?: import("@/lib/media-catalog-list-dto").MediaCatalogListItem[];
  pagination?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
};
