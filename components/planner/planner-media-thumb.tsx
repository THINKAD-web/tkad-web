"use client";

import Image from "next/image";
import { getPrimaryMediaImageUrl, type MediaItem, typeLabels } from "@/lib/media-data";
import { catalogThumbnailImageProps } from "@/lib/media-catalog-map";
import { MediaImagePlaceholder } from "@/components/media-image-placeholder";
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
  isKo?: boolean;
};

export function PlannerMediaThumb({
  media,
  alt,
  size = "card",
  className,
  isKo = true,
}: Props) {
  const thumb = catalogThumbnailImageProps(getPrimaryMediaImageUrl(media));
  const typeLabel =
    typeLabels[media.type]?.[isKo ? "ko" : "en"] ?? media.type;

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden bg-gray-100 dark:bg-white/10",
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
        <MediaImagePlaceholder
          label={typeLabel}
          size="xs"
          className="absolute inset-0 h-full w-full"
        />
      )}
    </div>
  );
}
