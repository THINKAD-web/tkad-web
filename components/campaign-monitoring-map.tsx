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

type MapProvider = "kakao" | "google" | "fallback";

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
  /** Bumps when Kakao/Google map instance is ready so pan-to-selected can run. */
  const [mapEpoch, bumpMapEpoch] = useReducer((n: number) => n + 1, 0);

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

  const mountGoogle = useCallback(() => {
    const el = containerRef.current;
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const pinList = [...pinsRef.current];
    if (!el || !key || pinList.length === 0) return;

    let cancelled = false;
    const markers: Array<{ setMap: (m: null) => void }> = [];

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
              }) => { setMap: (m: null) => void; addListener: (ev: string, fn: () => void) => void };
            };
          };
        }
      ).google?.maps;
      if (!googleMaps) return;

      const map = new googleMaps.Map(el, {
        center,
        zoom: zoomOverride != null ? zoomOverride : 12,
      });

      if (!centerOverride) {
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
      }

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
  }, [
    center,
    centerOverride,
    zoomOverride,
    isKo,
    onSelectPin,
    pinLayoutKey,
    bumpMapEpoch,
  ]);

  const mountKakao = useCallback(() => {
    const el = containerRef.current;
    const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;
    const pinList = [...pinsRef.current];
    if (!el || !appKey || pinList.length === 0) return;

    let cancelled = false;
    const markers: Array<{ setMap: (m: null) => void }> = [];

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
              Marker: new (opts: { position: unknown; map: unknown; title?: string }) => {
                setMap: (m: null) => void;
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
        const map = new K.Map(el, {
          center: new K.LatLng(center.lat, center.lng),
          level:
            zoomOverride != null
              ? Math.max(1, Math.min(14, 15 - zoomOverride))
              : 8,
        });

        if (!centerOverride) {
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
        }

        kakaoMapCtxRef.current = { map, LatLng: K.LatLng };
        bumpMapEpoch();

        for (const p of pinList) {
          const marker = new K.Marker({
            position: new K.LatLng(p.lat, p.lng),
            map,
            title: isKo ? p.spotNameKo : p.spotNameEn,
          });
          K.event.addListener(marker, "click", () => onSelectPin(p.id));
          markers.push(marker);
        }
      });

      cleanupRef.current = () => {
        kakaoMapCtxRef.current = null;
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
    onSelectPin,
    pinLayoutKey,
    bumpMapEpoch,
  ]);

  useEffect(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    if (pins.length === 0) return;

    if (provider === "google") return mountGoogle();
    if (provider === "kakao") return mountKakao();
    return undefined;
  }, [mountGoogle, mountKakao, pinLayoutKey, pins.length, provider]);

  const prevSelectedIdRef = useRef<string | null>(null);

  useEffect(() => {
    // selectedId가 실제로 변경되었을 때만 팬/줌 수행
    if (!selectedId || selectedId === prevSelectedIdRef.current) return;
    prevSelectedIdRef.current = selectedId;

    const pin = pins.find((p) => p.id === selectedId);
    if (!pin) return;

    if (provider === "kakao") {
      const ctx = kakaoMapCtxRef.current;
      if (!ctx) return;
      ctx.map.setCenter(new ctx.LatLng(pin.lat, pin.lng));
      ctx.map.setLevel(4);
      return;
    }

    if (provider === "google") {
      const ctx = googleMapCtxRef.current;
      if (!ctx) return;
      ctx.map.panTo({ lat: pin.lat, lng: pin.lng });
      ctx.map.setZoom(15);
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
          <div className="absolute left-3 top-3 rounded-lg bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-navy shadow-sm backdrop-blur">
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
                    ? "border-gold bg-navy text-white focus-visible:ring-gold"
                    : tone === "green"
                      ? "border-white bg-emerald-500 text-white focus-visible:ring-emerald-400"
                      : "border-white bg-blue-500 text-white focus-visible:ring-blue-400",
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
          {provider === "kakao"
            ? isKo
              ? "카카오맵 · 핀을 눌러 매체 상세를 확인하세요."
              : "Kakao Map · tap a pin for placement details."
            : isKo
              ? "Google 지도 · 핀을 눌러 매체 상세를 확인하세요."
              : "Google Maps · tap a pin for placement details."}
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
