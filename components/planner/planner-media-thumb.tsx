"use client";

import Image from "next/image";
import { getPrimaryMediaImageUrl, type MediaItem } from "@/lib/media-data";
import { catalogThumbnailImageProps } from "@/lib/media-catalog-map";
import { cn } from "@/lib/utils";

type ThumbSize = "rank" | "card";

const SIZE: Record<ThumbSize, string> = {
  rank: "h-11 w-11 rounded-lg",
  card: "h-[4.25rem] w-[4.25rem] shrink-0 rounded-lg sm:h-[4.75rem] sm:w-[4.75rem]",
};

type Props = {
  media: MediaItem;
  alt: string;
  size?: ThumbSize;
  className?: string;
};

export function PlannerMediaThumb({
  media,
  alt,
  size = "card",
  className,
}: Props) {
  const thumb = catalogThumbnailImageProps(getPrimaryMediaImageUrl(media));

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gray-100 dark:bg-white/10",
        SIZE[size],
        className,
      )}
    >
      {thumb ? (
        <Image
          src={thumb.src}
          alt={alt}
          fill
          className="object-cover"
          sizes={size === "rank" ? "44px" : "80px"}
          unoptimized={thumb.unoptimized}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[9px] font-medium text-muted-foreground">
          —
        </div>
      )}
    </div>
  );
}
