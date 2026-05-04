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

/**
 * 클러스터 숫자 뱃지 스타일 — 값은 모두 문자열(px)로 두는 편이 Kakao MarkerClusterer와 잘 맞음.
 * (커스텀 마커 이미지 + 숫자 미표시 이슈는 공식 샘플처럼 클러스터용 마커에는 image 미지정으로 해결)
 * calculator 기본 구간 [10, 100, 1000, 10000] → 스타일 5단
 */
const TKAD_CLUSTER_STYLES: Array<Record<string, string>> = (() => {
  const mk = (px: number, fs: string) => {
    const h = `${px}px`;
    const r = `${Math.round(px / 2)}px`;
    const lh = `${px - 2}px`;
    return {
      width: h,
      height: h,
      borderRadius: r,
      background: "rgba(255, 98, 0, 0.95)",
      border: "2px solid #020202",
      color: "#ffffff",
      textAlign: "center",
      lineHeight: lh,
      fontSize: fs,
      fontWeight: "700",
      cursor: "pointer",
    };
  };
  return [mk(44, "12px"), mk(48, "13px"), mk(52, "14px"), mk(56, "15px"), mk(60, "16px")];
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
  const lastBoundsSentRef = useRef<MapBounds | null>(null);
  const onMarkerDetailRef = useRef(onMarkerDetail);
  const onSelectRef = useRef(onSelect);
  const markersRef = useRef<MapMarker[]>(markers);
  const [sdkError, setSdkError] = useState<string | null>(null);
  /** SDK 비동기 로드 후 지도 인스턴스가 생긴 뒤에만 true — markers effect 가 한 번 더 돌게 함 */
  const [mapReady, setMapReady] = useState(false);

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
    let idleHandler: (() => void) | null = null;

    loadKakaoSdk(appkey)
      .then(() => {
        if (cancelled || !containerRef.current) return;
        try {
          const kakao = (window as unknown as { kakao: any }).kakao;
          // React Strict / 라우트 재진입 시 이전 지도 노드가 남으면 Kakao 초기화 실패 가능
          containerRef.current.innerHTML = "";

          const map = new kakao.maps.Map(containerRef.current, {
            center: new kakao.maps.LatLng(center.lat, center.lng),
            level: zoom,
          });
          mapRef.current = map;

          if (typeof kakao.maps.MarkerClusterer === "function") {
            // minLevel 10: 공식 basicClusterer 샘플과 동일(레벨이 충분히 축소될 때만 클러스터 합침)
            clustererRef.current = new kakao.maps.MarkerClusterer({
              map,
              averageCenter: true,
              minLevel: 10,
              gridSize: 60,
              styles: TKAD_CLUSTER_STYLES,
            });
          } else {
            // clusterer 라이브러리 미로드 시 fallback: map에 직접 마커 추가
            clustererRef.current = null;
          }

          const fireBounds = () => {
            if (cancelled) return;
            const b = map.getBounds();
            const sw = b.getSouthWest();
            const ne = b.getNorthEast();
            const next: MapBounds = {
              swLat: sw.getLat(),
              swLng: sw.getLng(),
              neLat: ne.getLat(),
              neLng: ne.getLng(),
            };
            const prev = lastBoundsSentRef.current;
            if (
              prev &&
              prev.swLat === next.swLat &&
              prev.swLng === next.swLng &&
              prev.neLat === next.neLat &&
              prev.neLng === next.neLng
            ) {
              return;
            }
            lastBoundsSentRef.current = next;
            onBoundsChange(next);
          };

          idleHandler = fireBounds;
          kakao.maps.event.addListener(map, "idle", fireBounds);
          fireBounds();
          if (!cancelled) setMapReady(true);
        } catch (e: unknown) {
          if (!cancelled) {
            setSdkError(e instanceof Error ? e.message : "지도 초기화에 실패했습니다.");
          }
        }
      })
      .catch((e: Error) => {
        if (!cancelled) setSdkError(e.message);
      });

    return () => {
      cancelled = true;
      const mapInst = mapRef.current as Record<string, unknown> | null;
      const kw = typeof window !== "undefined" ? (window as unknown as { kakao?: any }).kakao : null;
      if (mapInst && idleHandler && kw?.maps?.event?.removeListener) {
        try {
          kw.maps.event.removeListener(mapInst, "idle", idleHandler);
        } catch {
          /* noop */
        }
      }
      idleHandler = null;
      const clusterer = clustererRef.current as { clear?: () => void } | null;
      try {
        clusterer?.clear?.();
      } catch {
        /* noop */
      }
      clustererRef.current = null;
      markerObjsRef.current.clear();
      mapRef.current = null;
      infoWindowRef.current = null;
      lastBoundsSentRef.current = null;
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current as any;
    if (!map) return;
    try {
      const clusterer = clustererRef.current as any;
      const kakao = (window as unknown as { kakao: any }).kakao;
      if (!kakao?.maps) return;

      const existing = markerObjsRef.current;
      const nextIds = new Set(markers.map((m) => m.id));

      for (const [id, m] of existing) {
        if (!nextIds.has(id)) {
          if (clusterer) clusterer.removeMarker(m);
          else (m as any).setMap(null);
          existing.delete(id);
        }
      }

      const pinImage = clusterer ? null : orangePinMarkerImage(kakao.maps);
      const toAdd: unknown[] = [];
      for (const mk of markers) {
        if (existing.has(mk.id)) continue;
        if (!Number.isFinite(mk.lat) || !Number.isFinite(mk.lng)) continue;
        // MarkerClusterer 경로: 공식 샘플처럼 map·image 없이 생성해야 클러스터/숫자가 정상 표시됨
        const marker = pinImage
          ? new kakao.maps.Marker({
              position: new kakao.maps.LatLng(mk.lat, mk.lng),
              title: mk.name,
              image: pinImage,
            })
          : new kakao.maps.Marker({
              position: new kakao.maps.LatLng(mk.lat, mk.lng),
              title: mk.name,
            });
        kakao.maps.event.addListener(marker, "click", () => onSelectRef.current(mk.id));
        existing.set(mk.id, marker);
        if (clusterer) toAdd.push(marker);
        else (marker as { setMap: (m: unknown) => void }).setMap(map);
      }
      if (clusterer && toAdd.length) clusterer.addMarkers(toAdd);
    } catch (e) {
      console.error("[KakaoMapView] markers sync failed", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, mapReady]);

  // #MAP-1: 미니 팝업(CustomOverlay) 비활성화. 마커 선택 시 panTo만 수행.
  // 상세는 사이드 카드(media-map-page-client.tsx) 또는 onMarkerDetail 라우팅으로 노출.
  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current as any;
    if (!map) return;
    try {
      const kakao = (window as unknown as { kakao: any }).kakao;
      if (!kakao?.maps) return;

      const existingInfo = infoWindowRef.current as any;
      if (existingInfo?.setMap) existingInfo.setMap(null);
      infoWindowRef.current = null;

      if (!selectedId) return;
      const m = markersRef.current.find((x) => x.id === selectedId);
      if (!m || !Number.isFinite(m.lat) || !Number.isFinite(m.lng)) return;

      map.panTo(new kakao.maps.LatLng(m.lat, m.lng));
    } catch (e) {
      console.error("[KakaoMapView] panTo failed", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, mapReady]);

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
