"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { MediaItem } from "@/lib/media-data";
import type { NearbyMapPoi } from "@/lib/kakao-nearby-pois";
import type { MapMarker } from "@/components/media-map/kakao-map-view";
import { cn } from "@/lib/utils";

const KakaoMapView = dynamic(() => import("@/components/media-map/kakao-map-view"), {
  ssr: false,
});

const RADIUS_M = 200;

type Props = {
  media: MediaItem;
  isKo: boolean;
  className?: string;
};

export function MediaDetailLocationMap({ media, isKo, className }: Props) {
  const t = useTranslations("mediaDetail.locationMap");
  const [pois, setPois] = useState<NearbyMapPoi[]>([]);
  const [poiError, setPoiError] = useState(false);

  const mediaName = isKo ? media.name : media.nameEn || media.name;

  const centerMarker: MapMarker = useMemo(
    () => ({
      id: media.id,
      name: mediaName,
      lat: media.lat,
      lng: media.lng,
      price: Number(media.price ?? 0),
      type: media.type,
    }),
    [media, mediaName],
  );

  useEffect(() => {
    let cancelled = false;
    const qs = new URLSearchParams({
      lat: String(media.lat),
      lng: String(media.lng),
      radius: String(RADIUS_M),
    });
    void fetch(`/api/geo/nearby-pois?${qs}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("poi fetch"))))
      .then((j: { pois?: NearbyMapPoi[] }) => {
        if (!cancelled) {
          setPois(j.pois ?? []);
          setPoiError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPois([]);
          setPoiError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [media.lat, media.lng]);

  const poiLegend = useMemo(() => {
    const kinds = new Set(pois.map((p) => p.kind));
    return [
      kinds.has("subway") ? t("legendSubway") : null,
      kinds.has("cafe") ? t("legendCafe") : null,
      kinds.has("convenience") ? t("legendConvenience") : null,
    ].filter(Boolean) as string[];
  }, [pois, t]);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="overflow-hidden border-2 border-border bg-card">
        <div className="border-b-2 border-border px-4 py-3">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
            [ {t("eyebrow")} ]
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">{t("radiusHint", { m: RADIUS_M })}</p>
        </div>
        <div className="h-[min(52vh,360px)] min-h-[240px]">
          <KakaoMapView
            markers={[centerMarker]}
            selectedId={media.id}
            onSelect={() => {}}
            onBoundsChange={() => {}}
            center={{ lat: media.lat, lng: media.lng }}
            zoom={3}
            focusCircle={{ lat: media.lat, lng: media.lng, radiusM: RADIUS_M }}
            poiMarkers={pois}
          />
        </div>
        {poiLegend.length > 0 ? (
          <div className="flex flex-wrap gap-2 border-t-2 border-border px-4 py-2.5">
            {poiLegend.map((label) => (
              <span
                key={label}
                className="border-2 border-border bg-muted px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-foreground"
              >
                {label}
              </span>
            ))}
          </div>
        ) : poiError ? (
          <p className="border-t-2 border-border px-4 py-2 font-mono text-[10px] tracking-tight text-muted-foreground">
            {t("poiUnavailable")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
