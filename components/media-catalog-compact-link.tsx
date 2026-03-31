"use client";

import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Flame, MapPin } from "lucide-react";
import { MediaCatalogThumbnail } from "@/components/media-catalog-thumbnail";
import { dedupeImageUrls, typeLabels, type MediaItem } from "@/lib/media-data";
import { formatMediaLocationShort } from "@/lib/media-location-format";
import {
  formatMediaPriceWonWithSymbol,
  mediaPricePeriodTranslationKey,
} from "@/lib/media-price-format";
import { MEDIA_CATALOG_COMPACT_ROW_OUTER_CLASS } from "@/components/media-catalog-shared";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Props = {
  media: MediaItem;
  isKo: boolean;
  href: string;
  imagePreparingLabel: string;
  pricePeriodLabel: string;
  popularIds?: Set<string>;
  /** e.g. compare checkbox area left of thumbnail */
  leadingSlot?: ReactNode;
  /** e.g. compare checkbox overlay on thumbnail */
  thumbnailOverlay?: ReactNode;
  className?: string;
};

/**
 * 매체검색·비교 공통 컴팩트 행(상세 링크).
 */
export function MediaCatalogCompactLinkRow({
  media,
  isKo,
  href,
  imagePreparingLabel,
  pricePeriodLabel,
  popularIds,
  leadingSlot,
  thumbnailOverlay,
  className,
}: Props) {
  const primaryThumb =
    dedupeImageUrls(media.sampleImages ?? [])[0]?.trim() || null;

  return (
    <Link
      href={href}
      aria-label={isKo ? media.name : media.nameEn}
      className={cn(
        MEDIA_CATALOG_COMPACT_ROW_OUTER_CLASS,
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40",
        className,
      )}
    >
      {leadingSlot ? (
        <div className="relative z-20 mr-1 flex h-full shrink-0 items-center justify-center">
          {leadingSlot}
        </div>
      ) : null}
      <MediaCatalogThumbnail
        media={media}
        primaryImageUrl={primaryThumb}
        placeholderLabel={imagePreparingLabel}
        className="relative z-10 h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-md sm:h-24 sm:w-28 sm:rounded-lg"
        bottomGradientClassName={null}
        placeholderSize="xs"
      >
        {thumbnailOverlay}
      </MediaCatalogThumbnail>
      <div className="relative z-0 flex min-w-0 flex-1 flex-col items-center justify-center gap-1 overflow-hidden text-center sm:gap-1.5">
        <div className="flex min-w-0 flex-wrap items-center justify-center gap-1 sm:gap-1.5">
          <Badge
            variant="secondary"
            className="max-w-full shrink bg-navy/5 px-1.5 py-0 text-[9px] text-navy sm:text-[10px]"
          >
            {isKo
              ? (typeLabels[media.type]?.ko ?? media.type)
              : (typeLabels[media.type]?.en ?? media.type)}
          </Badge>
          {popularIds?.has(media.id) ? (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-gold/90 px-1.5 py-0 text-[8px] font-bold text-navy sm:text-[9px]">
              <Flame className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
              {isKo ? "인기" : "Hot"}
            </span>
          ) : null}
        </div>
        <p className="line-clamp-2 min-w-0 break-words text-center text-[13px] font-bold leading-snug text-navy sm:line-clamp-1 sm:text-sm sm:leading-relaxed">
          {isKo ? media.name : media.nameEn}
        </p>
        <p className="flex min-w-0 items-center justify-center gap-0.5 text-[10px] leading-snug text-muted-foreground sm:text-[11px] sm:leading-relaxed">
          <MapPin className="h-2.5 w-2.5 shrink-0 sm:h-3 sm:w-3" />
          <span className="min-w-0 line-clamp-2 sm:line-clamp-1">
            {formatMediaLocationShort(media, isKo)}
          </span>
        </p>
        <p className="min-w-0 break-words text-center text-[13px] font-bold tabular-nums leading-tight text-navy sm:text-sm sm:leading-none">
          {formatMediaPriceWonWithSymbol(media.price)}
          <span className="text-[9px] font-normal text-muted-foreground sm:text-[10px]">
            {" "}
            · {pricePeriodLabel}
          </span>
        </p>
      </div>
    </Link>
  );
}
