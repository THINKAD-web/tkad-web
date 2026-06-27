"use client";

import { forwardRef } from "react";
import { DiscoveryMediaCardMapTile } from "@/components/discovery/media-card-compact";
import type { MapMapItem } from "@/components/media-map/media-map-types";

type Props = {
  item: MapMapItem;
  isKo?: boolean;
  locale: string;
  selected?: boolean;
  hovered?: boolean;
  inCompare?: boolean;
  inCart?: boolean;
  onSelect: (id: string) => void;
  onToggleCompare?: () => void;
  onToggleCart?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
};

/** @deprecated `DiscoveryMediaCard` `compactLayout="map-tile"` 사용 */
export const MediaMapListCard = forwardRef<HTMLLIElement, Props>(
  function MediaMapListCard(props, ref) {
    return (
      <DiscoveryMediaCardMapTile
        ref={ref}
        {...props}
        variant="compact"
        compactLayout="map-tile"
      />
    );
  },
);
