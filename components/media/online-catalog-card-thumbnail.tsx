"use client";

import Image from "next/image";
import { OnlinePlatformBadge } from "@/components/media/online-platform-badge";
import type { HomeCatalogMediaItem } from "@/lib/media-catalog-types";
import { catalogThumbnailImageProps } from "@/lib/media-catalog-map";
import { isOnlineCatalogMedia } from "@/lib/pricing-unavailable";
import { cn } from "@/lib/utils";
import { MediaCatalogThumbnailFallback } from "@/components/media/media-catalog-thumbnail-fallback";

type Props = {
  item: Pick<
    HomeCatalogMediaItem,
    "thumbnailUrl" | "name" | "catalogChannel" | "onlineSpec" | "type"
  >;
  locale?: string;
  /** @deprecated pass `locale` */
  isKo?: boolean;
  size?: "tile" | "compact";
  imageClassName?: string;
  placeholderClassName?: string;
  sizes: string;
};

export function OnlineCatalogCardThumbnail({
  item,
  locale,
  isKo,
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
    <MediaCatalogThumbnailFallback
      catalogChannel={item.catalogChannel}
      type={item.type}
      size={size === "compact" ? 40 : 56}
      className={placeholderClassName}
    />
  );
}
