"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

type GalleryLabels = {
  close: string;
  prev: string;
  next: string;
  expand: string;
};

const defaultLabels: GalleryLabels = {
  close: "Close",
  prev: "Previous image",
  next: "Next image",
  expand: "View full size",
};

export default function MediaGallery({
  images,
  altBase,
  className,
  labels,
}: {
  images: string[];
  altBase: string;
  className?: string;
  labels?: Partial<GalleryLabels>;
}) {
  const L = { ...defaultLabels, ...labels };
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const lightboxIndexRef = useRef(0);

  useEffect(() => {
    lightboxIndexRef.current = lightboxIndex;
  }, [lightboxIndex]);

  const safe =
    images.length > 0
      ? images
      : ["https://picsum.photos/seed/tkad-media-empty/1200/800"];

  const n = safe.length;
  const mainIdx = Math.min(active, n - 1);
  const mainSrc = safe[mainIdx];

  const thumbIndices = safe
    .map((_, i) => i)
    .filter((i) => i !== mainIdx)
    .slice(0, 4);

  const closeLightbox = useCallback(() => {
    setActive(lightboxIndexRef.current);
    setLightboxOpen(false);
  }, []);

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  const goPrev = useCallback(() => {
    setLightboxIndex((i) => (i - 1 + n) % n);
  }, [n]);

  const goNext = useCallback(() => {
    setLightboxIndex((i) => (i + 1) % n);
  }, [n]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeLightbox();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightboxOpen, closeLightbox, goPrev, goNext]);

  useEffect(() => {
    if (lightboxOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [lightboxOpen]);

  return (
    <div className={cn(className)}>
      <div
        className={cn(
          "flex flex-col gap-2 sm:gap-3",
          "lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] lg:grid-rows-2 lg:items-stretch",
        )}
      >
        <button
          type="button"
          onClick={() => openLightbox(mainIdx)}
          className={cn(
            "group relative aspect-video w-full overflow-hidden rounded-xl border border-navy/10 bg-slate-100 text-left shadow-sm outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-gold/60",
            "lg:col-span-1 lg:row-span-2 lg:aspect-auto lg:min-h-[min(22rem,50vw)]",
          )}
          aria-label={L.expand}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- remote demo URLs */}
          <img
            src={mainSrc}
            alt={`${altBase} — ${mainIdx + 1} / ${n}`}
            className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-105"
          />
        </button>

        {thumbIndices.map((idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              setActive(idx);
              openLightbox(idx);
            }}
            className={cn(
              "group relative aspect-video w-full overflow-hidden rounded-lg border border-navy/10 bg-slate-100 text-left outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-gold/60",
              "lg:aspect-auto lg:min-h-0",
            )}
            aria-label={`${altBase} — ${idx + 1} / ${n}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={safe[idx]}
              alt=""
              className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      {lightboxOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/92 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={L.expand}
          onClick={closeLightbox}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              closeLightbox();
            }}
            className="absolute top-4 right-4 z-[82] flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            aria-label={L.close}
          >
            <X className="h-5 w-5" />
          </button>

          {n > 1 ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                className="absolute top-1/2 left-2 z-[82] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:left-4"
                aria-label={L.prev}
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                className="absolute top-1/2 right-2 z-[82] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-4"
                aria-label={L.next}
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          ) : null}

          <div
            className="relative z-[81] flex max-h-[min(88vh,100%)] max-w-[min(96vw,100%)] items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={safe[lightboxIndex]}
              alt={`${altBase} — ${lightboxIndex + 1} / ${n}`}
              className="max-h-[min(88vh,100%)] max-w-full object-contain shadow-2xl"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
