"use client";

import { useCallback, useMemo, useState } from "react";
import { NeonSection } from "@/components/landing/neon/neon-section";
import { NeonSectionHead } from "@/components/landing/neon/neon-section-head";
import MediaLightbox from "@/components/media-lightbox";
import { resolvePublicMediaImageUrl } from "@/lib/optimized-image-url";
import { cn } from "@/lib/utils";

type Props = {
  isKo: boolean;
  galleryImages: string[];
};

export function NetworkGallery({ isKo, galleryImages }: Props) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const images = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const url of galleryImages) {
      const src = resolvePublicMediaImageUrl(url);
      if (src && !seen.has(src)) {
        seen.add(src);
        out.push(src);
      }
    }
    return out;
  }, [galleryImages]);

  const openAt = useCallback((i: number) => {
    setIndex(i);
    setOpen(true);
  }, []);

  if (images.length < 5) return null;

  const labels = isKo
    ? { close: "닫기", prev: "이전", next: "다음", expand: "크게 보기" }
    : { close: "Close", prev: "Previous", next: "Next", expand: "Expand" };

  return (
    <NeonSection>
      <NeonSectionHead
        kicker={isKo ? "GALLERY" : "GALLERY"}
        title={
          <>
            {isKo ? "현장 " : "Site "}
            <span className="tkad-home-accent-text">
              {isKo ? "설치 사진" : "gallery"}
            </span>
          </>
        }
        meta={
          isKo
            ? "전국 네트워크 매체의 실제 설치 환경"
            : "Real installation environments nationwide"
        }
      />

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {images.slice(0, 8).map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => openAt(i)}
            className={cn(
              "group relative aspect-[4/3] overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 dark:border-white/10 dark:bg-black/30",
              i === 0 && "sm:col-span-2 sm:row-span-2 sm:aspect-auto sm:min-h-[240px]",
            )}
            aria-label={`${labels.expand} ${i + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      <MediaLightbox
        open={open}
        onClose={() => setOpen(false)}
        images={images}
        index={index}
        onIndexChange={setIndex}
        altBase={isKo ? "네트워크 매체 현장" : "Network site"}
        labels={labels}
      />
    </NeonSection>
  );
}
