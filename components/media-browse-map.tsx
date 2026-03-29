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
}: {
  items: readonly MediaItem[];
  locale: string;
  selectedId: number | null;
  onSelectId: (id: number | null) => void;
  className?: string;
}) {
  const isKo = locale === "ko";
  const pins = useMemo(
    () => mediaItemsToCampaignPins(items, isKo),
    [items, isKo],
  );
  const sid = selectedId != null ? String(selectedId) : null;

  return (
    <CampaignMonitoringMap
      pins={pins}
      selectedId={sid}
      onSelectPin={(id) => onSelectId(id == null ? null : Number(id))}
      isKo={isKo}
      className={className}
    />
  );
}
