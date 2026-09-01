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
import { BRAND_ACCENT, BRAND_ACCENT_STROKE } from "@/lib/brand-palette";

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

/**
 * 단일 명령형 뷰 채널 — "지도에 무엇을 시킬지"를 한 곳(부모)에서 nonce 로 보낸다.
 * 여러 effect 가 prop 토글로 경쟁하던 구조를 대체. `command` 를 넘기는 소비자는
 * 레거시 뷰 effect(fitMarkersBounds/selectedId panTo)가 자동 비활성화된다.
 * - fitMarkers(auto): 사용자가 한 번이라도 지도를 조작하면(userViewportAdjustedRef) 무시.
 * - focusMarker: 명시적 사용자 의도 → 실행(programmatic) 후 사용자 조정 상태로 표시.
 */
export type MapViewCommand =
  | { type: "fitMarkers"; auto?: boolean; nonce: number }
  | {
      type: "focusMarker";
      lat: number;
      lng: number;
      level: number;
      nonce: number;
      /** false면 pan/setCenter 만 — 줌아웃 후 재실행 시 레벨 덮어쓰기 방지 */
      adjustLevel?: boolean;
    }
  | null;

type Props = {
  markers: MapMarker[];
  selectedId: string | null;
  /** 사이드카드 hover 시 지도의 해당 핀을 살짝 더 큰 selected 변형으로 표시 (별도 panTo 없음). */
  hoveredId?: string | null;
  onSelect: (id: string) => void;
  onBoundsChange: (b: MapBounds) => void;
  /** 지도 idle 시점에 현재 중심·줌을 알림. URL state 동기화용. */
  onViewChange?: (view: { lat: number; lng: number; zoom: number }) => void;
  /** 사용자가 직접 드래그/줌한 뒤 1회 알림 — 선택 재포커스 억제용 */
  onUserViewportAdjusted?: () => void;
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
  /** true면 모든 마커가 한 화면에 들어오도록 LatLngBounds 로 맞춤(네트워크 다지점용) */
  fitMarkersBounds?: boolean;
  /** 마커/목록 선택 시 panTo 만 수행 (줌 레벨은 변경하지 않음) */
  panOnSelect?: boolean;
  /** 선택 시 panTo + 줌 레벨 적용 (카카오: 숫자가 작을수록 확대). 매체 상세 등 클로즈업용 */
  zoomOnSelect?: number;
  /** 단일 명령형 뷰 채널. 넘기면 레거시 뷰 effect(fitMarkersBounds/selectedId panTo) 비활성. */
  command?: MapViewCommand;
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
/** MarkerClusterer `minLevel` 과 동기화 — 이보다 확대(숫자↓)되면 개별 마커 노출 */
const TKAD_CLUSTER_MIN_LEVEL = 5;
const TKAD_CLUSTER_UNCLUSTER_LEVEL = TKAD_CLUSTER_MIN_LEVEL - 1;
/** 프로그램적 줌인 하한 — 카카오 레벨 1~2 과확대 방지 (숫자가 작을수록 확대) */
const TKAD_PROGRAMMATIC_MIN_LEVEL = 3;

function clampProgrammaticZoomLevel(level: number): number {
  return Math.max(
    TKAD_PROGRAMMATIC_MIN_LEVEL,
    Math.min(14, Math.round(level)),
  );
}

/** 현재보다 확대(레벨 숫자 감소)할 때만 setLevel — 줌아웃은 사용자에게 맡김 */
function programmaticZoomInLevel(
  currentLevel: number,
  targetLevel: number,
): number | null {
  const target = clampProgrammaticZoomLevel(targetLevel);
  if (target >= currentLevel) return null;
  return target;
}

function clampMapZoomInIfNeeded(map: KakaoMapFocusApi) {
  const cur = map.getLevel?.();
  if (cur != null && cur < TKAD_PROGRAMMATIC_MIN_LEVEL) {
    map.setLevel?.(TKAD_PROGRAMMATIC_MIN_LEVEL);
  }
}

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
    mk(38, "10px", "rgba(255,98,0,0.92)", "rgba(255,98,0,0.32)"),
    mk(42, "11px", "rgba(113,113,122,0.92)", "rgba(113,113,122,0.32)"),
    mk(46, "12px", "rgba(161,161,170,0.9)", "rgba(161,161,170,0.28)"),
    mk(50, "13px", "rgba(255,98,0,0.95)", "rgba(255,98,0,0.34)"),
    mk(54, "14px", "rgba(82,82,91,0.95)", "rgba(82,82,91,0.36)"),
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
      opts: {
        center: unknown;
        level: number;
        scrollwheel?: boolean;
        draggable?: boolean;
        disableDoubleClickZoom?: boolean;
        keyboardShortcuts?: boolean;
      },
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
      addControl?: (control: unknown, position: number) => void;
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
    ZoomControl?: new () => unknown;
    ControlPosition?: {
      TOPRIGHT?: number;
      RIGHT?: number;
      LEFT?: number;
      TOPLEFT?: number;
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
  | "network"
  | "networkSelected"
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
  network: { path: "data", w: 40, h: 48 },
  networkSelected: { path: "data", w: 44, h: 52 },
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
      fill: BRAND_ACCENT,
      stroke: "#ff8a3d",
      text: "#ffffff",
      glow: "rgba(255,98,0,0.45)",
      ink: "#05050a",
    };
  }
  // Quiet Professional pin palette (no violet/cyan neon)
  if (t.includes("digital")) {
    return {
      fill: BRAND_ACCENT,
      stroke: BRAND_ACCENT,
      text: "#ffffff",
      glow: "rgba(255,98,0,0.45)",
      ink: "#0a0a0c",
    };
  }
  if (t.includes("static")) {
    return {
      fill: "#52525b",
      stroke: "#71717a",
      text: "#ffffff",
      glow: "rgba(82,82,91,0.45)",
      ink: "#05050a",
    };
  }
  if (t.includes("mobile")) {
    return {
      fill: "#78716c",
      stroke: "#a8a29e",
      text: "#ffffff",
      glow: "rgba(120,113,108,0.45)",
      ink: "#05050a",
    };
  }
  if (t.includes("network")) {
    return {
      fill: BRAND_ACCENT_STROKE,
      stroke: BRAND_ACCENT,
      text: "#ffffff",
      glow: "rgba(255,98,0,0.4)",
      ink: "#05050a",
    };
  }
  return {
    fill: "#71717a",
    stroke: "#a1a1aa",
    text: "#ffffff",
    glow: "rgba(113,113,122,0.45)",
    ink: "#05050a",
  };
}

function pinLetterForType(type: string): string {
  const t = (type || "").toLowerCase();
  if (t.includes("office") || t.includes("thinkad")) return "T";
  if (t.includes("digital")) return "D";
  if (t.includes("static")) return "S";
  if (t.includes("mobile")) return "M";
  if (t.includes("network")) return "N";
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

type MediaPinBase = "dooh" | "static" | "mobile" | "network" | "office" | "default";

const pinImageCache = new Map<string, unknown>();

function mediaPinBaseType(type: string): MediaPinBase {
  const t = (type || "").toLowerCase();
  if (t.includes("office") || t.includes("thinkad")) return "office";
  if (t.includes("network")) return "network";
  if (t.includes("digital")) return "dooh";
  if (t.includes("static")) return "static";
  if (t.includes("mobile")) return "mobile";
  return "default";
}

function mediaPinVariant(base: MediaPinBase, highlighted: boolean): TkadPinVariant {
  if (highlighted) {
    if (base === "office") return "officeSelected";
    if (base === "network") return "networkSelected";
    if (base === "digital") return "digitalSelected";
    if (base === "static") return "staticSelected";
    if (base === "mobile") return "mobileSelected";
    return "selected";
  }
  if (base === "office") return "office";
  if (base === "network") return "network";
  if (base === "digital") return "dooh";
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

type KakaoMapFocusApi = {
  getLevel?: () => number;
  setLevel?: (next: number, opts?: { anchor?: unknown }) => void;
  setCenter?: (pos: unknown) => void;
  panTo?: (pos: unknown) => void;
  getBounds?: () => { contain?: (p: unknown) => boolean };
  getCenter?: () => { getLat: () => number; getLng: () => number };
  setBounds?: (
    bounds: unknown,
    padTop?: number,
    padRight?: number,
    padBottom?: number,
    padLeft?: number,
  ) => void;
  relayout?: () => void;
};

type KakaoMapsBoundsApi = {
  maps: { LatLngBounds: new () => { extend: (p: unknown) => void } };
};

function isPositionInMapBounds(
  bounds: {
    contain?: (p: unknown) => boolean;
    getSouthWest?: () => { getLat: () => number; getLng: () => number };
    getNorthEast?: () => { getLat: () => number; getLng: () => number };
  },
  pos: { getLat: () => number; getLng: () => number },
): boolean {
  try {
    if (bounds.contain) return bounds.contain(pos);
    const sw = bounds.getSouthWest?.();
    const ne = bounds.getNorthEast?.();
    if (!sw || !ne) return false;
    const lat = pos.getLat();
    const lng = pos.getLng();
    return (
      lat >= sw.getLat() &&
      lat <= ne.getLat() &&
      lng >= sw.getLng() &&
      lng <= ne.getLng()
    );
  } catch {
    return false;
  }
}

function runAfterMapIdle(
  map: unknown,
  kakao: { maps?: { event?: { addListener?: Function; removeListener?: Function } } },
  fn: () => void,
) {
  const eventApi = kakao.maps?.event;
  if (!eventApi?.addListener || !eventApi?.removeListener) {
    requestAnimationFrame(fn);
    return;
  }
  const listener = eventApi.addListener(map, "idle", () => {
    eventApi.removeListener!(map, "idle", listener);
    fn();
  });
}

function forceUnclusterLevel(map: KakaoMapFocusApi) {
  const level = map.getLevel?.() ?? TKAD_CLUSTER_MIN_LEVEL + 1;
  if (level > TKAD_CLUSTER_UNCLUSTER_LEVEL) {
    const zoomIn = programmaticZoomInLevel(level, TKAD_CLUSTER_UNCLUSTER_LEVEL);
    if (zoomIn != null) map.setLevel?.(zoomIn);
  }
}
function latLngDist2(
  a: { getLat: () => number; getLng: () => number },
  b: { getLat: () => number; getLng: () => number },
): number {
  const dLat = a.getLat() - b.getLat();
  const dLng = a.getLng() - b.getLng();
  return dLat * dLat + dLng * dLng;
}

/** 줌/이동 후 viewport 안에 마커가 최소 1개는 남도록 보정 */
function ensureAtLeastOneMarkerVisible(
  map: KakaoMapFocusApi,
  kakao: KakaoMapsBoundsApi,
  positions: unknown[],
  focusPos: unknown,
  padding = 72,
) {
  const relayout = () => {
    try {
      map.relayout?.();
    } catch {
      /* noop */
    }
  };

  if (positions.length === 0) {
    relayout();
    return;
  }

  if (typeof map.getBounds !== "function") {
    relayout();
    return;
  }

  let bounds: { contain?: (p: unknown) => boolean };
  try {
    // 반드시 map 에 바인딩해 호출 — 메서드를 떼어내 호출하면 Kakao 내부 this 손실로 throw.
    bounds = map.getBounds();
  } catch {
    relayout();
    return;
  }

  const anyVisible = positions.some((p) =>
    isPositionInMapBounds(bounds, p as { getLat: () => number; getLng: () => number }),
  );

  if (anyVisible) {
    relayout();
    return;
  }

  const mapCenter = map.getCenter?.();
  let target = focusPos ?? positions[0];
  if (mapCenter && positions.length > 1) {
    let best = positions[0];
    let bestD = Infinity;
    for (const p of positions) {
      const pos = p as { getLat: () => number; getLng: () => number };
      const d = latLngDist2(mapCenter, pos);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    target = best;
  }

  if (positions.length === 1) {
    map.setCenter?.(target);
    relayout();
    return;
  }

  try {
    const b = new kakao.maps.LatLngBounds();
    for (const p of positions) b.extend(p);
    if (focusPos) b.extend(focusPos);
    map.setBounds?.(b, padding, padding, padding, padding);
  } catch {
    map.setCenter?.(target);
  }
  relayout();
}

/** anchor 없이 setCenter+setLevel — panTo/anchor 조합 시 핀이 화면 밖으로 밀리는 경우 방지 */
function focusMapOnPosition(
  map: KakaoMapFocusApi,
  kakao: KakaoMapsBoundsApi,
  focusPos: unknown,
  targetLevel: number,
  visiblePositions: unknown[],
  opts?: { ensureVisible?: boolean },
) {
  const level = clampProgrammaticZoomLevel(targetLevel);
  if (typeof map.setCenter === "function") map.setCenter(focusPos);
  else map.panTo?.(focusPos);
  const current = map.getLevel?.() ?? level;
  const zoomIn = programmaticZoomInLevel(current, level);
  if (zoomIn != null) map.setLevel?.(zoomIn);

  if (opts?.ensureVisible === false) return;

  requestAnimationFrame(() => {
    ensureAtLeastOneMarkerVisible(map, kakao, visiblePositions, focusPos);
  });
}

/** 클러스터 탭 → 줌인 후 개별 마커가 화면에 보이도록 */
function zoomClusterIn(
  map: KakaoMapFocusApi,
  kakao: KakaoMapsBoundsApi & {
    maps?: { event?: { addListener?: Function; removeListener?: Function } };
  },
  center: unknown,
  markerPositions: unknown[],
  onAfterZoom?: () => void,
) {
  const finish = () => {
    forceUnclusterLevel(map);
    onAfterZoom?.();
    try {
      map.relayout?.();
    } catch {
      /* noop */
    }
  };

  if (markerPositions.length === 0) {
    finish();
    return;
  }

  if (markerPositions.length === 1) {
    const pos = markerPositions[0];
    map.setCenter?.(pos);
    const current = map.getLevel?.() ?? 8;
    const target = Math.min(current - 2, TKAD_CLUSTER_UNCLUSTER_LEVEL);
    const zoomIn = programmaticZoomInLevel(current, target);
    if (zoomIn != null) map.setLevel?.(zoomIn);
    runAfterMapIdle(map, kakao, () => {
      clampMapZoomInIfNeeded(map);
      finish();
    });
    return;
  }

  const bounds = new kakao.maps.LatLngBounds();
  for (const p of markerPositions) bounds.extend(p);

  let spanLat = 0;
  let spanLng = 0;
  try {
    const b = bounds as {
      getSouthWest?: () => { getLat: () => number; getLng: () => number };
      getNorthEast?: () => { getLat: () => number; getLng: () => number };
    };
    const sw = b.getSouthWest?.();
    const ne = b.getNorthEast?.();
    if (sw && ne) {
      spanLat = Math.abs(ne.getLat() - sw.getLat());
      spanLng = Math.abs(ne.getLng() - sw.getLng());
    }
  } catch {
    /* noop */
  }

  // 근거리 클러스터 — bounds 맞춤으로 핀들이 화면에 들어오게
  const compact = spanLat < 0.35 && spanLng < 0.35;

  if (compact && map.setBounds) {
    map.setBounds(bounds, 56, 56, 56, 56);
    runAfterMapIdle(map, kakao, () => {
      clampMapZoomInIfNeeded(map);
      ensureAtLeastOneMarkerVisible(map, kakao, markerPositions, center);
      finish();
    });
    return;
  }

  // 전국 단위 등 넓은 클러스터 — 단계 줌 + 가까운 마커로 보정
  const current = map.getLevel?.() ?? 8;
  const steps = markerPositions.length >= 30 ? 2 : 3;
  const next = Math.max(TKAD_CLUSTER_UNCLUSTER_LEVEL, current - steps);
  const focus = center ?? markerPositions[0];
  if (focus) map.setCenter?.(focus);
  const zoomIn = programmaticZoomInLevel(current, next);
  if (zoomIn != null) map.setLevel?.(zoomIn);
  runAfterMapIdle(map, kakao, () => {
    clampMapZoomInIfNeeded(map);
    ensureAtLeastOneMarkerVisible(map, kakao, markerPositions, focus);
    finish();
  });
}

export default function KakaoMapView({
  markers,
  selectedId,
  hoveredId = null,
  onSelect,
  onBoundsChange,
  onViewChange,
  onUserViewportAdjusted,
  onMarkerDetail,
  center = { lat: 37.5665, lng: 126.978 },
  zoom = 8,
  programmaticView = null,
  userLocation = null,
  coverageGeoJson = null,
  fitCoverageBounds = false,
  monochromeTiles = false,
  disableCluster = false,
  fitMarkersBounds = false,
  panOnSelect = true,
  zoomOnSelect,
  command,
}: Props) {
  /** 명령 채널 사용 여부(레거시 뷰 effect 비활성 판단) */
  const usesCommandChannel = command !== undefined;
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
  const onUserViewportAdjustedRef = useRef(onUserViewportAdjusted);
  const markersRef = useRef<MapMarker[]>(markers);
  const lastProgrammaticNonceRef = useRef<number | null>(null);
  const lastExecutedCommandNonceRef = useRef<number | null>(null);
  const lastAutoFocusKeyRef = useRef<string | null>(null);
  const userViewportAdjustedRef = useRef(false);
  const programmaticApplyRef = useRef(false);
  const mapGestureActiveRef = useRef(false);
  const lastContainerSizeRef = useRef<{ w: number; h: number } | null>(null);
  const [sdkError, setSdkError] = useState<string | null>(null);
  /** SDK 비동기 로드 후 지도 인스턴스가 생긴 뒤에만 true — markers effect 가 한 번 더 돌게 함 */
  const [mapReady, setMapReady] = useState(false);
  const coveragePolygonsRef = useRef<Array<{ setMap: (m: unknown) => void }>>([]);
  const styledTileImagesRef = useRef<WeakSet<HTMLImageElement>>(new WeakSet());
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
    onUserViewportAdjustedRef.current = onUserViewportAdjusted;
  }, [onUserViewportAdjusted]);

  useEffect(() => {
    markersRef.current = markers;
  }, [markers]);

  useEffect(() => {
    lastAutoFocusKeyRef.current = null;
  }, [selectedId]);

  const markUserViewportAdjusted = useCallback(() => {
    if (programmaticApplyRef.current) return;
    if (!userViewportAdjustedRef.current) {
      userViewportAdjustedRef.current = true;
      onUserViewportAdjustedRef.current?.();
    }
  }, []);

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
      if (styledTileImagesRef.current.has(img)) return;
      if (isMarkerMapImage(img)) {
        img.style.filter = "none";
        img.dataset.tkadMarker = "1";
        styledTileImagesRef.current.add(img);
        return;
      }
      if (img.dataset.tkadMarker === "1") return;
      img.style.filter = "grayscale(1) contrast(1.08) brightness(1.03)";
      styledTileImagesRef.current.add(img);
    });
  }, [isMarkerMapImage, monochromeTiles]);

  useEffect(() => {
    if (!mapReady || !monochromeTiles) return;
    const root = containerRef.current;
    if (!root) return;
    applyMonochromeTiles();
    let debounce: ReturnType<typeof setTimeout> | null = null;
    const observer = new MutationObserver(() => {
      if (debounce) return;
      debounce = setTimeout(() => {
        debounce = null;
        applyMonochromeTiles();
      }, 48);
    });
    observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
    return () => {
      if (debounce) clearTimeout(debounce);
      observer.disconnect();
    };
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
    let gestureStartHandler: (() => void) | null = null;
    let zoomChangedHandler: (() => void) | null = null;
    let dragEndHandler: (() => void) | null = null;
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
            scrollwheel: true,
            draggable: true,
            disableDoubleClickZoom: false,
            keyboardShortcuts: true,
          });
          mapRef.current = map;

          if (typeof kakao.maps.ZoomControl === "function" && map.addControl) {
            const zoomControl = new kakao.maps.ZoomControl();
            map.addControl(
              zoomControl,
              kakao.maps.ControlPosition?.LEFT ??
                kakao.maps.ControlPosition?.TOPLEFT ??
                0,
            );
          }

          if (typeof ResizeObserver !== "undefined" && containerRef.current) {
            resizeObserver = new ResizeObserver((entries) => {
              const rect = entries[0]?.contentRect;
              if (!rect || cancelled) return;
              const { width, height } = rect;
              const last = lastContainerSizeRef.current;
              if (
                last &&
                Math.abs(last.w - width) < 2 &&
                Math.abs(last.h - height) < 2
              ) {
                return;
              }
              lastContainerSizeRef.current = { w: width, h: height };
              if (mapGestureActiveRef.current) return;
              window.requestAnimationFrame(() => {
                if (!cancelled) fireRelayout();
              });
            });
            resizeObserver.observe(containerRef.current);
            const parent = containerRef.current.parentElement;
            if (parent) resizeObserver.observe(parent);
          }

          if (!disableCluster && typeof kakao.maps.MarkerClusterer === "function") {
            // minLevel 낮을수록(숫자 작을수록) 더 확대된 상태에서도 클러스터가 동작 — 겹침 숫자 노출 증가
            const clusterer = new kakao.maps.MarkerClusterer({
              map,
              averageCenter: true,
              // 더 가까운 줌(레벨↓)에서도 숫자 클러스터 유지
              minLevel: TKAD_CLUSTER_MIN_LEVEL,
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
              const positions = markersIn
                .map((mk) =>
                  (mk as { getPosition?: () => unknown }).getPosition?.(),
                )
                .filter(Boolean);
              zoomClusterIn(
                map as KakaoMapFocusApi,
                kakao,
                centerLatLng,
                positions,
                () => {
                  try {
                    const redraw = (clusterer as { redraw?: () => void }).redraw;
                    if (typeof redraw === "function") redraw();
                  } catch {
                    /* noop */
                  }
                },
              );
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

          gestureStartHandler = () => {
            mapGestureActiveRef.current = true;
            markUserViewportAdjusted();
          };
          zoomChangedHandler = () => {
            markUserViewportAdjusted();
          };
          dragEndHandler = () => {
            mapGestureActiveRef.current = false;
            markUserViewportAdjusted();
          };

          idleHandler = () => {
            mapGestureActiveRef.current = false;
            fireRelayout();
            fireBoundsDebounced();
          };

          kakao.maps.event.addListener(map, "dragstart", gestureStartHandler);
          kakao.maps.event.addListener(map, "zoom_start", gestureStartHandler);
          kakao.maps.event.addListener(map, "zoom_changed", zoomChangedHandler);
          kakao.maps.event.addListener(map, "dragend", dragEndHandler);
          kakao.maps.event.addListener(map, "idle", idleHandler);
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
      if (mapInst && gestureStartHandler && kw?.maps?.event?.removeListener) {
        try {
          kw.maps.event.removeListener(mapInst, "dragstart", gestureStartHandler);
          kw.maps.event.removeListener(mapInst, "zoom_start", gestureStartHandler);
        } catch {
          /* noop */
        }
      }
      if (mapInst && zoomChangedHandler && kw?.maps?.event?.removeListener) {
        try {
          kw.maps.event.removeListener(mapInst, "zoom_changed", zoomChangedHandler);
        } catch {
          /* noop */
        }
      }
      if (mapInst && dragEndHandler && kw?.maps?.event?.removeListener) {
        try {
          kw.maps.event.removeListener(mapInst, "dragend", dragEndHandler);
        } catch {
          /* noop */
        }
      }
      gestureStartHandler = null;
      zoomChangedHandler = null;
      dragEndHandler = null;
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
        const variant = mediaPinVariant(base, false);
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
        if (!mapGestureActiveRef.current) {
          try {
            const redraw = clusterer?.redraw as (() => void) | undefined;
            if (typeof redraw === "function") redraw();
          } catch {
            /* noop */
          }
        }
      }
    } catch (e) {
      console.error("[KakaoMapView] markers sync failed", e);
    }
  }, [markers, mapReady]);

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

  // 네트워크 다지점 — 모든 마커가 한 화면에 들어오도록 bounds 맞춤.
  // (단일/소수 1개면 center+zoom 그대로 — 단일 매체 회귀 없음)
  useEffect(() => {
    if (usesCommandChannel) return; // 명령 채널 사용 시 비활성 (executor 가 담당)
    if (!mapReady || !fitMarkersBounds) return;
    const valid = markers.filter(
      (m) =>
        Number.isFinite(m.lat) &&
        Number.isFinite(m.lng) &&
        Math.abs(m.lat) <= 90 &&
        Math.abs(m.lng) <= 180,
    );
    if (valid.length < 2) return;
    const kakao = getKakaoSdk();
    const map = mapRef.current as {
      setBounds?: (...args: unknown[]) => void;
    } | null;
    if (!kakao?.maps || !map?.setBounds) return;
    try {
      const bounds = new kakao.maps.LatLngBounds();
      for (const m of valid) bounds.extend(new kakao.maps.LatLng(m.lat, m.lng));
      map.setBounds(bounds, 56, 56, 56, 56);
      window.setTimeout(() => clampMapZoomInIfNeeded(map), 0);
    } catch {
      /* ignore */
    }
  }, [mapReady, fitMarkersBounds, markers, usesCommandChannel]);

  // #MAP-1: 미니 팝업(CustomOverlay) 비활성화. 마커 선택 시 panTo만 수행.
  // 상세는 사이드 카드(media-map-page-client.tsx) 또는 onMarkerDetail 라우팅으로 노출.
  useEffect(() => {
    if (usesCommandChannel) return; // 명령 채널 사용 시 뷰 이동은 executor 가 전담
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
      if (!panOnSelect && zoomOnSelect == null) return;

      const focusKey = `${selectedId}:${zoomOnSelect ?? "pan"}`;
      if (lastAutoFocusKeyRef.current === focusKey) return;
      lastAutoFocusKeyRef.current = focusKey;

      const m = markersRef.current.find((x) => x.id === selectedId);
      const lat = m ? Number(m.lat) : NaN;
      const lng = m ? Number(m.lng) : NaN;
      if (!m || !Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const pos = new kakao.maps.LatLng(lat, lng);
      const mapApi = map as KakaoMapFocusApi;
      if (zoomOnSelect != null) {
        focusMapOnPosition(mapApi, kakao, pos, zoomOnSelect, [pos], {
          ensureVisible: false,
        });
      } else {
        mapApi.panTo?.(pos);
        if (!mapApi.panTo) mapApi.setCenter?.(pos);
      }
    } catch (e) {
      console.error("[KakaoMapView] panTo failed", e);
    }
  }, [selectedId, mapReady, panOnSelect, zoomOnSelect, usesCommandChannel]);

  // ── 단일 명령형 뷰 채널 executor ──
  // 모든 뷰 이동(fit/focus)을 한 곳에서 실행. fitMarkers(auto) 는 사용자가 지도를 직접
  // 조작한 뒤엔(userViewportAdjustedRef) 무시. focusMarker 는 명시적 사용자 의도로 실행하고
  // 이후 사용자 조정 상태로 표시 → effect 경쟁/리셋 구조 제거. main 의 제스처 신호 재사용.
  useEffect(() => {
    if (!usesCommandChannel || !command || !mapReady) return;
    if (lastExecutedCommandNonceRef.current === command.nonce) return;
    lastExecutedCommandNonceRef.current = command.nonce;
    const map = mapRef.current as KakaoMapFocusApi | null;
    const kakao = getKakaoSdk();
    if (!map || !kakao?.maps) return;
    try {
      if (command.type === "fitMarkers") {
        if (command.auto && userViewportAdjustedRef.current) return; // 채널 내장 게이트
        const valid = markersRef.current.filter(
          (m) =>
            Number.isFinite(m.lat) &&
            Number.isFinite(m.lng) &&
            Math.abs(m.lat) <= 90 &&
            Math.abs(m.lng) <= 180,
        );
        if (valid.length === 0) return;
        // zero-area 가드: 단일/동일좌표면 setBounds(과도 줌·오류) 대신 setCenter
        if (valid.length === 1) {
          map.setCenter?.(new kakao.maps.LatLng(valid[0].lat, valid[0].lng));
          return;
        }
        const bounds = new kakao.maps.LatLngBounds();
        for (const m of valid) bounds.extend(new kakao.maps.LatLng(m.lat, m.lng));
        programmaticApplyRef.current = true;
        map.setBounds?.(bounds, 56, 56, 56, 56);
        window.setTimeout(() => {
          programmaticApplyRef.current = false;
          clampMapZoomInIfNeeded(map);
        }, 0);
      } else if (command.type === "focusMarker") {
        const pos = new kakao.maps.LatLng(command.lat, command.lng);
        programmaticApplyRef.current = true;
        map.setCenter?.(pos);
        const adjustLevel = command.adjustLevel !== false;
        if (adjustLevel) {
          const current = map.getLevel?.() ?? command.level;
          const zoomIn = programmaticZoomInLevel(current, command.level);
          if (zoomIn != null) map.setLevel?.(zoomIn);
        }
        userViewportAdjustedRef.current = true;
        window.setTimeout(() => {
          programmaticApplyRef.current = false;
        }, 0);
      }
    } catch (e) {
      console.error("[KakaoMapView] view command failed", e);
    }
  }, [command, mapReady, usesCommandChannel]);

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
      programmaticApplyRef.current = true;
      const pos = new kakao.maps.LatLng(programmaticView.lat, programmaticView.lng);
      map.panTo?.(pos);
      if (typeof map.setLevel === "function") {
        map.setLevel(programmaticView.zoom);
      }
      userViewportAdjustedRef.current = false;
      lastAutoFocusKeyRef.current = null;
    } catch (e) {
      console.error("[KakaoMapView] programmaticView failed", e);
    } finally {
      window.setTimeout(() => {
        programmaticApplyRef.current = false;
      }, 0);
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
      <stop offset="0" stop-color="${BRAND_ACCENT}"/>
      <stop offset="0.8" stop-color="${BRAND_ACCENT}" stop-opacity="0.4"/>
      <stop offset="1" stop-color="${BRAND_ACCENT}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="17" cy="17" r="16" fill="url(#ul)" opacity="0.55"/>
  <circle cx="17" cy="17" r="8" fill="${BRAND_ACCENT}" stroke="#ffffff" stroke-width="3"/>
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
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.04] bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px]" />
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-16 bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--qp-accent)_18%,transparent),transparent_58%),radial-gradient(circle_at_bottom,color-mix(in_srgb,var(--qp-accent)_10%,transparent),transparent_58%)]"
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
        "tkad-kakao-map-root relative h-full w-full min-h-[200px] touch-manipulation text-[#0a0a0c] [color-scheme:light]",
        monochromeTiles && "tkad-kakao-map-root--mono",
      )}
    >
      <div ref={containerRef} className="h-full w-full min-h-[200px] touch-manipulation" />
      {!mapReady && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center dark:bg-black bg-white/25 p-4">
          <div className="relative w-full max-w-sm overflow-hidden rounded-[22px] border dark:border-white/12 border-gray-200 dark:bg-black bg-white/45 px-6 py-8 dark:text-white text-gray-900 shadow-[0_28px_120px_rgba(0,0,0,0.55)] backdrop-blur">
            <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.04] bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px]" />
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-16 bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--qp-accent)_18%,transparent),transparent_58%),radial-gradient(circle_at_bottom,color-mix(in_srgb,var(--qp-accent)_10%,transparent),transparent_58%)]"
            />
            <div className="relative flex flex-col items-center gap-4">
              <div className="rounded-2xl border dark:border-white/14 border-gray-200 dark:bg-white/8 bg-gray-100 px-3 py-1 font-display text-xs font-medium uppercase tracking-[0.22em] dark:text-white text-gray-700">
                LOADING
              </div>
              <div className="text-sm font-semibold dark:text-white text-gray-800">지도 준비 중…</div>
              <div className="h-2 w-full overflow-hidden rounded-full border dark:border-white/12 border-gray-200 dark:bg-black bg-white/20">
                <div className="h-full w-[42%] animate-[tkadShimmer_1.2s_ease-in-out_infinite] bg-[linear-gradient(90deg,#52525b,var(--qp-accent),#a1a1aa)]" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
