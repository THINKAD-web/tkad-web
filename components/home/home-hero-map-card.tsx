"use client";

import { useEffect, useMemo } from "react";
import "leaflet/dist/leaflet.css";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import type { HomeHeroMapPin } from "@/lib/public-media-catalog";

const ACCENT = "#22d3ee";
const TILE_URL =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

function MapInvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const raf = window.requestAnimationFrame(() => map.invalidateSize());
    const t = window.setTimeout(() => map.invalidateSize(), 150);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, [map]);
  return null;
}

type Props = {
  pins: HomeHeroMapPin[];
  isKo: boolean;
};

export default function HomeHeroMapCard({ pins, isKo }: Props) {
  const validPins = useMemo(
    () =>
      pins.filter(
        (p) =>
          Number.isFinite(p.lat) &&
          Number.isFinite(p.lng) &&
          p.lat >= 33 &&
          p.lat <= 39.5 &&
          p.lng >= 124 &&
          p.lng <= 132.5,
      ),
    [pins],
  );

  const center: [number, number] = [36.5, 127.8];

  return (
    <div className="relative flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
      <div
        className="relative z-[5] h-72 w-full shrink-0 overflow-hidden sm:h-80"
        style={{ minHeight: 288 }}
      >
        <MapContainer
          center={center}
          zoom={6}
          minZoom={5}
          maxZoom={11}
          style={{ height: "100%", width: "100%", minHeight: 288 }}
          className="z-0 h-72 w-full max-w-none sm:h-80"
          scrollWheelZoom={false}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer url={TILE_URL} subdomains="abcd" maxZoom={20} />
          <MapInvalidateSize />
          {validPins.map((p) => (
            <CircleMarker
              key={p.id}
              center={[p.lat, p.lng]}
              radius={4}
              pathOptions={{
                color: ACCENT,
                fillColor: ACCENT,
                weight: 1,
                fillOpacity: 1,
                opacity: 1,
              }}
            >
              <Popup>
                <span className="text-sm font-semibold text-neutral-900">
                  {p.name}
                </span>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      <div className="grid shrink-0 grid-cols-3 gap-2 border-t border-border bg-muted/50 px-4 py-3">
        {[
          { k: isKo ? "검증 매체" : "Verified", v: "500+" },
          { k: isKo ? "파트너" : "Partners", v: "100+" },
          { k: isKo ? "평균 응답" : "Response", v: "24h" },
        ].map((s) => (
          <div key={s.k} className="min-w-0 text-center">
            <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              {s.k}
            </p>
            <p className="mt-1 truncate text-base font-black tabular-nums tracking-tight text-foreground sm:text-lg">
              {s.v}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
