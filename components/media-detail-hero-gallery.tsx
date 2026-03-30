"use client";

import { useCallback, useState, type ReactNode } from "react";
import { ZoomIn } from "lucide-react";
import { useTranslations } from "next-intl";
import MediaLightbox, { type MediaLightboxLabels } from "@/components/media-lightbox";
import { MediaImagePlaceholder } from "@/components/media-image-placeholder";

type Props = {
  images: string[];
  heroSrc: string;
  altBase: string;
  labels: MediaLightboxLabels & { clickHint: string };
  children: ReactNode;
  /** When false, hide the thumbnail strip even if multiple images exist. */
  showThumbnails?: boolean;
};

export default function MediaDetailHeroGallery({
  images,
  heroSrc,
  altBase,
  labels,
  children,
  showThumbnails = true,
}: Props) {
  const tMedia = useTranslations("media");
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const uploads = images.filter((u) => typeof u === "string" && u.trim().length > 0);
  const mainSrc = heroSrc.trim();
  const hasImage = uploads.length > 0 && mainSrc.length > 0;

  const safe = uploads.length > 0 ? uploads : [];

  const openAt = useCallback(
    (i: number) => {
      if (safe.length === 0) return;
      const clamped = Math.min(Math.max(0, i), safe.length - 1);
      setIndex(clamped);
      setOpen(true);
    },
    [safe.length],
  );

  const lightboxLabels: MediaLightboxLabels = {
    close: labels.close,
    prev: labels.prev,
    next: labels.next,
    expand: labels.expand,
  };

  if (!hasImage) {
    return (
      <section className="relative aspect-video w-full overflow-hidden bg-navy">
        <MediaImagePlaceholder
          label={tMedia("imagePreparing")}
          size="lg"
          className="min-h-[14rem] h-full w-full sm:min-h-[16rem]"
        />
        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black/75 via-black/35 to-black/15" />
        <div className="relative z-10 flex h-full min-h-0 flex-col justify-between px-4 py-6 sm:px-6 sm:py-8 lg:px-12 lg:py-10 pointer-events-none [&_a]:pointer-events-auto [&_button]:pointer-events-auto">
          {children}
        </div>
      </section>
    );
  }

  return (
    <section className="relative w-full overflow-hidden bg-navy aspect-video">
      <button
        type="button"
        onClick={() => openAt(0)}
        className="absolute inset-0 z-0 block cursor-zoom-in border-0 bg-navy p-0 text-left outline-none ring-inset focus-visible:ring-2 focus-visible:ring-gold/70"
        aria-label={labels.expand}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mainSrc}
          alt={altBase}
          className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out hover:scale-[1.03] active:scale-[1.01]"
          fetchPriority="high"
        />
      </button>

      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black/90 via-black/55 to-black/25"
        aria-hidden
      />

      <span
        className="pointer-events-none absolute bottom-4 right-4 z-[11] flex items-center gap-2 rounded-full border border-white/25 bg-black/45 px-3 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur-md sm:bottom-6 sm:right-6"
        aria-hidden
      >
        <ZoomIn className="h-4 w-4 shrink-0" strokeWidth={2.5} />
        {labels.clickHint}
      </span>

      {showThumbnails && safe.length > 1 ? (
        <div className="pointer-events-auto absolute bottom-3 left-3 right-3 z-[12] flex gap-1.5 overflow-x-auto pb-1 sm:bottom-4 sm:left-4 sm:right-auto sm:max-w-[min(100%,28rem)]">
          {safe.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openAt(i);
              }}
              className={`relative h-12 w-16 shrink-0 overflow-hidden rounded-md border-2 bg-black/30 shadow-md transition sm:h-14 sm:w-[4.5rem] ${
                i === 0 ? "border-gold" : "border-white/30 opacity-90 hover:opacity-100"
              }`}
              aria-label={`${labels.expand} ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      ) : null}

      <div className="relative z-10 flex h-full min-h-0 flex-col justify-between px-4 py-6 sm:px-6 sm:py-8 lg:px-12 lg:py-10 pointer-events-none [&_a]:pointer-events-auto [&_button]:pointer-events-auto">
        {children}
      </div>

      <MediaLightbox
        open={open}
        onClose={() => setOpen(false)}
        images={safe}
        index={index}
        onIndexChange={setIndex}
        altBase={altBase}
        labels={lightboxLabels}
      />
    </section>
  );
}
