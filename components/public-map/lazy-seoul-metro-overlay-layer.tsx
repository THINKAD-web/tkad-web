"use client";

import { useEffect, useState, type ComponentType } from "react";

type MetroLayerProps = { lightTiles: boolean };

/** GeoJSON fetch + 800+ station DOM — only loaded when subway toggle is ON. */
export function LazySeoulMetroOverlayLayer({ lightTiles }: MetroLayerProps) {
  const [Layer, setLayer] = useState<ComponentType<MetroLayerProps> | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    void import("@/components/public-map/seoul-metro-overlay-layer").then(
      (mod) => {
        if (!cancelled) setLayer(() => mod.SeoulMetroOverlayLayer);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  if (!Layer) return null;
  return <Layer lightTiles={lightTiles} />;
}
