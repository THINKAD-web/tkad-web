"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCampaignMonitoringMapProvider } from "@/components/campaign-monitoring-map";

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

type Props = {
  latitude: number | null;
  longitude: number | null;
  onPositionChange: (lat: number, lng: number) => void;
  className?: string;
  heightPx?: number;
  /** 이동형 — 시·군·구 코드 선택 시 근사 폴리곤 오버레이 */
  coverageDistrictCodes?: string[];
};

export default function AdminMediaDraggableMap({
  latitude,
  longitude,
  onPositionChange,
  className,
  heightPx = 260,
  coverageDistrictCodes,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onDragRef = useRef(onPositionChange);
  onDragRef.current = onPositionChange;
  const skipEmitRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);

  const kakaoRef = useRef<{
    map: {
      setCenter: (p: unknown) => void;
      setLevel: (n: number) => void;
      setBounds?: (b: unknown, ...pad: number[]) => void;
    };
    marker: {
      setPosition: (p: unknown) => void;
      getPosition: () => { getLat: () => number; getLng: () => number };
    };
    LatLng: new (lat: number, lng: number) => unknown;
  } | null>(null);

  const googleRef = useRef<{
    map: { panTo: (p: { lat: number; lng: number }) => void };
    marker: {
      setPosition: (p: { lat: number; lng: number }) => void;
      getPosition: () => { lat: () => number; lng: () => number };
    };
  } | null>(null);

  const cleanupRef = useRef<(() => void) | null>(null);
  const provider = getCampaignMonitoringMapProvider();
  const coverageKey = useMemo(
    () => [...(coverageDistrictCodes ?? [])].sort().join(","),
    [coverageDistrictCodes],
  );
  const coveragePolygonsRef = useRef<Array<{ setMap: (m: unknown) => void }>>([]);

  const latOrDefault = latitude ?? SEOUL.lat;
  const lngOrDefault = longitude ?? SEOUL.lng;
  const coordsRef = useRef({ lat: latOrDefault, lng: lngOrDefault });
  coordsRef.current = { lat: latOrDefault, lng: lngOrDefault };

  const mountKakao = useCallback(() => {
    const el = containerRef.current;
    const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;
    if (!el || !appKey) return;

    let cancelled = false;
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
                setCenter: (p: unknown) => void;
                setLevel: (n: number) => void;
              };
              LatLng: new (lat: number, lng: number) => unknown;
              Marker: new (opts: {
                position: unknown;
                map: unknown;
                draggable?: boolean;
              }) => {
                setPosition: (p: unknown) => void;
                getPosition: () => { getLat: () => number; getLng: () => number };
              };
              event: {
                addListener: (
                  target: { getPosition: () => unknown },
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
        const { lat: lat0, lng: lng0 } = coordsRef.current;
        const map = new K.Map(el, {
          center: new K.LatLng(lat0, lng0),
          level: 4,
        });
        const marker = new K.Marker({
          position: new K.LatLng(lat0, lng0),
          map,
          draggable: true,
        });
        kakaoRef.current = { map, marker, LatLng: K.LatLng };
        K.event.addListener(marker, "dragend", () => {
          if (skipEmitRef.current) return;
          const p = marker.getPosition();
          onDragRef.current(p.getLat(), p.getLng());
        });
        setMapReady(true);
      });

      cleanupRef.current = () => {
        kakaoRef.current = null;
        setMapReady(false);
        el.innerHTML = "";
      };
    })();

    return () => {
      cancelled = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, []);

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
              };
              LatLng: new (lat: number, lng: number) => unknown;
              Marker: new (opts: {
                position: unknown;
                map: unknown;
                draggable?: boolean;
              }) => {
                setPosition: (p: { lat: number; lng: number }) => void;
                getPosition: () => { lat: () => number; lng: () => number };
              };
              event: {
                addListener: (
                  m: { getPosition: () => unknown },
                  ev: string,
                  fn: () => void,
                ) => void;
              };
            };
          };
        }
      ).google?.maps;

      if (!g) return;

      const { lat: lat0, lng: lng0 } = coordsRef.current;
      const center = new g.LatLng(lat0, lng0);
      const map = new g.Map(el, { center, zoom: 17 });
      const marker = new g.Marker({
        position: center,
        map,
        draggable: true,
      });
      googleRef.current = { map, marker };
      g.event.addListener(marker, "dragend", () => {
        if (skipEmitRef.current) return;
        const p = marker.getPosition();
        onDragRef.current(p.lat(), p.lng());
      });
      setMapReady(true);

      cleanupRef.current = () => {
        googleRef.current = null;
        setMapReady(false);
        el.innerHTML = "";
      };
    })();

    return () => {
      cancelled = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, []);

  useEffect(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    setMapReady(false);
    if (provider === "fallback") return undefined;
    if (provider === "kakao") return mountKakao();
    return mountGoogle();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 마운트 1회, 좌표는 coordsRef·동기화 effect
  }, [provider, mountKakao, mountGoogle]);

  useEffect(() => {
    if (!mapReady) return;
    const lat = latitude ?? SEOUL.lat;
    const lng = longitude ?? SEOUL.lng;
    skipEmitRef.current = true;
    if (provider === "kakao" && kakaoRef.current) {
      const { map, marker, LatLng } = kakaoRef.current;
      const p = new LatLng(lat, lng);
      marker.setPosition(p);
      map.setCenter(p);
      map.setLevel(4);
    }
    if (provider === "google" && googleRef.current) {
      const { map, marker } = googleRef.current;
      const pos = { lat, lng };
      marker.setPosition(pos);
      map.panTo(pos);
    }
    const t = requestAnimationFrame(() => {
      skipEmitRef.current = false;
    });
    return () => cancelAnimationFrame(t);
  }, [latitude, longitude, mapReady, provider]);

  useEffect(() => {
    if (!mapReady || provider !== "kakao" || !kakaoRef.current) return;
    const K = (
      window as unknown as {
        kakao?: {
          maps: {
            LatLng: new (lat: number, lng: number) => unknown;
            LatLngBounds: new () => {
              extend: (p: unknown) => void;
            };
            Polygon: new (opts: {
              map: unknown;
              path: unknown[];
              strokeWeight?: number;
              strokeColor?: string;
              strokeOpacity?: number;
              fillColor?: string;
              fillOpacity?: number;
            }) => { setMap: (m: unknown) => void };
          };
        };
      }
    ).kakao?.maps;
    if (!K?.Polygon || !K.LatLngBounds) return;

    for (const p of coveragePolygonsRef.current) {
      try {
        p.setMap(null);
      } catch {
        /* noop */
      }
    }
    coveragePolygonsRef.current = [];

    const codes = (coverageDistrictCodes ?? []).filter(Boolean);
    if (!codes.length) return;

    let cancelled = false;
    const qs = encodeURIComponent(codes.join(","));
    void fetch(`/api/geo/district-boundaries?codes=${qs}`)
      .then((r) => r.json())
      .then(
        (fc: {
          features?: Array<{
            geometry?: { type?: string; coordinates?: [number, number][][] };
          }>;
        }) => {
          if (cancelled || !kakaoRef.current || !fc?.features?.length) return;
          const map = kakaoRef.current.map;
          const bounds = new K.LatLngBounds();
          for (const f of fc.features) {
            const geom = f.geometry;
            if (geom?.type !== "Polygon" || !geom.coordinates?.[0]) continue;
            const ring = geom.coordinates[0];
            if (ring.length < 3) continue;
            const path = ring.map(
              ([lng, lat]) => new K.LatLng(lat, lng) as unknown,
            );
            const poly = new K.Polygon({
              map,
              path,
              strokeWeight: 2,
              strokeColor: "#312e81",
              strokeOpacity: 0.9,
              fillColor: "#a855f7",
              fillOpacity: 0.14,
            });
            coveragePolygonsRef.current.push(poly);
            for (const [lng, lat] of ring) {
              bounds.extend(new K.LatLng(lat, lng) as unknown);
            }
          }
          if (!coveragePolygonsRef.current.length) return;
          try {
            map.setBounds?.(bounds, 40, 40, 40, 40);
          } catch {
            try {
              map.setBounds?.(bounds, 48);
            } catch {
              /* noop */
            }
          }
        },
      )
      .catch(() => {});

    return () => {
      cancelled = true;
      for (const p of coveragePolygonsRef.current) {
        try {
          p.setMap(null);
        } catch {
          /* noop */
        }
      }
      coveragePolygonsRef.current = [];
    };
  }, [mapReady, provider, coverageKey]);

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
          <code className="rounded bg-white px-1">NEXT_PUBLIC_KAKAO_MAP_APP_KEY</code> 또는{" "}
          <code className="rounded bg-white px-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>를
          설정하세요.
        </p>
        <p className="mt-1">위도·경도는 아래 숫자 필드로 직접 입력할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-lg border border-navy/10", className)}>
      <div
        ref={containerRef}
        className="w-full bg-slate-100"
        style={{ height: heightPx }}
        role="presentation"
      />
      <p className="border-t border-navy/5 bg-slate-50 px-2 py-1.5 text-[10px] text-muted-foreground">
        핀을 드래그해 정확한 설치 위치를 맞춥니다. 주소 검색 후에도 미세 조정할 수 있습니다.
      </p>
    </div>
  );
}
