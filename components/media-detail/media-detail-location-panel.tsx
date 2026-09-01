"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { MapPin } from "lucide-react";
import { MediaDetailKakaoMap } from "@/components/media-detail/media-detail-kakao-map";
import { RoadviewCard } from "@/components/media-detail/roadview-card";
import { NearbyPoiSection } from "@/components/media/nearby-poi-section";
import type { MapMarker } from "@/components/public-map/map-types";
import type { MapViewCommand } from "@/components/media-map/kakao-map-view";
import type { MediaItem } from "@/lib/media-data";
import {
  mapCenterForMediaDetail,
  mapMarkersForMediaDetail,
  resolveMediaIdFromMapPinId,
} from "@/lib/media-detail-map-markers";
import { cn } from "@/lib/utils";
import { networkInventoryUnitSuffix } from "@/lib/media-network-types";
import { mediaDetailUsesLeafletMap } from "@/lib/media-detail-map-engine";
import {
  mapItemShowsOnMap,
  resolveMapDisplayMode,
  resolveMediaDetailMapNotice,
} from "@/lib/media-map/map-display-mode";
import { MediaDetailServiceRegionPanel } from "@/components/media-detail/media-detail-service-region-panel";

/** 카카오 지도 — 선택 시 클로즈업 (작을수록 확대) */
const LOCATION_FOCUS_ZOOM = 4;

function coordsMatch(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  eps = 1e-5,
): boolean {
  return Math.abs(a.lat - b.lat) < eps && Math.abs(a.lng - b.lng) < eps;
}

function markerIdForLocationRow(
  loc: { lat?: number; lng?: number },
  mapMarkers: MapMarker[],
): string | null {
  if (loc.lat == null || loc.lng == null) return null;
  const mk = mapMarkers.find((m) => coordsMatch(m, { lat: loc.lat!, lng: loc.lng! }));
  return mk?.id ?? null;
}

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
  const mapNotice = useMemo(
    () => resolveMediaDetailMapNotice(media, isKo),
    [media, isKo],
  );
  const showMapPins = mapItemShowsOnMap(resolveMapDisplayMode(media));
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
  const [focusActive, setFocusActive] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);

  // 단일 명령형 뷰 채널 — 지도 이동(fit/focus)을 한 곳에서만 결정.
  const cmdNonceRef = useRef(0);
  const didInitFitRef = useRef(false);
  const [mapCommand, setMapCommand] = useState<MapViewCommand>(null);
  const emitMapCommand = useCallback(
    (cmd: { type: "fitMarkers"; auto?: boolean }
      | { type: "focusMarker"; lat: number; lng: number; level: number }) => {
      cmdNonceRef.current += 1;
      setMapCommand({ ...cmd, nonce: cmdNonceRef.current } as MapViewCommand);
    },
    [],
  );

  const selectMarker = useCallback(
    (id: string) => {
      setFocusActive(true);
      setSelectedId(id);
      const mk = mapMarkers.find((m) => m.id === id);
      if (mk) {
        emitMapCommand({
          type: "focusMarker",
          lat: mk.lat,
          lng: mk.lng,
          level: LOCATION_FOCUS_ZOOM,
        });
      }
    },
    [mapMarkers, emitMapCommand],
  );

  // 최초 1회만 전체 핀 자동 맞춤(네트워크 다지점). 사용자가 지도를 조작하면
  // 채널 게이트(userInteractedRef)가 이후 auto 명령을 무시하므로 리셋되지 않는다.
  useEffect(() => {
    if (didInitFitRef.current) return;
    if (!(isNetwork && mapMarkers.length > 1)) return;
    didInitFitRef.current = true;
    emitMapCommand({ type: "fitMarkers", auto: true });
  }, [isNetwork, mapMarkers, emitMapCommand]);

  /** 지점 목록 행 클릭 → 해당 마커 선택 + 지도 클로즈업 */
  const focusLocationOnMap = (loc: { lat?: number; lng?: number }) => {
    const id = markerIdForLocationRow(loc, mapMarkers);
    if (id) selectMarker(id);
  };

  /** 단일/네트워크 공용 지점 목록 행 (단일 매체는 1행) */
  const locationRows = useMemo<
    Array<{
      name: string;
      region?: string;
      address?: string;
      unitCount?: number;
      dailyFootfall?: number;
      lat?: number;
      lng?: number;
    }>
  >(() => {
    if (netLocations.length > 0) {
      return netLocations.map((l) => ({
        name: l.name,
        region: [l.regionMain, l.regionSub].filter(Boolean).join(" ") || undefined,
        address: l.address,
        unitCount: l.unitCount,
        dailyFootfall: l.dailyFootfall,
        lat: l.lat,
        lng: l.lng,
      }));
    }
    if ((media.installLocations?.length ?? 0) > 1) {
      return media.installLocations!.map((l) => ({
        name: l.label,
        address: l.location,
        lat: l.lat,
        lng: l.lng,
      }));
    }
    const hasCoord =
      showMapPins &&
      Number.isFinite(media.lat) &&
      Number.isFinite(media.lng) &&
      !(media.lat === 0 && media.lng === 0);
    return [
      {
        name: isKo ? media.name : media.nameEn || media.name,
        region: regionDisplay,
        address: isKo ? media.location : media.locationEn || media.location,
        lat: hasCoord ? media.lat : undefined,
        lng: hasCoord ? media.lng : undefined,
      },
    ];
  }, [netLocations, media, isKo, regionDisplay, showMapPins]);

  // media 변경(다른 매체 보기)에만 반응 — mapMarkers 객체 identity 의존 제거(상위 리렌더 취약성 차단).
  useEffect(() => {
    setSelectedId(mapMarkers[0]?.id ?? media.id);
    setFocusActive(false);
    didInitFitRef.current = false; // 새 매체엔 초기 fit 재허용
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media.id]);

  /** 지도 마커 선택 시 목록에서 해당 행으로 스크롤 */
  useEffect(() => {
    if (!focusActive || !selectedId || !listRef.current) return;
    const mk = mapMarkers.find((m) => m.id === selectedId);
    if (!mk) return;
    const idx = locationRows.findIndex(
      (loc) =>
        loc.lat != null &&
        loc.lng != null &&
        coordsMatch({ lat: loc.lat, lng: loc.lng }, mk),
    );
    if (idx < 0) return;
    const row = listRef.current.children[idx] as HTMLElement | undefined;
    row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focusActive, selectedId, locationRows, mapMarkers]);

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

  const unitSuffix = networkInventoryUnitSuffix(
    media.networkSubtype ?? media.type,
    isKo,
    media.tags,
  );
  const kakaoUrl = `https://map.kakao.com/link/map/${encodeURIComponent(spotName)},${mapLat},${mapLng}`;
  const googleUrl = `https://www.google.com/maps/search/?api=1&query=${mapLat},${mapLng}`;
  const useLeafletMap = mediaDetailUsesLeafletMap(media.country);
  const addressText =
    selectedInstall?.location?.trim() ||
    (isKo ? media.location : media.locationEn || media.location);

  return (
    <div className={cn("space-y-6", className)}>
      <div className="overflow-hidden rounded-2xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-white shadow-sm">
        <div className="h-80 min-h-[20rem] w-full sm:h-96">
          {showMapPins ? (
            <MediaDetailKakaoMap
              country={media.country}
              markers={mapMarkers}
              selectedId={selectedId}
              onSelect={selectMarker}
              center={mapCenter}
              zoom={mapZoom}
              disableCluster={mapMarkers.length <= 8}
              command={mapCommand}
            />
          ) : mapNotice ? (
            <MediaDetailServiceRegionPanel notice={mapNotice} />
          ) : null}
        </div>
      </div>

      {locationRows.length > 0 ? (
        <div className="rounded-2xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-white">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b dark:border-white/10 border-gray-200 px-4 py-3">
            <p className="flex items-center gap-2 text-[length:var(--qp-text-meta)] font-semibold tracking-wide text-[color:var(--qp-accent)] dark:text-[color:var(--qp-accent)]/80">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              {isNetwork ? (isKo ? "설치 지점" : "Locations") : isKo ? "위치" : "Location"}
            </p>
            {isNetwork ? (
              <p className="text-[length:var(--qp-text-body)] font-bold tabular-nums dark:text-white text-gray-900">
                {isKo
                  ? `전국 ${netLocations.length.toLocaleString("ko-KR")}개 지점 · 총 ${totalUnits.toLocaleString("ko-KR")}${unitSuffix}`
                  : `${netLocations.length.toLocaleString("en-US")} sites · ${totalUnits.toLocaleString("en-US")} units`}
              </p>
            ) : null}
          </div>
          <ul
            ref={listRef}
            className="max-h-80 divide-y divide-gray-100 overflow-y-auto dark:divide-white/8"
          >
            {locationRows.map((loc, i) => {
              const hasCoord = loc.lat != null && loc.lng != null;
              const rowMarkerId = markerIdForLocationRow(loc, mapMarkers);
              const isRowSelected =
                focusActive && rowMarkerId != null && rowMarkerId === selectedId;
              return (
                <li key={`${loc.name}-${i}`}>
                  <button
                    type="button"
                    onClick={() => focusLocationOnMap(loc)}
                    disabled={!hasCoord}
                    className={cn(
                      "flex w-full items-start justify-between gap-3 px-4 py-2.5 text-left transition-colors",
                      hasCoord
                        ? "hover:bg-[color:var(--qp-accent-soft)] dark:hover:bg-white/5"
                        : "cursor-default",
                      isRowSelected &&
                        "bg-[color:var(--qp-accent-soft)] ring-1 ring-inset ring-[color:var(--qp-accent)]/40 dark:bg-[color:var(--qp-accent)]/10 dark:ring-[color:var(--qp-accent)]/40",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[length:var(--qp-text-body)] font-semibold dark:text-white text-gray-900">
                        {loc.name}
                      </p>
                      <p className="mt-0.5 truncate text-[length:var(--qp-text-meta)] text-gray-600 dark:text-white/65">
                        {loc.region ? `${loc.region} · ` : ""}
                        {loc.address ?? (isKo ? "주소 미등록" : "No address")}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      {loc.unitCount != null ? (
                        <p className="text-xs font-bold tabular-nums text-[color:var(--qp-accent)] dark:text-[color:var(--qp-accent)]">
                          {loc.unitCount.toLocaleString(isKo ? "ko-KR" : "en-US")}
                          {isKo ? unitSuffix : "u"}
                        </p>
                      ) : null}
                      {loc.dailyFootfall ? (
                        <p className="tkad-type-caption dark:text-white/45 text-gray-400">
                          {isKo ? "일 " : ""}
                          {loc.dailyFootfall.toLocaleString(isKo ? "ko-KR" : "en-US")}
                        </p>
                      ) : null}
                      {!hasCoord ? (
                        <p className="tkad-type-note text-amber-500">
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

      <div className={cn("grid gap-4", !useLeafletMap && showMapPins && "sm:grid-cols-2")}>
        <div className="rounded-2xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-white p-4">
          <p className="mb-2 flex items-center gap-2 text-[length:var(--qp-text-meta)] font-semibold tracking-wide text-[color:var(--qp-accent)] dark:text-[color:var(--qp-accent)]/80">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            {t("locationAddressLabel")}
          </p>
          <p className="text-[length:var(--qp-text-body)] leading-relaxed dark:text-white/85 text-gray-800">
            {addressText}
          </p>
          <p className="mt-2 text-[length:var(--qp-text-meta)] text-gray-600 dark:text-white/65">
            {t("locationRegionLabel")}: {regionDisplay}
          </p>
          {showMapPins ? (
          <div className="mt-3 flex flex-wrap gap-3 tkad-type-title">
            {useLeafletMap ? null : (
              <a
                href={kakaoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[color:var(--qp-accent)] underline-offset-2 hover:underline dark:text-[color:var(--qp-accent)]"
              >
                {t("openKakao")}
              </a>
            )}
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[color:var(--qp-accent)] underline-offset-2 hover:underline dark:text-[color:var(--qp-accent)]"
            >
              {t("openGoogle")}
            </a>
          </div>
          ) : null}
        </div>

        {useLeafletMap || !showMapPins ? null : (
          <NearbyPoiSection
            lat={mapLat}
            lng={mapLng}
            address={addressText}
            isKo={isKo}
          />
        )}
      </div>

      {useLeafletMap || !showMapPins ? null : (
        <RoadviewCard
          lat={mapLat}
          lng={mapLng}
          mediaName={spotName}
        />
      )}
    </div>
  );
}
