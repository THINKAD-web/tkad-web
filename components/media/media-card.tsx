"use client";

import type { ReactNode } from "react";
import { DiscoveryMediaCard } from "@/components/discovery/media-card";
import type { HomeCatalogMediaItem } from "@/types/media";
import type { MediaCardMode } from "@/types/media";
import type { MediaCardCompactLayout } from "@/components/discovery/media-card-types";
import { cn } from "@/lib/utils";

export type MediaCardProps = {
  item: HomeCatalogMediaItem;
  mode?: MediaCardMode;
  href: string;
  isKo?: boolean;
  /** feed 모드 — 칩·하이라이트 */
  highlights?: string[];
  locationLine?: string | null;
  /** compact / card — 한 줄 메타 */
  metaLine?: string;
  priceLabel?: string | null;
  inCompare?: boolean;
  inCart?: boolean;
  onToggleCompare?: () => void;
  onToggleCart?: () => void;
  showPlanButton?: boolean;
  isInPlan?: boolean;
  onTogglePlan?: () => void;
  /** true: 카드 본문 클릭 시 상세 대신 플랜 토글 */
  plannerMode?: boolean;
  rank?: number;
  recommendReason?: string;
  planAddedFrom?: "search" | "planner" | "ai_recommend" | "map";
  className?: string;
};

function modeToLayout(mode: MediaCardMode): {
  variant: "feed" | "compact";
  compactLayout?: MediaCardCompactLayout;
} {
  switch (mode) {
    case "compact":
      return { variant: "compact", compactLayout: "row" };
    case "card":
      return { variant: "compact", compactLayout: "grid" };
    default:
      return { variant: "feed" };
  }
}

/** 표준 매체 카드 — discovery `DiscoveryMediaCard` 위임 (레거시 `mode` API 유지) */
export function MediaCard(props: MediaCardProps) {
  const { mode = "feed", className, ...rest } = props;
  const { variant, compactLayout } = modeToLayout(mode);

  return (
    <DiscoveryMediaCard
      {...rest}
      variant={variant}
      compactLayout={compactLayout}
      className={cn(mode === "card" && "h-full min-h-0", className)}
    />
  );
}
