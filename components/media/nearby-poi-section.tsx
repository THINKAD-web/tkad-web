"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  lat: number;
  lng: number;
  address: string;
  isKo: boolean;
  className?: string;
};

type LoadState = "loading" | "ready" | "empty" | "error";

const FETCH_TIMEOUT_MS = 15_000;

export function NearbyPoiSection({ lat, lng, address, isKo, className }: Props) {
  const [items, setItems] = useState<string[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadState("loading");
      try {
        const q = new URLSearchParams({
          lat: String(lat),
          lng: String(lng),
          locale: isKo ? "ko" : "en",
          address,
        });
        const res = await fetch(`/api/public/nearby-pois?${q}`, {
          cache: "no-store",
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (cancelled) return;
        if (!res.ok) {
          setItems([]);
          setLoadState("error");
          return;
        }
        const data = (await res.json()) as { items?: string[] };
        const next = Array.isArray(data.items) ? data.items : [];
        setItems(next.slice(0, 6));
        setLoadState(next.length > 0 ? "ready" : "empty");
      } catch {
        if (!cancelled) {
          setItems([]);
          setLoadState("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lat, lng, address, isKo]);

  const cardClass = cn(
    "rounded-2xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-white p-4",
    className,
  );

  if (loadState === "loading") {
    return (
      <div className={cardClass}>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest dark:text-white/45 text-gray-400">
          {isKo ? "주변 POI" : "Nearby POI"}
        </p>
        <p className="text-sm dark:text-white/40 text-gray-400">
          {isKo ? "주변 시설 조회 중…" : "Loading nearby places…"}
        </p>
      </div>
    );
  }

  if (loadState === "empty" || loadState === "error") {
    return (
      <div className={cardClass} data-screenshot="media-nearby-poi-empty">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest dark:text-white/45 text-gray-400">
          {isKo ? "주변 POI" : "Nearby POI"}
        </p>
        <p className="text-sm dark:text-white/50 text-gray-500">
          {loadState === "error"
            ? isKo
              ? "주변 시설 정보를 불러오지 못했습니다."
              : "Could not load nearby places."
            : isKo
              ? "표시할 주변 시설 정보가 없습니다."
              : "No nearby places to show."}
        </p>
      </div>
    );
  }

  return (
    <div className={cardClass} data-screenshot="media-nearby-poi">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest dark:text-white/45 text-gray-400">
        {isKo ? "주변 POI" : "Nearby POI"}
      </p>
      <ul className="space-y-1.5 text-sm dark:text-white/75 text-gray-700">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-hermes"
              aria-hidden
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
