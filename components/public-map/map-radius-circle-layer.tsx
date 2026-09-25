"use client";

import { Circle } from "react-leaflet";

type Props = {
  center: { lat: number; lng: number };
  radiusM: number;
};

export function MapRadiusCircleLayer({ center, radiusM }: Props) {
  if (!Number.isFinite(center.lat) || !Number.isFinite(center.lng) || radiusM <= 0) {
    return null;
  }
  return (
    <Circle
      center={[center.lat, center.lng]}
      radius={radiusM}
      pathOptions={{
        color: "var(--qp-accent, #ff6200)",
        weight: 2,
        fillColor: "var(--qp-accent, #ff6200)",
        fillOpacity: 0.08,
      }}
    />
  );
}
