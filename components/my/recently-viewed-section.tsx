"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
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
    <section className="mb-8">
      <div className="mb-4 flex items-center gap-2">
        <Clock className="h-4 w-4 text-bx-accent" />
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
          [ RECENTLY VIEWED / {items.length} ]
        </p>
      </div>
      <div className="-mx-4 flex snap-x snap-mandatory gap-0 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {items.map((m) => (
          <Link
            key={m.id}
            href={`/media/${m.id}`}
            className="group -ml-[2px] w-40 flex-shrink-0 snap-start border-2 border-bx-black bg-bx-white p-2 transition-colors hover:bg-bx-off"
          >
            <div className="mb-2 aspect-[4/3] overflow-hidden border-2 border-bx-black bg-bx-off">
              {m.image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={m.image}
                  alt=""
                  className="h-full w-full object-cover grayscale transition-all duration-300 group-hover:grayscale-0"
                />
              ) : null}
            </div>
            <div className="truncate text-xs font-bold tracking-tight text-bx-black group-hover:text-bx-accent">
              {m.name}
            </div>
            <div className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.18em] text-bx-gray-dim">
              {`// `}{m.region} · {m.type}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
