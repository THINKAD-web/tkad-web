/**
 * 고급 필터 필드 정의 (API·문서·UI 순서 참고).
 * 실제 범위·로직은 `media-filter-advanced.ts`의 `ADVANCED_RANGE` 등과 동기화합니다.
 */
export const MEDIA_ADVANCED_HIGH_PRIORITY_FILTERS = [
  {
    field: "visibility_score",
    type: "range" as const,
    min: 0,
    max: 100,
  },
  {
    field: "impressions",
    type: "range" as const,
    min: 0,
    max: 10_000_000,
  },
  { field: "cpm", type: "range" as const, min: 0, max: 10_000 },
  { field: "reach", type: "range" as const, min: 0, max: 1_000_000 },
  { field: "frequency", type: "range" as const, min: 0, max: 10 },
  {
    field: "daily_footfall",
    type: "range" as const,
    min: 0,
    max: 500_000,
  },
  { field: "target_age", type: "multiselect" as const },
  { field: "tags", type: "multiselect" as const },
  {
    field: "engagement_rate",
    type: "range" as const,
    min: 0,
    max: 1,
  },
] as const;

export const MEDIA_ADVANCED_SECONDARY_FILTERS = [
  { field: "sub_category", type: "select" as const },
  { field: "nearby_landmarks", type: "text" as const },
  { field: "nearby_stations", type: "text" as const },
  { field: "width_m", type: "range" as const },
  { field: "height_m", type: "range" as const },
  { field: "resolution", type: "select" as const },
  { field: "operating_hours", type: "select" as const },
] as const;
