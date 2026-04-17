"use client";

import {
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useLayoutEffect,
  useReducer,
} from "react";
import { cn } from "@/lib/utils";
import type { CampaignMapPin, CampaignMapMediaType } from "@/lib/campaign-monitoring-mock";

type MapProvider = "kakao" | "google" | "fallback";

export type MapBounds = {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
};

export function getCampaignMonitoringMapProvider(): MapProvider {
  const k = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;
  const g = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (typeof k === "string" && k.trim().length > 0) return "kakao";
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

/** SVG 핀 이미지 data URI — 타입별 색상 + 선택 상태 */
function makePinDataUri(type: CampaignMapMediaType, selected: boolean): string {
  const fill = selected
    ? "#C49B2A"
    : type === "digital"
      ? "#2563EB"
      : type === "billboard"
        ? "#0f172a"
        : type === "transport"
          ? "#D97706"
          : "#7C3AED";
  const stroke = selected ? "#fff" : "#fff";
  const sw = selected ? 3 : 2.5;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="46" viewBox="0 0 36 46"><path d="M18 0C8.059 0 0 8.059 0 18c0 9.37 16.31 28 18 28s18-18.63 18-28C36 8.059 27.941 0 18 0z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/><circle cx="18" cy="17" r="6.5" fill="white" opacity="0.92"/></svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
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

type KakaoLatLng = { getLat(): number; getLng(): number };
type KakaoMapInstance = {
  setBounds(b: unknown): void;
  setCenter(p: unknown): void;
  setLevel(n: number): void;
  getLevel(): number;
  getBounds(): {
    getSouthWest(): KakaoLatLng;
    getNorthEast(): KakaoLatLng;
  };
};
type KakaoMarker = { setMap(m: null): void };
type KakaoAPI = {
  load(cb: () => void): void;
  Map: new (
    el: HTMLElement,
    opts: { center: unknown; level: number },
  ) => KakaoMapInstance;
  LatLng: new (lat: number, lng: number) => unknown;
  LatLngBounds: new () => { extend(p: unknown): void };
  Marker: new (opts: {
    position: unknown;
    map: unknown;
    title?: string;
    image?: unknown;
  }) => KakaoMarker;
  MarkerImage: new (
    src: string,
    size: unknown,
    opts?: { offset?: unknown },
  ) => unknown;
  Size: new (w: number, h: number) => unknown;
  Point: new (x: number, y: number) => unknown;
  MarkerClusterer: new (opts: {
    map: unknown;
    averageCenter?: boolean;
    minLevel?: number;
    disableClickZoom?: boolean;
    styles?: object[];
  }) => {
    addMarkers(ms: KakaoMarker[]): void;
    setMap(m: null): void;
  };
  event: {
    addListener(target: unknown, evt: string, fn: () => void): void;
  };
};

type KakaoMapCtx = {
  map: KakaoMapInstance;
  LatLng: new (lat: number, lng: number) => unknown;
};

type GoogleMapCtx = {
  map: {
    panTo: (p: { lat: number; lng: number }) => void;
    setZoom: (z: number) => void;
    fitBounds: (b: unknown) => void;
  };
};

type Props = {
  pins: readonly CampaignMapPin[];
  selectedId: string | null;
  onSelectPin: (id: string | null) => void;
  isKo: boolean;
  className?: string;
  /** Fixed map height in px (e.g. 400). Default: responsive 360 / 440. */
  fixedMapHeightPx?: number;
  /** When true, the map fills its parent's height (use h-full on parent). */
  fullHeight?: boolean;
  /** Show helper line under the map (provider hint). Default true. */
  showFooterCaption?: boolean;
  /** Optional: override initial center (e.g. user geolocation). */
  centerOverride?: { lat: number; lng: number } | null;
  /** Optional: override initial zoom when centerOverride is set. */
  zoomOverride?: number | null;
  /**
   * Called whenever the Kakao map viewport changes (pan / zoom idle).
   * Not fired for Google / fallback provider.
   */
  onBoundsChange?: (bounds: MapBounds) => void;
  pinMetaById?: Record<
    string,
    { tone?: "blue" | "green"; nowBadge?: boolean; popular?: boolean }
  >;
};

export function CampaignMonitoringMap({
  pins,
  selectedId,
  onSelectPin,
  isKo,
  className,
  fixedMapHeightPx,
  fullHeight,
  showFooterCaption = true,
  centerOverride = null,
  zoomOverride = null,
  onBoundsChange,
  pinMetaById,
}: Props) {
  const provider = useMemo(() => getCampaignMonitoringMapProvider(), []);
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const kakaoMapCtxRef = useRef<KakaoMapCtx | null>(null);
  const googleMapCtxRef = useRef<GoogleMapCtx | null>(null);
  const onBoundsChangeRef = useRef(onBoundsChange);
  useLayoutEffect(() => { onBoundsChangeRef.current = onBoundsChange; }, [onBoundsChange]);

  const [mapEpoch, bumpMapEpoch] = useReducer((n: number) => n + 1, 0);
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
  useLayoutEffect(() => { pinsRef.current = pins; }, [pins]);

  const mountGoogle = useCallback(() => {
    const el = containerRef.current;
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const pinList = [...pinsRef.current];
    if (!el || !key || pinList.length === 0) return;

    let cancelled = false;
    const markers: Array<{ setMap: (m: null) => void }> = [];

    void (async () => {
      try {
        const w = window as unknown as { google?: { maps?: unknown } };
        if (!w.google?.maps) {
          await loadScript(
            `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly`,
          );
        }
      } catch { return; }
      if (cancelled || !containerRef.current) return;

      const googleMaps = (
        window as unknown as {
          google?: {
            maps: {
              Map: new (el: HTMLElement, opts: { center: { lat: number; lng: number }; zoom: number }) => {
                fitBounds(b: unknown): void;
                panTo(p: { lat: number; lng: number }): void;
                setZoom(z: number): void;
              };
              LatLngBounds: new () => { extend(p: { lat: number; lng: number }): void };
              Marker: new (opts: { position: { lat: number; lng: number }; map: unknown; title?: string }) => {
                setMap(m: null): void;
                addListener(ev: string, fn: () => void): void;
              };
            };
          };
        }
      ).google?.maps;
      if (!googleMaps) return;

      const map = new googleMaps.Map(el, {
        center,
        zoom: zoomOverride != null ? zoomOverride : 12,
      });

      if (!centerOverride && !isMapMountedRef.current) {
        const bounds = new googleMaps.LatLngBounds();
        for (const p of pinList) bounds.extend({ lat: p.lat, lng: p.lng });
        map.fitBounds(bounds);
        window.setTimeout(() => {
          const m = map as { getZoom?: () => number; setZoom?: (z: number) => void };
          const z = m.getZoom?.();
          if (typeof z === "number" && z > 14) m.setZoom?.(14);
        }, 400);
      } else if (mapStateRef.current?.googleZoom != null) {
        map.setZoom(mapStateRef.current.googleZoom);
      }

      isMapMountedRef.current = true;
      googleMapCtxRef.current = { map };
      bumpMapEpoch();

      for (const p of pinList) {
        const marker = new googleMaps.Marker({
          position: { lat: p.lat, lng: p.lng },
          map,
          title: isKo ? p.spotNameKo : p.spotNameEn,
        });
        marker.addListener("click", () => onSelectPin(p.id));
        markers.push(marker);
      }

      cleanupRef.current = () => {
        if (map) {
          const m = map as { getZoom?: () => number };
          const z = m.getZoom?.();
          if (typeof z === "number") mapStateRef.current = { googleZoom: z };
        }
        googleMapCtxRef.current = null;
        for (const m of markers) m.setMap(null);
        el.innerHTML = "";
      };
    })();

    return () => {
      cancelled = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [center, centerOverride, zoomOverride, isKo, onSelectPin, pinLayoutKey, bumpMapEpoch]);

  const mountKakao = useCallback(() => {
    const el = containerRef.current;
    const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;
    const pinList = [...pinsRef.current];
    if (!el || !appKey || pinList.length === 0) return;

    let cancelled = false;
    const markers: KakaoMarker[] = [];

    void (async () => {
      try {
        const w = window as unknown as { kakao?: { maps?: unknown } };
        if (!w.kakao?.maps) {
          await loadScript(
            `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false&libraries=clusterer`,
          );
        }
      } catch { return; }
      if (cancelled || !containerRef.current) return;

      const K = (
        window as unknown as { kakao?: { maps: KakaoAPI } }
      ).kakao?.maps;
      if (!K) return;

      K.load(() => {
        if (cancelled || !containerRef.current) return;

        const map = new K.Map(el, {
          center: new K.LatLng(center.lat, center.lng),
          level: zoomOverride != null ? Math.max(1, Math.min(14, 15 - zoomOverride)) : 8,
        });

        if (!centerOverride && !isMapMountedRef.current) {
          const bounds = new K.LatLngBounds();
          for (const p of pinList) bounds.extend(new K.LatLng(p.lat, p.lng));
          map.setBounds(bounds);
          const lv = map.getLevel();
          if (lv < 6) map.setLevel(6);
        } else if (mapStateRef.current?.kakaoLevel != null) {
          map.setLevel(mapStateRef.current.kakaoLevel);
        }

        isMapMountedRef.current = true;
        kakaoMapCtxRef.current = { map, LatLng: K.LatLng };
        bumpMapEpoch();

        // Custom SVG markers per media type
        for (const p of pinList) {
          const uri = makePinDataUri(p.mediaType, false);
          const img = new K.MarkerImage(
            uri,
            new K.Size(36, 46),
            { offset: new K.Point(18, 46) },
          );
          const marker = new K.Marker({
            position: new K.LatLng(p.lat, p.lng),
            map,
            title: isKo ? p.spotNameKo : p.spotNameEn,
            image: img,
          });
          K.event.addListener(marker, "click", () => onSelectPin(p.id));
          markers.push(marker);
        }

        // Clusterer
        if (K.MarkerClusterer) {
          const clusterer = new K.MarkerClusterer({
            map,
            averageCenter: true,
            minLevel: 6,
            disableClickZoom: false,
            styles: [
              {
                width: "44px",
                height: "44px",
                background: "rgba(15,23,42,0.85)",
                borderRadius: "50%",
                color: "#fff",
                textAlign: "center",
                lineHeight: "44px",
                fontWeight: "700",
                fontSize: "14px",
                border: "2px solid #C49B2A",
                boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
              },
            ],
          });
          clusterer.addMarkers(markers);
          // Replace cleanup to also remove clusterer
          const prevCleanup = cleanupRef.current;
          cleanupRef.current = () => {
            prevCleanup?.();
            clusterer.setMap(null);
          };
        }

        // Bounds change on idle
        K.event.addListener(map as unknown as KakaoMarker, "idle", () => {
          const cb = onBoundsChangeRef.current;
          if (!cb) return;
          const b = map.getBounds();
          const sw = b.getSouthWest();
          const ne = b.getNorthEast();
          cb({
            swLat: sw.getLat(),
            swLng: sw.getLng(),
            neLat: ne.getLat(),
            neLng: ne.getLng(),
          });
        });

        cleanupRef.current = () => {
          if (kakaoMapCtxRef.current?.map) {
            const lv = kakaoMapCtxRef.current.map.getLevel();
            if (typeof lv === "number") mapStateRef.current = { kakaoLevel: lv };
          }
          kakaoMapCtxRef.current = null;
          for (const m of markers) m.setMap(null);
          el.innerHTML = "";
        };
      });
    })();

    return () => {
      cancelled = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [center, centerOverride, zoomOverride, isKo, onSelectPin, pinLayoutKey, bumpMapEpoch]);

  useEffect(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    if (pins.length === 0) return;
    if (provider === "google") return mountGoogle();
    if (provider === "kakao") return mountKakao();
    return undefined;
  }, [mountGoogle, mountKakao, pinLayoutKey, pins.length, provider]);

  const prevSelectedIdRef = useRef<string | null>(null);
  const prevMapEpochRef = useRef<number>(0);

  useEffect(() => {
    const selectedIdChanged = selectedId !== prevSelectedIdRef.current;
    const mapRemounted = mapEpoch !== prevMapEpochRef.current;
    if (!selectedIdChanged && !mapRemounted) return;
    prevSelectedIdRef.current = selectedId;
    prevMapEpochRef.current = mapEpoch;
    if (!selectedId) return;

    const pin = pins.find((p) => p.id === selectedId);
    if (!pin) return;

    if (provider === "kakao") {
      const ctx = kakaoMapCtxRef.current;
      if (!ctx) return;
      ctx.map.setCenter(new ctx.LatLng(pin.lat, pin.lng));
      ctx.map.setLevel(5);
      return;
    }
    if (provider === "google") {
      const ctx = googleMapCtxRef.current;
      if (!ctx) return;
      ctx.map.panTo({ lat: pin.lat, lng: pin.lng });
      ctx.map.setZoom(14);
    }
  }, [selectedId, pins, provider, mapEpoch]);

  // ── Fallback (no API key) ──────────────────────────────────────────────────
  const pinTypeColors: Record<CampaignMapMediaType, string> = {
    billboard: "bg-slate-900 border-white",
    digital: "bg-blue-600 border-white",
    transport: "bg-amber-500 border-white",
    special: "bg-violet-600 border-white",
  };

  if (pins.length === 0) {
    return (
      <div
        className={cn(
          "flex min-h-[320px] items-center justify-center rounded-xl border border-dashed border-navy/20 bg-slate-50 text-sm text-muted-foreground",
          className,
        )}
      >
        {isKo ? "표시할 매체 위치가 없습니다." : "No placements to show."}
      </div>
    );
  }

  if (provider === "fallback") {
    const heightClass = fullHeight
      ? "h-full"
      : fixedMapHeightPx == null
        ? "min-h-[360px] md:min-h-[500px]"
        : "";
    return (
      <div className={cn("relative overflow-hidden", className)}>
        <div
          className={cn(
            "relative w-full bg-[linear-gradient(160deg,#dde4f0_0%,#c8d4e8_45%,#a0b4cc_100%)]",
            heightClass,
          )}
          style={fixedMapHeightPx != null ? { height: fixedMapHeightPx, minHeight: fixedMapHeightPx } : undefined}
          role="application"
          aria-label={isKo ? "매체 위치 (데모 지도)" : "Media locations (demo map)"}
        >
          <div className="pointer-events-none absolute inset-0 opacity-[0.10] [background-image:linear-gradient(#0f172a_1px,transparent_1px),linear-gradient(90deg,#0f172a_1px,transparent_1px)] [background-size:32px_32px]" />
          <div className="absolute left-3 top-3 rounded-lg bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-navy shadow-sm backdrop-blur">
            {isKo ? "데모 지도 · NEXT_PUBLIC_KAKAO_MAP_APP_KEY 설정 시 실제 지도로 전환" : "Demo map · set NEXT_PUBLIC_KAKAO_MAP_APP_KEY for live map"}
          </div>
          {pins.map((p) => {
            const active = selectedId === p.id;
            const meta = pinMetaById?.[p.id];
            const popular = meta?.popular === true;
            const colorCls = pinTypeColors[p.mediaType] ?? "bg-blue-600 border-white";
            return (
              <button
                key={p.id}
                type="button"
                className={cn(
                  "absolute flex h-9 w-9 -translate-x-1/2 -translate-y-full items-center justify-center rounded-full border-2 shadow-lg transition-all hover:scale-110 focus:outline-none focus-visible:ring-2",
                  active ? "scale-125 border-gold bg-gold shadow-gold/40 focus-visible:ring-gold" : colorCls,
                  popular && !active && "ring-2 ring-gold/70",
                )}
                style={{ left: `${p.fallbackX}%`, top: `${p.fallbackY}%` }}
                onClick={() => onSelectPin(active ? null : p.id)}
                aria-pressed={active}
                aria-label={isKo ? p.spotNameKo : p.spotNameEn}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-white opacity-90" />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Real map (Kakao / Google) ──────────────────────────────────────────────
  const mapHeightClass = fullHeight
    ? "h-full"
    : fixedMapHeightPx == null
      ? "h-[360px] md:h-[500px]"
      : "";

  return (
    <div className={cn("relative overflow-hidden", fullHeight && "h-full", className)}>
      <div
        ref={containerRef}
        className={cn("w-full", mapHeightClass)}
        style={fixedMapHeightPx != null ? { height: fixedMapHeightPx } : undefined}
        role="application"
        aria-label={isKo ? "매체 위치 지도" : "Media location map"}
      />
      {showFooterCaption ? (
        <p className="border-t border-navy/10 bg-white/90 px-3 py-1.5 text-[11px] text-muted-foreground backdrop-blur-sm">
          {provider === "kakao"
            ? isKo ? "카카오맵 · 핀을 눌러 매체 상세를 확인하세요." : "Kakao Map · tap a pin for details."
            : isKo ? "Google 지도 · 핀을 눌러 매체 상세를 확인하세요." : "Google Maps · tap a pin for details."}
        </p>
      ) : null}
    </div>
  );
}

export function campaignMapProviderLabel(isKo: boolean): string {
  const p = getCampaignMonitoringMapProvider();
  if (p === "kakao") return isKo ? "카카오맵" : "Kakao Map";
  if (p === "google") return isKo ? "Google 지도" : "Google Maps";
  return isKo ? "데모 지도" : "Demo map";
}

export { mediaLabel };
