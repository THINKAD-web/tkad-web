"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { SpecialHotspot } from "@/lib/special-media-landings";
import type { MapMarker } from "@/components/public-map/map-types";
import { cn } from "@/lib/utils";

const DarkMapView = dynamic(
  () => import("@/components/public-map/dark-map-view"),
  { ssr: false },
);

type Props = {
  hotspots: SpecialHotspot[];
  isKo: boolean;
  className?: string;
};

export function SpecialHotspotMap({ hotspots, isKo, className }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(hotspots[0]?.id ?? null);

  const markers: MapMarker[] = useMemo(
    () =>
      hotspots.map((h) => ({
        id: h.id,
        name: isKo ? h.nameKo : h.nameEn,
        lat: h.lat,
        lng: h.lng,
        price: 0,
        type: "digital",
      })),
    [hotspots, isKo],
  );

  const center = useMemo(() => {
    if (hotspots.length === 0) return { lat: 37.5665, lng: 126.978 };
    const lat = hotspots.reduce((s, h) => s + h.lat, 0) / hotspots.length;
    const lng = hotspots.reduce((s, h) => s + h.lng, 0) / hotspots.length;
    return { lat, lng };
  }, [hotspots]);

  return (
    <div className={cn("space-y-4", className)}>
      <div
        className="relative w-full overflow-hidden rounded-2xl border dark:border-white/10 border-gray-200"
        style={{ minHeight: 380, height: 420 }}
      >
        <DarkMapView
          markers={markers}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onBoundsChange={() => {}}
          center={center}
          zoom={12}
          disableCluster
        />
      </div>
      <ul className="flex flex-wrap justify-center gap-2">
        {hotspots.map((h) => {
          const active = selectedId === h.id;
          return (
            <li key={h.id}>
              <button
                type="button"
                onClick={() => setSelectedId(h.id)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                  active
                    ? "border-pink-500/50 bg-pink-500/15 text-pink-700 dark:text-pink-200"
                    : "border-gray-200 bg-white dark:border-white/15 dark:bg-white/5",
                )}
              >
                📍 {isKo ? h.nameKo : h.nameEn}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
