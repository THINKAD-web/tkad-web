"use client";

import { useEffect, useRef, useState } from "react";

export type MapMarker = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  price: number;
  type: string;
};

export type MapBounds = {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
};

type Props = {
  markers: MapMarker[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onBoundsChange: (b: MapBounds) => void;
  onMarkerDetail?: (id: string) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
};

declare global {
  interface Window {
    kakao: unknown;
  }
}

const KAKAO_SDK_URL = (appkey: string) =>
  `//dapi.kakao.com/v2/maps/sdk.js?appkey=${appkey}&autoload=false&libraries=clusterer`;

/** 카카오 기본 클러스터 스프라이트가 깨지거나 다크 테마 `color` 상속으로 숫자가 사라지는 경우 방지 */
const TKAD_CLUSTER_STYLES: Array<Record<string, string>> = (() => {
  const border = "2px solid #020202";
  const mk = (px: number, fs: string) => {
    const h = `${px}px`;
    const r = `${Math.round(px / 2)}px`;
    const lh = `${px - 4}px`;
    return {
      width: h,
      height: h,
      borderRadius: r,
      background: "#ff6200",
      border,
      color: "#ffffff",
      textAlign: "center",
      lineHeight: lh,
      fontSize: fs,
      fontWeight: "700",
      boxSizing: "border-box",
    };
  };
  // calculator 기본 구간 [10, 100, 1000, 10000] → 스타일 5단
  return [mk(46, "12px"), mk(50, "13px"), mk(54, "14px"), mk(58, "15px"), mk(62, "16px")];
})();

function orangePinMarkerImage(kakao: {
  maps: {
    MarkerImage: new (
      src: string,
      size: unknown,
      opts?: { offset?: unknown },
    ) => unknown;
    Size: new (w: number, h: number) => unknown;
    Point: new (x: number, y: number) => unknown;
  };
}) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="44" viewBox="0 0 32 44"><path fill="#ff6200" stroke="#020202" stroke-width="2" stroke-linejoin="round" d="M16 2C9.4 2 4 7.4 4 14c0 7.5 12 28 12 28s12-20.5 12-28C28 7.4 22.6 2 16 2z"/><circle fill="#f4f2ef" cx="16" cy="14" r="5"/></svg>`;
  const src = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  return new kakao.maps.MarkerImage(
    src,
    new kakao.maps.Size(32, 44),
    { offset: new kakao.maps.Point(16, 44) },
  );
}

function loadKakaoSdk(appkey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("SSR"));
    const w = window as unknown as { kakao?: { maps?: { load: (cb: () => void) => void } } };
    if (w.kakao?.maps) {
      w.kakao.maps.load(() => resolve());
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-kakao-sdk="1"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => {
        const kw = window as unknown as { kakao?: { maps?: { load: (cb: () => void) => void } } };
        kw.kakao?.maps?.load(() => resolve());
      });
      existing.addEventListener("error", () => reject(new Error("SDK load failed")));
      return;
    }
    const s = document.createElement("script");
    s.src = KAKAO_SDK_URL(appkey);
    s.async = true;
    s.dataset.kakaoSdk = "1";
    s.onload = () => {
      const kw = window as unknown as { kakao?: { maps?: { load: (cb: () => void) => void } } };
      kw.kakao?.maps?.load(() => resolve());
    };
    s.onerror = () => reject(new Error("SDK load failed"));
    document.head.appendChild(s);
  });
}

export default function KakaoMapView({
  markers,
  selectedId,
  onSelect,
  onBoundsChange,
  onMarkerDetail,
  center = { lat: 37.5665, lng: 126.978 },
  zoom = 8,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<unknown>(null);
  const markerObjsRef = useRef<Map<string, unknown>>(new Map());
  const clustererRef = useRef<unknown>(null);
  const infoWindowRef = useRef<unknown>(null);
  const onMarkerDetailRef = useRef(onMarkerDetail);
  const onSelectRef = useRef(onSelect);
  const markersRef = useRef<MapMarker[]>(markers);
  const [sdkError, setSdkError] = useState<string | null>(null);

  useEffect(() => {
    onMarkerDetailRef.current = onMarkerDetail;
  }, [onMarkerDetail]);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    markersRef.current = markers;
  }, [markers]);

  useEffect(() => {
    const appkey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;
    if (!appkey) {
      setSdkError("NEXT_PUBLIC_KAKAO_MAP_APP_KEY 미설정");
      return;
    }

    let cancelled = false;

    loadKakaoSdk(appkey)
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const kakao = (window as unknown as { kakao: any }).kakao;

        const map = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(center.lat, center.lng),
          level: zoom,
        });
        mapRef.current = map;

        if (typeof kakao.maps.MarkerClusterer === "function") {
          clustererRef.current = new kakao.maps.MarkerClusterer({
            map,
            averageCenter: true,
            minLevel: 6,
            gridSize: 60,
            styles: TKAD_CLUSTER_STYLES,
          });
        } else {
          // clusterer 라이브러리 미로드 시 fallback: map에 직접 마커 추가
          clustererRef.current = null;
        }

        const fireBounds = () => {
          const b = map.getBounds();
          const sw = b.getSouthWest();
          const ne = b.getNorthEast();
          onBoundsChange({
            swLat: sw.getLat(),
            swLng: sw.getLng(),
            neLat: ne.getLat(),
            neLng: ne.getLng(),
          });
        };

        kakao.maps.event.addListener(map, "idle", fireBounds);
        fireBounds();
      })
      .catch((e: Error) => setSdkError(e.message));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current as any;
    if (!map) return;
    const clusterer = clustererRef.current as any;
    const kakao = (window as unknown as { kakao: any }).kakao;

    const existing = markerObjsRef.current;
    const nextIds = new Set(markers.map((m) => m.id));

    for (const [id, m] of existing) {
      if (!nextIds.has(id)) {
        if (clusterer) clusterer.removeMarker(m);
        else (m as any).setMap(null);
        existing.delete(id);
      }
    }

    const pinImage = orangePinMarkerImage(kakao.maps);
    const toAdd: unknown[] = [];
    for (const mk of markers) {
      if (existing.has(mk.id)) continue;
      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(mk.lat, mk.lng),
        title: mk.name,
        image: pinImage,
      });
      kakao.maps.event.addListener(marker, "click", () => onSelectRef.current(mk.id));
      existing.set(mk.id, marker);
      if (clusterer) toAdd.push(marker);
      else marker.setMap(map);
    }
    if (clusterer && toAdd.length) clusterer.addMarkers(toAdd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers]);

  // #MAP-1: 미니 팝업(CustomOverlay) 비활성화. 마커 선택 시 panTo만 수행.
  // 상세는 사이드 카드(media-map-page-client.tsx) 또는 onMarkerDetail 라우팅으로 노출.
  useEffect(() => {
    const map = mapRef.current as any;
    if (!map) return;
    const kakao = (window as unknown as { kakao: any }).kakao;

    const existingInfo = infoWindowRef.current as any;
    if (existingInfo?.setMap) existingInfo.setMap(null);
    infoWindowRef.current = null;

    if (!selectedId) return;
    const m = markersRef.current.find((x) => x.id === selectedId);
    if (!m) return;

    map.panTo(new kakao.maps.LatLng(m.lat, m.lng));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  if (sdkError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted text-sm text-muted-foreground">
        {sdkError}
      </div>
    );
  }

  return (
    <div className="tkad-kakao-map-root relative h-full w-full min-h-[200px] text-[#0a0a0c] [color-scheme:light]">
      <div ref={containerRef} className="h-full w-full min-h-[200px]" />
    </div>
  );
}
