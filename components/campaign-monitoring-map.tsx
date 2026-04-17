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
  CustomOverlay: new (opts: {
    position: unknown;
    content: HTMLElement | string;
    yAnchor?: number;
    zIndex?: number;
  }) => { setMap(m: unknown): void };
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
  const kakaoActionsRef = useRef<{
    showPopup: (pin: CampaignMapPin) => void;
    hidePopup: () => void;
    highlightPin: (id: string | null) => void;
  } | null>(null);
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

        // ── Price-label CustomOverlay pins ──────────────────────────────
        const overlayEls = new Map<string, HTMLElement>();
        const overlays: Array<{ setMap(m: unknown): void }> = [];
        const pinById = new Map<string, CampaignMapPin>();
        for (const p of pinList) pinById.set(p.id, p);

        function getPinBg(type: CampaignMapMediaType): string {
          if (type === "digital") return "#2563EB";
          if (type === "billboard") return "#0f172a";
          if (type === "transport") return "#D97706";
          return "#7C3AED";
        }

        function getPriceText(p: CampaignMapPin): string {
          const cap = isKo ? p.creativeCaptionKo : p.creativeCaptionEn;
          const parts = cap.split(" · ");
          return parts[parts.length - 1] ?? cap;
        }

        function makePinEl(p: CampaignMapPin, selected: boolean): HTMLElement {
          const bg = selected ? "#C49B2A" : getPinBg(p.mediaType);
          const el2 = document.createElement("div");
          el2.setAttribute("data-pinid", p.id);
          el2.style.cssText = [
            `background:${bg}`,
            "color:white",
            "border-radius:20px",
            "padding:4px 10px",
            "font-size:11px",
            "font-weight:700",
            "cursor:pointer",
            "white-space:nowrap",
            "border:2px solid rgba(255,255,255,0.85)",
            "box-shadow:0 2px 8px rgba(0,0,0,0.35)",
            "transition:background 0.15s,transform 0.15s",
            "user-select:none",
            `transform:${selected ? "scale(1.15)" : "scale(1)"}`,
            "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
            "line-height:1.4",
          ].join(";");
          el2.textContent = getPriceText(p);
          el2.addEventListener("click", (e) => {
            e.stopPropagation();
            onSelectPin(p.id);
          });
          return el2;
        }

        for (const p of pinList) {
          const pinEl = makePinEl(p, false);
          const overlay = new K.CustomOverlay({
            position: new K.LatLng(p.lat, p.lng),
            content: pinEl,
            yAnchor: 1.0,
            zIndex: 3,
          });
          overlay.setMap(map);
          overlayEls.set(p.id, pinEl);
          overlays.push(overlay);
        }

        // ── On-map popup ─────────────────────────────────────────────────
        let popupOverlay: { setMap(m: unknown): void } | null = null;

        function hidePopup() {
          if (popupOverlay) { popupOverlay.setMap(null); popupOverlay = null; }
        }

        function showPopup(pin: CampaignMapPin) {
          hidePopup();
          const pfx = isKo ? "" : "/en";
          const href = `${pfx}/media/${pin.id}`;
          const quoteHref = `${pfx}/quote?media=${pin.id}`;
          const name = isKo ? pin.spotNameKo : pin.spotNameEn;
          const priceText = getPriceText(pin);
          const wrapper = document.createElement("div");
          wrapper.style.cssText = [
            "width:260px",
            "background:white",
            "border-radius:12px",
            "box-shadow:0 8px 32px rgba(0,0,0,0.22)",
            "overflow:hidden",
            "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
            "border:1px solid rgba(15,23,42,0.1)",
            "position:relative",
          ].join(";");
          const imgBlock = pin.imageUrl
            ? `<img src="${pin.imageUrl}" style="width:100%;height:130px;object-fit:cover;display:block;" alt="" />`
            : `<div style="width:100%;height:60px;background:linear-gradient(135deg,#1e293b,#334155);"></div>`;
          wrapper.innerHTML = `${imgBlock}
<div style="padding:10px 12px 12px;">
  <p style="margin:0 0 2px;font-size:13px;font-weight:700;color:#0f172a;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${name}</p>
  <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:#B8892A;">${priceText}</p>
  <div style="display:flex;gap:7px;">
    <a href="${href}" style="flex:1;display:flex;align-items:center;justify-content:center;height:34px;background:#0f172a;color:white;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none;">${isKo ? "상세보기" : "Details"}</a>
    <a href="${quoteHref}" style="flex:1;display:flex;align-items:center;justify-content:center;height:34px;background:#C49B2A;color:#0f172a;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none;">${isKo ? "견적문의" : "Quote"}</a>
  </div>
</div>
<button style="position:absolute;top:8px;right:8px;width:26px;height:26px;background:rgba(0,0,0,0.55);border:none;border-radius:50%;cursor:pointer;color:white;font-size:16px;line-height:1;display:flex;align-items:center;justify-content:center;padding:0;" id="kmap-popup-close">×</button>`;
          wrapper.querySelector("#kmap-popup-close")?.addEventListener("click", (e) => {
            e.stopPropagation();
            hidePopup();
            highlightPin(null);
            onSelectPin(null);
          });
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          popupOverlay = new K!.CustomOverlay({
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            position: new K!.LatLng(pin.lat, pin.lng),
            content: wrapper,
            yAnchor: 1.35,
            zIndex: 10,
          });
          popupOverlay.setMap(map);
        }

        function highlightPin(id: string | null) {
          for (const [pid, pinEl2] of overlayEls) {
            const sel = pid === id;
            const p2 = pinById.get(pid);
            pinEl2.style.background = sel ? "#C49B2A" : (p2 ? getPinBg(p2.mediaType) : "#0f172a");
            pinEl2.style.transform = sel ? "scale(1.15)" : "scale(1)";
          }
        }

        kakaoActionsRef.current = { showPopup, hidePopup, highlightPin };

        // Dismiss popup on map background click
        K.event.addListener(map as unknown as KakaoMarker, "click", () => {
          hidePopup();
          highlightPin(null);
          onSelectPin(null);
        });

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
          kakaoActionsRef.current = null;
          kakaoMapCtxRef.current = null;
          hidePopup();
          for (const o of overlays) o.setMap(null);
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
    if (!selectedId) {
      if (provider === "kakao") {
        kakaoActionsRef.current?.highlightPin(null);
        kakaoActionsRef.current?.hidePopup();
      }
      return;
    }

    const pin = pins.find((p) => p.id === selectedId);
    if (!pin) return;

    if (provider === "kakao") {
      const ctx = kakaoMapCtxRef.current;
      if (!ctx) return;
      ctx.map.setCenter(new ctx.LatLng(pin.lat, pin.lng));
      const lv = ctx.map.getLevel();
      if (lv > 5) ctx.map.setLevel(5);
      kakaoActionsRef.current?.highlightPin(selectedId);
      kakaoActionsRef.current?.showPopup(pin);
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
