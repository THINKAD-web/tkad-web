"use client";

import { useEffect } from "react";

/** `/media/map` 진입 시 Leaflet·지도 청크를 앞당겨 dynamic() 게이트를 줄인다. */
export function MapChunkPrefetch() {
  useEffect(() => {
    void import("@/components/public-map/dark-map-view");
  }, []);
  return null;
}
