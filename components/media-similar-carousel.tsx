"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { MediaCatalogThumbnail } from "@/components/media-catalog-thumbnail";
import { cn } from "@/lib/utils";
import type { MediaItem } from "@/lib/media-data";
import {
  getSimilarMediaFromCatalog,
  haversineKm,
  type SimilarSortKey,
  typeLabels,
} from "@/lib/media-data";
import {
  formatMediaPriceWonWithSymbol,
  mediaPricePeriodTranslationKey,
} from "@/lib/media-price-format";

type SortableContext = {
  catalog: readonly MediaItem[];
  currentMedia: MediaItem;
  limit?: number;
};

export default function MediaSimilarCarousel({
  items,
  isKo,
  title,
  sortable,
}: {
  items: readonly MediaItem[];
  isKo: boolean;
  title: string;
  /** 옵션. 제공 시 정렬 토글 노출 + 내부에서 재정렬. */
  sortable?: SortableContext;
}) {
  const t = useTranslations("media.detail");
  const tMedia = useTranslations("media");
  const [sortBy, setSortBy] = useState<SimilarSortKey>("score");

  const displayItems = useMemo<readonly MediaItem[]>(() => {
    if (!sortable) return items;
    return getSimilarMediaFromCatalog(
      [...sortable.catalog],
      sortable.currentMedia,
      sortable.limit ?? items.length ?? 4,
      sortBy,
    );
  }, [items, sortable, sortBy]);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const max = scrollWidth - clientWidth;
    setCanPrev(scrollLeft > 6);
    setCanNext(max > 6 && scrollLeft < max - 6);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      ro.disconnect();
    };
  }, [items.length, updateArrows]);

  const scrollByDir = useCallback((dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const delta = Math.max(240, Math.floor(el.clientWidth * 0.72));
    el.scrollBy({ left: dir * delta, behavior: "smooth" });
  }, []);

  if (displayItems.length === 0) return null;

  return (
    <section
      className="mt-12 border-t border-navy/10 pt-10"
      aria-labelledby="media-similar-heading"
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <h2
          id="media-similar-heading"
          className="text-lg font-bold text-navy sm:text-xl"
        >
          {title}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {sortable ? (
            <div role="group" aria-label={t("similarSortLabel")} className="flex rounded-full border border-navy/10 bg-slate-50 p-0.5">
              {(
                [
                  ["score", t("similarSortScore")],
                  ["distance", t("similarSortDistance")],
                  ["price", t("similarSortPrice")],
                  ["visibility", t("similarSortVisibility")],
                ] as const
              ).map(([key, label]) => (
                <Button
                  key={key}
                  type="button"
                  size="sm"
                  variant={sortBy === key ? "default" : "ghost"}
                  className={cn(
                    "h-7 rounded-full px-2.5 text-[11px]",
                    sortBy === key && "btn-gold border-0",
                  )}
                  aria-pressed={sortBy === key}
                  onClick={() => setSortBy(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
          ) : null}
          {displayItems.length > 1 ? (
            <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0 border-navy/15 bg-white text-navy shadow-sm hover:bg-slate-50"
              disabled={!canPrev}
              aria-label={t("similarCarouselPrev")}
              onClick={() => scrollByDir(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0 border-navy/15 bg-white text-navy shadow-sm hover:bg-slate-50"
              disabled={!canNext}
              aria-label={t("similarCarouselNext")}
              onClick={() => scrollByDir(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
        </div>
      </div>

      <div
        ref={scrollerRef}
        className={cn(
          "flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none]",
          "snap-x snap-mandatory",
          "[&::-webkit-scrollbar]:hidden",
        )}
      >
        {displayItems.map((m) => {
          const typeLabel =
            (isKo ? typeLabels[m.type]?.ko : typeLabels[m.type]?.en) ?? "";
          const distanceKm =
            sortable && sortBy === "distance"
              ? haversineKm(sortable.currentMedia, m)
              : null;
          return (
            <Link
              key={m.id}
              href={`/media/${m.id}`}
              className={cn(
                "group flex snap-start flex-col overflow-hidden rounded-2xl border border-navy/10 bg-white",
                "w-[min(100%,280px)] shrink-0 sm:w-[268px]",
                "shadow-md shadow-navy/[0.07] transition duration-300",
                "hover:-translate-y-1 hover:border-navy/20 hover:shadow-xl hover:shadow-navy/[0.12]",
                "motion-reduce:transform-none",
              )}
            >
              <MediaCatalogThumbnail
                media={m}
                placeholderLabel={tMedia("imagePreparing")}
                className="relative aspect-[4/3] w-full"
                imgClassName="transition duration-500 ease-out group-hover:scale-105"
                bottomGradientClassName={null}
                placeholderSize="xs"
              />
              <div className="flex flex-1 flex-col px-3 pb-3 pt-2.5">
                {typeLabel ? (
                  <span className="mb-1.5 inline-flex w-fit max-w-full truncate rounded-md border border-navy/10 bg-slate-50 px-1.5 py-0.5 text-[11px] font-semibold text-navy/80">
                    {typeLabel}
                  </span>
                ) : null}
                <p className="line-clamp-2 min-h-[2.35rem] text-sm font-bold leading-snug text-navy group-hover:text-gold-dark">
                  {isKo ? m.name : (m.nameEn || m.name)}
                </p>
                <p className="mt-2 text-sm font-bold tabular-nums text-gold-dark sm:text-base">
                  {formatMediaPriceWonWithSymbol(m.price)}
                  <span className="ml-1 text-[11px] font-medium text-muted-foreground sm:text-xs">
                    · {tMedia(mediaPricePeriodTranslationKey(m.pricePeriod))}
                  </span>
                </p>
                {distanceKm != null && Number.isFinite(distanceKm) ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {t("similarDistance", {
                      km: distanceKm < 1 ? distanceKm.toFixed(2) : distanceKm.toFixed(1),
                    })}
                  </p>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
