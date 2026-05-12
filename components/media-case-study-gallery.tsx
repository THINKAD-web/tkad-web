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
              className="-mt-[2px] -ml-[2px] overflow-hidden rounded-[24px] border border-border/80 bg-card/80 shadow-xs backdrop-blur"
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
                  className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1 rounded-2xl border border-white/16 bg-black/35 px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-white/90 shadow-[0_18px_70px_rgba(0,0,0,0.55)] backdrop-blur"
                  aria-hidden
                >
                  <ZoomIn className="h-3 w-3" />
                  {labels.clickHint}
                </span>
              </button>
              {cap ? (
                <figcaption className="border-t border-border/70 px-4 py-3 font-mono text-[12px] leading-relaxed tracking-tight text-muted-foreground">
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
