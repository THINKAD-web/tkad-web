"use client";

import { useEffect, useRef, useState } from "react";
import type { NearbyMapPoi, NearbyMapPoiKind } from "@/lib/kakao-nearby-pois";

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
  /** 이동형 커버리지 — `/api/geo/district-boundaries` 응답과 동일 형식 FeatureCollection */
  coverageGeoJson?: unknown | null;
  /** `coverageGeoJson` 이 있을 때 지도를 해당 영역에 맞춤 */
  fitCoverageBounds?: boolean;
  focusCircle?: { lat: number; lng: number; radiusM: number } | null;
  poiMarkers?: NearbyMapPoi[];
};

declare global {
  interface Window {
    kakao: unknown;
  }
}

function kakaoMapsSdkUrl(appkey: string) {
  return `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appkey)}&autoload=false&libraries=clusterer`;
}

/**
 * 클러스터 — 글래스 디스크 + 네온 링(보라/시안/핑크) + 소프트 글로우 (주황 제거)
 * calculator 는 아래 TKAD_CLUSTER_CALCULATOR 와 길이(스타일 단계)를 맞출 것
 */
const TKAD_CLUSTER_CALCULATOR = [5, 14, 35, 90] as const;

const TKAD_CLUSTER_STYLES: Array<Record<string, string>> = (() => {
  const mk = (px: number, fs: string, ring: string, glow: string) => {
    const h = `${px}px`;
    const lh = `${px - 2}px`;
    return {
      width: h,
      height: h,
      borderRadius: "50%",
      background:
        "linear-gradient(165deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.92) 40%, rgba(255,255,255,0.86) 100%)",
      border: "1px solid rgba(15,23,42,0.22)",
      color: "#0a0a0c",
      textAlign: "center",
      lineHeight: lh,
      fontSize: fs,
      fontWeight: "800",
      fontFamily:
        "'JetBrains Mono', 'Pretendard Variable', Pretendard, ui-monospace, system-ui, sans-serif",
      letterSpacing: "-0.03em",
      cursor: "pointer",
      boxShadow: `${ring}, 0 0 0 1px rgba(255,255,255,0.55) inset, 0 10px 28px rgba(2,2,2,0.16), 0 18px 48px rgba(2,2,2,0.10), ${glow}`,
    };
  };
  return [
    mk(
      40,
      "11px",
      "0 0 0 2px rgba(168,85,247,0.55)",
      "0 14px 38px rgba(34,211,238,0.14)",
    ),
    mk(
      44,
      "12px",
      "0 0 0 2px rgba(34,211,238,0.58)",
      "0 16px 42px rgba(236,72,153,0.14)",
    ),
    mk(
      48,
      "13px",
      "0 0 0 3px rgba(236,72,153,0.52)",
      "0 18px 46px rgba(168,85,247,0.14)",
    ),
    mk(
      52,
      "14px",
      "0 0 0 3px rgba(34,211,238,0.56)",
      "0 20px 54px rgba(34,211,238,0.16)",
    ),
    mk(
      56,
      "15px",
      "0 0 0 3px rgba(168,85,247,0.58)",
      "0 22px 60px rgba(168,85,247,0.16)",
    ),
  ];
})();

type KakaoMapsForImage = {
  maps: {
    MarkerImage: new (
      src: string,
      size: unknown,
      opts?: { offset?: unknown },
    ) => unknown;
    Size: new (w: number, h: number) => unknown;
    Point: new (x: number, y: number) => unknown;
  };
};

type KakaoSdk = {
  maps: {
    Map: new (
      container: HTMLElement,
      opts: { center: unknown; level: number },
    ) => {
      getBounds: () => {
        getSouthWest: () => { getLat: () => number; getLng: () => number };
        getNorthEast: () => { getLat: () => number; getLng: () => number };
      };
      getLevel: () => number;
      setLevel: (next: number, opts?: { anchor?: unknown }) => void;
      setBounds: (...args: unknown[]) => void;
      panTo: (pos: unknown) => void;
      relayout?: () => void;
    };
    LatLng: new (lat: number, lng: number) => unknown;
    LatLngBounds: new () => { extend: (pos: unknown) => void };
    Marker: new (opts: { position: unknown; title?: string; image?: unknown }) => {
      setMap: (map: unknown | null) => void;
      setImage: (img: unknown) => void;
    };
    MarkerImage: new (
      src: string,
      size: unknown,
      opts?: { offset?: unknown },
    ) => unknown;
    Size: new (w: number, h: number) => unknown;
    Point: new (x: number, y: number) => unknown;
    MarkerClusterer?: new (opts: {
      map: unknown;
      averageCenter?: boolean;
      minLevel?: number;
      gridSize?: number;
      disableClickZoom?: boolean;
      calculator?: number[];
      styles?: unknown[];
    }) => {
      addMarkers: (markers: unknown[]) => void;
      removeMarker: (marker: unknown) => void;
      clear: () => void;
      redraw?: () => void;
    };
    Polygon: new (opts: {
      map: unknown;
      path: unknown[];
      strokeWeight?: number;
      strokeColor?: string;
      strokeOpacity?: number;
      fillColor?: string;
      fillOpacity?: number;
    }) => { setMap: (map: unknown | null) => void };
    Circle?: new (opts: {
      map: unknown;
      center: unknown;
      radius: number;
      strokeWeight?: number;
      strokeColor?: string;
      strokeOpacity?: number;
      fillColor?: string;
      fillOpacity?: number;
    }) => { setMap: (map: unknown | null) => void };
    event: {
      addListener: (target: unknown, type: string, handler: (...args: unknown[]) => void) => void;
      removeListener?: (target: unknown, type: string, handler: (...args: unknown[]) => void) => void;
    };
  };
};

function getKakaoSdk(): KakaoSdk | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { kakao?: KakaoSdk };
  return w.kakao ?? null;
}

type TkadPinVariant =
  | "default"
  | "selected"
  | "digital"
  | "digitalSelected"
  | "static"
  | "staticSelected"
  | "mobile"
  | "mobileSelected";

const TKAD_PIN: Record<
  TkadPinVariant,
  { path: string; w: number; h: number }
> = {
  default: { path: "/images/tkad-media-map-pin.svg", w: 40, h: 48 },
  selected: { path: "/images/tkad-media-map-pin-selected.svg", w: 44, h: 52 },
  // type-specific pins (generated on the fly via data URL)
  digital: { path: "data", w: 40, h: 48 },
  digitalSelected: { path: "data", w: 44, h: 52 },
  static: { path: "data", w: 40, h: 48 },
  staticSelected: { path: "data", w: 44, h: 52 },
  mobile: { path: "data", w: 40, h: 48 },
  mobileSelected: { path: "data", w: 44, h: 52 },
};

function pinColorForType(type: string): {
  fill: string;
  stroke: string;
  text: string;
  glow: string;
  ink: string;
} {
  const t = (type || "").toLowerCase();
  // premium neon palette — consistent with landing day/night
  if (t.includes("digital")) {
    return {
      // lime = immediately recognizable; keep ink dark for readability
      fill: "#a3e635",
      stroke: "#a3e635",
      text: "#14532d",
      glow: "rgba(163,230,53,0.55)",
      ink: "#0a0a0c",
    };
  }
  if (t.includes("static")) {
    return {
      fill: "#a855f7",
      stroke: "#a855f7",
      // label sits on a light core, so use dark ink for contrast
      text: "#0a0a0c",
      glow: "rgba(168,85,247,0.55)",
      ink: "#05050a",
    };
  }
  if (t.includes("mobile")) {
    return {
      fill: "#ec4899",
      stroke: "#ec4899",
      text: "#0a0a0c",
      glow: "rgba(236,72,153,0.55)",
      ink: "#05050a",
    };
  }
  return {
    fill: "#22d3ee",
    stroke: "#22d3ee",
    text: "#0a0a0c",
    glow: "rgba(34,211,238,0.55)",
    ink: "#05050a",
  };
}

function pinLetterForType(type: string): string {
  const t = (type || "").toLowerCase();
  if (t.includes("digital")) return "D";
  if (t.includes("static")) return "S";
  if (t.includes("mobile")) return "M";
  return "•";
}

function pinDataUrl(type: string, selected: boolean): string {
  const { fill, stroke, text, glow, ink } = pinColorForType(type);
  const w = selected ? 44 : 40;
  const h = selected ? 52 : 48;
  const label = pinLetterForType(type);
  const ring = selected ? 3 : 2;
  const font = selected ? 14 : 13;
  // If a bright fill ever feels too loud, we can flip this to "border-only" quickly.
  const borderOnly = false;
  const bodyFill = borderOnly ? "rgba(0,0,0,0.18)" : fill;
  const coreFill = borderOnly ? "rgba(255,255,255,0.96)" : "rgba(255,255,255,0.96)";
  // Premium neon pin: slim silhouette + glass highlight + gradient ring + selected glow.
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 44 52">
    <defs>
      <linearGradient id="ring" x1="10" y1="10" x2="34" y2="34" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="${stroke}" stop-opacity="1"/>
        <stop offset="0.55" stop-color="#ffffff" stop-opacity="0.42"/>
        <stop offset="1" stop-color="${stroke}" stop-opacity="0.95"/>
      </linearGradient>
      <radialGradient id="cap" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(22 16) rotate(90) scale(18 18)">
        <stop offset="0" stop-color="rgba(255,255,255,0.18)"/>
        <stop offset="1" stop-color="rgba(255,255,255,0)"/>
      </radialGradient>
      <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
        <feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="${glow}" flood-opacity="${selected ? "0.65" : "0.0"}"/>
        <feDropShadow dx="0" dy="18" stdDeviation="14" flood-color="rgba(0,0,0,0.60)" flood-opacity="0.9"/>
      </filter>
      <filter id="soft" x="-60%" y="-60%" width="220%" height="220%">
        <feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="rgba(0,0,0,0.55)" flood-opacity="0.85"/>
      </filter>
    </defs>
    <g filter="${selected ? "url(#glow)" : "url(#soft)"}">
      <!-- outer body -->
      <path d="M22 51C31 39 36 30.5 36 22.5C36 12.85 29.15 5 22 5C14.85 5 8 12.85 8 22.5C8 30.5 13 39 22 51Z" fill="${bodyFill}" stroke="rgba(0,0,0,0.22)" stroke-width="2"/>
      <!-- glass sheen -->
      <path d="M14 14c3.5-5 8.5-7.2 13.2-6.1c1 .25 1.5 1.35.95 2.2c-1.8 2.8-5.2 4.6-9.1 4.9c-2.2.18-4 .98-5.2 2.4c-.7.8-2 .5-1.95-.4c.06-1.0.6-2.1 2.1-3.0Z" fill="rgba(255,255,255,0.10)"/>
      <!-- cap glow -->
      <circle cx="22" cy="18" r="16" fill="url(#cap)"/>
      <!-- inner ring + core -->
      <circle cx="22" cy="22" r="12.2" fill="rgba(0,0,0,0.12)" stroke="url(#ring)" stroke-width="${ring}"/>
      <circle cx="22" cy="22" r="9.3" fill="${coreFill}"/>
      <!-- label -->
      <text x="22" y="27.2" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace" font-size="${font}" font-weight="950" fill="${borderOnly ? ink : text}">${label}</text>
      <!-- micro highlight dot -->
      <circle cx="28.2" cy="16.8" r="1.2" fill="rgba(255,255,255,0.55)"/>
    </g>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.trim())}`;
}

/**
 * THINKAD UI(헤르메스 오렌지·브루탈 보더) 정적 SVG — 절대 URL로 로드해 MarkerClusterer 와도 호환.
 */
function tkadPinMarkerImage(
  maps: KakaoMapsForImage["maps"],
  variant: TkadPinVariant,
  mediaType?: string,
) {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "";
  const { path, w, h } = TKAD_PIN[variant];
  const src =
    path === "data"
      ? pinDataUrl(mediaType ?? "", variant.toLowerCase().includes("selected"))
      : `${origin}${path}`;
  return new maps.MarkerImage(src, new maps.Size(w, h), {
    offset: new maps.Point(w / 2, h),
  });
}

const SDK_LOAD_FAILED_KO =
  "카카오 지도 SDK를 불러오지 못했습니다. JavaScript 키(NEXT_PUBLIC_KAKAO_MAP_APP_KEY)·카카오 디벨로퍼스 「JS SDK 도메인」에 브라우저 주소와 동일한 origin(예: http://localhost:3000, http://localhost:3004)을 등록·.env 변경 후 dev 재시작·네트워크를 확인하세요.";

function loadKakaoSdk(appkey: string): Promise<void> {
  const sdkUrl = kakaoMapsSdkUrl(appkey);
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("SSR"));
      return;
    }
    type MapsApi = { load: (cb: () => void) => void };
    const mapsApi = (): MapsApi | undefined =>
      (window as unknown as { kakao?: { maps?: MapsApi } }).kakao?.maps;

    const runKakaoLoad = () => {
      const maps = mapsApi();
      if (maps?.load) {
        maps.load(() => resolve());
        return;
      }
      reject(
        new Error(
          "kakao.maps 가 없습니다. JavaScript 키와 Web 사이트 도메인을 카카오 디벨로퍼스에서 확인하세요.",
        ),
      );
    };

    if (mapsApi()?.load) {
      runKakaoLoad();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-kakao-sdk="1"]`,
    );
    if (existing) {
      const onScriptError = () => reject(new Error(SDK_LOAD_FAILED_KO));
      existing.addEventListener("load", runKakaoLoad, { once: true });
      existing.addEventListener("error", onScriptError, { once: true });
      queueMicrotask(() => {
        if (mapsApi()?.load) runKakaoLoad();
      });
      return;
    }

    const s = document.createElement("script");
    s.src = sdkUrl;
    s.async = true;
    s.dataset.kakaoSdk = "1";
    s.onload = () => runKakaoLoad();
    s.onerror = () => reject(new Error(SDK_LOAD_FAILED_KO));
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
  coverageGeoJson = null,
  fitCoverageBounds = false,
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
  const coveragePolygonsRef = useRef<Array<{ setMap: (m: unknown) => void }>>([]);
  const coverageSig =
    coverageGeoJson == null ? "" : JSON.stringify(coverageGeoJson);

  useEffect(() => {
    onMarkerDetailRef.current = onMarkerDetail;
  }, [onMarkerDetail]);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    markersRef.current = markers;
  }, [markers]);

  // This effect intentionally boots Kakao SDK once per mount.
  useEffect(() => {
    const appkey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY?.trim();
    if (!appkey) {
      queueMicrotask(() => {
        setSdkError(
          "NEXT_PUBLIC_KAKAO_MAP_APP_KEY 미설정 (KAKAO_REST_API_KEY 와 다릅니다 — 지도는 JS 키가 필요합니다)",
        );
      });
      return;
    }

    let cancelled = false;
    let idleHandler: (() => void) | null = null;
    let clusterClickHandler: ((cluster: unknown) => void) | null = null;
    let resizeObserver: ResizeObserver | null = null;
    const markerObjs = markerObjsRef.current;
    const containerEl = containerRef.current;

    const fireRelayout = () => {
      const m = mapRef.current as { relayout?: () => void } | null;
      if (m && typeof m.relayout === "function") {
        try {
          m.relayout();
        } catch {
          /* noop */
        }
      }
    };

    loadKakaoSdk(appkey)
      .then(() => {
        if (cancelled || !containerRef.current) return;
        try {
          const kakao = getKakaoSdk();
          if (!kakao?.maps) return;
          // React Strict / 라우트 재진입 시 이전 지도 노드가 남으면 Kakao 초기화 실패 가능
          containerRef.current.innerHTML = "";

          const map = new kakao.maps.Map(containerRef.current, {
            center: new kakao.maps.LatLng(center.lat, center.lng),
            level: zoom,
          });
          mapRef.current = map;

          if (typeof ResizeObserver !== "undefined" && containerRef.current) {
            resizeObserver = new ResizeObserver(() => {
              if (!cancelled) fireRelayout();
            });
            resizeObserver.observe(containerRef.current);
          }

          if (typeof kakao.maps.MarkerClusterer === "function") {
            // minLevel 낮을수록(숫자 작을수록) 더 확대된 상태에서도 클러스터가 동작 — 겹침 숫자 노출 증가
            const clusterer = new kakao.maps.MarkerClusterer({
              map,
              averageCenter: true,
              // 더 가까운 줌(레벨↓)에서도 숫자 클러스터 유지
              minLevel: 5,
              // 중간 줌에서도 적극적으로 묶이게 확대
              gridSize: 120,
              disableClickZoom: true,
              calculator: [...TKAD_CLUSTER_CALCULATOR],
              styles: TKAD_CLUSTER_STYLES,
            });
            clustererRef.current = clusterer;

            clusterClickHandler = (cluster: unknown) => {
              if (cancelled) return;
              const c = cluster as {
                getCenter?: () => unknown;
                getMarkers?: () => unknown[];
              };
              const centerLatLng = c.getCenter?.();
              const markersIn =
                typeof c.getMarkers === "function" ? (c.getMarkers() ?? []) : [];

              if (markersIn.length > 1) {
                const bounds = new kakao.maps.LatLngBounds();
                for (const m of markersIn as Array<{ getPosition?: () => unknown }>) {
                  try {
                    const p = m.getPosition?.();
                    if (p) bounds.extend(p);
                  } catch {
                    /* noop */
                  }
                }
                try {
                  // (상,우,하,좌) 패딩 px — 클러스터 탭 후 주변 맥락이 보이도록
                  map.setBounds(bounds, 72, 72, 72, 72);
                } catch {
                  try {
                    map.setBounds(bounds, 72);
                  } catch {
                    const next = Math.max(1, map.getLevel() - 2);
                    if (centerLatLng) map.setLevel(next, { anchor: centerLatLng });
                  }
                }
              } else {
                const next = Math.max(1, map.getLevel() - 2);
                if (centerLatLng) map.setLevel(next, { anchor: centerLatLng });
              }
            };
            kakao.maps.event.addListener(clusterer, "clusterclick", clusterClickHandler);
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
          requestAnimationFrame(() => {
            if (!cancelled) fireRelayout();
          });
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
      resizeObserver?.disconnect();
      resizeObserver = null;
      const mapInst = mapRef.current as Record<string, unknown> | null;
      const kw = getKakaoSdk();
      if (mapInst && idleHandler && kw?.maps?.event?.removeListener) {
        try {
          kw.maps.event.removeListener(mapInst, "idle", idleHandler);
        } catch {
          /* noop */
        }
      }
      idleHandler = null;
      const clusterer = clustererRef.current as {
        clear?: () => void;
      } | null;
      if (clusterer && clusterClickHandler && kw?.maps?.event?.removeListener) {
        try {
          kw.maps.event.removeListener(clusterer, "clusterclick", clusterClickHandler);
        } catch {
          /* noop */
        }
      }
      clusterClickHandler = null;
      try {
        clusterer?.clear?.();
      } catch {
        /* noop */
      }
      clustererRef.current = null;
      for (const p of coveragePolygonsRef.current) {
        try {
          p.setMap(null);
        } catch {
          /* noop */
        }
      }
      coveragePolygonsRef.current = [];
      markerObjs.clear();
      mapRef.current = null;
      infoWindowRef.current = null;
      lastBoundsSentRef.current = null;
      if (containerEl) containerEl.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current as unknown;
    if (!map) return;
    try {
      const clusterer = clustererRef.current as unknown as
        | {
            addMarkers?: (markers: unknown[]) => void;
            removeMarker?: (marker: unknown) => void;
            redraw?: () => void;
          }
        | null;
      const kakao = getKakaoSdk();
      if (!kakao?.maps) return;

      const existing = markerObjsRef.current;
      const nextIds = new Set(markers.map((m) => m.id));

      for (const [id, m] of existing) {
        if (!nextIds.has(id)) {
          if (clusterer?.removeMarker) clusterer.removeMarker(m);
          else (m as { setMap: (map: unknown | null) => void }).setMap(null);
          existing.delete(id);
        }
      }

      const toAdd: unknown[] = [];
      for (const mk of markers) {
        if (existing.has(mk.id)) continue;
        const lat = Number(mk.lat);
        const lng = Number(mk.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        const baseType: "digital" | "static" | "mobile" | "default" =
          mk.type?.toLowerCase().includes("digital")
            ? "digital"
            : mk.type?.toLowerCase().includes("static")
              ? "static"
              : mk.type?.toLowerCase().includes("mobile")
                ? "mobile"
                : "default";
        const variant: TkadPinVariant =
          selectedId != null && mk.id === selectedId
            ? baseType === "digital"
              ? "digitalSelected"
              : baseType === "static"
                ? "staticSelected"
                : baseType === "mobile"
                  ? "mobileSelected"
                  : "selected"
            : baseType === "digital"
              ? "digital"
              : baseType === "static"
                ? "static"
                : baseType === "mobile"
                  ? "mobile"
                  : "default";
        const marker = new kakao.maps.Marker({
          position: new kakao.maps.LatLng(lat, lng),
          title: mk.name,
          image: tkadPinMarkerImage(kakao.maps, variant, mk.type),
        });
        kakao.maps.event.addListener(marker, "click", () => onSelectRef.current(mk.id));
        existing.set(mk.id, marker);
        if (clusterer) toAdd.push(marker);
        else (marker as { setMap: (m: unknown) => void }).setMap(map);
      }

      for (const mk of markers) {
        const marker = existing.get(mk.id) as
          | { setImage?: (im: unknown) => void }
          | undefined;
        if (!marker || typeof marker.setImage !== "function") continue;
        const baseType: "digital" | "static" | "mobile" | "default" =
          mk.type?.toLowerCase().includes("digital")
            ? "digital"
            : mk.type?.toLowerCase().includes("static")
              ? "static"
              : mk.type?.toLowerCase().includes("mobile")
                ? "mobile"
                : "default";
        const variant: TkadPinVariant =
          selectedId != null && mk.id === selectedId
            ? baseType === "digital"
              ? "digitalSelected"
              : baseType === "static"
                ? "staticSelected"
                : baseType === "mobile"
                  ? "mobileSelected"
                  : "selected"
            : baseType === "digital"
              ? "digital"
              : baseType === "static"
                ? "static"
                : baseType === "mobile"
                  ? "mobile"
                  : "default";
        try {
          marker.setImage(tkadPinMarkerImage(kakao.maps, variant, mk.type));
        } catch {
          /* noop */
        }
      }

      if (clusterer?.addMarkers && toAdd.length) {
        clusterer.addMarkers(toAdd);
        requestAnimationFrame(() => {
          try {
            const relayout = (map as { relayout?: () => void } | null)?.relayout;
            if (typeof relayout === "function") relayout();
            const redraw = clusterer?.redraw as (() => void) | undefined;
            if (typeof redraw === "function") redraw();
          } catch {
            /* noop */
          }
        });
      }
    } catch (e) {
      console.error("[KakaoMapView] markers sync failed", e);
    }
  }, [markers, mapReady, selectedId]);

  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    const kakao = getKakaoSdk();
    if (!map || !kakao?.maps?.Polygon) return;

    for (const p of coveragePolygonsRef.current) {
      try {
        p.setMap(null);
      } catch {
        /* noop */
      }
    }
    coveragePolygonsRef.current = [];

    const fc = coverageGeoJson as {
      features?: Array<{
        geometry?: { type?: string; coordinates?: [number, number][][] };
      }>;
    } | null;
    if (!fc?.features?.length) return;

    const K = kakao.maps;
    const bounds = new K.LatLngBounds();
    for (const f of fc.features) {
      const geom = f.geometry;
      if (geom?.type !== "Polygon" || !geom.coordinates?.[0]) continue;
      const ring = geom.coordinates[0];
      if (ring.length < 3) continue;
      const path = ring.map(([lng, lat]) => new K.LatLng(lat, lng));
      const poly = new K.Polygon({
        map,
        path,
        strokeWeight: 2,
        strokeColor: "#3730a3",
        strokeOpacity: 0.88,
        fillColor: "#a855f7",
        fillOpacity: 0.12,
      });
      coveragePolygonsRef.current.push(poly);
      for (const [lng, lat] of ring) bounds.extend(new K.LatLng(lat, lng));
    }

    if (fitCoverageBounds && coveragePolygonsRef.current.length) {
      const m = map as { setBounds?: (...args: unknown[]) => void };
      try {
        m.setBounds?.(bounds, 48, 48, 48, 48);
      } catch {
        try {
          m.setBounds?.(bounds, 56);
        } catch {
          /* noop */
        }
      }
    }

    return () => {
      for (const p of coveragePolygonsRef.current) {
        try {
          p.setMap(null);
        } catch {
          /* noop */
        }
      }
      coveragePolygonsRef.current = [];
    };
  }, [mapReady, coverageGeoJson, coverageSig, fitCoverageBounds]);

  // #MAP-1: 미니 팝업(CustomOverlay) 비활성화. 마커 선택 시 panTo만 수행.
  // 상세는 사이드 카드(media-map-page-client.tsx) 또는 onMarkerDetail 라우팅으로 노출.
  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current as unknown;
    if (!map) return;
    try {
      const kakao = getKakaoSdk();
      if (!kakao?.maps) return;

      const existingInfo = infoWindowRef.current as { setMap?: (m: unknown | null) => void } | null;
      if (existingInfo?.setMap) existingInfo.setMap(null);
      infoWindowRef.current = null;

      if (!selectedId) return;
      const m = markersRef.current.find((x) => x.id === selectedId);
      const lat = m ? Number(m.lat) : NaN;
      const lng = m ? Number(m.lng) : NaN;
      if (!m || !Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const panTo = (map as { panTo?: (pos: unknown) => void } | null)?.panTo;
      if (typeof panTo === "function") {
        panTo(new kakao.maps.LatLng(lat, lng));
      }
    } catch (e) {
      console.error("[KakaoMapView] panTo failed", e);
    }
  }, [selectedId, mapReady]);

  if (sdkError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-transparent p-4">
        <div className="relative w-full max-w-lg overflow-hidden rounded-[22px] border border-white/12 bg-black/45 px-6 py-8 text-sm text-white shadow-[0_28px_120px_rgba(0,0,0,0.55)] backdrop-blur">
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.10] tkad-neon-grid" />
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-16 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.22),transparent_58%),radial-gradient(circle_at_bottom,rgba(34,211,238,0.18),transparent_58%),radial-gradient(circle_at_left,rgba(236,72,153,0.14),transparent_62%)]"
          />
          <div className="relative">
            <div className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white/70">
              MAP SDK ERROR
            </div>
            <div className="mt-2 leading-relaxed text-white/90">{sdkError}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tkad-kakao-map-root relative h-full w-full min-h-[200px] text-[#0a0a0c] [color-scheme:light]">
      <div ref={containerRef} className="h-full w-full min-h-[200px]" />
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/25 p-4">
          <div className="relative w-full max-w-sm overflow-hidden rounded-[22px] border border-white/12 bg-black/45 px-6 py-8 text-white shadow-[0_28px_120px_rgba(0,0,0,0.55)] backdrop-blur">
            <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.10] tkad-neon-grid" />
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-16 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.22),transparent_58%),radial-gradient(circle_at_bottom,rgba(34,211,238,0.18),transparent_58%),radial-gradient(circle_at_left,rgba(236,72,153,0.14),transparent_62%)]"
            />
            <div className="relative flex flex-col items-center gap-4">
              <div className="rounded-2xl border border-white/14 bg-white/8 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white/75">
                LOADING
              </div>
              <div className="text-sm font-semibold text-white/90">지도 준비 중…</div>
              <div className="h-2 w-full overflow-hidden rounded-full border border-white/12 bg-black/20">
                <div className="h-full w-[42%] animate-[tkadShimmer_1.2s_ease-in-out_infinite] bg-[linear-gradient(90deg,#a855f7,#22d3ee,#ec4899)]" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
