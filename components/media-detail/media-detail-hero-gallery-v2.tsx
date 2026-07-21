"use client";

import { useCallback, useState } from "react";
import { ZoomIn } from "lucide-react";
import { useTranslations } from "next-intl";
import { BunnyFallbackImage } from "@/components/bunny-fallback-image";
import { MediaDetailKakaoMap } from "@/components/media-detail/media-detail-kakao-map";
import MediaLightbox, { type MediaLightboxLabels } from "@/components/media-lightbox";
import { MediaImagePlaceholder } from "@/components/media-image-placeholder";
import { cn } from "@/lib/utils";

type MapMarker = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  price: number;
  type: string;
};

type Props = {
  images: string[];
  heroSrc: string;
  altBase: string;
  labels: MediaLightboxLabels & { clickHint: string };
  mapFallback?: MapMarker | null;
  className?: string;
};

export function MediaDetailHeroGalleryV2({
  images,
  heroSrc,
  altBase,
  labels,
  mapFallback,
  className,
}: Props) {
  const tMedia = useTranslations("media");
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [activeThumb, setActiveThumb] = useState(0);

  const uploads = images.filter((u) => typeof u === "string" && u.trim().length > 0);
  const hasImage = uploads.length > 0 && heroSrc.trim().length > 0;
  const thumbs = uploads.slice(0, 4);
  const mainSrc = hasImage ? (uploads[activeThumb] ?? uploads[0]) : "";

  const openAt = useCallback(
    (i: number) => {
      if (uploads.length === 0) return;
      const clamped = Math.min(Math.max(0, i), uploads.length - 1);
      setIndex(clamped);
      setOpen(true);
    },
    [uploads.length],
  );

  return (
    <div className={cn("min-w-0", className)}>
      <div className="group relative aspect-[4/3] w-full overflow-hidden rounded-[24px] border dark:border-white/12 border-gray-200 dark:bg-black/40 bg-gray-100 shadow-lg dark:shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
        {hasImage ? (
          <button
            type="button"
            onClick={() => openAt(activeThumb)}
            className="absolute inset-0 z-10 block h-full w-full cursor-zoom-in border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--qp-accent)]"
            aria-label={labels.expand}
          >
            <BunnyFallbackImage
              rawSrc={mainSrc}
              alt={altBase}
              fill
              priority
              fetchPriority="high"
              sizes="(max-width: 1024px) 100vw, 66vw"
              className="object-cover transition duration-500 group-hover:scale-[1.02]"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl border dark:border-white/20 border-gray-200 dark:bg-black/50 bg-white/80 dark:text-white text-gray-800 opacity-0 shadow-lg backdrop-blur transition group-hover:opacity-100"
            >
              <ZoomIn className="h-4 w-4" />
            </span>
          </button>
        ) : mapFallback ? (
          <div className="absolute inset-0">
            <MediaDetailKakaoMap
              markers={[mapFallback]}
              selectedId={mapFallback.id}
              center={{ lat: mapFallback.lat, lng: mapFallback.lng }}
              zoom={4}
            />
          </div>
        ) : (
          <MediaImagePlaceholder
            label={tMedia("imagePreparing")}
            size="lg"
            className="absolute inset-0 flex h-full w-full items-center justify-center"
          />
        )}
      </div>

      {thumbs.length > 1 ? (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {thumbs.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setActiveThumb(i)}
              className={cn(
                "relative aspect-[4/3] overflow-hidden rounded-xl border transition",
                activeThumb === i
                  ? "border-[color:var(--qp-accent)] ring-2 ring-[color:var(--qp-accent)]/40"
                  : "dark:border-white/10 border-gray-200 opacity-80 hover:opacity-100",
              )}
              aria-label={`${labels.expand} ${i + 1}`}
            >
              <BunnyFallbackImage
                rawSrc={src}
                alt=""
                fill
                sizes="(max-width: 1024px) 25vw, 12vw"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}

      <MediaLightbox
        open={open}
        onClose={() => setOpen(false)}
        images={uploads}
        index={index}
        onIndexChange={setIndex}
        altBase={altBase}
        labels={labels}
      />
    </div>
  );
}
