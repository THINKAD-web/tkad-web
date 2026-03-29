"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MediaItem } from "@/lib/media-data";
import { resolveMediaGallery, typeLabels } from "@/lib/media-data";

export default function MediaSimilarCarousel({
  items,
  isKo,
  title,
  priceSuffix,
}: {
  items: readonly MediaItem[];
  isKo: boolean;
  title: string;
  priceSuffix: string;
}) {
  const t = useTranslations("media.detail");
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

  if (items.length === 0) return null;

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
        {items.length > 1 ? (
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

      <div
        ref={scrollerRef}
        className={cn(
          "flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none]",
          "snap-x snap-mandatory",
          "[&::-webkit-scrollbar]:hidden",
        )}
      >
        {items.map((m) => {
          const thumb = resolveMediaGallery(m)[0];
          const typeLabel =
            (isKo ? typeLabels[m.type]?.ko : typeLabels[m.type]?.en) ?? "";
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
              <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumb}
                  alt=""
                  className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-105"
                />
              </div>
              <div className="flex flex-1 flex-col p-4">
                {typeLabel ? (
                  <span className="mb-2 inline-flex w-fit max-w-full truncate rounded-md border border-navy/10 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-navy/80">
                    {typeLabel}
                  </span>
                ) : null}
                <p className="line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-snug text-navy group-hover:text-gold-dark">
                  {isKo ? m.name : m.nameEn}
                </p>
                <p className="mt-3 text-base font-bold tabular-nums text-gold-dark">
                  ₩{m.price.toLocaleString()}
                  <span className="ml-1 text-xs font-medium text-muted-foreground">
                    {priceSuffix}
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
