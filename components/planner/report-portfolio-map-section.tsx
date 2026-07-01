"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { MediaItem } from "@/lib/media-data";
import {
  boundsFromMapMarkers,
  buildPlannerReportPortfolioMap,
} from "@/lib/planner-report-portfolio-map";
import { DocumentSectionHeading } from "@/components/document/document-layout";
import type { DarkMapProgrammaticView } from "@/components/public-map/dark-map-view";
import { PUBLIC_DARK_MAP_DEFAULT_CENTER } from "@/lib/public-dark-map-config";

const DarkMapView = dynamic(
  () => import("@/components/public-map/dark-map-view"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-gray-50 text-xs text-gray-400">
        …
      </div>
    ),
  },
);

type Props = {
  portfolio: readonly MediaItem[];
  isKo: boolean;
};

/** 플래너 보고서 화면 전용 — 담긴 매체 위치 미니맵 (PDF/PPT 제외) */
export function ReportPortfolioMapSection({ portfolio, isKo }: Props) {
  const mapData = useMemo(
    () => buildPlannerReportPortfolioMap(portfolio, isKo),
    [portfolio, isKo],
  );
  const { markers, mappableMediaCount, locationCount, unmappedCount } = mapData;

  const [invalidateNonce, setInvalidateNonce] = useState(0);
  const pvNonceRef = useRef(0);
  const [programmaticView, setProgrammaticView] =
    useState<DarkMapProgrammaticView | null>(null);

  useEffect(() => {
    if (markers.length === 0) {
      setProgrammaticView(null);
      return;
    }
    const bounds = boundsFromMapMarkers(markers);
    pvNonceRef.current += 1;
    setProgrammaticView({
      lat: PUBLIC_DARK_MAP_DEFAULT_CENTER.lat,
      lng: PUBLIC_DARK_MAP_DEFAULT_CENTER.lng,
      zoom: 8,
      nonce: pvNonceRef.current,
      fitBounds: bounds ?? undefined,
      fitBoundsMaxZoom: markers.length === 1 ? 13 : 14,
    });
    setInvalidateNonce((n) => n + 1);
  }, [markers]);

  if (markers.length === 0) return null;

  const summaryLine = isKo
    ? `${mappableMediaCount}개 매체 · ${locationCount}개 위치`
    : `${mappableMediaCount} media · ${locationCount} locations`;

  return (
    <section className="space-y-3" data-screenshot="planner-report-portfolio-map">
      <DocumentSectionHeading>
        {isKo ? "매체 위치" : "Media locations"}
      </DocumentSectionHeading>
      <div
        className="relative w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-50"
        style={{ height: 320, minHeight: 280 }}
      >
        <DarkMapView
          markers={markers}
          selectedId={null}
          onSelect={() => {}}
          onBoundsChange={() => {}}
          programmaticView={programmaticView}
          disableCluster={markers.length <= 12}
          preferLightTiles
          invalidateNonce={invalidateNonce}
        />
      </div>
      <div className="space-y-1 text-center">
        <p className="text-xs font-medium text-gray-600">{summaryLine}</p>
        {unmappedCount > 0 ? (
          <p className="text-[11px] text-gray-400">
            {isKo
              ? `좌표 미등록 ${unmappedCount}건 — 목록의 위치 텍스트를 참고하세요`
              : `${unmappedCount} without map coordinates — see location text in the lineup`}
          </p>
        ) : null}
        <p className="text-[11px] text-gray-400">
          {isKo
            ? "매체 위치 지도는 화면에서만 제공됩니다. PDF·PPT에는 포함되지 않습니다."
            : "Location map is on-screen only. Not included in PDF or PPT exports."}
        </p>
      </div>
    </section>
  );
}
