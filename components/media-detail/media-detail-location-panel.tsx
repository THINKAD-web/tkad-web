"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { MapPin } from "lucide-react";
import { MediaDetailKakaoMap } from "@/components/media-detail/media-detail-kakao-map";
import { RoadviewCard } from "@/components/media-detail/roadview-card";
import { NearbyPoiSection } from "@/components/media/nearby-poi-section";
import type { MediaItem } from "@/lib/media-data";
import {
  mapCenterForMediaDetail,
  mapMarkersForMediaDetail,
  resolveMediaIdFromMapPinId,
} from "@/lib/media-detail-map-markers";
import { cn } from "@/lib/utils";

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
  const mapMarkers = useMemo(
    () => mapMarkersForMediaDetail(media, isKo),
    [media, isKo],
  );
  const mapCenter = useMemo(
    () => mapCenterForMediaDetail(media, mapMarkers),
    [media, mapMarkers],
  );
  const mapZoom = mapMarkers.length > 1 ? 5 : 4;
  const isNetwork = media.catalogSource === "network";
  const netLocations = media.networkLocations ?? [];
  const totalUnits = useMemo(
    () => netLocations.reduce((s, l) => s + (l.unitCount || 1), 0),
    [netLocations],
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    () => mapMarkers[0]?.id ?? media.id,
  );

  /** 지점 목록 행 클릭 → 좌표 있으면 해당 마커 선택(지도 pan) */
  const focusLocationOnMap = (loc: { lat?: number; lng?: number }) => {
    if (loc.lat == null || loc.lng == null) return;
    const mk = mapMarkers.find(
      (m) => Math.abs(m.lat - loc.lat!) < 1e-6 && Math.abs(m.lng - loc.lng!) < 1e-6,
    );
    if (mk) setSelectedId(mk.id);
  };

  useEffect(() => {
    setSelectedId(mapMarkers[0]?.id ?? media.id);
  }, [media.id, mapMarkers]);

  const selectedMarker = useMemo(
    () => mapMarkers.find((m) => m.id === selectedId) ?? mapMarkers[0],
    [mapMarkers, selectedId],
  );
  const selectedInstall = useMemo(() => {
    const pinId = selectedId ?? media.id;
    const mediaId = resolveMediaIdFromMapPinId(pinId);
    if (mediaId !== media.id || mapMarkers.length <= 1) return null;
    const m = /^(.+)-install-(\d+)$/.exec(pinId);
    const idx = m ? Number(m[2]) : -1;
    if (idx < 0 || !media.installLocations?.[idx]) return null;
    return media.installLocations[idx]!;
  }, [media, mapMarkers.length, selectedId]);

  const mapLat = selectedMarker?.lat ?? media.lat;
  const mapLng = selectedMarker?.lng ?? media.lng;
  const spotName = selectedMarker?.name ?? (isKo ? media.name : media.nameEn || media.name);

  const kakaoUrl = `https://map.kakao.com/link/map/${encodeURIComponent(spotName)},${mapLat},${mapLng}`;
  const googleUrl = `https://www.google.com/maps/search/?api=1&query=${mapLat},${mapLng}`;
  const addressText =
    selectedInstall?.location?.trim() ||
    (isKo ? media.location : media.locationEn || media.location);

  return (
    <div className={cn("space-y-6", className)}>
      <div className="overflow-hidden rounded-2xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-white shadow-sm">
        {mapMarkers.length > 1 ? (
          <ul className="flex flex-wrap gap-2 border-b dark:border-white/10 border-gray-200 px-3 py-2">
            {mapMarkers.map((mk) => {
              const active = selectedId === mk.id;
              return (
                <li key={mk.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(mk.id)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                      active
                        ? "border-violet-500/50 bg-violet-500/15 text-violet-700 dark:text-violet-200"
                        : "border-gray-200 bg-white dark:border-white/15 dark:bg-white/5",
                    )}
                  >
                    {mk.name}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
        <div className="h-80 min-h-[20rem] w-full sm:h-96">
          <MediaDetailKakaoMap
            markers={mapMarkers}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId(id)}
            center={mapCenter}
            zoom={mapZoom}
            disableCluster={
              isNetwork ? mapMarkers.length <= 1 : mapMarkers.length <= 8
            }
            fitMarkersBounds={isNetwork && mapMarkers.length > 1}
          />
        </div>
      </div>

      {isNetwork && netLocations.length > 0 ? (
        <div className="rounded-2xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-white">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b dark:border-white/10 border-gray-200 px-4 py-3">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-300/80">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              {isKo ? "설치 지점" : "Locations"}
            </p>
            <p className="text-sm font-bold tabular-nums dark:text-white text-gray-900">
              {isKo
                ? `전국 ${netLocations.length.toLocaleString("ko-KR")}개 지점 · 총 ${totalUnits.toLocaleString("ko-KR")}구좌`
                : `${netLocations.length.toLocaleString("en-US")} sites · ${totalUnits.toLocaleString("en-US")} units`}
            </p>
          </div>
          <ul className="max-h-80 divide-y divide-gray-100 overflow-y-auto dark:divide-white/8">
            {netLocations.map((loc, i) => {
              const hasCoord = loc.lat != null && loc.lng != null;
              const region = [loc.regionMain, loc.regionSub]
                .filter(Boolean)
                .join(" ");
              return (
                <li key={`${loc.name}-${i}`}>
                  <button
                    type="button"
                    onClick={() => focusLocationOnMap(loc)}
                    disabled={!hasCoord}
                    className={cn(
                      "flex w-full items-start justify-between gap-3 px-4 py-2.5 text-left transition-colors",
                      hasCoord
                        ? "hover:bg-violet-50 dark:hover:bg-white/5"
                        : "cursor-default",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold dark:text-white text-gray-900">
                        {loc.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs dark:text-white/55 text-gray-500">
                        {region ? `${region} · ` : ""}
                        {loc.address ?? (isKo ? "주소 미등록" : "No address")}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-bold tabular-nums text-violet-600 dark:text-violet-300">
                        {loc.unitCount.toLocaleString(isKo ? "ko-KR" : "en-US")}
                        {isKo ? "구좌" : "u"}
                      </p>
                      {loc.dailyFootfall ? (
                        <p className="text-[11px] dark:text-white/45 text-gray-400">
                          {isKo ? "일 " : ""}
                          {loc.dailyFootfall.toLocaleString(isKo ? "ko-KR" : "en-US")}
                        </p>
                      ) : null}
                      {!hasCoord ? (
                        <p className="text-[10px] text-amber-500">
                          {isKo ? "지도 미표시" : "no map"}
                        </p>
                      ) : null}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-white p-4">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-300/80">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            {t("locationAddressLabel")}
          </p>
          <p className="text-sm leading-relaxed dark:text-white/85 text-gray-800">
            {addressText}
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
          lat={mapLat}
          lng={mapLng}
          address={addressText}
          isKo={isKo}
        />
      </div>

      <RoadviewCard
        lat={mapLat}
        lng={mapLng}
        mediaName={spotName}
      />
    </div>
  );
}
