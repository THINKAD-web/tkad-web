"use client";

import Image from "next/image";
import { OnlinePlatformBadge } from "@/components/media/online-platform-badge";
import type { HomeCatalogMediaItem } from "@/lib/media-catalog-types";
import { catalogThumbnailImageProps } from "@/lib/media-catalog-map";
import { isOnlineCatalogMedia } from "@/lib/pricing-unavailable";
import { cn } from "@/lib/utils";

type Props = {
  item: Pick<
    HomeCatalogMediaItem,
    "thumbnailUrl" | "name" | "catalogChannel" | "onlineSpec"
  >;
  isKo?: boolean;
  size?: "tile" | "compact";
  imageClassName?: string;
  placeholderClassName?: string;
  sizes: string;
};

export function OnlineCatalogCardThumbnail({
  item,
  isKo = true,
  size = "tile",
  imageClassName,
  placeholderClassName,
  sizes,
}: Props) {
  const thumb = catalogThumbnailImageProps(item.thumbnailUrl);
  const isOnline = isOnlineCatalogMedia({ catalogChannel: item.catalogChannel });
  const platform = item.onlineSpec?.platform;

  if (thumb) {
    return (
      <Image
        src={thumb.src}
        alt={item.name}
        fill
        className={cn("object-cover", imageClassName)}
        sizes={sizes}
        unoptimized={thumb.unoptimized}
      />
    );
  }

  if (isOnline && platform) {
    return <OnlinePlatformBadge platform={platform} size={size} />;
  }

  return (
    <div
      className={cn(
        "tkad-type-note flex h-full w-full items-center justify-center text-tkad-muted",
        placeholderClassName,
      )}
    >
      {isKo ? "준비중" : "No image"}
    </div>
  );
}
