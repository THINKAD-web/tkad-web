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
};

export function MediaThumbnailTrustOverlay({
  item,
  isKo,
  verifiedOnly = false,
  className,
}: Props) {
  const badges = buildTrustThumbnailBadges(item, isKo, { verifiedOnly });
  return (
    <MediaThumbnailBadgeStack badges={badges} className={className} />
  );
}
