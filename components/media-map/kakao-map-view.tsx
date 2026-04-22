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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
  const markersRef = useRef<MapMarker[]>(markers);
  const [sdkError, setSdkError] = useState<string | null>(null);

  useEffect(() => {
    onMarkerDetailRef.current = onMarkerDetail;
  }, [onMarkerDetail]);

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

    const toAdd: unknown[] = [];
    for (const mk of markers) {
      if (existing.has(mk.id)) continue;
      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(mk.lat, mk.lng),
        title: mk.name,
      });
      kakao.maps.event.addListener(marker, "click", () => onSelect(mk.id));
      existing.set(mk.id, marker);
      if (clusterer) toAdd.push(marker);
      else marker.setMap(map);
    }
    if (clusterer && toAdd.length) clusterer.addMarkers(toAdd);
  }, [markers, onSelect]);

  useEffect(() => {
    const map = mapRef.current as any;
    if (!map) return;
    const kakao = (window as unknown as { kakao: any }).kakao;

    // 기존 InfoWindow 닫기 (CustomOverlay는 setMap(null))
    const existingInfo = infoWindowRef.current as any;
    if (existingInfo?.setMap) existingInfo.setMap(null);
    infoWindowRef.current = null;

    if (!selectedId) return;
    const m = markersRef.current.find((x) => x.id === selectedId);
    if (!m) return;

    map.panTo(new kakao.maps.LatLng(m.lat, m.lng));

    // 가격 포맷
    const priceLabel =
      m.price >= 100_000_000
        ? `${(m.price / 100_000_000).toFixed(1)}억`
        : m.price >= 10_000
          ? `${Math.round(m.price / 10_000).toLocaleString("ko-KR")}만원`
          : `${m.price.toLocaleString("ko-KR")}원`;

    const containerEl = document.createElement("div");
    containerEl.style.cssText =
      "padding:10px 12px;min-width:220px;background:#fff;border:1px solid #e4e6ec;border-radius:12px;box-shadow:0 8px 24px rgba(13,27,46,0.15);font-family:Pretendard,system-ui,sans-serif;";
    containerEl.innerHTML = `
      <div style="font-size:13px;font-weight:600;color:#0D1B2E;margin-bottom:4px;line-height:1.3;">
        ${escapeHtml(m.name)}
      </div>
      <div style="font-size:14px;font-weight:700;color:#C8913C;margin-bottom:8px;">
        ${priceLabel}
      </div>
      <button type="button" data-detail="${escapeHtml(m.id)}"
        style="width:100%;padding:7px 10px;background:#0D1B2E;color:#fff;border:none;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;">
        자세히 보기 →
      </button>
    `;
    const btn = containerEl.querySelector<HTMLButtonElement>("[data-detail]");
    btn?.addEventListener("click", () => {
      onMarkerDetailRef.current?.(m.id);
    });

    const info = new kakao.maps.CustomOverlay({
      position: new kakao.maps.LatLng(m.lat, m.lng),
      content: containerEl,
      yAnchor: 1.4,
      zIndex: 100,
    });
    info.setMap(map);
    infoWindowRef.current = info;

    return () => {
      info.setMap(null);
    };
  // markers는 매번 바뀔 수 있으므로 ref로 조회 (InfoWindow 재생성 방지)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  if (sdkError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500 text-sm">
        {sdkError}
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-full" />;
}
