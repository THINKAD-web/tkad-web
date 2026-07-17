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
      <section className="tkad-media-detail-hero tkad-home-hero relative w-full overflow-hidden bg-gray-50 text-gray-900 dark:bg-[#05050a] dark:text-white">
        <div
          aria-hidden
          className="absolute inset-0 tkad-hero-noise opacity-[0.07] mix-blend-overlay"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.12),rgba(0,0,0,0.55),rgba(0,0,0,0.90))]"
        />

        <div className="relative mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-12">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[28px] border dark:border-white/12 border-gray-200 dark:bg-black bg-white/20">
            <MediaImagePlaceholder
              label={tMedia("imagePreparing")}
              size="lg"
              className="absolute inset-0 flex h-full w-full items-center justify-center"
            />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="tkad-media-detail-hero tkad-home-hero relative w-full overflow-hidden bg-gray-50 text-gray-900 dark:bg-[#05050a] dark:text-white">
      <div
        aria-hidden
        className="absolute inset-0 tkad-hero-noise opacity-[0.07] mix-blend-overlay"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.12),rgba(0,0,0,0.55),rgba(0,0,0,0.92))]"
      />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col items-stretch px-4 py-10 sm:px-6 lg:px-12">
        <div className="group relative aspect-[16/9] w-full overflow-hidden rounded-[28px] border dark:border-white/12 border-gray-200 dark:bg-black bg-white/20 shadow-[0_28px_120px_rgba(0,0,0,0.75)] backdrop-blur-sm">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-10 z-0 bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--qp-accent)_18%,transparent),transparent_55%),radial-gradient(circle_at_right,color-mix(in_srgb,var(--qp-ink)_8%,transparent),transparent_58%)] blur-2xl opacity-70"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_35%,transparent_65%,rgba(0,0,0,0.18))]"
          />
          <button
            type="button"
            onClick={() => openAt(0)}
            className="absolute inset-0 z-10 block h-full w-full cursor-zoom-in border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label={labels.expand}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mainSrc}
              alt={altBase}
              className="absolute inset-0 h-full w-full object-cover transition-[filter,transform] duration-500 group-hover:contrast-[1.06] group-hover:scale-[1.01]"
              fetchPriority="high"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/16 dark:bg-black bg-white/35 dark:text-white text-gray-800 opacity-0 shadow-[0_18px_70px_rgba(0,0,0,0.55)] backdrop-blur transition-opacity duration-200 group-hover:opacity-100"
            >
              <ZoomIn className="h-4 w-4" />
            </span>
          </button>
        </div>

        <div className="mt-8 flex flex-col gap-4 pb-4 dark:text-white text-gray-900">
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
