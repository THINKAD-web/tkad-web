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

export function NearbyPoiSection({ lat, lng, address, isKo, className }: Props) {
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const q = new URLSearchParams({
          lat: String(lat),
          lng: String(lng),
          locale: isKo ? "ko" : "en",
          address,
        });
        const res = await fetch(`/api/public/nearby-pois?${q}`, {
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { items?: string[] };
        const next = Array.isArray(data.items) ? data.items : [];
        if (!cancelled) setItems(next.slice(0, 6));
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lat, lng, address, isKo]);

  if (loading) {
    return (
      <div
        className={cn(
          "rounded-2xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-white p-4",
          className,
        )}
      >
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest dark:text-white/45 text-gray-400">
          {isKo ? "주변 POI" : "Nearby POI"}
        </p>
        <p className="text-sm dark:text-white/40 text-gray-400">
          {isKo ? "주변 시설 조회 중…" : "Loading nearby places…"}
        </p>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-2xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-white p-4",
        className,
      )}
      data-screenshot="media-nearby-poi"
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest dark:text-white/45 text-gray-400">
        {isKo ? "주변 POI" : "Nearby POI"}
      </p>
      <ul className="space-y-1.5 text-sm dark:text-white/75 text-gray-700">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400"
              aria-hidden
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
