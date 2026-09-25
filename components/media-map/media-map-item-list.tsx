"use client";

import { memo, useMemo, type MutableRefObject } from "react";
import { useSyncExternalStore } from "react";
import { DiscoveryMediaCard } from "@/components/discovery/media-card";
import { DiscoveryEmptyState } from "@/components/discovery/filter-bar";
import { DesignEmptyIllustration } from "@/components/design/design-empty-illustration";
import { Button } from "@/components/ui/button";
import { resolveMediaIdFromMapPinId } from "@/lib/media-detail-map-markers";
import {
  getMapHoveredMediaId,
  setMapHoveredMediaId,
  subscribeMapHoveredMediaId,
} from "@/lib/media-map/map-hover-bridge";
import { buildMapListSections } from "@/lib/media-map/split-map-list-sections";
import type { MapMapItem } from "@/components/media-map/media-map-types";
import type { MapBounds } from "@/components/public-map/map-types";

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
  searchedBounds: MapBounds | null;
  isTextSearchActive: boolean;
  compareEntries: { id: string }[];
  listItemRefs: MutableRefObject<Map<string, HTMLLIElement>>;
  onSelect: (id: string) => void;
  onToggleCompare: (it: MapMapItem) => void;
  isInCompare: (id: string) => boolean;
  onClearFilters?: () => void;
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
  onClearFilters,
}: Props) {
  const hoveredMediaId = useMapHoveredMediaId();

  const sections = useMemo(
    () =>
      buildMapListSections(
        items,
        isTextSearchActive ? null : searchedBounds,
        isKo,
      ),
    [items, searchedBounds, isTextSearchActive, isKo],
  );

  const listItemCount = sections.reduce((n, s) => n + s.items.length, 0);

  const renderCard = (it: MapMapItem) => (
    <DiscoveryMediaCard
      key={it.id}
      ref={(el) => {
        if (el) listItemRefs.current.set(it.id, el);
        else listItemRefs.current.delete(it.id);
      }}
      variant="compact"
      compactLayout="map-tile"
      item={it}
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
  );

  const showEmpty =
    (searchedBounds || isTextSearchActive) &&
    listItemCount === 0 &&
    !loading;

  return (
    <ul className="relative z-0 grid grid-cols-2 gap-3 p-3 pb-8 md:gap-4 md:p-4">
      {loading && items.length === 0 ? (
        <MapListSkeleton count={6} />
      ) : (
        sections.flatMap((section) => {
          const header =
            sections.length > 1
              ? [
                  <li
                    key={`${section.id}-label`}
                    className="col-span-2 list-none"
                  >
                    <div className="tkad-type-label px-0.5 pt-1 font-semibold text-tkad-muted">
                      {isKo ? section.titleKo : section.titleEn}
                    </div>
                  </li>,
                ]
              : [];
          return [
            ...header,
            ...section.items.map((it) => renderCard(it)),
          ];
        })
      )}
      {showEmpty ? (
        <li className="col-span-2 list-none">
          <DiscoveryEmptyState
            icon={<DesignEmptyIllustration variant="noResults" />}
            title={isKo ? "검색 결과가 없습니다" : "No results"}
            description={
              isKo
                ? "필터를 줄이거나 지도를 넓혀 다른 영역을 검색해 보세요."
                : "Clear filters or pan the map to search a wider area."
            }
            action={
              onClearFilters
                ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={onClearFilters}
                    >
                      {isKo ? "필터 초기화" : "Clear filters"}
                    </Button>
                  )
                : undefined
            }
          />
        </li>
      ) : null}
    </ul>
  );
});
