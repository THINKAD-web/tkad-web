"use client";

import { useMemo } from "react";
import { CampaignMonitoringMap, type MapBounds } from "@/components/campaign-monitoring-map";
import { mediaItemsToCampaignPins } from "@/lib/media-data";
import type { MediaItem } from "@/lib/media-data";

export type { MapBounds };

export default function MediaBrowseMap({
  items,
  locale,
  selectedId,
  onSelectId,
  className,
  fixedMapHeightPx,
  fullHeight,
  showFooterCaption,
  centerOverride,
  zoomOverride,
  onBoundsChange,
  pinMetaById,
}: {
  items: readonly MediaItem[];
  locale: string;
  selectedId: string | null;
  onSelectId: (id: string | null) => void;
  className?: string;
  fixedMapHeightPx?: number;
  fullHeight?: boolean;
  showFooterCaption?: boolean;
  centerOverride?: { lat: number; lng: number } | null;
  zoomOverride?: number | null;
  onBoundsChange?: (bounds: MapBounds) => void;
  pinMetaById?: Record<
    string,
    { tone?: "blue" | "green"; nowBadge?: boolean; popular?: boolean }
  >;
}) {
  const isKo = locale === "ko";
  const pins = useMemo(() => mediaItemsToCampaignPins(items), [items]);
  return (
    <CampaignMonitoringMap
      pins={pins}
      selectedId={selectedId}
      onSelectPin={(id) => onSelectId(id)}
      isKo={isKo}
      className={className}
      fixedMapHeightPx={fixedMapHeightPx}
      fullHeight={fullHeight}
      showFooterCaption={showFooterCaption}
      centerOverride={centerOverride ?? null}
      zoomOverride={zoomOverride ?? null}
      onBoundsChange={onBoundsChange}
      pinMetaById={pinMetaById}
    />
  );
}
