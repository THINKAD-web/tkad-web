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

  const uploads = images.filter(
    (u) => typeof u === "string" && u.trim().length > 0,
  );
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
      <section className="relative w-full overflow-hidden bg-navy">
        <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 lg:px-12">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-black/40">
            <MediaImagePlaceholder
              label={tMedia("imagePreparing")}
              size="lg"
              className="absolute inset-0 flex h-full w-full items-center justify-center"
            />
          </div>
        </div>
        <div className="border-t border-white/10" />
      </section>
    );
  }

  return (
    <section className="relative w-full overflow-hidden bg-navy">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-stretch px-4 py-4 sm:px-6 lg:px-12">
        <div className="group relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-black/40">
          <button
            type="button"
            onClick={() => openAt(0)}
            className="absolute inset-0 block h-full w-full cursor-zoom-in border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
            aria-label={labels.expand}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mainSrc}
              alt={altBase}
              className="absolute inset-0 h-full w-full object-cover"
              fetchPriority="high"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100"
            >
              <ZoomIn className="h-4 w-4" />
            </span>
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-4 pb-2 text-white">
          {children}
        </div>
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
