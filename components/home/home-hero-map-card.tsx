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
import {
  PUBLIC_DARK_MAP_TILE_SUBDOMAINS,
  PUBLIC_DARK_MAP_TILE_URL,
} from "@/lib/public-dark-map-config";
import { useTranslations } from "next-intl";

const ACCENT = "#22d3ee";

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
};

export default function HomeHeroMapCard({ pins }: Props) {
  const t = useTranslations("homePage");
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
          <TileLayer url={PUBLIC_DARK_MAP_TILE_URL} subdomains={PUBLIC_DARK_MAP_TILE_SUBDOMAINS} maxZoom={20} />
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
          { k: t("heroMapStatVerified"), v: "500+" },
          { k: t("heroMapStatPartners"), v: "100+" },
          { k: t("heroMapStatResponse"), v: "24h" },
        ].map((s) => (
          <div key={s.k} className="min-w-0 text-center">
            <p className="font-display text-xs font-medium uppercase tracking-wider text-muted-foreground">
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
