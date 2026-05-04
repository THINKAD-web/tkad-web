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
      <div className="grid grid-cols-1 gap-0 sm:grid-cols-2">
        {photos.map((p, i) => {
          const cap = caption(i);
          return (
            <figure
              key={`${p.url}-${i}`}
              className="-mt-[2px] -ml-[2px] overflow-hidden border-2 border-border bg-card"
            >
              <button
                type="button"
                onClick={() => {
                  setIndex(i);
                  setOpen(true);
                }}
                className="group relative block aspect-[16/10] w-full cursor-zoom-in overflow-hidden border-0 bg-muted p-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-accent"
                aria-label={labels.expand}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt={cap || altBase}
                  className="h-full w-full object-cover grayscale transition-[filter,transform] duration-500 ease-out group-hover:grayscale-0 group-hover:scale-[1.02]"
                />
                <span
                  className="pointer-events-none absolute bottom-0 right-0 flex items-center gap-1 border-t-2 border-l-2 border-border bg-accent px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-accent-foreground"
                  aria-hidden
                >
                  <ZoomIn className="h-3 w-3" />
                  {labels.clickHint}
                </span>
              </button>
              {cap ? (
                <figcaption className="border-t-2 border-border px-4 py-3 font-mono text-[12px] leading-relaxed tracking-tight text-muted-foreground">
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
