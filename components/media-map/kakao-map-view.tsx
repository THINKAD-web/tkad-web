"use client";

/**
 * Kakao Maps JavaScript SDK — 매체 상세·어드민·레거시 지도 목록.
 * 환경 변수: `NEXT_PUBLIC_KAKAO_MAP_APP_KEY`
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getKakaoMapAppKey,
  loadKakaoMapsSdk,
} from "@/lib/kakao-maps-admin";
import { cn } from "@/lib/utils";

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
  /** 사이드카드 hover 시 지도의 해당 핀을 살짝 더 큰 selected 변형으로 표시 (별도 panTo 없음). */
  hoveredId?: string | null;
  onSelect: (id: string) => void;
  onBoundsChange: (b: MapBounds) => void;
  /** 지도 idle 시점에 현재 중심·줌을 알림. URL state 동기화용. */
  onViewChange?: (view: { lat: number; lng: number; zoom: number }) => void;
  onMarkerDetail?: (id: string) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
  /** 외부에서 center/zoom 이 바뀔 때마다 panTo + setLevel 로 따라가게 하는 시퀀스 토큰.
   *  같은 값을 또 보내면 무시됨 (반복 렌더 시 무한 zoom 방지). */
  programmaticView?: { lat: number; lng: number; zoom: number; nonce: number } | null;
  /** "내 위치" 라벨 마커. 클릭/선택 대상 아님. */
  userLocation?: { lat: number; lng: number } | null;
  /** 이동형 커버리지 — `/api/geo/district-boundaries` 응답과 동일 형식 FeatureCollection */
  coverageGeoJson?: unknown | null;
  /** `coverageGeoJson` 이 있을 때 지도를 해당 영역에 맞춤 */
  fitCoverageBounds?: boolean;
  /** 타일만 흑백 — 마커·클러스터 핀 이미지는 컬러 유지 */
  monochromeTiles?: boolean;
  /** true면 마커를 지도에 직접 올려 근접 핀도 각각 표시 */
  disableCluster?: boolean;
};

declare global {
  interface Window {
    kakao: unknown;
  }
}

/**
 * 클러스터 — 글래스 디스크 + 네온 링(보라/시안/핑크) + 소프트 글로우 (주황 제거)
 * calculator 는 아래 TKAD_CLUSTER_CALCULATOR 와 길이(스타일 단계)를 맞출 것
 */
const TKAD_CLUSTER_CALCULATOR = [5, 14, 35, 90] as const;

const TKAD_CLUSTER_STYLES: Array<Record<string, string>> = (() => {
  const mk = (px: number, fs: string, accent: string, glow: string) => {
    const h = `${px}px`;
    const lh = `${px - 4}px`;
    return {
      width: h,
      height: h,
      borderRadius: "999px",
      background:
        "linear-gradient(145deg, rgba(8,8,12,0.94) 0%, rgba(18,18,26,0.88) 55%, rgba(8,8,12,0.92) 100%)",
      border: `2px solid ${accent}`,
      color: "#f8fafc",
      textAlign: "center",
      lineHeight: lh,
      fontSize: fs,
      fontWeight: "700",
      fontFamily:
        "'JetBrains Mono', 'Pretendard Variable', Pretendard, ui-monospace, system-ui, sans-serif",
      letterSpacing: "-0.05em",
      cursor: "pointer",
      boxShadow: `0 0 0 1px rgba(255,255,255,0.06) inset, 0 0 18px ${glow}`,
    };
  };
  return [
    mk(38, "10px", "rgba(168,85,247,0.92)", "rgba(168,85,247,0.35)"),
    mk(42, "11px", "rgba(34,211,238,0.92)", "rgba(34,211,238,0.32)"),
    mk(46, "12px", "rgba(236,72,153,0.9)", "rgba(236,72,153,0.3)"),
    mk(50, "13px", "rgba(34,211,238,0.95)", "rgba(34,211,238,0.34)"),
    mk(54, "14px", "rgba(168,85,247,0.95)", "rgba(168,85,247,0.36)"),
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
  | "mobileSelected"
  | "office"
  | "officeSelected";

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
  office: { path: "data", w: 40, h: 48 },
  officeSelected: { path: "data", w: 44, h: 52 },
};

function pinColorForType(type: string): {
  fill: string;
  stroke: string;
  text: string;
  glow: string;
  ink: string;
} {
  const t = (type || "").toLowerCase();
  if (t.includes("office") || t.includes("thinkad")) {
    return {
      fill: "#a855f7",
      stroke: "#22d3ee",
      text: "#0a0a0c",
      glow: "rgba(168,85,247,0.45)",
      ink: "#05050a",
    };
  }
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
  if (t.includes("office") || t.includes("thinkad")) return "T";
  if (t.includes("digital")) return "D";
  if (t.includes("static")) return "S";
  if (t.includes("mobile")) return "M";
  return "•";
}

function pinDataUrl(type: string, selected: boolean): string {
  const { fill, stroke, text } = pinColorForType(type);
  const w = selected ? 44 : 40;
  const h = selected ? 52 : 48;
  const label = pinLetterForType(type);
  const ring = selected ? 3 : 2;
  const font = selected ? 14 : 13;
  // If a bright fill ever feels too loud, we can flip this to "border-only" quickly.
  const bodyFill = selected ? fill : "rgba(8,8,12,0.94)";
  const bodyStroke = selected ? stroke : "rgba(255,255,255,0.14)";
  const coreFill = selected ? fill : "rgba(12,12,18,0.98)";
  const labelFill = selected ? text : stroke;
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 44 52">
    <defs>
      <linearGradient id="ring" x1="8" y1="8" x2="36" y2="36" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="${stroke}" stop-opacity="1"/>
        <stop offset="0.45" stop-color="#ffffff" stop-opacity="0.5"/>
        <stop offset="1" stop-color="${stroke}" stop-opacity="1"/>
      </linearGradient>
    </defs>
    <g>
      <path d="M22 51C31 39 36 30.5 36 22.5C36 12.85 29.15 5 22 5C14.85 5 8 12.85 8 22.5C8 30.5 13 39 22 51Z" fill="${bodyFill}" stroke="${bodyStroke}" stroke-width="${selected ? 2.5 : 1.75}"/>
      <path d="M14 14c3.5-5 8.5-7.2 13.2-6.1c1 .25 1.5 1.35.95 2.2c-1.8 2.8-5.2 4.6-9.1 4.9c-2.2.18-4 .98-5.2 2.4c-.7.8-2 .5-1.95-.4c.06-1.0.6-2.1 2.1-3.0Z" fill="rgba(255,255,255,0.08)"/>
      ${selected ? `<ellipse cx="22" cy="21" rx="17" ry="18" fill="none" stroke="${stroke}" stroke-width="2" opacity="0.85"/>` : ""}
      <circle cx="22" cy="22" r="11.8" fill="${coreFill}" stroke="url(#ring)" stroke-width="${ring}"/>
      <circle cx="22" cy="22" r="8.6" fill="rgba(255,255,255,0.04)"/>
      <text x="22" y="26.8" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="${font}" font-weight="800" fill="${labelFill}">${label}</text>
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

type MediaPinBase = "digital" | "static" | "mobile" | "office" | "default";

const pinImageCache = new Map<string, unknown>();

function mediaPinBaseType(type: string): MediaPinBase {
  const t = (type || "").toLowerCase();
  if (t.includes("office") || t.includes("thinkad")) return "office";
  if (t.includes("digital")) return "digital";
  if (t.includes("static")) return "static";
  if (t.includes("mobile")) return "mobile";
  return "default";
}

function mediaPinVariant(base: MediaPinBase, highlighted: boolean): TkadPinVariant {
  if (highlighted) {
    if (base === "office") return "officeSelected";
    if (base === "digital") return "digitalSelected";
    if (base === "static") return "staticSelected";
    if (base === "mobile") return "mobileSelected";
    return "selected";
  }
  if (base === "office") return "office";
  if (base === "digital") return "digital";
  if (base === "static") return "static";
  if (base === "mobile") return "mobile";
  return "default";
}

function cachedPinMarkerImage(
  maps: KakaoMapsForImage["maps"],
  variant: TkadPinVariant,
  mediaType: string,
) {
  const key = `trendy:${variant}:${mediaType}`;
  const hit = pinImageCache.get(key);
  if (hit) return hit;
  const img = tkadPinMarkerImage(maps, variant, mediaType);
  pinImageCache.set(key, img);
  return img;
}

/** 클러스터 탭 시 항상 줌인만 (setBounds 는 분산이 크면 오히려 줌아웃됨). */
function zoomClusterIn(
  map: {
    getLevel: () => number;
    setLevel: (next: number, opts?: { anchor?: unknown }) => void;
    panTo: (pos: unknown) => void;
  },
  center: unknown,
  markerCount: number,
) {
  const current = map.getLevel();
  const steps =
    markerCount >= 80 ? 1 : markerCount >= 30 ? 2 : markerCount >= 10 ? 3 : 4;
  const target = Math.max(1, current - steps);
  const next = target < current ? target : Math.max(1, current - 1);
  if (center) {
    map.panTo(center);
    map.setLevel(next, { anchor: center });
  } else {
    map.setLevel(next);
  }
}

export default function KakaoMapView({
  markers,
  selectedId,
  hoveredId = null,
  onSelect,
  onBoundsChange,
  onViewChange,
  onMarkerDetail,
  center = { lat: 37.5665, lng: 126.978 },
  zoom = 8,
  programmaticView = null,
  userLocation = null,
  coverageGeoJson = null,
  fitCoverageBounds = false,
  monochromeTiles = false,
  disableCluster = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<unknown>(null);
  const markerObjsRef = useRef<Map<string, unknown>>(new Map());
  const clustererRef = useRef<unknown>(null);
  const infoWindowRef = useRef<unknown>(null);
  const userLocationMarkerRef = useRef<unknown>(null);
  const lastBoundsSentRef = useRef<MapBounds | null>(null);
  const onMarkerDetailRef = useRef(onMarkerDetail);
  const onSelectRef = useRef(onSelect);
  const onViewChangeRef = useRef(onViewChange);
  const markersRef = useRef<MapMarker[]>(markers);
  const lastProgrammaticNonceRef = useRef<number | null>(null);
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
    onViewChangeRef.current = onViewChange;
  }, [onViewChange]);

  useEffect(() => {
    markersRef.current = markers;
  }, [markers]);

  const isMarkerMapImage = useCallback((img: HTMLImageElement) => {
    const src = img.getAttribute("src") ?? "";
    return (
      src.startsWith("data:image") ||
      src.includes("tkad-media-map-pin") ||
      src.includes("/images/tkad")
    );
  }, []);

  const applyMonochromeTiles = useCallback(() => {
    const root = containerRef.current;
    if (!root || !monochromeTiles) return;
    root.querySelectorAll("img").forEach((img) => {
      if (isMarkerMapImage(img)) {
        img.style.filter = "none";
        img.dataset.tkadMarker = "1";
        return;
      }
      if (img.dataset.tkadMarker === "1") return;
      img.style.filter = "grayscale(1) contrast(1.08) brightness(1.03)";
    });
  }, [isMarkerMapImage, monochromeTiles]);

  useEffect(() => {
    if (!mapReady || !monochromeTiles) return;
    const root = containerRef.current;
    if (!root) return;
    applyMonochromeTiles();
    const observer = new MutationObserver(() => applyMonochromeTiles());
    observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
    return () => observer.disconnect();
  }, [mapReady, monochromeTiles, applyMonochromeTiles]);

  // This effect intentionally boots Kakao SDK once per mount.
  useEffect(() => {
    const appkey = getKakaoMapAppKey();
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
    let idleDebounce: ReturnType<typeof setTimeout> | null = null;
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

    loadKakaoMapsSdk({ appkey, libraries: "clusterer" })
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

          if (!disableCluster && typeof kakao.maps.MarkerClusterer === "function") {
            // minLevel 낮을수록(숫자 작을수록) 더 확대된 상태에서도 클러스터가 동작 — 겹침 숫자 노출 증가
            const clusterer = new kakao.maps.MarkerClusterer({
              map,
              averageCenter: true,
              // 더 가까운 줌(레벨↓)에서도 숫자 클러스터 유지
              minLevel: 5,
              gridSize: 100,
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
              const count = Math.max(1, markersIn.length);
              zoomClusterIn(map, centerLatLng, count);
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
            // 중심·줌 변경도 함께 통보 — URL state 동기화용
            try {
              const cb = onViewChangeRef.current;
              if (cb) {
                const centerLat = (sw.getLat() + ne.getLat()) / 2;
                const centerLng = (sw.getLng() + ne.getLng()) / 2;
                const z = map.getLevel();
                cb({ lat: centerLat, lng: centerLng, zoom: z });
              }
            } catch {
              /* noop */
            }
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

          const fireBoundsDebounced = () => {
            if (idleDebounce) clearTimeout(idleDebounce);
            idleDebounce = setTimeout(() => {
              idleDebounce = null;
              fireBounds();
            }, 140);
          };
          idleHandler = fireBoundsDebounced;
          kakao.maps.event.addListener(map, "idle", fireBoundsDebounced);
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
      if (idleDebounce) clearTimeout(idleDebounce);
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

  const pinVariantByIdRef = useRef<Map<string, TkadPinVariant>>(new Map());

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
      const variantById = pinVariantByIdRef.current;
      const nextIds = new Set(markers.map((m) => m.id));
      const highlightId = hoveredId ?? selectedId;

      for (const [id, m] of existing) {
        if (!nextIds.has(id)) {
          if (clusterer?.removeMarker) clusterer.removeMarker(m);
          else (m as { setMap: (map: unknown | null) => void }).setMap(null);
          existing.delete(id);
          variantById.delete(id);
        }
      }

      const toAdd: unknown[] = [];
      for (const mk of markers) {
        if (existing.has(mk.id)) continue;
        const lat = Number(mk.lat);
        const lng = Number(mk.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        const base = mediaPinBaseType(mk.type);
        const variant = mediaPinVariant(base, mk.id === highlightId);
        const marker = new kakao.maps.Marker({
          position: new kakao.maps.LatLng(lat, lng),
          title: mk.name,
          image: cachedPinMarkerImage(kakao.maps, variant, mk.type),
        });
        kakao.maps.event.addListener(marker, "click", () => onSelectRef.current(mk.id));
        existing.set(mk.id, marker);
        variantById.set(mk.id, variant);
        if (clusterer) toAdd.push(marker);
        else (marker as { setMap: (m: unknown) => void }).setMap(map);
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
  }, [markers, mapReady, hoveredId, selectedId]);

  useEffect(() => {
    if (!mapReady) return;
    const kakao = getKakaoSdk();
    if (!kakao?.maps) return;
    try {
      const existing = markerObjsRef.current;
      const variantById = pinVariantByIdRef.current;
      const highlightId = hoveredId ?? selectedId;
      const list = markersRef.current;

      for (const mk of list) {
        const marker = existing.get(mk.id) as
          | { setImage?: (im: unknown) => void }
          | undefined;
        if (!marker || typeof marker.setImage !== "function") continue;
        const base = mediaPinBaseType(mk.type);
        const variant = mediaPinVariant(base, mk.id === highlightId);
        if (variantById.get(mk.id) === variant) continue;
        variantById.set(mk.id, variant);
        try {
          marker.setImage(cachedPinMarkerImage(kakao.maps, variant, mk.type));
        } catch {
          /* noop */
        }
      }
    } catch (e) {
      console.error("[KakaoMapView] marker visuals failed", e);
    }
  }, [selectedId, hoveredId, mapReady]);

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

  // 외부 programmaticView (URL 하이드레이션 / "내 주변" 클릭 등) 반영
  useEffect(() => {
    if (!mapReady) return;
    if (!programmaticView) return;
    if (lastProgrammaticNonceRef.current === programmaticView.nonce) return;
    lastProgrammaticNonceRef.current = programmaticView.nonce;
    const map = mapRef.current as
      | {
          panTo?: (pos: unknown) => void;
          setLevel?: (z: number, opts?: { anchor?: unknown }) => void;
        }
      | null;
    const kakao = getKakaoSdk();
    if (!map || !kakao?.maps) return;
    try {
      const pos = new kakao.maps.LatLng(programmaticView.lat, programmaticView.lng);
      map.panTo?.(pos);
      if (typeof map.setLevel === "function") {
        map.setLevel(programmaticView.zoom);
      }
    } catch (e) {
      console.error("[KakaoMapView] programmaticView failed", e);
    }
  }, [programmaticView, mapReady]);

  // "내 위치" 마커
  useEffect(() => {
    if (!mapReady) return;
    const kakao = getKakaoSdk();
    if (!kakao?.maps) return;
    const map = mapRef.current as unknown;
    if (!map) return;

    const existing = userLocationMarkerRef.current as
      | { setMap?: (m: unknown | null) => void }
      | null;
    if (existing?.setMap) {
      try {
        existing.setMap(null);
      } catch {
        /* noop */
      }
    }
    userLocationMarkerRef.current = null;

    if (!userLocation) return;

    try {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34">
  <defs>
    <radialGradient id="ul" cx="17" cy="17" r="15" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#22d3ee"/>
      <stop offset="0.8" stop-color="#22d3ee" stop-opacity="0.4"/>
      <stop offset="1" stop-color="#22d3ee" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="17" cy="17" r="16" fill="url(#ul)" opacity="0.55"/>
  <circle cx="17" cy="17" r="8" fill="#22d3ee" stroke="#ffffff" stroke-width="3"/>
</svg>`;
      const dataUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
      const image = new kakao.maps.MarkerImage(
        dataUrl,
        new kakao.maps.Size(34, 34),
        { offset: new kakao.maps.Point(17, 17) },
      );
      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(userLocation.lat, userLocation.lng),
        image,
        title: "내 위치",
      });
      (marker as { setMap: (m: unknown) => void }).setMap(map);
      userLocationMarkerRef.current = marker;
    } catch (e) {
      console.error("[KakaoMapView] userLocation marker failed", e);
    }

    return () => {
      const m = userLocationMarkerRef.current as
        | { setMap?: (m: unknown | null) => void }
        | null;
      try {
        m?.setMap?.(null);
      } catch {
        /* noop */
      }
      userLocationMarkerRef.current = null;
    };
  }, [userLocation, mapReady]);

  if (sdkError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-transparent p-4">
        <div className="relative w-full max-w-lg overflow-hidden rounded-[22px] border dark:border-white/12 border-gray-200 dark:bg-black bg-white/45 px-6 py-8 text-sm dark:text-white text-gray-900 shadow-[0_28px_120px_rgba(0,0,0,0.55)] backdrop-blur">
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.10] tkad-neon-grid" />
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-16 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.22),transparent_58%),radial-gradient(circle_at_bottom,rgba(34,211,238,0.18),transparent_58%),radial-gradient(circle_at_left,rgba(236,72,153,0.14),transparent_62%)]"
          />
          <div className="relative">
            <div className="font-display text-xs font-medium uppercase tracking-[0.22em] dark:text-white text-gray-600">
              MAP SDK ERROR
            </div>
            <div className="mt-2 leading-relaxed dark:text-white text-gray-800">{sdkError}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "tkad-kakao-map-root relative h-full w-full min-h-[200px] text-[#0a0a0c] [color-scheme:light]",
        monochromeTiles && "tkad-kakao-map-root--mono",
      )}
    >
      <div ref={containerRef} className="h-full w-full min-h-[200px]" />
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center dark:bg-black bg-white/25 p-4">
          <div className="relative w-full max-w-sm overflow-hidden rounded-[22px] border dark:border-white/12 border-gray-200 dark:bg-black bg-white/45 px-6 py-8 dark:text-white text-gray-900 shadow-[0_28px_120px_rgba(0,0,0,0.55)] backdrop-blur">
            <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.10] tkad-neon-grid" />
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-16 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.22),transparent_58%),radial-gradient(circle_at_bottom,rgba(34,211,238,0.18),transparent_58%),radial-gradient(circle_at_left,rgba(236,72,153,0.14),transparent_62%)]"
            />
            <div className="relative flex flex-col items-center gap-4">
              <div className="rounded-2xl border dark:border-white/14 border-gray-200 dark:bg-white/8 bg-gray-100 px-3 py-1 font-display text-xs font-medium uppercase tracking-[0.22em] dark:text-white text-gray-700">
                LOADING
              </div>
              <div className="text-sm font-semibold dark:text-white text-gray-800">지도 준비 중…</div>
              <div className="h-2 w-full overflow-hidden rounded-full border dark:border-white/12 border-gray-200 dark:bg-black bg-white/20">
                <div className="h-full w-[42%] animate-[tkadShimmer_1.2s_ease-in-out_infinite] bg-[linear-gradient(90deg,#a855f7,#22d3ee,#ec4899)]" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
