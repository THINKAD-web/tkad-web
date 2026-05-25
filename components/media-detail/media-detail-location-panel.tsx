"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { MapPin } from "lucide-react";
import { RoadviewCard } from "@/components/media-detail/roadview-card";
import { NearbyPoiSection } from "@/components/media/nearby-poi-section";
import type { MediaItem } from "@/lib/media-data";
import { cn } from "@/lib/utils";

const DarkMapView = dynamic(() => import("@/components/public-map/dark-map-view"), {
  ssr: false,
});

type Props = {
  media: MediaItem;
  isKo: boolean;
  regionDisplay: string;
  className?: string;
};

export function MediaDetailLocationPanel({
  media,
  isKo,
  regionDisplay,
  className,
}: Props) {
  const t = useTranslations("media.detail");
  const [selectedId, setSelectedId] = useState<string | null>(media.id);

  const kakaoUrl = `https://map.kakao.com/link/map/${encodeURIComponent(isKo ? media.name : media.nameEn || media.name)},${media.lat},${media.lng}`;
  const googleUrl = `https://www.google.com/maps/search/?api=1&query=${media.lat},${media.lng}`;
  const addressText = isKo ? media.location : media.locationEn || media.location;

  return (
    <div className={cn("space-y-6", className)}>
      <div className="overflow-hidden rounded-2xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-white shadow-sm">
        <div className="h-80 min-h-[20rem] w-full sm:h-96">
          <DarkMapView
            markers={[
              {
                id: media.id,
                name: isKo ? media.name : media.nameEn || media.name,
                lat: media.lat,
                lng: media.lng,
                price: Number(media.price ?? 0),
                type: media.type,
              },
            ]}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId(id)}
            onBoundsChange={() => {}}
            center={{ lat: media.lat, lng: media.lng }}
            zoom={4}
            disableCluster
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-white p-4">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-300/80">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            {t("locationAddressLabel")}
          </p>
          <p className="text-sm leading-relaxed dark:text-white/85 text-gray-800">
            {isKo ? media.location : media.locationEn || media.location}
          </p>
          <p className="mt-2 text-xs dark:text-white/50 text-gray-500">
            {t("locationRegionLabel")}: {regionDisplay}
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold">
            <a
              href={kakaoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-600 underline-offset-2 hover:underline dark:text-violet-300"
            >
              {t("openKakao")}
            </a>
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-600 underline-offset-2 hover:underline dark:text-violet-300"
            >
              {t("openGoogle")}
            </a>
          </div>
        </div>

        <NearbyPoiSection
          lat={media.lat}
          lng={media.lng}
          address={addressText}
          isKo={isKo}
        />
      </div>

      <RoadviewCard
        lat={media.lat}
        lng={media.lng}
        mediaName={isKo ? media.name : media.nameEn || media.name}
      />
    </div>
  );
}
