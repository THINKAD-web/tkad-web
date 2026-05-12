"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { getPrimaryMediaImageUrl, type MediaItem } from "@/lib/media-data";
import { MediaImagePlaceholder } from "@/components/media-image-placeholder";

type Props = {
  media: MediaItem;
  /** When set, used as the image URL instead of `getPrimaryMediaImageUrl(media)` */
  primaryImageUrl?: string | null;
  /** Fallback image URL when the media has no primary image */
  fallbackUrl?: string | null;
  placeholderLabel: string;
  className?: string;
  imgClassName?: string;
  /** Set to `null` to skip the overlay gradient when an image is shown */
  bottomGradientClassName?: string | null;
  /**
   * 명시 alt. 미설정 시 `{media.name} OOH 광고 매체 - {location}` 자동 사용.
   * 빈 문자열("") 명시 시에만 decorative 처리.
   */
  alt?: string;
  /** alt 자동 생성 시 영문 사용 여부 (locale="en") */
  altEn?: boolean;
  placeholderSize?: "xs" | "sm" | "md" | "lg";
  /** next/image priority flag for above-the-fold images */
  priority?: boolean;
  /** next/image sizes hint */
  sizes?: string;
  children?: ReactNode;
};

export function MediaCatalogThumbnail({
  media,
  primaryImageUrl,
  fallbackUrl,
  placeholderLabel,
  className,
  imgClassName,
  bottomGradientClassName = "absolute inset-0 bg-gradient-to-t from-navy/60 via-navy/10 to-transparent",
  alt,
  altEn = false,
  placeholderSize = "sm",
  priority = false,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  children,
}: Props) {
  const fromItem = getPrimaryMediaImageUrl(media);
  const primary =
    primaryImageUrl !== undefined
      ? primaryImageUrl?.trim() || null
      : fromItem;
  const imageUrl = primary || fallbackUrl?.trim() || null;
  const [failed, setFailed] = useState(false);
  const showPlaceholder = !imageUrl || failed;

  /**
   * SEO / 이미지 검색 / 접근성:
   *   alt 명시 안 됨 → 매체명 + 위치 자동 조합 ("강남대로 LED 빌보드 OOH 광고 매체 - 서울 강남구")
   *   alt="" (빈 문자열) → decorative 의도로 존중
   */
  const mediaName = altEn ? (media.nameEn || media.name) : media.name;
  const mediaLocation = altEn ? (media.locationEn || media.location) : media.location;
  const autoAlt = altEn
    ? `${mediaName} OOH advertising media${mediaLocation ? ` - ${mediaLocation}` : ""}`
    : `${mediaName} OOH 광고 매체${mediaLocation ? ` - ${mediaLocation}` : ""}`;
  const finalAlt = alt === undefined ? autoAlt : alt;

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
          <Image
            src={imageUrl}
            alt={finalAlt}
            fill
            sizes={sizes}
            priority={priority}
            className={cn(
              "object-cover",
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
