"use client";

import {
  buildTrustThumbnailBadges,
  MediaThumbnailBadgeStack,
} from "@/components/media/media-thumbnail-badge-stack";
import type { HomeCatalogMediaItem } from "@/lib/media-catalog-types";
import { cn } from "@/lib/utils";

type OverlayItem = Pick<
  HomeCatalogMediaItem,
  "isVerified" | "isInstantBooking"
>;

type Props = {
  item: OverlayItem;
  isKo: boolean;
  variant?: "card" | "feed";
  /** 피드 카드 — 검증 뱃지만 (즉시예약은 상세로) */
  verifiedOnly?: boolean;
  className?: string;
  /** "overlay"(기본) — 썸네일 위. "flow" — 카드 정보 영역 안 일반 흐름. */
  layout?: "overlay" | "flow";
};

export function MediaThumbnailTrustOverlay({
  item,
  isKo,
  verifiedOnly = false,
  className,
  layout = "overlay",
}: Props) {
  const badges = buildTrustThumbnailBadges(item, isKo, { verifiedOnly });
  return (
    <MediaThumbnailBadgeStack
      badges={badges}
      className={className}
      layout={layout}
    />
  );
}
