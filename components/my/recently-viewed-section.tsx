"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { Clock } from "lucide-react";
import {
  readRecentlyViewedRecords,
  subscribeRecentlyViewedChanged,
  type RecentlyViewedRecord,
} from "@/lib/recently-viewed";
import { MediaPriceExclNote } from "@/components/media/media-price-excl-note";
import { formatMediaDisplayPrice } from "@/lib/media-price-format";

export function RecentlyViewedSection() {
  const locale = useLocale();
  const isKo = locale.startsWith("ko");
  const [items, setItems] = useState<RecentlyViewedRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = () => {
      setItems(readRecentlyViewedRecords());
      setLoaded(true);
    };
    load();
    const unsub = subscribeRecentlyViewedChanged(load);
    return unsub;
  }, []);

  if (!loaded || items.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center gap-2">
        <Clock className="h-4 w-4 text-accent" />
        <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-accent">
          [ RECENTLY VIEWED / {items.length} ]
        </p>
      </div>
      <div className="-mx-4 flex snap-x snap-mandatory gap-0 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {items.map((m) => (
          <Link
            key={m.id}
            href={`/media/${m.id}`}
            className="group -ml-[2px] w-40 shrink-0 snap-start border-2 border-border bg-card p-2 transition-colors hover:bg-muted"
          >
            <div className="mb-2 aspect-[4/3] overflow-hidden border-2 border-border bg-muted">
              {m.thumbnail ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={m.thumbnail}
                  alt=""
                  className="h-full w-full object-cover grayscale transition-all duration-300 group-hover:grayscale-0"
                />
              ) : null}
            </div>
            <div className="truncate text-xs font-bold tracking-tight text-foreground group-hover:text-accent">
              {m.name}
            </div>
            <p className="mt-0.5 truncate font-display text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {`// `}{m.region} · {m.type}
            </p>
            <p className="mt-1 truncate text-[10px] tabular-nums text-foreground">
              {formatMediaDisplayPrice(
                { price: m.price, pricePeriod: m.pricePeriod ?? "month" },
                isKo ? "ko-KR" : "en-US",
              )}
            </p>
            <MediaPriceExclNote isKo={isKo} />
          </Link>
        ))}
      </div>
    </section>
  );
}
