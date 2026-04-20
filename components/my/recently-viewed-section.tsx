"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock } from "lucide-react";
import {
  readRecentlyViewedIds,
  subscribeRecentlyViewedChanged,
} from "@/lib/recently-viewed";

type Item = {
  id: string;
  name: string;
  region: string;
  type: string;
  price: number;
  image: string | null;
};

export function RecentlyViewedSection() {
  const [items, setItems] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const ids = readRecentlyViewedIds();
      if (ids.length === 0) {
        if (!cancelled) {
          setItems([]);
          setLoaded(true);
        }
        return;
      }
      try {
        const res = await fetch("/api/media/map?priceMin=0", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled && data.ok) {
          const byId = new Map<string, Item>(
            data.data.items.map((it: Item) => [it.id, it]),
          );
          setItems(
            ids
              .map((id) => byId.get(id))
              .filter((x): x is Item => x != null)
              .slice(0, 6),
          );
          setLoaded(true);
        }
      } catch {
        if (!cancelled) setLoaded(true);
      }
    }

    load();
    const unsub = subscribeRecentlyViewedChanged(() => load());
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  if (!loaded || items.length === 0) return null;

  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-gray-500" />
        <h2 className="text-sm font-semibold text-gray-700">최근 본 매체</h2>
        <span className="text-xs text-gray-400">{items.length}</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory">
        {items.map((m) => (
          <Link
            key={m.id}
            href={`/media/${m.id}`}
            className="flex-shrink-0 w-40 snap-start group"
          >
            <div className="aspect-[4/3] bg-secondary rounded-lg overflow-hidden mb-2 ring-1 ring-border/60 group-hover:ring-primary/40 transition-all">
              {m.image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={m.image}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              ) : null}
            </div>
            <div className="text-xs font-medium text-gray-900 truncate group-hover:text-primary">
              {m.name}
            </div>
            <div className="text-[10px] text-gray-500 truncate">
              {m.region} · {m.type}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
