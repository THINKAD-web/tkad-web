"use client";

import { useMemo } from "react";
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
}: {
  items: readonly MediaItem[];
  locale: string;
  selectedId: string | null;
  onSelectId: (id: string | null) => void;
  className?: string;
  fixedMapHeightPx?: number;
  showFooterCaption?: boolean;
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
      showFooterCaption={showFooterCaption}
    />
  );
}
