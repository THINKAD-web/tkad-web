"use client";

import { useCallback, useMemo } from "react";
import { CampaignMonitoringMap } from "@/components/campaign-monitoring-map";
import { mediaItemsToCampaignPins } from "@/lib/media-data";
import type { MediaItem } from "@/lib/media-data";

export default function MediaBrowseMap({
  items,
  locale,
  selectedId,
  onSelectId,
  className,
  fixedMapHeightPx,
  showFooterCaption,
  centerOverride,
  zoomOverride,
  pinMetaById,
}: {
  items: readonly MediaItem[];
  locale: string;
  selectedId: string | null;
  onSelectId: (id: string | null) => void;
  className?: string;
  fixedMapHeightPx?: number;
  showFooterCaption?: boolean;
  centerOverride?: { lat: number; lng: number } | null;
  zoomOverride?: number | null;
  pinMetaById?: Record<
    string,
    { tone?: "blue" | "green"; nowBadge?: boolean; popular?: boolean }
  >;
}) {
  const isKo = locale === "ko";
  const pins = useMemo(() => mediaItemsToCampaignPins(items), [items]);
  const handleSelectPin = useCallback(
    (id: string | null) => {
      onSelectId(id);
    },
    [onSelectId],
  );
  return (
    <CampaignMonitoringMap
      pins={pins}
      selectedId={selectedId}
      onSelectPin={handleSelectPin}
      isKo={isKo}
      className={className}
      fixedMapHeightPx={fixedMapHeightPx}
      showFooterCaption={showFooterCaption}
      centerOverride={centerOverride ?? null}
      zoomOverride={zoomOverride ?? null}
      pinMetaById={pinMetaById}
    />
  );
}
