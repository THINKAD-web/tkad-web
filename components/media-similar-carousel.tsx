"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
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
      className="mt-12 border-t-2 border-bx-black pt-10"
      aria-labelledby="media-similar-heading"
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
            [ SIMILAR MEDIA ]
          </p>
          <h2
            id="media-similar-heading"
            className="mt-1 text-xl font-bold tracking-tight text-bx-black sm:text-2xl"
          >
            {title}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {sortable ? (
            <div
              role="group"
              aria-label={t("similarSortLabel")}
              className="inline-flex border-2 border-bx-black bg-bx-white"
            >
              {(
                [
                  ["score", t("similarSortScore")],
                  ["distance", t("similarSortDistance")],
                  ["price", t("similarSortPrice")],
                  ["visibility", t("similarSortVisibility")],
                ] as const
              ).map(([key, label], i) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={sortBy === key}
                  onClick={() => setSortBy(key)}
                  className={cn(
                    "px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors",
                    i > 0 && "border-l-2 border-bx-black",
                    sortBy === key
                      ? "bg-bx-black text-bx-white"
                      : "text-bx-black hover:bg-bx-off",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
          {displayItems.length > 1 ? (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!canPrev}
                aria-label={t("similarCarouselPrev")}
                onClick={() => scrollByDir(-1)}
                className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-bx-black bg-bx-white text-bx-black transition-colors hover:bg-bx-black hover:text-bx-white disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={!canNext}
                aria-label={t("similarCarouselNext")}
                onClick={() => scrollByDir(1)}
                className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-bx-black bg-bx-white text-bx-black transition-colors hover:bg-bx-black hover:text-bx-white disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div
        ref={scrollerRef}
        className={cn(
          "flex gap-0 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none]",
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
                "group -ml-[2px] flex snap-start flex-col overflow-hidden border-2 border-bx-black bg-bx-white",
                "w-[min(100%,280px)] shrink-0 sm:w-[268px]",
                "transition-colors hover:bg-bx-off",
              )}
            >
              <MediaCatalogThumbnail
                media={m}
                placeholderLabel={tMedia("imagePreparing")}
                className="relative aspect-[4/3] w-full border-b-2 border-bx-black"
                imgClassName="grayscale transition-[filter,transform] duration-500 ease-out group-hover:grayscale-0 group-hover:scale-[1.02]"
                bottomGradientClassName={null}
                placeholderSize="xs"
              />
              <div className="flex flex-1 flex-col gap-1.5 p-4">
                {typeLabel ? (
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
                    [ {typeLabel} ]
                  </span>
                ) : null}
                <p className="line-clamp-2 min-h-[2.35rem] text-sm font-bold leading-snug tracking-tight text-bx-black group-hover:text-bx-accent">
                  {isKo ? m.name : (m.nameEn || m.name)}
                </p>
                <p className="mt-1 font-mono text-sm font-bold tabular-nums text-bx-black">
                  {formatMediaPriceWonWithSymbol(m.price)}
                  <span className="ml-1 text-[10px] font-normal uppercase tracking-[0.18em] text-bx-gray-dim">
                    · {tMedia(mediaPricePeriodTranslationKey(m.pricePeriod))}
                  </span>
                </p>
                {distanceKm != null && Number.isFinite(distanceKm) ? (
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-bx-gray-dim">
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
