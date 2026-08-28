"use client";

import { useEffect } from "react";
import { prefetchMapChunks } from "@/lib/lazy-chunk-prefetch";

/** `/media` · `/media/map` — Leaflet·지도 청크를 앞당겨 dynamic() 게이트를 줄인다. */
export function MapChunkPrefetch() {
  useEffect(() => {
    void prefetchMapChunks();
  }, []);
  return null;
}
