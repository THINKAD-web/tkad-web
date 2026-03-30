"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ZoomIn } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import MediaLightbox, { type MediaLightboxLabels } from "@/components/media-lightbox";
import { MediaImagePlaceholder } from "@/components/media-image-placeholder";

type GalleryLabels = MediaLightboxLabels & {
  clickHint?: string;
};

const defaultLabels: GalleryLabels = {
  close: "Close",
  prev: "Previous image",
  next: "Next image",
  expand: "View full size",
  clickHint: "Click to enlarge",
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
  const tMedia = useTranslations("media");
  const L = { ...defaultLabels, ...labels };
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const lightboxIndexRef = useRef(lightboxIndex);

  useEffect(() => {
    lightboxIndexRef.current = lightboxIndex;
  }, [lightboxIndex]);

  const safe = images.filter(
    (u) => typeof u === "string" && u.trim().length > 0,
  );

  const n = safe.length;
  const mainIdx = n > 0 ? Math.min(active, n - 1) : 0;
  const mainSrc = n > 0 ? safe[mainIdx] : "";

  const closeLightbox = useCallback(() => {
    setActive(lightboxIndexRef.current);
    setLightboxOpen(false);
  }, []);

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  const thumbIndices =
    n > 0
      ? safe
          .map((_, i) => i)
          .filter((i) => i !== mainIdx)
          .slice(0, 5)
      : [];

  const lightboxLabels: MediaLightboxLabels = {
    close: L.close,
    prev: L.prev,
    next: L.next,
    expand: L.expand,
  };

  if (n === 0) {
    return (
      <div className={cn("overflow-hidden rounded-2xl border border-navy/10", className)}>
        <MediaImagePlaceholder
          label={tMedia("imagePreparing")}
          size="md"
          className="min-h-[220px] w-full py-12"
        />
      </div>
    );
  }

  return (
    <div className={cn(className)}>
      <div
        className={cn(
          "flex flex-col gap-2 sm:gap-3",
          "lg:grid lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)_minmax(0,1fr)] lg:grid-rows-2 lg:items-stretch lg:gap-3",
        )}
      >
        <button
          type="button"
          onClick={() => openLightbox(mainIdx)}
          className={cn(
            "group relative aspect-video w-full cursor-zoom-in overflow-hidden rounded-xl border border-navy/10 bg-slate-100 text-left shadow-md shadow-navy/5 outline-none ring-offset-2 transition-shadow duration-300 hover:border-gold/40 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-gold/60",
            "lg:col-span-1 lg:row-span-2 lg:aspect-auto lg:min-h-[min(20rem,48vw)]",
          )}
          aria-label={L.expand}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mainSrc}
            alt={`${altBase} — ${mainIdx + 1} / ${n}`}
            className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.03] group-active:scale-[0.99]"
            loading="lazy"
            decoding="async"
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy/50 via-transparent to-navy/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full border border-white/30 bg-navy/75 px-2.5 py-1 text-[11px] font-semibold text-white shadow-md backdrop-blur-sm transition duration-300 group-hover:bg-navy/90"
            aria-hidden
          >
            <ZoomIn className="h-3.5 w-3.5" strokeWidth={2.5} />
            <span>{L.clickHint}</span>
          </div>
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
              "group relative aspect-video w-full cursor-zoom-in overflow-hidden rounded-lg border border-navy/10 bg-slate-100 text-left shadow-sm outline-none ring-offset-2 transition-all duration-300 hover:border-gold/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-gold/60",
              "lg:aspect-auto lg:min-h-0",
            )}
            aria-label={`${L.expand} — ${idx + 1} / ${n}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={safe[idx]}
              alt=""
              className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.05]"
              loading="lazy"
              decoding="async"
            />
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center bg-navy/0 transition-colors duration-300 group-hover:bg-navy/20"
              aria-hidden
            >
              <ZoomIn className="h-8 w-8 text-white opacity-0 drop-shadow-md transition-opacity duration-300 group-hover:opacity-100" />
            </div>
          </button>
        ))}
      </div>

      {n > 0 ? (
        <MediaLightbox
          open={lightboxOpen}
          onClose={closeLightbox}
          images={safe}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          altBase={altBase}
          labels={lightboxLabels}
        />
      ) : null}
    </div>
  );
}
