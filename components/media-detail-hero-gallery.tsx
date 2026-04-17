"use client";

import { useCallback, useState, type ReactNode } from "react";
import { Images, ZoomIn } from "lucide-react";
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
}: Props) {
  const tMedia = useTranslations("media");
  const [open, setOpen] = useState(false);
  const [lbIndex, setLbIndex] = useState(0);
  const [activeIdx, setActiveIdx] = useState(0);

  const uploads = images.filter(
    (u) => typeof u === "string" && u.trim().length > 0,
  );
  const mainSrc = heroSrc.trim();
  const hasImage = uploads.length > 0 && mainSrc.length > 0;
  const safe = uploads;
  const activeSrc = safe[activeIdx] ?? mainSrc;
  const hasThumbs = safe.length > 1;

  const openAt = useCallback(
    (i: number) => {
      if (safe.length === 0) return;
      const clamped = Math.min(Math.max(0, i), safe.length - 1);
      setLbIndex(clamped);
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
      <section className="relative w-full overflow-hidden bg-navy">
        <div className="relative min-h-[420px] w-full sm:min-h-[540px]">
          <div className="absolute inset-0 bg-black/40" />
          <MediaImagePlaceholder
            label={tMedia("imagePreparing")}
            size="lg"
            className="absolute inset-0 flex h-full w-full items-center justify-center"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy via-navy/60 to-navy/20" />
          <div className="absolute inset-0 flex flex-col px-4 py-4 text-white sm:px-6 lg:px-12">
            {children}
          </div>
        </div>
        <div className="border-t border-white/10" />
      </section>
    );
  }

  return (
    <section className="relative w-full overflow-hidden bg-navy">
      {/* ── Full-bleed hero ── */}
      <div className="relative min-h-[500px] w-full overflow-hidden sm:min-h-[640px] lg:min-h-[720px]">
        {/* Clickable image */}
        <button
          type="button"
          onClick={() => openAt(activeIdx)}
          className="absolute inset-0 block h-full w-full cursor-zoom-in border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
          aria-label={labels.expand}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeSrc}
            alt={`${altBase} ${activeIdx + 1}`}
            className="absolute inset-0 h-full w-full object-cover"
            fetchPriority="high"
            decoding="async"
          />
        </button>

        {/* Gradient: dark at bottom for text legibility, subtle at top */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy via-navy/55 to-navy/10" />

        {/* Zoom hint */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white opacity-80 shadow-lg"
        >
          <ZoomIn className="h-5 w-5" />
        </span>

        {/* Photo count badge */}
        {hasThumbs && (
          <div className="pointer-events-none absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
            <Images className="h-3.5 w-3.5" />
            <span>
              {activeIdx + 1} / {safe.length}
            </span>
          </div>
        )}

        {/* Content overlaid on the image */}
        <div className="absolute inset-0 flex flex-col px-4 py-4 text-white sm:px-6 lg:px-12">
          {children}
        </div>
      </div>

      {/* ── Thumbnail strip ── */}
      {hasThumbs && (
        <div className="border-t border-white/[0.07] bg-navy/95 px-4 py-3 sm:px-6 lg:px-12">
          <div className="mx-auto flex max-w-6xl gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {safe.map((src, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveIdx(i)}
                className={[
                  "relative h-[72px] w-[112px] flex-shrink-0 overflow-hidden rounded-lg transition-all duration-200",
                  i === activeIdx
                    ? "opacity-100 shadow-lg shadow-gold/20 ring-2 ring-gold"
                    : "opacity-45 ring-1 ring-white/10 hover:opacity-80",
                ].join(" ")}
                aria-label={`${altBase} ${i + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`${altBase} ${i + 1}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      <MediaLightbox
        open={open}
        onClose={() => setOpen(false)}
        images={safe}
        index={lbIndex}
        onIndexChange={setLbIndex}
        altBase={altBase}
        labels={lightboxLabels}
      />
    </section>
  );
}
