"use client";

import { useState, useEffect } from "react";
import { ArrowRight, MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  readRecentlyViewedRecords,
  subscribeRecentlyViewedChanged,
  type RecentlyViewedRecord,
} from "@/lib/recently-viewed";
import { typeLabels } from "@/lib/media-data";
import { formatCatalogPriceFieldWon } from "@/lib/media-price-format";
import ScrollAnimate from "@/components/scroll-animate";
import { cn } from "@/lib/utils";

interface Props {
  locale: string;
}

const HOME_DISPLAY_MAX = 5;

export default function HomeRecentlyViewed({ locale }: Props) {
  const isKo = locale === "ko";
  const [items, setItems] = useState<RecentlyViewedRecord[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const load = () => {
      setItems(readRecentlyViewedRecords());
      setReady(true);
    };
    load();
    return subscribeRecentlyViewedChanged(load);
  }, []);

  if (!ready) return null;
  if (items.length === 0) return null;

  const visible = items.slice(0, HOME_DISPLAY_MAX);

  return (
    <section
      className="border-t dark:border-white/10 border-gray-200 dark:bg-black bg-white/20 py-14 sm:py-16"
      aria-label={isKo ? "최근에 보신 매체" : "Recently viewed media"}
    >
      <div className="ui-container">
        <ScrollAnimate>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] dark:text-white text-gray-500">
                {isKo ? "// PERSONAL" : "// PERSONAL"}
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight dark:text-white text-gray-900 sm:text-3xl">
                {isKo ? "최근에 보신 매체" : "Recently viewed"}
              </h2>
            </div>
            <Link
              href="/my?tab=recent"
              className="link-underline-grow inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold text-cyan-300 transition-colors hover:text-cyan-200 sm:min-h-0 sm:self-auto"
            >
              {isKo ? "전체 보기" : "View all"}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </ScrollAnimate>

        <div
          className={cn(
            "mt-8 flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none]",
            "snap-x snap-mandatory",
            "[&::-webkit-scrollbar]:hidden",
          )}
        >
          {visible.map((media, i) => {
            const typeLabel =
              (isKo
                ? typeLabels[media.type as keyof typeof typeLabels]?.ko
                : typeLabels[media.type as keyof typeof typeLabels]?.en) ?? media.type;
            return (
              <ScrollAnimate key={media.id} delay={i * 80} className="shrink-0 snap-start">
                <Link
                  href={`/media/${media.id}`}
                  className="group flex w-[min(82vw,240px)] flex-col overflow-hidden rounded-2xl border dark:border-white/12 border-gray-200 dark:bg-white/5 bg-gray-50 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur transition-transform hover:-translate-y-0.5"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden dark:bg-white/5 bg-gray-50">
                    {media.thumbnail ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={media.thumbnail}
                        alt=""
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center font-mono text-[10px] uppercase tracking-[0.2em] dark:text-white text-gray-400">
                        {isKo ? "이미지 준비 중" : "No image"}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5 p-3">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300/90">
                      {typeLabel}
                    </span>
                    <p className="line-clamp-2 text-sm font-bold leading-snug dark:text-white text-gray-900 group-hover:text-cyan-100">
                      {media.name}
                    </p>
                    <div className="flex min-w-0 items-start gap-1 text-xs dark:text-white text-gray-500">
                      <MapPin className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                      <span className="truncate">{media.region}</span>
                    </div>
                    <p className="text-sm font-bold tabular-nums dark:text-white text-gray-900">
                      {formatCatalogPriceFieldWon(media.price)}
                    </p>
                  </div>
                </Link>
              </ScrollAnimate>
            );
          })}
        </div>
      </div>
    </section>
  );
}
