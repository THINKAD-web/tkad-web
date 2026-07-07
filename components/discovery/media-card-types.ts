import type { ReactNode } from "react";
import type { HomeCatalogMediaItem } from "@/types/media";
import type { MapMapItem } from "@/components/media-map/media-map-types";

/** 발견하기 카드 표현 — 피드(쇼핑몰형) vs 컴팩트(리스트·그리드·지도 타일) */
export type MediaCardVariant = "feed" | "compact";

/** `variant="compact"` 일 때 레이아웃 분기 */
export type MediaCardCompactLayout = "row" | "grid" | "map-tile";

export type DiscoveryMediaCardSharedProps = {
  isKo?: boolean;
  className?: string;
  recommendReason?: string;
  /** true: 추천 이유를 카드 셸 안에 렌더 (그리드 카드 높이 정렬용) */
  recommendReasonInside?: boolean;
  /** 그리드 카드 하단 슬롯 (수량 컨트롤 등) */
  cardFooter?: ReactNode;
  rank?: number;
  plannerMode?: boolean;
  isInPlan?: boolean;
  onTogglePlan?: () => void;
  showPlanButton?: boolean;
  inCompare?: boolean;
  inCart?: boolean;
  onToggleCompare?: () => void;
  onToggleCart?: () => void;
  planAddedFrom?: "search" | "planner" | "ai_recommend" | "map";
};

export type DiscoveryMediaCardCatalogProps = DiscoveryMediaCardSharedProps & {
  item: HomeCatalogMediaItem;
  href: string;
  variant?: MediaCardVariant;
  compactLayout?: MediaCardCompactLayout;
  /** feed — 칩·하이라이트 */
  highlights?: string[];
  locationLine?: string | null;
  /** compact row / grid — 한 줄 메타 */
  metaLine?: string;
  priceLabel?: string | null;
};

export type DiscoveryMediaCardMapProps = DiscoveryMediaCardSharedProps & {
  variant: "compact";
  compactLayout: "map-tile";
  item: MapMapItem;
  locale: string;
  selected?: boolean;
  hovered?: boolean;
  onSelect: (id: string) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
};

export type DiscoveryMediaCardProps =
  | DiscoveryMediaCardCatalogProps
  | DiscoveryMediaCardMapProps;

export function isDiscoveryMapCardProps(
  props: DiscoveryMediaCardProps,
): props is DiscoveryMediaCardMapProps {
  return (
    props.compactLayout === "map-tile" &&
    "onSelect" in props &&
    typeof props.onSelect === "function"
  );
}
