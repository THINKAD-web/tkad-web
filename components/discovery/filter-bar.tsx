"use client";

/**
 * 발견하기 필터 바 — `MediaManualBrowseFilters` 공용 래퍼.
 * `/media`, `/media/map`, `/media?features=network`, `/media/targets`, `/media/packages` 가
 * 동일 props·마크업 계약을 공유한다.
 */
export {
  MediaManualBrowseFilters as DiscoveryFilterBar,
  type MediaManualBrowseViewMode as DiscoveryFilterBarViewMode,
  type MediaManualBrowseFiltersProps as DiscoveryFilterBarProps,
} from "@/components/media/media-manual-browse-filters";

export type { MediaMobileViewSegment } from "@/components/discovery/media-mobile-bottom-bar";
export { MEDIA_MOBILE_BOTTOM_BAR_SLOT_ID } from "@/components/discovery/media-mobile-bottom-bar";

export {
  DiscoveryResultSummary,
  DiscoveryFilterSheetHeader,
  DiscoveryEmptyState,
  formatMapViewCountLabel,
  formatMapViewCountCompact,
  formatMapViewCountDetail,
  type DiscoveryResultSummaryProps,
  type DiscoveryFilterSheetHeaderProps,
  type DiscoveryEmptyStateProps,
} from "@/components/discovery/filter-bar-parts";

export { DiscoveryPageHeader, type DiscoveryPageHeaderProps } from "@/components/discovery/page-header";
