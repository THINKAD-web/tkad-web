"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Clock, RotateCcw } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { MediaCatalogThumbnail } from "@/components/media-catalog-thumbnail";
import { MEDIA_CATALOG_THUMB_IMG_FILTER_CLASS } from "@/components/media-catalog-shared";
import { cn } from "@/lib/utils";
import { formatCatalogPriceFieldWon, mediaPricePeriodTranslationKey } from "@/lib/media-price-format";
import {
  clearRecentlyViewed,
  fetchRecentlyViewedItems,
  readRecentlyViewedIds,
  RECENTLY_VIEWED_MAX,
  subscribeRecentlyViewedChanged,
} from "@/lib/recently-viewed";
import { type MediaItem } from "@/lib/media-data";
import { typeLabels } from "@/lib/media-data";

const DISPLAY_MAX = RECENTLY_VIEWED_MAX;

interface Props {
  locale: string;
}

export default function RecentlyViewedMedia({ locale }: Props) {
  const isKo = locale === "ko";
  const tMedia = useTranslations("media");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const ids = readRecentlyViewedIds();
    if (ids.length === 0) {
      queueMicrotask(() => setReady(true));
      return;
    }
    let cancelled = false;
    void fetchRecentlyViewedItems()
      .then((data) => {
        if (cancelled) return;
        setItems(data);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return subscribeRecentlyViewedChanged(() => {
      void fetchRecentlyViewedItems()
        .then(setItems)
        .catch(() => setItems([]));
    });
  }, []);

  if (!ready) return null;
  if (items.length === 0) return null;

  return (
    <section
      className="mt-12 border-t border-border/70 pt-12"
      aria-label={isKo ? "최근 본 매체" : "Recently viewed media"}
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            [ RECENTLY VIEWED ]
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {tMedia("recentlyViewed")}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              clearRecentlyViewed();
              setItems([]);
            }}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-2xl border border-border/80 bg-card/80 px-3 text-foreground shadow-xs backdrop-blur transition-colors hover:bg-muted disabled:opacity-40"
            aria-label={isKo ? "최근 본 매체 초기화" : "Reset recently viewed"}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]">
              {isKo ? "초기화" : "Reset"}
            </span>
          </button>
        </div>
      </div>

      <div
        className={cn(
          "flex gap-0 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none]",
          "snap-x snap-mandatory",
          "[&::-webkit-scrollbar]:hidden",
        )}
        aria-label={tMedia("recentlyViewed")}
      >
        {items.slice(0, DISPLAY_MAX).map((m) => {
          const typeLabel =
            (isKo ? typeLabels[m.type]?.ko : typeLabels[m.type]?.en) ?? m.type;
          return (
            <Link
              key={m.id}
              href={`/media/${m.id}`}
              className={cn(
                "group -ml-[2px] flex snap-start flex-col overflow-hidden rounded-[24px] border border-border/80 bg-card/80 shadow-xs backdrop-blur",
                "w-[min(100%,256px)] shrink-0 sm:w-[244px]",
                "transition-colors hover:bg-muted/50",
              )}
            >
              <MediaCatalogThumbnail
                media={m}
                placeholderLabel={tMedia("imagePreparing")}
                className={cn(
                  "relative aspect-[4/3] w-full border-b border-border/70",
                  MEDIA_CATALOG_THUMB_IMG_FILTER_CLASS,
                  "group-hover:[&_img]:scale-[1.02]",
                )}
                bottomGradientClassName={null}
                placeholderSize="xs"
              >
                <div className="pointer-events-none absolute left-2.5 top-2.5 z-20 rounded-xl border border-border/80 bg-card/80 px-1.5 py-1 font-mono text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground shadow-xs backdrop-blur">
                  <Clock className="mr-1 inline-block h-3 w-3" aria-hidden />
                  {isKo ? "최근" : "Recent"}
                </div>
              </MediaCatalogThumbnail>
              <div className="flex flex-1 flex-col gap-1.5 p-3">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                  [ {typeLabel} ]
                </span>
                <p className="line-clamp-2 min-h-[2.35rem] text-sm font-bold leading-snug tracking-tight text-foreground group-hover:text-accent">
                  {isKo ? m.name : (m.nameEn || m.name)}
                </p>
                <p className="mt-1 font-mono text-sm font-bold tabular-nums text-foreground">
                  {formatCatalogPriceFieldWon(m.price)}
                  <span className="ml-1 text-[10px] font-normal uppercase tracking-[0.18em] text-muted-foreground">
                    · {tMedia(mediaPricePeriodTranslationKey(m.pricePeriod))}
                  </span>
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
