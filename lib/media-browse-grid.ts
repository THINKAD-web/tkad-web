/** `/media` 카드형 목록 — 동일 행 높이 맞춤 */
export const MEDIA_BROWSE_CARD_GRID_CLASS =
  "grid auto-rows-fr items-stretch [&>*]:min-w-0 grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4";

/** AI 추천·축별 탐색 — 수량 옵션 높이에 따라 행 전체가 늘어나지 않도록 */
export const RECOMMEND_MEDIA_GRID_CLASS =
  "grid auto-rows-min items-start [&>*]:min-w-0 grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4";

/** TOP 3 — 3열 고정, 카드 높이는 콘텐츠만큼 */
export const RECOMMEND_TOP3_GRID_CLASS =
  "grid auto-rows-min items-start [&>*]:min-w-0 grid-cols-1 gap-3 sm:grid-cols-3";
