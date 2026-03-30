"use client";

import { useCallback, useState } from "react";
import { ZoomIn } from "lucide-react";
import type { MediaCaseStudyPhoto } from "@/lib/media-data";
import MediaLightbox, { type MediaLightboxLabels } from "@/components/media-lightbox";

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

  if (photos.length === 0) return null;

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2">
        {photos.map((p, i) => {
          const cap = caption(i);
          return (
            <figure
              key={`${p.url}-${i}`}
              className="overflow-hidden rounded-xl border bg-white shadow-sm"
            >
              <button
                type="button"
                onClick={() => {
                  setIndex(i);
                  setOpen(true);
                }}
                className="group relative block aspect-[16/10] w-full cursor-zoom-in overflow-hidden border-0 bg-slate-100 p-0 text-left outline-none ring-offset-2 transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-gold/60"
                aria-label={labels.expand}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt={cap || altBase}
                  className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.03]"
                />
                <div
                  className="pointer-events-none absolute inset-0 flex items-center justify-center bg-navy/0 transition-colors duration-300 group-hover:bg-navy/15"
                  aria-hidden
                >
                  <ZoomIn className="h-10 w-10 text-white opacity-0 drop-shadow-md transition-opacity duration-300 group-hover:opacity-100" />
                </div>
                <span
                  className="pointer-events-none absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm"
                  aria-hidden
                >
                  <ZoomIn className="h-3 w-3" />
                  {labels.clickHint}
                </span>
              </button>
              {cap ? (
                <figcaption className="border-t px-4 py-3 text-sm leading-relaxed text-muted-foreground">
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
