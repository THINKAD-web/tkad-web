"use client";

import {
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useLayoutEffect,
  useReducer,
} from "react";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CampaignMapPin, CampaignMapMediaType } from "@/lib/campaign-monitoring-mock";

type MapProvider = "google" | "fallback";

/** @deprecated 공개 페이지는 `DarkCampaignMap` / `DarkMapView` 사용. Kakao는 어드민 전용. */
export function getCampaignMonitoringMapProvider(): MapProvider {
  const g = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (typeof g === "string" && g.trim().length > 0) return "google";
  return "fallback";
}

function mediaLabel(type: CampaignMapMediaType, isKo: boolean): string {
  const m: Record<CampaignMapMediaType, [string, string]> = {
    billboard: ["빌보드", "Billboard"],
    digital: ["디지털", "Digital"],
    transport: ["교통", "Transit"],
    special: ["특수", "Special"],
  };
  return isKo ? m[type][0] : m[type][1];
}

function pinToneForMediaType(type: CampaignMapMediaType): "digital" | "static" | "mobile" | "network" {
  // Map campaign-only categories onto our public media pin palette.
  if (type === "digital") return "digital";
  if (type === "billboard") return "static";
  if (type === "transport") return "mobile";
  return "network";
}

function pinColorForType(type: "digital" | "static" | "mobile" | "network"): {
  fill: string;
  stroke: string;
  text: string;
  glow: string;
  ink: string;
} {
  // Keep this palette consistent with `/media/map`.
  switch (type) {
    case "digital":
      return {
        fill: "#22c55e",
        stroke: "#a3ffcc",
        text: "#0a0a0c",
        glow: "rgba(34,197,94,0.55)",
        ink: "rgba(10,10,12,0.92)",
      };
    case "static":
      return {
        fill: "#22d3ee",
        stroke: "#bff7ff",
        text: "#0a0a0c",
        glow: "rgba(34,211,238,0.55)",
        ink: "rgba(10,10,12,0.92)",
      };
    case "mobile":
      return {
        fill: "#fb7185",
        stroke: "#ffd3db",
        text: "#0a0a0c",
        glow: "rgba(236,72,153,0.50)",
        ink: "rgba(10,10,12,0.92)",
      };
    default:
      return {
        fill: "#a855f7",
        stroke: "#ead6ff",
        text: "#0a0a0c",
        glow: "rgba(168,85,247,0.55)",
        ink: "rgba(10,10,12,0.92)",
      };
  }
}

function pinDataUrl(type: "digital" | "static" | "mobile" | "network", selected: boolean): string {
  const { fill, stroke, text, glow, ink } = pinColorForType(type);
  const label = type === "digital" ? "D" : type === "static" ? "S" : type === "mobile" ? "M" : "N";
  const w = 44;
  const h = 52;
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 44 52">
    <defs>
      <filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="rgba(0,0,0,0.40)"/>
      </filter>
      <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
        <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="${glow}"/>
        <feDropShadow dx="0" dy="12" stdDeviation="12" flood-color="rgba(0,0,0,0.45)"/>
      </filter>
      <radialGradient id="core" cx="32%" cy="26%" r="76%">
        <stop offset="0%" stop-color="rgba(255,255,255,0.96)"/>
        <stop offset="55%" stop-color="rgba(255,255,255,0.88)"/>
        <stop offset="100%" stop-color="rgba(255,255,255,0.72)"/>
      </radialGradient>
      <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${stroke}" stop-opacity="0.95"/>
        <stop offset="55%" stop-color="${fill}" stop-opacity="0.92"/>
        <stop offset="100%" stop-color="${stroke}" stop-opacity="0.9"/>
      </linearGradient>
    </defs>
    <g filter="${selected ? "url(#glow)" : "url(#soft)"}">
      <path d="M22 50c9-11 14-19 14-28C36 12.6 30.3 7 22 7S8 12.6 8 22c0 9 5 17 14 28z" fill="rgba(0,0,0,0.25)"/>
      <path d="M22 48.5c8.2-10.2 12.9-17.6 12.9-26.2C34.9 13.3 29.8 9 22 9S9.1 13.3 9.1 22.3c0 8.6 4.7 16 12.9 26.2z" fill="url(#ring)" opacity="0.95"/>
      <path d="M22 44.7c6.6-8.7 10.2-14.9 10.2-22.1C32.2 15.8 28.2 13 22 13S11.8 15.8 11.8 22.6c0 7.2 3.6 13.4 10.2 22.1z" fill="rgba(0,0,0,0.10)"/>
      <circle cx="22" cy="22" r="10.2" fill="url(#core)"/>
      <circle cx="22" cy="22" r="10.2" fill="rgba(255,255,255,0.06)"/>
      <circle cx="22" cy="22" r="10.2" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="1.2"/>
      <text x="22" y="25.8" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="10.5" font-weight="900" fill="${text}" letter-spacing="0.08em">${label}</text>
      <path d="M14 17c3.5-3.6 9.5-4.2 14-.8" fill="none" stroke="rgba(255,255,255,0.50)" stroke-width="2" stroke-linecap="round" opacity="0.35"/>
      <path d="M16 31c3.8 2.5 9.9 2.1 12.8-.6" fill="none" stroke="${ink}" stroke-width="1.5" stroke-linecap="round" opacity="0.10"/>
    </g>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(
      `script[src="${src}"]`,
    ) as HTMLScriptElement | null;
    if (existing?.dataset.loaded === "1") {
      resolve();
      return;
    }
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("script load")),
        { once: true },
      );
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => {
      s.dataset.loaded = "1";
      resolve();
    };
    s.onerror = () => reject(new Error("script load"));
    document.head.appendChild(s);
  });
}

type Props = {
  pins: readonly CampaignMapPin[];
  selectedId: string | null;
  onSelectPin: (id: string | null) => void;
  isKo: boolean;
  className?: string;
  /** Fixed map height in px (e.g. 400). Default: responsive 360 / 440. */
  fixedMapHeightPx?: number;
  /** Show helper line under the map (provider hint). Default true. */
  showFooterCaption?: boolean;
  /** Optional: override initial center (e.g. user geolocation). */
  centerOverride?: { lat: number; lng: number } | null;
  /** Optional: override initial zoom when centerOverride is set. */
  zoomOverride?: number | null;
  /**
   * Optional per-pin UI metadata (used by fallback/demo map styling).
   * Keys: pin id
   */
  pinMetaById?: Record<
    string,
    { tone?: "blue" | "green"; nowBadge?: boolean; popular?: boolean }
  >;
};

type KakaoMapCtx = {
  map: { setCenter: (p: unknown) => void; setLevel: (n: number) => void };
  LatLng: new (lat: number, lng: number) => unknown;
};

type GoogleMapCtx = {
  map: {
    panTo: (p: { lat: number; lng: number }) => void;
    setZoom: (z: number) => void;
    fitBounds: (b: unknown) => void;
  };
};

export function CampaignMonitoringMap({
  pins,
  selectedId,
  onSelectPin,
  isKo,
  className,
  fixedMapHeightPx,
  showFooterCaption = true,
  centerOverride = null,
  zoomOverride = null,
  pinMetaById,
}: Props) {
  const provider = useMemo(() => getCampaignMonitoringMapProvider(), []);
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const kakaoMapCtxRef = useRef<KakaoMapCtx | null>(null);
  const googleMapCtxRef = useRef<GoogleMapCtx | null>(null);
  const markerByIdRef = useRef<Record<string, { setImage?: (img: unknown) => void }>>({});
  const googleMarkerByIdRef = useRef<Record<string, { setIcon?: (icon: unknown) => void }>>({});
  /** Bumps when Kakao/Google map instance is ready so pan-to-selected can run. */
  const [mapEpoch, bumpMapEpoch] = useReducer((n: number) => n + 1, 0);

  /** Track if map is mounted to avoid resetting zoom/center on re-renders */
  const isMapMountedRef = useRef(false);
  const mapStateRef = useRef<{ kakaoLevel?: number; googleZoom?: number } | null>(null);

  const center = useMemo(() => {
    if (centerOverride) return centerOverride;
    if (pins.length === 0) return { lat: 37.5665, lng: 126.978 };
    const s = pins.reduce(
      (a, p) => ({ lat: a.lat + p.lat, lng: a.lng + p.lng }),
      { lat: 0, lng: 0 },
    );
    return { lat: s.lat / pins.length, lng: s.lng / pins.length };
  }, [pins, centerOverride]);

  const pinLayoutKey = useMemo(
    () => pins.map((p) => `${p.id}:${p.lat}:${p.lng}`).join("|"),
    [pins],
  );

  const pinsRef = useRef(pins);
  useLayoutEffect(() => {
    pinsRef.current = pins;
  }, [pins]);

  const onSelectPinRef = useRef(onSelectPin);
  useLayoutEffect(() => {
    onSelectPinRef.current = onSelectPin;
  }, [onSelectPin]);

  const mountGoogle = useCallback(() => {
    const el = containerRef.current;
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const pinList = [...pinsRef.current];
    if (!el || !key || pinList.length === 0) return;

    let cancelled = false;
    const markers: Array<{ setMap: (m: null) => void; setIcon?: (i: unknown) => void }> = [];

    void (async () => {
      try {
        const w = window as unknown as {
          google?: { maps?: unknown };
        };
        if (!w.google?.maps) {
          await loadScript(
            `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly`,
          );
        }
      } catch {
        return;
      }
      if (cancelled || !containerRef.current) return;

      const googleMaps = (
        window as unknown as {
          google?: {
            maps: {
              Map: new (
                el: HTMLElement,
                opts: { center: { lat: number; lng: number }; zoom: number },
              ) => {
                fitBounds: (b: unknown) => void;
                panTo: (p: { lat: number; lng: number }) => void;
                setZoom: (z: number) => void;
              };
              LatLngBounds: new () => {
                extend: (p: { lat: number; lng: number }) => void;
              };
              Marker: new (opts: {
                position: { lat: number; lng: number };
                map: unknown;
                title?: string;
                icon?: { url: string; scaledSize?: unknown };
              }) => {
                setMap: (m: null) => void;
                setIcon?: (i: unknown) => void;
                addListener: (ev: string, fn: () => void) => void;
              };
              Size?: new (w: number, h: number) => unknown;
            };
          };
        }
      ).google?.maps;
      if (!googleMaps) return;

      const map = new googleMaps.Map(el, {
        center,
        zoom: zoomOverride != null ? zoomOverride : 12,
      });

      // Only fit bounds on initial mount or when no pin is selected
      // Preserve zoom/center if map was already showing a selected pin
      if (!centerOverride && !isMapMountedRef.current) {
        const bounds = new googleMaps.LatLngBounds();
        for (const p of pinList) {
          bounds.extend({ lat: p.lat, lng: p.lng });
        }
        map.fitBounds(bounds);
        window.setTimeout(() => {
          const m = map as { getZoom?: () => number; setZoom?: (z: number) => void };
          const z = m.getZoom?.();
          if (typeof z === "number" && z > 14) {
            m.setZoom?.(14);
          }
        }, 400);
      } else if (mapStateRef.current?.googleZoom != null) {
        // Restore previous zoom level if available
        map.setZoom(mapStateRef.current.googleZoom);
      }

      isMapMountedRef.current = true;
      googleMapCtxRef.current = { map };
      bumpMapEpoch();

      for (const p of pinList) {
        const tone = pinToneForMediaType(p.mediaType);
        const iconUrl = pinDataUrl(tone, false);
        const marker = new googleMaps.Marker({
          position: { lat: p.lat, lng: p.lng },
          map,
          title: isKo ? p.spotNameKo : p.spotNameEn,
          icon: googleMaps.Size
            ? { url: iconUrl, scaledSize: new googleMaps.Size(36, 42) }
            : { url: iconUrl },
        });
        marker.addListener("click", () => onSelectPinRef.current(p.id));
        markers.push(marker);
        googleMarkerByIdRef.current[p.id] = marker;
      }

      cleanupRef.current = () => {
        // Save current zoom before cleanup
        if (map) {
          const m = map as { getZoom?: () => number };
          const z = m.getZoom?.();
          if (typeof z === "number") {
            mapStateRef.current = { googleZoom: z };
          }
        }
        googleMapCtxRef.current = null;
        googleMarkerByIdRef.current = {};
        for (const m of markers) m.setMap(null);
        el.innerHTML = "";
      };
    })();

    return () => {
      cancelled = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [
    center,
    centerOverride,
    zoomOverride,
    isKo,
    bumpMapEpoch,
  ]);

  const mountKakao = useCallback(() => {
    const el = containerRef.current;
    const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;
    const pinList = [...pinsRef.current];
    if (!el || !appKey || pinList.length === 0) return;

    let cancelled = false;
    const markers: Array<{ setMap: (m: null) => void; setImage?: (img: unknown) => void }> = [];

    void (async () => {
      try {
        const w = window as unknown as { kakao?: { maps?: unknown } };
        if (!w.kakao?.maps) {
          await loadScript(
            `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false`,
          );
        }
      } catch {
        return;
      }
      if (cancelled || !containerRef.current) return;

      const K = (
        window as unknown as {
          kakao?: {
            maps: {
              load: (cb: () => void) => void;
              Map: new (node: HTMLElement, opts: { center: unknown; level: number }) => {
                setBounds: (b: unknown) => void;
                setCenter: (p: unknown) => void;
                setLevel: (n: number) => void;
              };
              LatLng: new (lat: number, lng: number) => unknown;
              LatLngBounds: new () => { extend: (p: unknown) => void };
              Size: new (w: number, h: number) => unknown;
              Point: new (x: number, y: number) => unknown;
              MarkerImage: new (
                src: string,
                size: unknown,
                opts?: { offset?: unknown },
              ) => unknown;
              Marker: new (opts: {
                position: unknown;
                map: unknown;
                title?: string;
                image?: unknown;
              }) => {
                setMap: (m: null) => void;
                setImage?: (img: unknown) => void;
              };
              event: {
                addListener: (
                  target: { setMap: (m: null) => void },
                  evt: string,
                  fn: () => void,
                ) => void;
              };
            };
          };
        }
      ).kakao?.maps;

      if (!K) return;

      K.load(() => {
        if (cancelled || !containerRef.current) return;
        containerRef.current.innerHTML = "";
        const map = new K.Map(el, {
          center: new K.LatLng(center.lat, center.lng),
          level:
            zoomOverride != null
              ? Math.max(1, Math.min(14, 15 - zoomOverride))
              : 8,
        });

        // Only fit bounds on initial mount or when no pin is selected
        // Preserve zoom/center if map was already showing a selected pin
        if (!centerOverride && !isMapMountedRef.current) {
          const bounds = new K.LatLngBounds();
          for (const p of pinList) {
            bounds.extend(new K.LatLng(p.lat, p.lng));
          }
          map.setBounds(bounds);
          // 동일·근접 좌표만 있으면 과확대 → 레벨 숫자가 작을수록 확대이므로 최소 레벨 6 이상으로 완화
          const minLevelWide = 6;
          const mapAny = map as {
            getLevel?: () => number;
            setLevel: (n: number) => void;
          };
          const lv = mapAny.getLevel?.();
          if (typeof lv === "number" && lv < minLevelWide) {
            mapAny.setLevel(minLevelWide);
          }
        } else if (mapStateRef.current?.kakaoLevel != null) {
          // Restore previous zoom level if available
          map.setLevel(mapStateRef.current.kakaoLevel);
        }

        isMapMountedRef.current = true;
        kakaoMapCtxRef.current = { map, LatLng: K.LatLng };
        bumpMapEpoch();

        for (const p of pinList) {
          const tone = pinToneForMediaType(p.mediaType);
          const src = pinDataUrl(tone, false);
          const img = new K.MarkerImage(
            src,
            new K.Size(40, 48),
            { offset: new K.Point(20, 48) },
          );
          const marker = new K.Marker({
            position: new K.LatLng(p.lat, p.lng),
            map,
            title: isKo ? p.spotNameKo : p.spotNameEn,
            image: img,
          });
          K.event.addListener(marker, "click", () => onSelectPinRef.current(p.id));
          markers.push(marker);
          markerByIdRef.current[p.id] = marker;
        }
      });

      cleanupRef.current = () => {
        // Save current zoom before cleanup
        if (kakaoMapCtxRef.current?.map) {
          const m = kakaoMapCtxRef.current.map as { getLevel?: () => number };
          const lv = m.getLevel?.();
          if (typeof lv === "number") {
            mapStateRef.current = { kakaoLevel: lv };
          }
        }
        kakaoMapCtxRef.current = null;
        markerByIdRef.current = {};
        for (const m of markers) m.setMap(null);
        el.innerHTML = "";
      };
    })();

    return () => {
      cancelled = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [
    center,
    centerOverride,
    zoomOverride,
    isKo,
    bumpMapEpoch,
  ]);

  useEffect(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    if (pins.length === 0) return;

    if (provider === "google") return mountGoogle();
    return undefined;
  }, [mountGoogle, pinLayoutKey, pins.length, provider]);

  useEffect(() => {
    if (!selectedId) return;
    if (provider === "google") {
      const mapsAny = (window as unknown as { google?: { maps?: unknown } }).google
        ?.maps as
        | {
            Size?: new (w: number, h: number) => unknown;
          }
        | undefined;
      for (const p of pins) {
        const mk = googleMarkerByIdRef.current[p.id];
        if (!mk?.setIcon) continue;
        const tone = pinToneForMediaType(p.mediaType);
        const iconUrl = pinDataUrl(tone, p.id === selectedId);
        mk.setIcon(
          mapsAny?.Size
            ? { url: iconUrl, scaledSize: new mapsAny.Size(36, 42) }
            : { url: iconUrl },
        );
      }
    }
  }, [selectedId, pins, provider]);

  const prevSelectedIdRef = useRef<string | null>(null);
  const prevMapEpochRef = useRef<number>(0);

  useEffect(() => {
    // selectedId가 변경되지 않았고 map도 remount되지 않았으면 실행 안 함
    const selectedIdChanged = selectedId !== prevSelectedIdRef.current;
    const mapRemounted = mapEpoch !== prevMapEpochRef.current;

    if (!selectedIdChanged && !mapRemounted) return;

    prevSelectedIdRef.current = selectedId;
    prevMapEpochRef.current = mapEpoch;

    // selectedId가 null이면 아무것도 하지 않음 (초기 상태 유지)
    if (!selectedId) return;

    // 선택된 핀이 있을 때만: 그 위치로 zoom in
    const pin = pins.find((p) => p.id === selectedId);
    if (!pin) return;

    if (provider === "google") {
      const ctx = googleMapCtxRef.current;
      if (!ctx) return;
      ctx.map.panTo({ lat: pin.lat, lng: pin.lng });
      ctx.map.setZoom(14);
    }
  }, [selectedId, pins, provider, mapEpoch]);

  if (pins.length === 0) {
    return (
      <div
        className={cn(
          "flex min-h-[320px] items-center justify-center rounded-xl border border-dashed border-navy/20 bg-slate-50 text-sm text-muted-foreground",
          className,
        )}
      >
        {isKo ? "표시할 진행 중 매체 위치가 없습니다." : "No live placements to show."}
      </div>
    );
  }

  if (provider === "fallback") {
    return (
      <div className={cn("relative overflow-hidden rounded-xl border border-navy/10", className)}>
        <div
          className={cn(
            "relative w-full bg-[linear-gradient(160deg,#e2e8f0_0%,#cbd5e1_45%,#94a3b8_100%)]",
            fixedMapHeightPx == null && "min-h-[360px] md:min-h-[440px]",
          )}
          style={
            fixedMapHeightPx != null
              ? { height: fixedMapHeightPx, minHeight: fixedMapHeightPx }
              : undefined
          }
          role="application"
          aria-label={isKo ? "캠페인 위치(데모 지도)" : "Campaign locations (demo map)"}
        >
          <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(#0f172a_1px,transparent_1px),linear-gradient(90deg,#0f172a_1px,transparent_1px)] [background-size:28px_28px]" />
          <div className="absolute left-3 top-3 rounded-2xl bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-navy shadow-sm backdrop-blur">
            {isKo ? "데모 지도 · API 키로 카카오/구글 전환" : "Demo map · add Kakao or Google API key"}
          </div>
          {pins.map((p) => {
            const active = selectedId === p.id;
            const meta = pinMetaById?.[p.id];
            const tone = meta?.tone ?? "blue";
            const isNow = meta?.nowBadge === true;
            const popular = meta?.popular === true;
            return (
              <button
                key={p.id}
                type="button"
                className={cn(
                  "absolute flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 shadow-lg transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2",
                  active
                    ? "border-gold bg-navy dark:text-white text-gray-900 focus-visible:ring-gold"
                    : tone === "green"
                      ? "border-white bg-emerald-500 dark:text-white text-gray-900 focus-visible:ring-emerald-400"
                      : "border-white bg-blue-500 dark:text-white text-gray-900 focus-visible:ring-blue-400",
                  popular && !active && "ring-2 ring-gold/80",
                )}
                style={{ left: `${p.fallbackX}%`, top: `${p.fallbackY}%` }}
                onClick={() => onSelectPin(active ? null : p.id)}
                aria-pressed={active}
                aria-label={isKo ? p.spotNameKo : p.spotNameEn}
              >
                <span className="relative">
                  <MapPin className="h-5 w-5" />
                  {isNow ? (
                    <span className="absolute -right-6 -top-2 rounded-full bg-white px-1.5 py-0.5 text-[9px] font-extrabold tracking-tight text-emerald-700 shadow">
                      NOW
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-navy/10", className)}>
      <div
        ref={containerRef}
        className={cn(
          "w-full",
          fixedMapHeightPx == null && "h-[360px] md:h-[440px]",
        )}
        style={
          fixedMapHeightPx != null ? { height: fixedMapHeightPx } : undefined
        }
        role="application"
        aria-label={isKo ? "캠페인 위치 지도" : "Campaign location map"}
      />
      {showFooterCaption ? (
        <p className="border-t border-navy/10 bg-white px-3 py-2 text-[11px] text-muted-foreground">
          {provider === "google"
            ? isKo
              ? "Google 지도 · 핀을 눌러 매체 상세를 확인하세요."
              : "Google Maps · tap a pin for placement details."
            : null}
        </p>
      ) : null}
    </div>
  );
}

export function campaignMapProviderLabel(isKo: boolean): string {
  const p = getCampaignMonitoringMapProvider();
  if (p === "google") return isKo ? "Google 지도" : "Google Maps";
  return isKo ? "데모 지도" : "Demo map";
}

export { mediaLabel };
