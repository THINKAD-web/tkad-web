"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { getPrimaryMediaImageUrl, type MediaItem } from "@/lib/media-data";
import { MediaImagePlaceholder } from "@/components/media-image-placeholder";

type Props = {
  media: MediaItem;
  /** When set, used as the image URL instead of `getPrimaryMediaImageUrl(media)` */
  primaryImageUrl?: string | null;
  placeholderLabel: string;
  className?: string;
  imgClassName?: string;
  /** Set to `null` to skip the overlay gradient when an image is shown */
  bottomGradientClassName?: string | null;
  alt?: string;
  placeholderSize?: "xs" | "sm" | "md" | "lg";
  children?: ReactNode;
};

export function MediaCatalogThumbnail({
  media,
  primaryImageUrl,
  placeholderLabel,
  className,
  imgClassName,
  bottomGradientClassName = "absolute inset-0 bg-gradient-to-t from-navy/60 via-navy/10 to-transparent",
  alt = "",
  placeholderSize = "sm",
  children,
}: Props) {
  const fromItem = getPrimaryMediaImageUrl(media);
  const primary =
    primaryImageUrl !== undefined
      ? primaryImageUrl?.trim() || null
      : fromItem;
  const [failed, setFailed] = useState(false);
  const showPlaceholder = !primary || failed;

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gradient-to-br from-navy/5 to-navy/10",
        className,
      )}
    >
      {showPlaceholder ? (
        <MediaImagePlaceholder
          label={placeholderLabel}
          size={placeholderSize}
          className="absolute inset-0 h-full w-full"
        />
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={primary}
            alt={alt}
            className={cn(
              "absolute inset-0 h-full w-full object-cover",
              imgClassName,
            )}
            onError={() => setFailed(true)}
          />
          {bottomGradientClassName ? (
            <div className={bottomGradientClassName} />
          ) : null}
        </>
      )}
      {children}
    </div>
  );
}
