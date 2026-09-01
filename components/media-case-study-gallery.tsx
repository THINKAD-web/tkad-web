"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import type { MediaCaseStudyPhoto } from "@/lib/media-data";
import MediaLightbox, { type MediaLightboxLabels } from "@/components/media-lightbox";
import { cn } from "@/lib/utils";

type Props = {
  photos: MediaCaseStudyPhoto[];
  isKo: boolean;
  labels: MediaLightboxLabels & { clickHint: string };
};

export default function MediaCaseStudyGallery({
  photos,
  isKo,
  labels,
}: Props) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const useHorizontalScroller = photos.length > 2;
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const urls = photos.map((p) => p.url);
  const altBase = isKo ? "캠페인 사진" : "Campaign photo";

  const caption = useCallback(
    (i: number) => {
      const p = photos[i];
      if (!p) return "";
      return isKo ? p.captionKo || p.captionEn || "" : p.captionEn || p.captionKo || "";
    },
    [photos, isKo],
  );

  const updateScrollerState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || !useHorizontalScroller) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    const max = scrollWidth - clientWidth;
    const cards = Array.from(el.children) as HTMLElement[];

    setCanPrev(scrollLeft > 6);
    setCanNext(max > 6 && scrollLeft < max - 6);

    if (cards.length === 0) {
      setActiveIndex(0);
      return;
    }

    let closestIdx = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    cards.forEach((card, idx) => {
      const distance = Math.abs(card.offsetLeft - scrollLeft);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIdx = idx;
      }
    });

    setActiveIndex(closestIdx);
  }, [useHorizontalScroller]);

  useEffect(() => {
    if (!useHorizontalScroller) {
      return;
    }

    const el = scrollerRef.current;
    if (!el) return;

    updateScrollerState();
    el.addEventListener("scroll", updateScrollerState, { passive: true });
    const ro = new ResizeObserver(updateScrollerState);
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", updateScrollerState);
      ro.disconnect();
    };
  }, [photos.length, updateScrollerState, useHorizontalScroller]);

  const scrollByDir = useCallback(
    (dir: -1 | 1) => {
      const el = scrollerRef.current;
      if (!el) return;

      const cards = Array.from(el.children) as HTMLElement[];
      const nextIndex = Math.max(0, Math.min(cards.length - 1, activeIndex + dir));
      cards[nextIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "start",
      });
    },
    [activeIndex],
  );

  if (photos.length === 0) return null;

  return (
    <>
      {useHorizontalScroller ? (
        <div className="mb-3 flex items-center justify-end gap-2">
          <span className="min-w-[3.5rem] text-center tkad-type-label text-muted-foreground">
            {activeIndex + 1} / {photos.length}
          </span>
          <button
            type="button"
            disabled={!canPrev}
            aria-label={labels.prev}
            onClick={() => scrollByDir(-1)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-border/80 bg-card/80 text-foreground shadow-xs backdrop-blur transition-colors hover:bg-muted disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={!canNext}
            aria-label={labels.next}
            onClick={() => scrollByDir(1)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-border/80 bg-card/80 text-foreground shadow-xs backdrop-blur transition-colors hover:bg-muted disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      <div
        ref={scrollerRef}
        className={cn(
          useHorizontalScroller
            ? "flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory [&::-webkit-scrollbar]:hidden"
            : "grid grid-cols-1 gap-0 sm:grid-cols-2",
        )}
      >
        {photos.map((p, i) => {
          const cap = caption(i);
          return (
            <figure
              key={`${p.url}-${i}`}
              className={cn(
                "overflow-hidden rounded-[24px] border border-border/80 bg-card/80 shadow-xs backdrop-blur",
                useHorizontalScroller
                  ? "w-[min(92vw,420px)] shrink-0 snap-start"
                  : "-mt-[2px] -ml-[2px]",
              )}
            >
              <button
                type="button"
                onClick={() => {
                  setIndex(i);
                  setOpen(true);
                }}
                className="group relative block aspect-[16/10] w-full cursor-zoom-in overflow-hidden border-0 bg-muted/40 p-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-accent"
                aria-label={labels.expand}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt={cap || altBase}
                  className="h-full w-full object-cover grayscale transition-[filter,transform] duration-500 ease-out group-hover:grayscale-0 group-hover:scale-[1.02]"
                />
                <span
                  className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1 rounded-2xl border border-white/16 dark:bg-black bg-white/35 px-3 py-1 font-display tkad-type-note font-black uppercase tracking-[0.18em] dark:text-white text-gray-800 shadow-[0_18px_70px_rgba(0,0,0,0.55)] backdrop-blur"
                  aria-hidden
                >
                  <ZoomIn className="h-3 w-3" />
                  {labels.clickHint}
                </span>
              </button>
              {cap ? (
                <figcaption className="border-t border-border/70 px-4 py-3 tkad-type-meta leading-relaxed tracking-tight text-muted-foreground">
                  {cap}
                </figcaption>
              ) : null}
            </figure>
          );
        })}
      </div>

      <MediaLightbox
        open={open}
        onClose={() => setOpen(false)}
        images={urls}
        index={index}
        onIndexChange={setIndex}
        altBase={altBase}
        labels={{
          close: labels.close,
          prev: labels.prev,
          next: labels.next,
          expand: labels.expand,
        }}
      />
    </>
  );
}
