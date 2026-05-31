"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getKakaoMapAppKey,
  loadKakaoMapsSdk,
} from "@/lib/kakao-maps-admin";

function getAdminMapProvider(): "kakao" | "google" | "fallback" {
  if (getKakaoMapAppKey()) return "kakao";
  const g = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (typeof g === "string" && g.trim().length > 0) return "google";
  return "fallback";
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

const SEOUL = { lat: 37.5665, lng: 126.978 };

type KakaoMarkerLike = {
  setPosition: (p: unknown) => void;
  setMap?: (m: null) => void;
  setZIndex?: (z: number) => void;
};

export type AdminInstallMapPoint = {
  id: string;
  label?: string;
  latitude: number;
  longitude: number;
};

type Props = {
  points: AdminInstallMapPoint[];
  activePointId: string | null;
  onActivePointChange: (id: string) => void;
  onPointPositionChange: (id: string, lat: number, lng: number) => void;
  className?: string;
  heightPx?: number;
};

export default function AdminMediaInstallLocationsMap({
  points,
  activePointId,
  onActivePointChange,
  onPointPositionChange,
  className,
  heightPx = 280,
}: Props) {
  const provider = getAdminMapProvider();
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [mapEpoch, bumpMapEpoch] = useReducer((n: number) => n + 1, 0);
  const [sdkError, setSdkError] = useState<string | null>(null);

  const pointsRef = useRef(points);
  useLayoutEffect(() => {
    pointsRef.current = points;
  }, [points]);

  const onActiveRef = useRef(onActivePointChange);
  const onMoveRef = useRef(onPointPositionChange);
  useLayoutEffect(() => {
    onActiveRef.current = onActivePointChange;
    onMoveRef.current = onPointPositionChange;
  }, [onActivePointChange, onPointPositionChange]);

  const kakaoMapRef = useRef<{
    map: {
      setCenter: (p: unknown) => void;
      setLevel: (n: number) => void;
      setBounds?: (b: unknown, ...pad: number[]) => void;
    };
    LatLng: new (lat: number, lng: number) => unknown;
    LatLngBounds: new () => { extend: (p: unknown) => void };
  } | null>(null);

  const googleMapRef = useRef<{
    map: {
      panTo: (p: { lat: number; lng: number }) => void;
      fitBounds: (b: unknown) => void;
    };
  } | null>(null);

  const markerByIdRef = useRef<Record<string, KakaoMarkerLike>>({});

  const pinLayoutKey = useMemo(
    () =>
      points
        .map((p) => `${p.id}:${p.latitude.toFixed(6)}:${p.longitude.toFixed(6)}:${p.label ?? ""}`)
        .join("|"),
    [points],
  );

  const center = useMemo(() => {
    if (points.length === 0) return SEOUL;
    const s = points.reduce(
      (a, p) => ({ lat: a.lat + p.latitude, lng: a.lng + p.longitude }),
      { lat: 0, lng: 0 },
    );
    return { lat: s.lat / points.length, lng: s.lng / points.length };
  }, [points]);

  const mountKakao = useCallback(() => {
    const el = containerRef.current;
    const appKey = getKakaoMapAppKey();
    if (!el || !appKey) return;

    let cancelled = false;
    void (async () => {
      try {
        await loadKakaoMapsSdk({ appkey: appKey });
      } catch (e) {
        if (!cancelled) {
          setSdkError(e instanceof Error ? e.message : "Kakao SDK load failed");
        }
        return;
      }
      if (cancelled || !containerRef.current) return;

      const K = (
        window as unknown as {
          kakao?: {
            maps: {
              load: (cb: () => void) => void;
              Map: new (node: HTMLElement, opts: { center: unknown; level: number }) => {
                setCenter: (p: unknown) => void;
                setLevel: (n: number) => void;
                setBounds?: (b: unknown, ...pad: number[]) => void;
              };
              LatLng: new (lat: number, lng: number) => unknown;
              LatLngBounds: new () => { extend: (p: unknown) => void };
              Marker: new (opts: {
                position: unknown;
                map: unknown;
                draggable?: boolean;
                title?: string;
                zIndex?: number;
              }) => {
                setPosition: (p: unknown) => void;
                setMap: (m: unknown) => void;
                setZIndex: (z: number) => void;
                getPosition: () => { getLat: () => number; getLng: () => number };
              };
              event: {
                addListener: (
                  target: unknown,
                  evt: string,
                  fn: () => void,
                ) => void;
              };
            };
          };
        }
      ).kakao?.maps;

      if (!K) {
        if (!cancelled) setSdkError("kakao.maps 를 불러오지 못했습니다.");
        return;
      }

      K.load(() => {
        if (cancelled || !containerRef.current) return;
        try {
          containerRef.current.innerHTML = "";
          const map = new K.Map(containerRef.current, {
            center: new K.LatLng(center.lat, center.lng),
            level: 5,
          });
          kakaoMapRef.current = {
            map,
            LatLng: K.LatLng,
            LatLngBounds: K.LatLngBounds,
          };
          setSdkError(null);
          bumpMapEpoch();
        } catch (e) {
          if (!cancelled) {
            setSdkError(
              e instanceof Error ? e.message : "지도 초기화에 실패했습니다.",
            );
          }
        }
      });

      cleanupRef.current = () => {
        kakaoMapRef.current = null;
        markerByIdRef.current = {};
        if (containerRef.current) containerRef.current.innerHTML = "";
      };
    })();

    return () => {
      cancelled = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [center.lat, center.lng]);

  const mountGoogle = useCallback(() => {
    const el = containerRef.current;
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!el || !key) return;

    let cancelled = false;
    void (async () => {
      try {
        const w = window as unknown as { google?: { maps?: unknown } };
        if (!w.google?.maps) {
          await loadScript(
            `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly`,
          );
        }
      } catch {
        return;
      }
      if (cancelled || !containerRef.current) return;

      const g = (
        window as unknown as {
          google?: {
            maps: {
              Map: new (el: HTMLElement, opts: { center: unknown; zoom: number }) => {
                panTo: (p: { lat: number; lng: number }) => void;
                fitBounds: (b: unknown) => void;
              };
              LatLng: new (lat: number, lng: number) => unknown;
              LatLngBounds: new () => { extend: (p: { lat: number; lng: number }) => void };
              Marker: new (opts: {
                position: unknown;
                map: unknown;
                draggable?: boolean;
                title?: string;
                zIndex?: number;
              }) => {
                setPosition: (p: { lat: number; lng: number }) => void;
                setMap: (m: null) => void;
                setZIndex: (z: number) => void;
                getPosition: () => { lat: () => number; lng: () => number };
                addListener: (ev: string, fn: () => void) => void;
              };
            };
          };
        }
      ).google?.maps;

      if (!g) return;

      const map = new g.Map(el, {
        center: { lat: center.lat, lng: center.lng },
        zoom: 14,
      });
      googleMapRef.current = { map };
      bumpMapEpoch();

      cleanupRef.current = () => {
        googleMapRef.current = null;
        markerByIdRef.current = {};
        el.innerHTML = "";
      };
    })();

    return () => {
      cancelled = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [center.lat, center.lng]);

  useEffect(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    if (provider === "fallback") return undefined;
    const cleanup = provider === "kakao" ? mountKakao() : mountGoogle();
    return () => cleanup?.();
  }, [provider, mountKakao, mountGoogle]);

  useEffect(() => {
    if (mapEpoch === 0 || provider === "fallback") return;
    const list = [...pointsRef.current].filter(
      (p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude),
    );

    for (const id of Object.keys(markerByIdRef.current)) {
      if (!list.some((p) => p.id === id)) {
        try {
          markerByIdRef.current[id]?.setMap?.(null);
        } catch {
          /* noop */
        }
        delete markerByIdRef.current[id];
      }
    }

    if (provider === "kakao" && kakaoMapRef.current) {
      const { map, LatLng, LatLngBounds } = kakaoMapRef.current;
      const K = (
        window as unknown as {
          kakao?: {
            maps: {
              Marker: new (opts: {
                position: unknown;
                map: unknown;
                draggable?: boolean;
                title?: string;
                zIndex?: number;
              }) => {
                setPosition: (p: unknown) => void;
                setMap: (m: unknown) => void;
                setZIndex: (z: number) => void;
                getPosition: () => { getLat: () => number; getLng: () => number };
              };
              event: {
                addListener: (target: unknown, evt: string, fn: () => void) => void;
              };
            };
          };
        }
      ).kakao?.maps;
      if (!K?.Marker) return;

      for (const p of list) {
        const pos = new LatLng(p.latitude, p.longitude);
        const isActive = p.id === activePointId;
        let marker = markerByIdRef.current[p.id] as
          | (typeof markerByIdRef.current)[string]
          | undefined;
        if (!marker) {
          const m = new K.Marker({
            position: pos,
            map,
            draggable: true,
            title: p.label?.trim() || undefined,
            zIndex: isActive ? 2 : 1,
          });
          K.event.addListener(m, "click", () => onActiveRef.current(p.id));
          K.event.addListener(m, "dragend", () => {
            const pos2 = m.getPosition();
            onMoveRef.current(p.id, pos2.getLat(), pos2.getLng());
          });
          markerByIdRef.current[p.id] = m as KakaoMarkerLike;
          marker = m as KakaoMarkerLike;
        } else {
          marker.setPosition(pos);
          marker.setZIndex?.(isActive ? 2 : 1);
        }
      }

      if (list.length > 0) {
        const bounds = new LatLngBounds();
        for (const p of list) {
          bounds.extend(new LatLng(p.latitude, p.longitude));
        }
        try {
          map.setBounds?.(bounds, 48, 48, 48, 48);
        } catch {
          try {
            map.setBounds?.(bounds, 56);
          } catch {
            /* noop */
          }
        }
      }
    }

    if (provider === "google" && googleMapRef.current) {
      const g = (
        window as unknown as {
          google?: {
            maps: {
              LatLng: new (lat: number, lng: number) => unknown;
              LatLngBounds: new () => { extend: (p: { lat: number; lng: number }) => void };
              Marker: new (opts: {
                position: { lat: number; lng: number };
                map: unknown;
                draggable?: boolean;
                title?: string;
                zIndex?: number;
              }) => {
                setPosition: (p: { lat: number; lng: number }) => void;
                setMap: (m: null) => void;
                setZIndex: (z: number) => void;
                getPosition: () => { lat: () => number; lng: () => number };
                addListener: (ev: string, fn: () => void) => void;
              };
            };
          };
        }
      ).google?.maps;
      const { map } = googleMapRef.current;
      if (!g?.Marker) return;

      for (const p of list) {
        const pos = { lat: p.latitude, lng: p.longitude };
        const isActive = p.id === activePointId;
        let marker = markerByIdRef.current[p.id];
        if (!marker) {
          const m = new g.Marker({
            position: pos,
            map,
            draggable: true,
            title: p.label?.trim() || undefined,
            zIndex: isActive ? 2 : 1,
          });
          m.addListener("click", () => onActiveRef.current(p.id));
          m.addListener("dragend", () => {
            const pos2 = m.getPosition();
            onMoveRef.current(p.id, pos2.lat(), pos2.lng());
          });
          markerByIdRef.current[p.id] = m as KakaoMarkerLike;
          marker = m as KakaoMarkerLike;
        } else {
          marker.setPosition(pos);
          marker.setZIndex?.(isActive ? 2 : 1);
        }
      }

      if (list.length > 0) {
        const bounds = new g.LatLngBounds();
        for (const p of list) {
          bounds.extend({ lat: p.latitude, lng: p.longitude });
        }
        map.fitBounds(bounds);
      }
    }
  }, [mapEpoch, pinLayoutKey, activePointId, provider]);

  if (provider === "fallback") {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-lg border border-dashed border-navy/20 bg-slate-50 p-4 text-center text-xs text-muted-foreground",
          className,
        )}
        style={{ minHeight: heightPx }}
      >
        <MapPin className="mb-2 h-8 w-8 text-navy/25" />
        <p>
          지도를 쓰려면{" "}
          <code className="rounded bg-white px-1">NEXT_PUBLIC_KAKAO_MAP_APP_KEY</code>
          를 설정하세요.
        </p>
        <p className="mt-1">아래 위·경도 입력으로도 저장할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-lg border border-navy/10", className)}>
      {sdkError ? (
        <p className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {sdkError}
        </p>
      ) : null}
      <div
        ref={containerRef}
        className="w-full bg-slate-100"
        style={{ height: heightPx }}
        role="presentation"
      />
      <p className="border-t border-navy/5 bg-slate-50 px-2 py-1.5 text-[10px] text-muted-foreground">
        설치 지점마다 핀이 표시됩니다. 핀을 클릭해 선택한 뒤 드래그해 위치를 맞춥니다.
      </p>
    </div>
  );
}
