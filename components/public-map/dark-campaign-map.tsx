"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import type { CampaignMapPin, CampaignMapMediaType } from "@/lib/campaign-monitoring-mock";
import type { MapMarker } from "@/components/public-map/map-types";
import { cn } from "@/lib/utils";

const DarkMapView = dynamic(
  () => import("@/components/public-map/dark-map-view"),
  { ssr: false },
);

function campaignTypeToMarkerType(type: CampaignMapMediaType): string {
  if (type === "digital") return "digital";
  if (type === "billboard") return "static";
  if (type === "transport") return "mobile";
  return "network";
}

function pinsToMarkers(pins: readonly CampaignMapPin[], isKo: boolean): MapMarker[] {
  return pins.map((p) => ({
    id: p.id,
    name: isKo ? p.spotNameKo : p.spotNameEn,
    lat: p.lat,
    lng: p.lng,
    price: 0,
    type: campaignTypeToMarkerType(p.mediaType),
  }));
}

type Props = {
  pins: readonly CampaignMapPin[];
  selectedId: string | null;
  onSelectPin: (id: string | null) => void;
  isKo: boolean;
  className?: string;
  fixedMapHeightPx?: number;
  showFooterCaption?: boolean;
  centerOverride?: { lat: number; lng: number } | null;
  zoomOverride?: number | null;
};

/** 캠페인·매체 탐색용 공개 다크 지도 (Carto dark + Leaflet) */
export function DarkCampaignMap({
  pins,
  selectedId,
  onSelectPin,
  isKo,
  className,
  fixedMapHeightPx,
  showFooterCaption = true,
  centerOverride = null,
  zoomOverride = null,
}: Props) {
  const markers = useMemo(() => pinsToMarkers(pins, isKo), [pins, isKo]);
  const center = centerOverride ?? { lat: 37.5665, lng: 126.978 };
  const zoom = zoomOverride ?? 8;

  return (
    <div className={cn("flex flex-col", className)}>
      <div
        className="relative w-full overflow-hidden rounded-2xl border dark:border-white/10 border-gray-200"
        style={{
          height: fixedMapHeightPx ?? "min(56vh, 480px)",
          minHeight: fixedMapHeightPx ?? 360,
        }}
      >
        <DarkMapView
          markers={markers}
          selectedId={selectedId}
          onSelect={(id) => onSelectPin(id)}
          onBoundsChange={() => {}}
          center={center}
          zoom={typeof zoom === "number" ? zoom : 8}
          disableCluster={markers.length <= 8}
        />
      </div>
      {showFooterCaption ? (
        <p className="mt-2 text-center tkad-type-caption dark:text-white/45 text-gray-500">
          {isKo
            ? "Carto 다크 타일 · Leaflet (공개 탐색 지도)"
            : "Carto dark tiles · Leaflet (public discovery map)"}
        </p>
      ) : null}
    </div>
  );
}

export function getPublicMapProviderLabel(isKo: boolean): string {
  return isKo ? "다크 지도 (Carto)" : "Dark map (Carto)";
}
