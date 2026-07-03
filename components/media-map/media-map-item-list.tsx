"use client";

import { memo, type MutableRefObject } from "react";
import { useSyncExternalStore } from "react";
import { DiscoveryMediaCard } from "@/components/discovery/media-card";
import { DiscoveryEmptyState } from "@/components/discovery/filter-bar";
import { resolveMediaIdFromMapPinId } from "@/lib/media-detail-map-markers";
import {
  getMapHoveredMediaId,
  setMapHoveredMediaId,
  subscribeMapHoveredMediaId,
} from "@/lib/media-map/map-hover-bridge";
import type { MapMapItem } from "@/components/media-map/media-map-types";

function useMapHoveredMediaId(): string | null {
  return useSyncExternalStore(
    subscribeMapHoveredMediaId,
    getMapHoveredMediaId,
    () => null,
  );
}

function MapListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <li
          key={i}
          className="overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-white/10 dark:bg-white/5"
        >
          <div className="aspect-[4/3] animate-pulse bg-gray-100 dark:bg-white/10" />
          <div className="space-y-2 p-2.5">
            <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100 dark:bg-white/10" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100 dark:bg-white/10" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-gray-100 dark:bg-white/10" />
            <div className="h-8 animate-pulse rounded-lg bg-gray-100 dark:bg-white/10" />
          </div>
        </li>
      ))}
    </>
  );
}

type Props = {
  items: MapMapItem[];
  loading: boolean;
  isKo: boolean;
  locale: string;
  isMobile: boolean;
  selectedId: string | null;
  searchedBounds: unknown;
  isTextSearchActive: boolean;
  compareEntries: { id: string }[];
  listItemRefs: MutableRefObject<Map<string, HTMLLIElement>>;
  onSelect: (id: string) => void;
  onToggleCompare: (it: MapMapItem) => void;
  isInCompare: (id: string) => boolean;
};

export const MediaMapItemList = memo(function MediaMapItemList({
  items,
  loading,
  isKo,
  locale,
  isMobile,
  selectedId,
  searchedBounds,
  isTextSearchActive,
  listItemRefs,
  onSelect,
  onToggleCompare,
  isInCompare,
}: Props) {
  const hoveredMediaId = useMapHoveredMediaId();

  return (
    <ul className="relative z-0 grid grid-cols-2 gap-3 p-3 pb-8 md:gap-4 md:p-4">
      {loading && items.length === 0 ? (
        <MapListSkeleton count={6} />
      ) : (
        items.map((it) => (
          <DiscoveryMediaCard
            key={it.id}
            ref={(el) => {
              if (el) listItemRefs.current.set(it.id, el);
              else listItemRefs.current.delete(it.id);
            }}
            variant="compact"
            compactLayout="map-tile"
            item={it}
            isKo={isKo}
            locale={locale}
            selected={resolveMediaIdFromMapPinId(selectedId ?? "") === it.id}
            hovered={hoveredMediaId === it.id}
            inCompare={isInCompare(it.id)}
            onSelect={onSelect}
            onToggleCompare={() => onToggleCompare(it)}
            onMouseEnter={() => setMapHoveredMediaId(it.id)}
            onMouseLeave={() => {
              if (getMapHoveredMediaId() === it.id) setMapHoveredMediaId(null);
            }}
            onFocus={() => setMapHoveredMediaId(it.id)}
            onBlur={() => {
              if (getMapHoveredMediaId() === it.id) setMapHoveredMediaId(null);
            }}
          />
        ))
      )}
      {(searchedBounds || isTextSearchActive) &&
      items.length === 0 &&
      !loading &&
      !isMobile ? (
        <li className="col-span-2 list-none">
          <DiscoveryEmptyState
            title={isKo ? "검색 결과가 없습니다" : "No results"}
            description={
              isKo
                ? "필터를 조정하거나 지도를 이동해보세요."
                : "Adjust filters or pan the map."
            }
          />
        </li>
      ) : null}
    </ul>
  );
});
