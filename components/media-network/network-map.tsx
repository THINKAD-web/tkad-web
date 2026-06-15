"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { NeonSection } from "@/components/landing/neon/neon-section";
import { NeonSectionHead } from "@/components/landing/neon/neon-section-head";
import { NETWORK_PANEL } from "@/components/media-network/network-neon-ui";
import type { MapMarker } from "@/components/public-map/map-types";
import {
  formatNetworkPriceWon,
  type NetworkMapPoint,
} from "@/lib/network-media-stats";
import { cn } from "@/lib/utils";

const MediaDetailKakaoMap = dynamic(
  () =>
    import("@/components/media-detail/media-detail-kakao-map").then(
      (m) => m.MediaDetailKakaoMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[420px] animate-pulse rounded-2xl bg-gray-100 dark:bg-white/5 sm:h-[480px]" />
    ),
  },
);

function centerFromPoints(points: { lat: number; lng: number }[]) {
  if (points.length === 0) return { lat: 36.38, lng: 127.51 };
  const lat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const lng = points.reduce((s, p) => s + p.lng, 0) / points.length;
  return { lat, lng };
}

type Props = {
  isKo: boolean;
  mapPoints: NetworkMapPoint[];
};

export function NetworkMap({ isKo, mapPoints }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const markers: MapMarker[] = useMemo(
    () =>
      mapPoints.map((p) => ({
        id: p.id,
        name: p.name,
        lat: p.lat,
        lng: p.lng,
        price: p.priceManWon,
        type: "network",
      })),
    [mapPoints],
  );

  const center = useMemo(() => centerFromPoints(mapPoints), [mapPoints]);
  const selected = mapPoints.find((p) => p.id === selectedId) ?? null;
  const onBoundsChange = useCallback(() => {}, []);

  return (
    <NeonSection id="map" className="scroll-mt-20">
      <NeonSectionHead
        number="02"
        kicker={isKo ? "COVERAGE" : "COVERAGE"}
        title={
          <>
            {isKo ? "전국 " : "Nationwide "}
            <span className="tkad-home-accent-text">
              {isKo ? "네트워크 분포" : "network map"}
            </span>
          </>
        }
        meta={
          isKo
            ? "클러스터를 확대하면 지점별 위치를 확인할 수 있습니다"
            : "Zoom clusters to explore site locations"
        }
      />

      <div className={cn(NETWORK_PANEL, "overflow-hidden p-0")}>
        <div className="relative h-[420px] sm:h-[480px]">
          {markers.length > 0 ? (
            <MediaDetailKakaoMap
              markers={markers}
              selectedId={selectedId ?? hoveredId}
              onSelect={setSelectedId}
              onBoundsChange={onBoundsChange}
              center={center}
              zoom={7}
              disableCluster={false}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-white/50">
              {isKo
                ? "지도에 표시할 좌표가 있는 지점이 없습니다."
                : "No geocoded network locations yet."}
            </div>
          )}

          {selected ? (
            <div className="absolute bottom-4 left-4 right-4 z-[500] rounded-2xl border border-gray-200 bg-white/95 p-4 text-gray-900 shadow-lg backdrop-blur sm:left-auto sm:right-4 sm:max-w-xs dark:border-white/10 dark:bg-white/10 dark:text-white">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-300">
                {selected.regionLabelKo}
              </p>
              <p className="mt-1 font-bold">{selected.name}</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-white/55">
                {selected.networkName}
              </p>
              <p className="mt-2 text-sm tabular-nums">
                {isKo ? "지점 " : ""}
                {selected.unitCount}
                {isKo ? "면" : " units"} ·{" "}
                {formatNetworkPriceWon(selected.priceManWon, isKo)}
                {isKo ? "/월" : "/mo"}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {mapPoints.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-2">
          {[...new Set(mapPoints.map((p) => p.regionKey))].map((key) => {
            const pts = mapPoints.filter((p) => p.regionKey === key);
            const label = pts[0]?.regionLabelKo ?? key;
            return (
              <li key={key}>
                <button
                  type="button"
                  className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600 transition hover:border-violet-500/40 hover:bg-violet-500/5 hover:text-violet-700 dark:border-white/12 dark:bg-white/6 dark:text-white/70 dark:hover:bg-white/10"
                  onMouseEnter={() => setHoveredId(pts[0]?.id ?? null)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => setSelectedId(pts[0]?.id ?? null)}
                >
                  {label} · {pts.length}
                  {isKo ? "곳" : " sites"}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </NeonSection>
  );
}
